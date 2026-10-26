/* OctoCat-Code — Le serpent d'Octo (monde de Python) : un jeu d'arcade à la place du Double Dragon.
 * Module PUR (testé sous Node, comme playsim.js).
 *
 * « Octo » veut dire huit tentacules, et Python est un serpent : OctoCat glisse sur une grille et laisse derrière lui une file de tentacules (des lettres
 * de « OCTOCAT »). Chaque pièce ramassée allonge la file. Les bords de l'arène se traversent (on sort d'un côté, on revient de l'autre) ;
 * les pierres bloquent ; les Glitch patrouillent. Laita court au bout de la file et, à l'appel, fige tous les Glitch pendant 4 secondes.
 *
 *   def = { cols, rows, speed, hpMax, seed, coins (nombre), walls: [[x, y, w, h], …], glitches: [{ x, y, dx, dy, speed }], hearts: [[x, y]], stars: [[x, y]] }
 *   Une pièce = une case ; `bitsTotal` = coins. Une pierre, un Glitch ou sa propre file fait perdre un cœur (jamais la partie d'un coup) ;
 *   à 0 cœur tout recommence (les pièces déjà prises restent prises).
 */
(function () {
  "use strict";

  var S = window.OctoSim, CFG = S.CFG;
  var DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

  function createSnake(def) {
    var C = def.cols || 28, R = def.rows || 15, hpMax = def.hpMax || 5, speed0 = def.speed || 6.5;
    var sim = {
      mode: "snake", cols: C, rows: R, time: 0, finished: false, events: [], relax: false, abilities: {}, victory: 0,
      stats: { deaths: 0, kills: 0, bits: 0, bitsTotal: def.coins || 0 }, coinsGot: {}, terminal: { x: 0, y: 0 }, walls: {}, wallList: [],
      body: [], dir: [1, 0], coins: [], glitches: [], hearts: [], stars: [], inv: 0, star: 0, freeze: 0, moves: 0, acc: 0, speed: speed0
    };
    var rnd = (function (seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })((def.seed || 7) * 131 + 17);
    var queued = null, prev = { left: false, right: false, up: false, down: false, dog: false }, grow = 0;
    function key(x, y) { return x + "," + y; }
    function emit(t, x, y, extra) { sim.events.push({ t: t, x: x, y: y, extra: extra }); }
    (def.walls || []).forEach(function (w) { for (var j = 0; j < w[3]; j++) for (var i = 0; i < w[2]; i++) { sim.walls[key(w[0] + i, w[1] + j)] = true; sim.wallList.push({ x: w[0] + i, y: w[1] + j }); } });
    var start = def.start || { x: 3, y: Math.floor(R / 2), dx: 1, dy: 0 };

    // pièces : des cases libres, loin du départ, espacées (tirage fixé par `seed` : le niveau est toujours le même)
    (function placeCoins() {
      var n = def.coins || 0, tries = 0;
      while (sim.coins.length < n && tries++ < 4000) {
        var x = Math.floor(rnd() * C), y = Math.floor(rnd() * R);
        if (sim.walls[key(x, y)] || sim.coins.some(function (c) { return Math.abs(c.x - x) + Math.abs(c.y - y) < 4; })) continue;
        if (Math.abs(x - start.x) + Math.abs(y - start.y) < 5) continue;
        if ((def.glitches || []).some(function (g) { return Math.abs(g.x - x) + Math.abs(g.y - y) < 3; })) continue;
        sim.coins.push({ x: x, y: y, id: sim.coins.length });
      }
    })();
    var allCoins = sim.coins.map(function (c) { return { x: c.x, y: c.y, id: c.id }; });
    sim.stats.bitsTotal = allCoins.length;

    var d = sim.dog = {
      x: 0, y: 0, face: 1, state: "follow", cd: 0, vx: 0, immortal: true,
      call: function () {
        if (d.cd > 0) return false;
        emit("bark", d.x, d.y); sim.freeze = CFG.dogScare; d.cd = CFG.dogCooldown;
        sim.glitches.forEach(function (g) { if (g.alive) emit("scare", g.x, g.y); });
        return true;
      },
      update: function (dt) { if (d.cd > 0) d.cd -= dt; }
    };
    // le joueur vu par le décor (cases ; la tête avance par à-coups, le rendu interpole avec sim.frac)
    var p = sim.player = { x: start.x, y: start.y, hp: hpMax, hpMax: hpMax, inv: 0, star: 0, power: 0, facing: 1 };

    function buildLevel() {
      sim.body = [];
      sim.dir = [start.dx == null ? 1 : start.dx, start.dy || 0];
      for (var i = 0; i < 3; i++) sim.body.push({ x: start.x - sim.dir[0] * i, y: start.y - sim.dir[1] * i });
      sim.glitches = (def.glitches || []).map(function (g, i) { return { id: i, x: g.x, y: g.y, x0: g.x, y0: g.y, dx: g.dx || 0, dy: g.dy || 0, speed: g.speed || 2.4, acc: 0, alive: true, hurt: 0 }; });
      sim.hearts = (def.hearts || []).map(function (h) { return { x: h[0], y: h[1], got: false }; });
      sim.stars = (def.stars || []).map(function (h) { return { x: h[0], y: h[1], got: false }; });
      sim.coins = allCoins.filter(function (c) { return !sim.coinsGot[c.id]; }).map(function (c) { return { x: c.x, y: c.y, id: c.id }; });
      queued = null; grow = 0; sim.acc = 0; sim.moves = 0; sim.victory = 0; sim.freeze = 0; sim.speed = speed0 + Math.min(2.5, sim.stats.bits * 0.2);
      p.x = start.x; p.y = start.y; p.inv = 1.4; p.star = 0; p.hp = hpMax;
    }
    buildLevel();
    sim.startCoins = sim.coins.length;

    function wrap(v, n) { return ((v % n) + n) % n; }
    function hurt(n) {
      if (p.inv > 0 || p.star > 0 || sim.relax) return false;
      p.hp -= n || 1; p.inv = 1.4; emit("hurt", sim.body[0].x, sim.body[0].y);
      if (p.hp <= 0) { sim.stats.deaths++; emit("die", sim.body[0].x, sim.body[0].y); buildLevel(); emit("restart", start.x, start.y); }
      return true;
    }
    function advance() {
      var head = sim.body[0], nx = wrap(head.x + sim.dir[0], C), ny = wrap(head.y + sim.dir[1], R), i;
      if (sim.walls[key(nx, ny)]) { // une pierre : la tête ne bouge pas, un cœur en moins
        emit("bump", nx, ny); hurt(1);
        // on repart dans une direction libre (à gauche ou à droite de la pierre) pour ne pas rester bloqué
        var alt = [[sim.dir[1], -sim.dir[0]], [-sim.dir[1], sim.dir[0]]];
        for (i = 0; i < 2; i++) { var ax = wrap(head.x + alt[i][0], C), ay = wrap(head.y + alt[i][1], R); if (!sim.walls[key(ax, ay)]) { sim.dir = alt[i]; break; } }
        return;
      }
      // sa propre file : on perd un cœur et la file est coupée à cet endroit (jamais sous 3 cases)
      for (i = 1; i < sim.body.length - (grow > 0 ? 0 : 1); i++) {
        if (sim.body[i].x === nx && sim.body[i].y === ny) { emit("self", nx, ny); if (hurt(1) && sim.body.length > 3) sim.body.length = Math.max(3, i); break; }
      }
      sim.body.unshift({ x: nx, y: ny });
      if (grow > 0) { grow--; sim.tailPrev = null; } else sim.tailPrev = sim.body.pop(); // (sim.tailPrev : où était le bout de la file, pour l'animation)
      p.x = nx; p.y = ny; sim.moves++;
      if (sim.dir[0]) p.facing = sim.dir[0];
      // pièces, cœurs, étoiles
      for (i = sim.coins.length - 1; i >= 0; i--) {
        var c = sim.coins[i];
        if (c.x === nx && c.y === ny) { sim.coins.splice(i, 1); sim.coinsGot[c.id] = true; sim.stats.bits++; grow += 1; sim.speed = Math.min(speed0 + 2.5, sim.speed + 0.2); emit("bit", nx, ny); }
      }
      sim.hearts.forEach(function (h) { if (!h.got && h.x === nx && h.y === ny) { h.got = true; if (p.hp >= hpMax) { p.star = CFG.starTime; emit("star", nx, ny); } else { p.hp = Math.min(hpMax, p.hp + 1); emit("heart", nx, ny); } } });
      sim.stars.forEach(function (h) { if (!h.got && h.x === nx && h.y === ny) { h.got = true; p.star = CFG.starTime; emit("star", nx, ny); } });
      if (!sim.coins.length && !sim.victory) { sim.victory = 1.4; emit("clear", nx, ny); }
      glitchTouch();
    }
    function glitchTouch() {
      sim.glitches.forEach(function (g) {
        if (!g.alive) return;
        var touch = sim.body.some(function (b, i) { return b.x === g.x && b.y === g.y && (i === 0 || p.star <= 0); });
        if (!touch) return;
        if (p.star > 0) { g.alive = false; sim.stats.kills++; emit("kill", g.x, g.y); return; } // invincible : on avale le Glitch
        if (hurt(1)) { var cut = Math.max(3, sim.body.length - 2); sim.body.length = cut; g.x = g.x0; g.y = g.y0; g.dx = -g.dx; g.dy = -g.dy; g.hurt = 1; }
      });
    }

    function stepOnce(inp, dt) {
      sim.time += dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.star > 0) p.star -= dt;
      if (sim.freeze > 0) sim.freeze -= dt;
      // directions : un appui change le sens (jamais demi-tour sur place)
      ["left", "right", "up", "down"].forEach(function (k2) {
        if (inp[k2] && !prev[k2]) { var v = DIRS[k2]; if (!(v[0] === -sim.dir[0] && v[1] === -sim.dir[1]) || sim.body.length <= 1) queued = v; }
        prev[k2] = !!inp[k2];
      });
      if (inp.dog && !prev.dog) d.call();
      prev.dog = !!inp.dog;
      d.update(dt);
      if (sim.victory > 0) { sim.victory -= dt; if (sim.victory <= 0) { sim.finished = true; emit("finish", p.x, p.y); } return; }
      // la tête avance d'une case à chaque pas
      sim.acc += dt * sim.speed;
      while (sim.acc >= 1) {
        sim.acc -= 1;
        if (queued && !(queued[0] === -sim.dir[0] && queued[1] === -sim.dir[1])) sim.dir = queued;
        queued = null;
        advance();
        if (sim.finished) return;
      }
      // les Glitch patrouillent (ils s'arrêtent quand Laita aboie)
      if (sim.freeze <= 0) sim.glitches.forEach(function (g) {
        if (!g.alive) return;
        if (g.hurt > 0) g.hurt -= dt;
        g.acc += dt * g.speed;
        while (g.acc >= 1) {
          g.acc -= 1;
          var nx = wrap(g.x + g.dx, C), ny = wrap(g.y + g.dy, R);
          if (sim.walls[key(nx, ny)]) { g.dx = -g.dx; g.dy = -g.dy; nx = wrap(g.x + g.dx, C); ny = wrap(g.y + g.dy, R); if (sim.walls[key(nx, ny)]) continue; }
          g.x = nx; g.y = ny;
        }
      });
      glitchTouch();
      // le chien est au bout de la file
      var tail = sim.body[sim.body.length - 1];
      d.vx = 0; d.x = tail.x; d.y = tail.y;
    }

    sim.step = function (input, dt) {
      var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (var i = 0; i < n; i++) stepOnce(input || {}, h);
    };
    sim.frac = function () { return Math.min(1, sim.acc); };
    sim.progress = function () { return sim.startCoins ? Math.min(1, 1 - sim.coins.length / sim.startCoins + (sim.victory > 0 ? 0 : 0)) : 0; };
    sim.nearestThreat = function () {
      var best = Infinity, h0 = sim.body[0];
      sim.glitches.forEach(function (g) { if (g.alive) best = Math.min(best, (Math.abs(g.x - h0.x) + Math.abs(g.y - h0.y)) * 16); });
      return best;
    };
    sim.battle = function () { return !!def.combat; };
    sim.terminal = { x: 0, y: 0 };
    return sim;
  }

  /** Le robot de test : plus court chemin (en traversant les bords) vers la pièce la plus proche, en évitant pierres, sa file et les Glitch. */
  function snakeBot(sim) {
    var C = sim.cols, R = sim.rows, names = ["left", "right", "up", "down"];
    function wrap(v, n) { return ((v % n) + n) % n; }
    return function () {
      var inp = { left: false, right: false, up: false, down: false, dog: false };
      var head = sim.body[0], blocked = {}, i;
      sim.body.forEach(function (b, bi) { if (bi < sim.body.length - 1) blocked[b.x + "," + b.y] = true; });
      var near = false;
      sim.glitches.forEach(function (g) {
        if (!g.alive) return;
        [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { blocked[wrap(g.x + o[0], C) + "," + wrap(g.y + o[1], R)] = true; });
        if (Math.abs(g.x - head.x) + Math.abs(g.y - head.y) < 3) near = true;
      });
      if (near && sim.dog.cd <= 0) inp.dog = true;
      // largeur d'abord depuis la tête
      var prevCell = {}, queue = [[head.x, head.y]], seen = {}, goal = null;
      seen[head.x + "," + head.y] = true;
      var coinAt = {}; sim.coins.forEach(function (c) { coinAt[c.x + "," + c.y] = true; });
      while (queue.length && !goal) {
        var cur = queue.shift();
        for (i = 0; i < 4; i++) {
          var v = [[-1, 0], [1, 0], [0, -1], [0, 1]][i], nx = wrap(cur[0] + v[0], C), ny = wrap(cur[1] + v[1], R), k2 = nx + "," + ny;
          if (seen[k2] || sim.walls[k2] || blocked[k2]) continue;
          // pas de demi-tour sur la 1re case
          if (cur[0] === head.x && cur[1] === head.y && v[0] === -sim.dir[0] && v[1] === -sim.dir[1]) continue;
          seen[k2] = true; prevCell[k2] = cur;
          if (coinAt[k2]) { goal = [nx, ny]; break; }
          queue.push([nx, ny]);
        }
      }
      var pick = null;
      if (goal) { // on remonte jusqu'à la 1re case après la tête
        var c2 = goal;
        while (prevCell[c2[0] + "," + c2[1]] && !(prevCell[c2[0] + "," + c2[1]][0] === head.x && prevCell[c2[0] + "," + c2[1]][1] === head.y)) c2 = prevCell[c2[0] + "," + c2[1]];
        pick = [wrap(c2[0] - head.x + 1, C) - 1, wrap(c2[1] - head.y + 1, R) - 1];
        if (Math.abs(pick[0]) > 1) pick[0] = -Math.sign(pick[0]);
        if (Math.abs(pick[1]) > 1) pick[1] = -Math.sign(pick[1]);
      } else { // rien de joignable : n'importe quelle case libre
        for (i = 0; i < 4 && !pick; i++) { var w2 = [[-1, 0], [1, 0], [0, -1], [0, 1]][i], k3 = wrap(head.x + w2[0], C) + "," + wrap(head.y + w2[1], R); if (!sim.walls[k3] && !blocked[k3] && !(w2[0] === -sim.dir[0] && w2[1] === -sim.dir[1])) pick = w2; }
      }
      if (pick) names.forEach(function (n) { var v2 = DIRS[n]; if (v2[0] === pick[0] && v2[1] === pick[1]) inp[n] = true; });
      return inp;
    };
  }

  S.createSnake = createSnake;
  S.snakeBot = snakeBot;
})();
