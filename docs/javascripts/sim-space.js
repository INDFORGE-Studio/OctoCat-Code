/* OctoCat-Code — L'invasion (monde de JavaScript) : un tir à la Space Invaders, à la place du Double Dragon.
 * Module PUR (testé sous Node, comme playsim.js).
 *
 * OctoCat pilote sa fusée en bas de l'écran, Laita à son côté. Des vagues d'envahisseurs descendent en formation (elles vont d'un bord à l'autre,
 * puis descendent d'un cran) et lâchent des bombes. On tire vers le haut ; les bunkers arrêtent les bombes ; une soucoupe-mystère laisse du butin.
 *
 *   def = { hpMax, shields, ufoEvery, waves: [ { cols, rows, kinds: ["squid","crab","drone"] (du haut vers le bas), speed, fire, volley (bombes lâchées d'un coup), armor (points de vie en plus), coins, boss } ] }
 *   Une pièce par envahisseur « doré » (coins = leur nombre dans la vague) : comme au Double Dragon, `bitsTotal` = le total des pièces du niveau.
 *
 * Règles gentilles : si une formation arrive en bas elle repart vers le haut (et coûte un cœur), jamais de partie perdue d'un coup ; à 0 cœur, tout recommence
 * au début du niveau (les pièces déjà prises restent prises). Laita : un aboiement qui fige tous les envahisseurs 4 secondes (elle ne tue jamais).
 */
(function () {
  "use strict";

  var S = window.OctoSim, CFG = S.CFG;

  var KINDS = {
    drone: { hp: 2, w: 22, h: 16, score: 1, fire: 1 },
    crab: { hp: 2, w: 24, h: 16, score: 2, fire: 1.2 },
    squid: { hp: 3, w: 22, h: 18, score: 3, fire: 1.6, aim: true },
    mother: { hp: 40, w: 84, h: 34, score: 10, fire: 0, boss: true }
  };
  var DX = 34, DY = 26;

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function hit(ax, ay, aw, ah, bx, by, bw, bh) { return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2; }

  function createInvaders(def, viewW, viewH) {
    var W = viewW || 600, H = viewH || 337, hpMax = def.hpMax || 5, shieldN = def.shields == null ? 0 : def.shields;
    var yMin = H - 96, yMax = H - 26, dangerY = H - 118;
    var waves = (def.waves || []).map(function (w, i) { return { spec: w, idx: i, state: "wait", t: 0 }; });
    var sim = {
      mode: "invaders", w: W, h: H, viewW: W, time: 0, finished: false, events: [], relax: false,
      enemies: [], bullets: [], bombs: [], shields: [], items: [], ufo: null, formation: null, freeze: 0, abilities: {}, victory: 0,
      stats: { deaths: 0, kills: 0, bits: 0, bitsTotal: 0 }, coinsGot: {}, terminal: { x: W / 2, y: H / 2 }, boss: null, breach: 0
    };
    waves.forEach(function (w) { sim.stats.bitsTotal += w.spec.coins || 0; });
    var p = sim.player = { x: W / 2, y: yMax - 8, hp: hpMax, hpMax: hpMax, inv: 0, star: 0, power: 0, cd: 0, facing: 1, tilt: 0, shield: 0 }; // shield : coups que le bouclier du cœur peut encore encaisser (2 au plus)
    var prev = { attack: false, dog: false };
    function emit(t, x, y, extra) { sim.events.push({ t: t, x: x, y: y, extra: extra }); }
    var rnd = (function (seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(1234 + (def.id || 1) * 77);

    // Laita : elle vole à côté de la fusée et, à l'appel, aboie : les envahisseurs figent
    var d = sim.dog = {
      x: p.x - 34, y: p.y + 2, face: 1, state: "follow", cd: 0, vx: 0, immortal: true,
      call: function () {
        if (d.cd > 0) return false;
        emit("bark", d.x, d.y - 10);
        sim.freeze = CFG.dogScare; sim.bombs.length = 0; d.cd = CFG.dogCooldown;
        sim.enemies.forEach(function (e) { if (e.alive) emit("scare", e.x, e.y - 12); });
        return true;
      },
      update: function (dt) {
        var px = d.x;
        if (d.cd > 0) d.cd -= dt;
        d.x += (p.x - 34 - d.x) * (1 - Math.exp(-9 * dt)); d.y += (p.y + 3 - d.y) * (1 - Math.exp(-9 * dt));
        d.vx = dt > 0 ? (d.x - px) / dt : 0; d.face = 1;
      }
    };

    /* ----- bunkers : des petits blocs en arche, qui encaissent les bombes (pas nos tirs) ----- */
    function buildShields() {
      sim.shields = [];
      var pattern = ["..XXXX..", ".XXXXXX.", "XXXXXXXX", "XXXXXXXX", "XX....XX"], bs = 5, i, r, c;
      for (i = 0; i < shieldN; i++) {
        var ox = (i + 1) * W / (shieldN + 1) - 4 * bs, oy = H - 74;
        for (r = 0; r < pattern.length; r++) for (c = 0; c < 8; c++) if (pattern[r].charAt(c) === "X") sim.shields.push({ x: ox + c * bs + bs / 2, y: oy + r * bs + bs / 2, s: bs, hp: 2, alive: true });
      }
    }

    /* ----- vagues ----- */
    function spawnWave(w) {
      var sp = w.spec, cols = sp.cols || 5, rows = sp.rows || 2, kinds = sp.kinds || ["crab", "drone"], total = cols * rows, i, r, c;
      var coinAt = {}, n = sp.coins || 0;
      for (i = 0; i < n; i++) coinAt[Math.min(total - 1, Math.floor((i + 0.5) * total / n))] = true;
      sim.formation = { x: (W - (cols - 1) * DX) / 2, y: -rows * DY, dir: 1, speed: sp.speed || 28, cols: cols, rows: rows, entering: true, targetY: sp.top || 58, fireT: 1.6 };
      for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
        var kind = kinds[Math.min(r, kinds.length - 1)], K = KINDS[kind], idx = r * cols + c, hp0 = K.hp + (sp.armor || 0);
        sim.enemies.push({ id: w.idx + ":" + idx, kind: kind, c: c, r: r, x: 0, y: 0, w: K.w, h: K.h, hp: hp0, maxHp: hp0, alive: true, coin: !!coinAt[idx], flash: 0 });
      }
      placeFormation();
      if (sp.boss) {
        var B = KINDS.mother, hpB = sp.boss.hp || B.hp;
        sim.boss = { kind: "mother", x: W / 2, y: -40, w: B.w, h: B.h, hp: hpB, maxHp: hpB, alive: true, dir: 1, speed: 44, cd: 2.2, phase: 0, flash: 0, sy: 40 };
      }
      w.state = "run";
      emit("wave", W / 2, 0, w.idx);
    }
    function placeFormation() {
      var f = sim.formation;
      sim.enemies.forEach(function (e) { e.x = f.x + e.c * DX; e.y = f.y + e.r * DY; });
    }
    function aliveEnemies() { return sim.enemies.filter(function (e) { return e.alive; }); }

    function hurtPlayer(n) {
      if (p.inv > 0 || p.star > 0 || sim.relax) return false;
      if (p.shield > 0) { p.shield--; p.inv = 0.4; emit(p.shield > 0 ? "pshield-hit" : "pshield-break", p.x, p.y - 10); return true; } // le bouclier encaisse à la place des cœurs
      p.hp -= n || 1; p.inv = CFG.invTime; emit("hurt", p.x, p.y - 10);
      if (p.hp <= 0) { sim.stats.deaths++; emit("die", p.x, p.y); restartLevel(); }
      return true;
    }
    function restartLevel() {
      waves.forEach(function (w) { w.state = "wait"; w.t = 0; });
      sim.enemies = []; sim.bullets = []; sim.bombs = []; sim.items = []; sim.ufo = null; sim.formation = null; sim.boss = null; sim.freeze = 0; sim.victory = 0;
      sim.stats.kills = 0; buildShields();
      p.x = W / 2; p.y = yMax - 8; p.hp = hpMax; p.inv = 1.5; p.star = 0; p.power = 0; p.cd = 0; p.shield = 0;
      d.x = p.x - 34; d.y = p.y + 2; d.cd = 0; sim.ufoT = def.ufoEvery || 22; sim.gap = 1.4;
      emit("restart", p.x, p.y);
    }
    sim.ufoT = def.ufoEvery || 22; sim.gap = 1.2;
    buildShields();

    function killEnemy(e, byBoss) {
      e.alive = false; sim.stats.kills++;
      emit("kill", e.x, e.y);
      if (e.coin && !sim.coinsGot[e.id]) { sim.coinsGot[e.id] = true; sim.stats.bits++; emit("bit", e.x, e.y - 8); }
      if (!byBoss && rnd() < 0.06) sim.items.push({ x: e.x, y: e.y, vy: 60, kind: "heart", got: false });
    }
    function damage(e, dmg) {
      e.hp -= dmg; e.flash = 0.12;
      if (e.hp <= 0) killEnemy(e); else emit("hit", e.x, e.y);
    }
    function pickup(it) {
      it.got = true;
      if (it.kind === "power") { p.power = CFG.powerTime; emit("power", it.x, it.y); }
      else if (p.hp >= hpMax) { p.shield = 2; emit("pshield", it.x, it.y); } // cœur à pleine vie : un bouclier apparaît (2 bombes suffisent à le casser), pas d'invincibilité
      else { p.hp = Math.min(hpMax, p.hp + 2); emit("heart", it.x, it.y); }
    }
    function dropBomb(x, y, aim, vyBase) {
      var vy = vyBase || 105 + Math.min(60, sim.stats.kills * 0.6), vx = 0;
      if (aim) { var dt2 = Math.max(0.3, (p.y - y) / vy); vx = clamp((p.x - x) / dt2, -60, 60); }
      sim.bombs.push({ x: x, y: y, vx: vx, vy: vy });
      emit("bomb", x, y);
    }

    function stepOnce(inp, dt) {
      var i, e, b;
      var attackNow = !!inp.attack, dogPressed = !!inp.dog && !prev.dog, throwNow = !!inp.throw;
      prev.attack = !!inp.attack; prev.dog = !!inp.dog;
      sim.time += dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.star > 0) p.star -= dt;
      if (p.power > 0) p.power -= dt;
      if (p.cd > 0) p.cd -= dt;
      if (sim.freeze > 0) sim.freeze -= dt;

      // la fusée
      var dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      p.x = clamp(p.x + dx * 200 * dt, 16, W - 16); p.y = clamp(p.y + dy * 120 * dt, yMin, yMax);
      p.tilt += (dx - p.tilt) * (1 - Math.exp(-12 * dt));
      if (dx) p.facing = dx;
      // tir : maintenir la touche ; l'étoile-shuriken donne un tir en éventail
      if ((attackNow || (throwNow && p.power > 0)) && p.cd <= 0 && sim.bullets.length < (p.power > 0 ? 12 : 6)) {
        p.cd = p.power > 0 ? 0.16 : 0.2;
        (p.power > 0 ? [-1, 0, 1] : [0]).forEach(function (fan) { sim.bullets.push({ x: p.x + fan * 6, y: p.y - 14, vx: fan * 60, vy: -400, power: p.power > 0 }); });
        emit("laser", p.x, p.y - 14);
      }
      if (dogPressed) d.call();
      d.update(dt);

      // vagues : on lance la suivante quand la précédente est finie
      var cur = null;
      for (i = 0; i < waves.length; i++) if (waves[i].state === "run") { cur = waves[i]; break; }
      if (!cur && !sim.victory) {
        var nxt = waves.filter(function (w) { return w.state === "wait"; })[0];
        if (nxt) { sim.gap -= dt; if (sim.gap <= 0) { spawnWave(nxt); sim.gap = 1.6; } }
        else if (waves.every(function (w) { return w.state === "done"; })) { sim.victory = 2.2; emit("clear", p.x, p.y); }
      }
      if (sim.victory > 0) { sim.victory -= dt; if (sim.victory <= 0 && !sim.finished) { sim.finished = true; emit("finish", p.x, p.y); } }

      // la formation
      var f = sim.formation;
      if (f && cur) {
        var alive = aliveEnemies(), frozen = sim.freeze > 0;
        if (f.entering) { f.y += 75 * dt; if (f.y >= f.targetY) { f.y = f.targetY; f.entering = false; } }
        else if (!frozen && alive.length) {
          var total = f.cols * f.rows, mult = 1 + 1.6 * (1 - alive.length / total);
          f.x += f.dir * f.speed * mult * dt;
          var minC = Infinity, maxC = -Infinity, maxR = -Infinity;
          alive.forEach(function (q) { minC = Math.min(minC, q.c); maxC = Math.max(maxC, q.c); maxR = Math.max(maxR, q.r); });
          if (f.x + minC * DX < 22 && f.dir < 0) { f.dir = 1; f.y += 12; }
          else if (f.x + maxC * DX > W - 22 && f.dir > 0) { f.dir = -1; f.y += 12; }
          if (f.y + maxR * DY >= dangerY) { // la formation est arrivée en bas : elle remonte (un cœur de moins), elle ne gagne jamais d'un coup
            f.y = Math.max(f.targetY - 10, f.y - 78); sim.breach++; emit("breach", p.x, dangerY); hurtPlayer(1);
          }
        }
        placeFormation();
        // les bombes : le plus bas de chaque colonne lâche, de temps en temps
        if (!f.entering && !frozen && alive.length) {
          f.fireT -= dt * (cur.spec.fire || 0.6) * (1 + 0.8 * (1 - alive.length / (f.cols * f.rows)));
          if (f.fireT <= 0) {
            f.fireT = 0.8 + rnd() * 0.7;
            var bottoms = {};
            alive.forEach(function (q) { if (!bottoms[q.c] || q.r > bottoms[q.c].r) bottoms[q.c] = q; });
            var keys = Object.keys(bottoms), nb = Math.min(keys.length, cur.spec.volley || 1);
            for (var vb = 0; vb < nb; vb++) { // une salve : plusieurs colonnes lâchent d'un coup
              var ki = Math.floor(rnd() * keys.length), q2 = bottoms[keys[ki]];
              keys.splice(ki, 1);
              if (q2) dropBomb(q2.x, q2.y + 8, KINDS[q2.kind].aim && rnd() < 0.7);
            }
          }
        }
      }
      sim.enemies.forEach(function (q) { if (q.flash > 0) q.flash -= dt; });

      // le gardien (vague finale du niveau 10) : il va et vient en haut, lâche des rafales et des bombes visées
      var B = sim.boss;
      if (B && B.alive && cur) {
        if (B.flash > 0) B.flash -= dt;
        if (B.y < B.sy) B.y += 60 * dt;
        else if (sim.freeze <= 0) {
          B.x += B.dir * B.speed * (1 + (1 - B.hp / B.maxHp)) * dt;
          if (B.x > W - 50) B.dir = -1; else if (B.x < 50) B.dir = 1;
          B.cd -= dt;
          if (B.cd <= 0) {
            var ph = B.hp / B.maxHp < 0.34 ? 2 : B.hp / B.maxHp < 0.67 ? 1 : 0; B.phase = ph;
            B.cd = [1.9, 1.5, 1.15][ph];
            [-1, 0, 1].slice(ph === 0 ? 1 : 0, ph === 2 ? 3 : 3).forEach(function (o) { sim.bombs.push({ x: B.x + o * 22, y: B.y + 18, vx: o * (ph ? 34 : 14), vy: 120 }); });
            emit("bomb", B.x, B.y + 18);
            if (ph === 2) dropBomb(B.x, B.y + 18, true, 150);
          }
        }
      }

      // la soucoupe-mystère : elle traverse le haut de l'écran, son butin est un cœur ou une étoile
      if (cur || sim.victory) {
        sim.ufoT -= dt;
        if (sim.ufoT <= 0 && !sim.ufo) { var left = rnd() < 0.5; sim.ufo = { x: left ? -20 : W + 20, y: 20, vx: left ? 85 : -85, hp: 2, alive: true, flash: 0 }; sim.ufoT = def.ufoEvery || 22; emit("ufo", sim.ufo.x, 20); }
      }
      if (sim.ufo) {
        var U = sim.ufo; U.x += U.vx * dt; if (U.flash > 0) U.flash -= dt;
        if (U.x < -40 || U.x > W + 40) sim.ufo = null;
      }

      // nos tirs
      for (i = sim.bullets.length - 1; i >= 0; i--) {
        b = sim.bullets[i]; b.x += (b.vx || 0) * dt; b.y += b.vy * dt;
        var gone = b.y < -10 || b.x < -10 || b.x > W + 10;
        for (var j = 0; j < sim.enemies.length && !gone; j++) {
          e = sim.enemies[j];
          if (e.alive && hit(b.x, b.y, 9, 12, e.x, e.y, e.w, e.h)) { damage(e, 1); gone = true; }
        }
        if (!gone && B && B.alive && hit(b.x, b.y, 9, 12, B.x, B.y, B.w, B.h)) {
          B.hp -= 1; B.flash = 0.1; gone = true; emit("hit", b.x, b.y);
          if (B.hp <= 0) { B.alive = false; emit("kill", B.x, B.y); emit("boom", B.x, B.y); sim.enemies.forEach(function (q) { if (q.alive) killEnemy(q, true); }); }
        }
        if (!gone && sim.ufo && sim.ufo.alive && hit(b.x, b.y, 9, 12, sim.ufo.x, sim.ufo.y, 28, 14)) {
          sim.ufo.hp -= 1; sim.ufo.flash = 0.12; gone = true;
          if (sim.ufo.hp <= 0) { sim.items.push({ x: sim.ufo.x, y: sim.ufo.y, vy: 60, kind: "heart", got: false }); emit("kill", sim.ufo.x, sim.ufo.y); sim.ufo = null; }
          else emit("hit", b.x, b.y);
        }
        if (gone) sim.bullets.splice(i, 1);
      }
      // leurs bombes
      for (i = sim.bombs.length - 1; i >= 0; i--) {
        b = sim.bombs[i]; if (!b) continue; // (un K.O. en cours de boucle remet le niveau à zéro : la liste des bombes est une autre)
        b.x += (b.vx || 0) * dt; b.y += b.vy * dt;
        var dead = b.y > H + 10 || b.x < -10 || b.x > W + 10;
        for (var k2 = 0; k2 < sim.shields.length && !dead; k2++) {
          var sh = sim.shields[k2];
          if (sh.alive && hit(b.x, b.y, 4, 8, sh.x, sh.y, sh.s, sh.s)) { sh.hp -= 1; if (sh.hp <= 0) sh.alive = false; dead = true; emit("shield", sh.x, sh.y); }
        }
        if (!dead && hit(b.x, b.y, 5, 9, p.x, p.y - 6, 18, 16)) { dead = true; hurtPlayer(1); }
        if (dead) sim.bombs.splice(i, 1);
      }
      // le butin tombe : on le prend en passant dessus
      for (i = sim.items.length - 1; i >= 0; i--) {
        var it = sim.items[i]; if (!it) continue;
        it.y += it.vy * dt;
        if (!it.got && hit(it.x, it.y, 12, 12, p.x, p.y - 6, 20, 18)) pickup(it);
        if (it.got || it.y > H + 12) sim.items.splice(i, 1);
      }

      // vague terminée ?
      if (cur) {
        var left2 = aliveEnemies().length === 0 && (!sim.boss || !sim.boss.alive || !cur.spec.boss);
        if (left2) { cur.state = "done"; sim.formation = null; sim.bombs.length = 0; if (cur.spec.boss) sim.boss = null; }
      }
    }

    sim.step = function (input, dt) {
      var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (var i = 0; i < n; i++) stepOnce(input || {}, h);
    };
    sim.progress = function () {
      var done = waves.filter(function (w) { return w.state === "done"; }).length, cur = waves.filter(function (w) { return w.state === "run"; })[0], frac = 0;
      if (cur) { var tot = (cur.spec.cols || 5) * (cur.spec.rows || 2); frac = 1 - aliveEnemies().length / tot; }
      return clamp((done + frac) / Math.max(1, waves.length), 0, 1);
    };
    sim.nearestThreat = function () {
      var best = Infinity;
      sim.bombs.forEach(function (q) { best = Math.min(best, Math.abs(q.x - p.x) + Math.abs(q.y - p.y) * 0.5); });
      aliveEnemies().forEach(function (q) { best = Math.min(best, (Math.abs(q.x - p.x) + Math.abs(q.y - p.y)) * 0.8); });
      return best;
    };
    sim.battle = function () { return waves.some(function (w) { return w.state === "run"; }); };
    sim.startY = yMax - 8;
    return sim;
  }

  /** Le robot de test : il se place sous l'envahisseur le plus bas (de préférence « doré »), tire sans arrêt, esquive les bombes et appelle Laita quand ça se complique. */
  function invadersBot(sim) {
    var p = sim.player;
    return function () {
      var inp = { left: false, right: false, up: false, down: false, attack: true, dog: false, throw: false };
      // esquive : une bombe qui arrive sur nous
      var danger = null;
      sim.bombs.forEach(function (b) { if (b.y < p.y && p.y - b.y < 90 && Math.abs(b.x + b.vx * 0.3 - p.x) < 16 && (!danger || b.y > danger.y)) danger = b; });
      if (danger) { inp.left = danger.x >= p.x; inp.right = !inp.left; if (p.x < 40) { inp.left = false; inp.right = true; } if (p.x > sim.w - 40) { inp.right = false; inp.left = true; } }
      else {
        var targets = sim.enemies.filter(function (e) { return e.alive; });
        if (sim.boss && sim.boss.alive && !targets.length) targets = [sim.boss];
        var best = null;
        targets.forEach(function (e) { var s = (e.coin ? 0 : 40) - e.y * 0.3 + Math.abs(e.x - p.x) * 0.5; if (!best || s < best.s) best = { e: e, s: s }; });
        if (best) { // on vise un peu devant la cible (le temps que le tir monte, la formation s'est déplacée)
          var f = sim.formation, tf = (p.y - best.e.y) / 400, lead = f && !f.entering && sim.freeze <= 0 ? f.dir * f.speed * (1 + 1.6 * (1 - sim.enemies.filter(function (q) { return q.alive; }).length / (f.cols * f.rows))) * tf : 0;
          var dxx = best.e.x + lead - p.x; if (Math.abs(dxx) > 4) { inp.right = dxx > 0; inp.left = dxx < 0; }
        }
        if (sim.ufo && !best) { var du = sim.ufo.x - p.x; inp.right = du > 5; inp.left = du < -5; }
      }
      if (sim.dog.cd <= 0 && (sim.bombs.length >= 5 || p.hp <= 2 || sim.breach > 0 && sim.formation && sim.formation.y > 150)) inp.dog = true;
      return inp;
    };
  }

  S.createInvaders = createInvaders;
  S.invadersBot = invadersBot;
  S.INVADERS = { KINDS: KINDS, DX: DX, DY: DY };
})();
