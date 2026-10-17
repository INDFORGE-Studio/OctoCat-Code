/* OctoCat-Code — Simulation des parcours (phase « trajet » entre les énigmes).
 * Module PUR : aucune dépendance au navigateur ni à KAPLAY, donc testable sous Node (des « bots » parcourent
 * chaque niveau dans dev/tests/courses.test.js pour prouver qu'il est faisable).
 *
 * Deux modes, mêlant les classiques du jeu vidéo :
 *   « platform » : plateformes à la Mario (saut, écrasement), Castlevania (fouet, bougies, chauves-souris, pics)
 *                  et Shinobi (double saut, shuriken) ; les capacités s'activent par niveau.
 *   « brawl »    : beat'em up à la Double Dragon (déplacement en profondeur, enchaînement de coups,
 *                  vagues d'ennemis qui verrouillent l'écran).
 * Les parcours « platform » se décrivent avec un petit langage de segments (voir buildCourse).
 */
(function () {
  "use strict";

  var TILE = 32, ROWS = 10;

  /* Réglages du « feeling » (px, secondes). Saut maximal ≈ 80 px (2,5 tuiles), portée ≈ 90 px (2,8 tuiles). */
  var CFG = {
    speed: 132, accelGround: 1600, accelAir: 1000, friction: 2400,
    gravity: 1150, fallGravity: 1700, jumpV: 430, doubleJumpV: 400, jumpCut: 0.5, maxFall: 640, bounceV: 330,
    coyote: 0.1, buffer: 0.12, hpMax: 5, invTime: 1.3,
    meleeReach: 38, whipReach: 52, swingTime: 0.28, swingCooldown: 0.34,
    shurikenSpeed: 330, shurikenLife: 0.9, shurikenCooldown: 0.3, shurikenMax: 2,
    starTime: 6, powerTime: 14, powerCooldown: 0.24, powerMax: 9 // cœur à pleine vie = invincibilité ; étoile des caisses = shuriken puissant
  };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function overlap(a, b) { return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t; }

  /* ======================================================================
   * 1. Parcours « platform » : langage de segments -> grille de caractères
   *    flat  {n, en, tough, hop, dash, fly, bits, candles, spikes, cp}  n colonnes de sol à la hauteur courante
   *          en = marcheur, tough = costaud (2 PV), hop = sauteur (bondit vers toi), dash = fonceur (charge), fly = chauve-souris (pique)
   *    gap   {n}                                              n colonnes de vide (≤ 2, ≤ 3 avec double saut)
   *    up / down {n}                                          marche de n tuiles (≤ 2)
   *    float {at, w, h, bits}                                 plateforme flottante à h tuiles du sol courant
   *    end   {n}                                              sol final avec le terminal
   *  Les propriétés de `flat` sont des décalages de colonne dans le segment.
   * ==================================================================== */

  function buildCourse(course) {
    var heights = [], feats = {}, floats = [], cur = 2, col = 0, endCol = -1, i;
    function feat(c, ch, up) { (feats[c] = feats[c] || []).push({ ch: ch, up: up || 0 }); }

    course.forEach(function (s) {
      var n = s.n || 0, start = col;
      if (s.t === "up") { cur += s.n; return; }
      if (s.t === "down") { cur -= s.n; return; }
      if (s.t === "float") { floats.push({ col: col + (s.at || 0), w: s.w || 3, h: s.h || 3, base: cur, bits: s.bits !== false }); return; }
      if (s.t === "gap") { for (i = 0; i < n; i++) heights.push(0); col += n; return; }
      // flat / end
      for (i = 0; i < n; i++) heights.push(cur);
      (s.en || []).forEach(function (o) { feat(start + o, "e"); });
      (s.tough || []).forEach(function (o) { feat(start + o, "E"); });
      (s.fly || []).forEach(function (o) { feat(start + o, "f", 3); });
      (s.hop || []).forEach(function (o) { feat(start + o, "h"); });
      (s.dash || []).forEach(function (o) { feat(start + o, "d"); });
      (s.bits || []).forEach(function (o) { feat(start + o, "o", s.bitsUp || 1); });
      (s.candles || []).forEach(function (o) { feat(start + o, "c"); });
      (s.spikes || []).forEach(function (o) { feat(start + o, "^"); });
      if (s.cp != null) feat(start + s.cp, "C");
      if (s.t === "end") { endCol = start + Math.max(1, n - 3); feat(endCol, "T"); }
      col += n;
    });

    var cols = col, rows = [];
    for (var r = 0; r < ROWS; r++) { rows.push([]); for (var c = 0; c < cols; c++) rows[r].push(" "); }
    function put(c, r, ch) { if (r >= 0 && r < ROWS && c >= 0 && c < cols) rows[r][c] = ch; }
    for (var c2 = 0; c2 < cols; c2++) for (var h = 0; h < heights[c2]; h++) put(c2, ROWS - 1 - h, "#");
    floats.forEach(function (f) {
      var top = ROWS - heights[clamp(f.col, 0, cols - 1)] - f.h; // rangée de la plateforme
      for (var k = 0; k < f.w; k++) put(f.col + k, top, "=");
      if (f.bits) for (var b = 0; b < f.w; b++) put(f.col + b, top - 1, "o");
    });
    for (var c3 in feats) {
      c3 = +c3;
      var groundTop = ROWS - heights[c3]; // première rangée pleine
      feats[c3].forEach(function (f) { put(c3, groundTop - 1 - (f.ch === "o" || f.ch === "f" ? f.up - 1 : 0), f.ch); });
    }
    put(2, ROWS - heights[2] - 1, "S");
    return rows.map(function (r) { return r.join(""); });
  }

  /* ======================================================================
   * 2. Simulation « platform »
   * ==================================================================== */

  function createPlatform(rows, abilities) {
    var ab = abilities || {};
    var cols = rows[0].length, R = rows.length;
    var sim = {
      mode: "platform", w: cols * TILE, h: R * TILE, abilities: ab, time: 0, finished: false,
      events: [], stats: { bits: 0, bitsTotal: 0, deaths: 0, kills: 0 },
      enemies: [], bits: [], candles: [], items: [], spikes: [], checkpoints: [], shurikens: [], terminal: null,
      player: null, cp: null, solid: []
    };
    var spawn = { x: TILE * 2.5, y: TILE * 7 };

    for (var ty = 0; ty < R; ty++) {
      sim.solid.push([]);
      for (var tx = 0; tx < cols; tx++) {
        var ch = rows[ty].charAt(tx), cx = tx * TILE + TILE / 2, by = (ty + 1) * TILE;
        sim.solid[ty].push(ch === "#" || ch === "=");
        if (ch === "S") spawn = { x: cx, y: by };
        else if (ch === "e" || ch === "E") sim.enemies.push({ type: ch === "E" ? "tough" : "walker", x: cx, y: by, w: 22, h: 28, vx: 0, vy: 0, dir: -1, hp: ch === "E" ? 2 : 1, hurt: 0, alive: true, tx: tx });
        else if (ch === "h") sim.enemies.push({ type: "hopper", x: cx, y: by, w: 22, h: 24, vx: 0, vy: 0, dir: -1, hp: 1, hurt: 0, alive: true, hopT: 0.5 + (tx % 3) * 0.3, onG: false });
        else if (ch === "d") sim.enemies.push({ type: "dasher", x: cx, y: by, w: 22, h: 28, vx: 0, vy: 0, dir: -1, hp: 2, hurt: 0, alive: true, mode: "walk", t: 0, cd: 0.8 + (tx % 3) * 0.3 });
        else if (ch === "f") sim.enemies.push({ type: "flyer", x: cx, y: by - TILE, w: 22, h: 16, y0: by - TILE, x0: cx, t: tx * 0.7, hp: 1, hurt: 0, alive: true, dir: 1, vx: 0, vy: 0, mode: null, cd: 1.5 + (tx % 4) * 0.5 });
        else if (ch === "o") { sim.bits.push({ x: cx, y: by - 14, got: false }); sim.stats.bitsTotal++; }
        else if (ch === "c") sim.candles.push({ x: cx, y: by, alive: true });
        else if (ch === "^") sim.spikes.push({ l: tx * TILE + 5, r: tx * TILE + TILE - 5, t: ty * TILE + 16, b: by });
        else if (ch === "C") sim.checkpoints.push({ x: cx, y: by, on: false });
        else if (ch === "T") sim.terminal = { l: tx * TILE - 8, r: tx * TILE + TILE + 8, t: ty * TILE - TILE, b: by, x: cx, y: by };
      }
    }
    sim.cp = { x: spawn.x, y: spawn.y };
    var p = sim.player = {
      x: spawn.x, y: spawn.y, w: 18, h: 34, vx: 0, vy: 0, facing: 1, onGround: false, hp: CFG.hpMax, inv: 0,
      coyote: 0, buffer: 0, jumps: 0, cut: false, swing: 0, swingCd: 0, swingHit: null, throwCd: 0, stomp: 0, star: 0, power: 0
    };
    var prev = { jump: false, attack: false, throw: false };

    function isSolid(tx2, ty2) {
      if (tx2 < 0 || tx2 >= cols) return true; // murs invisibles aux deux bouts
      if (ty2 < 0) return false;
      if (ty2 >= R) return false;
      return sim.solid[ty2][tx2];
    }
    function rectOf(b) { return { l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.h, b: b.y }; }
    function emit(t, x, y, extra) { sim.events.push({ t: t, x: x, y: y, extra: extra }); }

    /** Déplace un corps en résolvant les collisions avec la grille ; renvoie { hitX, hitY, landed }. */
    function move(b, dx, dy) {
      var res = { hitX: false, landed: false, bonk: false }, tx0, tx1, ty0, ty1, a, c;
      b.x += dx;
      tx0 = Math.floor((b.x - b.w / 2) / TILE); tx1 = Math.floor((b.x + b.w / 2 - 0.001) / TILE);
      ty0 = Math.floor((b.y - b.h) / TILE); ty1 = Math.floor((b.y - 0.001) / TILE);
      for (a = ty0; a <= ty1; a++) {
        for (c = tx0; c <= tx1; c++) {
          if (!isSolid(c, a)) continue;
          if (dx > 0) b.x = c * TILE - b.w / 2; else if (dx < 0) b.x = (c + 1) * TILE + b.w / 2;
          res.hitX = true;
          tx0 = Math.floor((b.x - b.w / 2) / TILE); tx1 = Math.floor((b.x + b.w / 2 - 0.001) / TILE);
        }
      }
      b.y += dy;
      tx0 = Math.floor((b.x - b.w / 2) / TILE); tx1 = Math.floor((b.x + b.w / 2 - 0.001) / TILE);
      ty0 = Math.floor((b.y - b.h) / TILE); ty1 = Math.floor((b.y - 0.001) / TILE);
      for (a = ty0; a <= ty1; a++) {
        for (c = tx0; c <= tx1; c++) {
          if (!isSolid(c, a)) continue;
          if (dy > 0) { b.y = a * TILE; res.landed = true; } else if (dy < 0) { b.y = (a + 1) * TILE + b.h; res.bonk = true; }
          b.vy = 0;
          ty0 = Math.floor((b.y - b.h) / TILE); ty1 = Math.floor((b.y - 0.001) / TILE);
        }
      }
      return res;
    }

    function groundAt(x, y) { return isSolid(Math.floor(x / TILE), Math.floor((y + 2) / TILE)); }

    function respawn(fell) {
      sim.stats.deaths++;
      emit(fell ? "fall" : "die", p.x, p.y);
      // une chute coûte une vie (un cœur) ; à 0 cœur on repart avec tous les cœurs
      if (fell) { if (!sim.relax) { p.hp -= 1; if (p.hp <= 0) p.hp = CFG.hpMax; } } else p.hp = CFG.hpMax;
      p.x = sim.cp.x; p.y = sim.cp.y; p.vx = 0; p.vy = 0; p.inv = 1.5; p.swing = 0;
    }
    function hurtPlayer(fromX, amount) {
      if (p.inv > 0 || p.star > 0 || sim.relax) return; // mode détente ou invincibilité : aucun dégât
      p.hp -= amount || 1; p.inv = CFG.invTime;
      p.vx = (p.x < fromX ? -1 : 1) * 180; p.vy = -230; p.onGround = false;
      emit("hurt", p.x, p.y - 16);
      if (p.hp <= 0) respawn(false);
    }
    function hurtEnemy(e, dmg, dir) {
      if (!e.alive) return;
      e.hp -= dmg; e.hurt = 0.25; e.vx = dir * 160;
      if (e.hp <= 0) { e.alive = false; sim.stats.kills++; emit("kill", e.x, e.y - e.h / 2); }
      else emit("hit", e.x, e.y - e.h / 2);
    }
    function breakCandle(cd) {
      cd.alive = false; emit("candle", cd.x, cd.y - 12);
      if (ab.shuriken && sim.candles.indexOf(cd) % 3 === 1) sim.items.push({ x: cd.x, y: cd.y - 10, kind: "power", got: false });
      else if (((cd.x | 0) % 3) === 0) sim.items.push({ x: cd.x, y: cd.y - 10, kind: "heart", got: false });
      else { sim.bits.push({ x: cd.x, y: cd.y - 14, got: false }); sim.stats.bitsTotal++; }
    }

    /** Ramasse un objet : cœur (+1 vie ; à pleine vie : invincibilité) ou étoile (shuriken puissant). */
    function pickup(it) {
      it.got = true;
      if (it.kind === "power") { p.power = CFG.powerTime; emit("power", it.x, it.y); }
      else if (p.hp >= CFG.hpMax) { p.star = CFG.starTime; emit("star", it.x, it.y); }
      else { p.hp = Math.min(CFG.hpMax, p.hp + 1); emit("heart", it.x, it.y); }
    }

    function stepOnce(inp, dt) {
      var dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), i, e;
      var jumpPressed = !!inp.jump && !prev.jump, attackPressed = !!inp.attack && !prev.attack, throwPressed = !!inp.throw && !prev.throw;
      prev.jump = !!inp.jump; prev.attack = !!inp.attack; prev.throw = !!inp.throw;
      sim.time += dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.swingCd > 0) p.swingCd -= dt;
      if (p.throwCd > 0) p.throwCd -= dt;
      if (p.star > 0) p.star -= dt;
      if (p.power > 0) p.power -= dt;

      // --- mouvement horizontal ---
      var target = dir * CFG.speed, acc = dir === 0 ? CFG.friction : (p.onGround ? CFG.accelGround : CFG.accelAir);
      if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt); else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
      if (dir !== 0) p.facing = dir;

      // --- saut (délai de grâce, tampon, saut variable, double saut) ---
      p.coyote = p.onGround ? CFG.coyote : p.coyote - dt;
      p.buffer = jumpPressed ? CFG.buffer : p.buffer - dt;
      if (p.buffer > 0 && p.coyote > 0) {
        p.vy = -CFG.jumpV; p.coyote = 0; p.buffer = 0; p.onGround = false; p.jumps = 1; p.cut = false;
        emit("jump", p.x, p.y);
      } else if (jumpPressed && !p.onGround && ab.doubleJump && p.jumps < 2 && p.coyote <= 0) {
        p.vy = -CFG.doubleJumpV; p.jumps = 2; p.cut = false; emit("djump", p.x, p.y);
      }
      if (!inp.jump && p.vy < 0 && !p.cut) { p.vy *= CFG.jumpCut; p.cut = true; }
      p.vy = Math.min(CFG.maxFall, p.vy + (p.vy > 0 ? CFG.fallGravity : CFG.gravity) * dt);

      var wasGround = p.onGround;
      var r = move(p, p.vx * dt, p.vy * dt);
      if (r.hitX) p.vx = 0;
      p.onGround = r.landed;
      if (r.landed) { p.jumps = 0; if (!wasGround) emit("land", p.x, p.y); }
      p.x = clamp(p.x, p.w / 2, sim.w - p.w / 2);

      // --- attaque au corps à corps (épée / fouet) ---
      if (attackPressed && p.swingCd <= 0) { p.swing = CFG.swingTime; p.swingCd = CFG.swingCooldown; p.swingHit = {}; emit("swing", p.x, p.y - 20); }
      if (p.swing > 0) {
        p.swing -= dt;
        var t = CFG.swingTime - p.swing;
        if (t > 0.05 && t < 0.2) {
          var reach = ab.whip ? CFG.whipReach : CFG.meleeReach, x0 = p.facing > 0 ? p.x + 4 : p.x - 4 - reach;
          var box = { l: x0, r: x0 + reach, t: p.y - 32, b: p.y - 2 };
          for (i = 0; i < sim.enemies.length; i++) {
            e = sim.enemies[i];
            if (e.alive && !p.swingHit["e" + i] && overlap(box, rectOf(e))) { p.swingHit["e" + i] = true; hurtEnemy(e, 1, p.facing); }
          }
          for (i = 0; i < sim.candles.length; i++) {
            var cd = sim.candles[i];
            if (cd.alive && overlap(box, { l: cd.x - 6, r: cd.x + 6, t: cd.y - 24, b: cd.y })) breakCandle(cd);
          }
        }
      }

      // --- shuriken (Shinobi) ---
      var powered = p.power > 0;
      if ((ab.shuriken || powered) && throwPressed && p.throwCd <= 0 && sim.shurikens.length < (powered ? CFG.powerMax : CFG.shurikenMax)) {
        p.throwCd = powered ? CFG.powerCooldown : CFG.shurikenCooldown;
        (powered ? [-1, 0, 1] : [0]).forEach(function (fan) {
          sim.shurikens.push({ x: p.x + p.facing * 12, y: p.y - 20, vx: p.facing * CFG.shurikenSpeed * (powered ? 1.15 : 1), vy: fan * 70, life: powered ? 1.1 : CFG.shurikenLife, power: powered, hits: {} });
        });
        emit("throw", p.x, p.y - 20);
      }
      for (i = sim.shurikens.length - 1; i >= 0; i--) {
        var s = sim.shurikens[i], dead = false;
        s.x += s.vx * dt; s.y += (s.vy || 0) * dt; s.life -= dt;
        if (s.life <= 0 || isSolid(Math.floor(s.x / TILE), Math.floor(s.y / TILE))) dead = true;
        for (var j = 0; j < sim.enemies.length && !dead; j++) {
          e = sim.enemies[j];
          if (e.alive && overlap({ l: s.x - 5, r: s.x + 5, t: s.y - 5, b: s.y + 5 }, rectOf(e))) {
            if (s.power) { if (!s.hits[j]) { s.hits[j] = true; hurtEnemy(e, 2, s.vx > 0 ? 1 : -1); } } // le shuriken puissant traverse
            else { hurtEnemy(e, 1, s.vx > 0 ? 1 : -1); dead = true; }
          }
        }
        for (var m = 0; m < sim.candles.length && !dead; m++) {
          var cc = sim.candles[m];
          if (cc.alive && overlap({ l: s.x - 5, r: s.x + 5, t: s.y - 5, b: s.y + 5 }, { l: cc.x - 6, r: cc.x + 6, t: cc.y - 24, b: cc.y })) { breakCandle(cc); dead = true; }
        }
        if (dead) sim.shurikens.splice(i, 1);
      }

      // --- ennemis ---
      var pr = rectOf(p);
      for (i = 0; i < sim.enemies.length; i++) {
        e = sim.enemies[i];
        if (!e.alive) continue;
        if (e.hurt > 0) e.hurt -= dt;
        if (e.type === "flyer") {
          e.t += dt * 2.2;
          if (e.cd > 0) e.cd -= dt;
          if (e.mode === "dive") { // pique sur le joueur, puis remonte
            e.dive -= dt;
            var fx = e.tx - e.x, fy = e.ty - e.y, fd = Math.sqrt(fx * fx + fy * fy) || 1;
            if (e.dive > 0 && fd > 6) { e.x += fx / fd * 150 * dt; e.y += fy / fd * 150 * dt; } else e.mode = "back";
          } else if (e.mode === "back") {
            var bx = e.x0 - e.x, by = e.y0 + Math.sin(e.t) * 22 - e.y, bd = Math.sqrt(bx * bx + by * by) || 1;
            if (bd > 5) { e.x += bx / bd * 95 * dt; e.y += by / bd * 95 * dt; } else { e.mode = null; e.cd = 2.8; }
          } else {
            if (e.hurt <= 0) e.x += e.dir * 46 * dt;
            if (Math.abs(e.x - e.x0) > 90) e.dir = -e.dir;
            e.y = e.y0 + Math.sin(e.t) * 22;
            if (e.cd <= 0 && e.hurt <= 0 && Math.abs(p.x - e.x) < 85 && p.y - e.y > 4 && p.y - e.y < 150) { e.mode = "dive"; e.tx = p.x; e.ty = p.y - 14; e.dive = 0.8; }
          }
        } else if (e.type === "hopper") { // bondit vers le joueur quand il est proche
          e.vy = Math.min(CFG.maxFall, e.vy + CFG.gravity * dt);
          if (e.hurt <= 0) {
            e.hopT -= dt;
            if (e.onG && e.hopT <= 0 && Math.abs(p.x - e.x) < 230) { e.dir = p.x >= e.x ? 1 : -1; e.vy = -300; e.vx = e.dir * 92; e.hopT = 1 + (i % 3) * 0.2; }
          }
          var hr = move(e, e.vx * dt, e.vy * dt);
          e.onG = hr.landed;
          if (hr.hitX) e.vx = 0;
          if (e.onG) e.vx *= e.hurt > 0 ? 0.9 : 0;
          if (e.y > sim.h + 200) e.alive = false;
        } else if (e.type === "dasher") { // patrouille, prévient (il clignote), puis fonce
          e.vy = Math.min(CFG.maxFall, e.vy + CFG.gravity * dt);
          var dsp = 0;
          if (e.hurt > 0) dsp = e.vx;
          else if (e.mode === "wind") { e.t -= dt; if (e.t <= 0) { e.mode = "dash"; e.t = 0.42; } }
          else if (e.mode === "dash") { e.t -= dt; dsp = e.dir * 175; if (e.t <= 0) { e.mode = "walk"; e.cd = 1.8; } }
          else {
            e.cd -= dt; dsp = e.dir * 44;
            var seen = (p.x - e.x) * e.dir;
            if (Math.abs(p.x - e.x) < 170 && Math.abs(p.y - e.y) < 40) { e.dir = p.x >= e.x ? 1 : -1; dsp = e.dir * 44; }
            if (e.cd <= 0 && seen > 0 && seen < 140 && Math.abs(p.y - e.y) < 40) { e.mode = "wind"; e.t = 0.38; }
          }
          var dr = move(e, dsp * dt, e.vy * dt);
          if (e.hurt > 0) e.vx *= 0.9;
          if (e.hurt <= 0) {
            if (dr.hitX) { e.dir = -e.dir; if (e.mode === "dash") { e.mode = "walk"; e.cd = 1.4; } }
            else if (dr.landed && !groundAt(e.x + e.dir * (e.w / 2 + 4), e.y)) { e.dir = -e.dir; if (e.mode === "dash") { e.mode = "walk"; e.cd = 1.4; } }
          }
          if (e.y > sim.h + 200) e.alive = false;
        } else {
          var speed = e.hurt > 0 ? e.vx : e.dir * (e.type === "tough" ? 40 : 46);
          e.vy = Math.min(CFG.maxFall, e.vy + CFG.gravity * dt);
          if (e.hurt <= 0 && Math.abs(p.x - e.x) < 110 && Math.abs(p.y - e.y) < 30) speed = (p.x >= e.x ? 1 : -1) * Math.abs(speed); // se tourne vers le joueur
          var er = move(e, speed * dt, e.vy * dt);
          if (e.hurt > 0) e.vx *= 0.9;
          if (er.hitX && e.hurt <= 0) e.dir = -e.dir;
          else if (er.landed && e.hurt <= 0 && !groundAt(e.x + Math.sign(speed || e.dir) * (e.w / 2 + 4), e.y)) e.dir = -e.dir;
          else if (e.hurt <= 0 && speed !== 0) e.dir = Math.sign(speed);
          if (e.y > sim.h + 200) e.alive = false;
        }
        var er2 = rectOf(e);
        if (overlap(pr, er2)) {
          if (p.star > 0) { hurtEnemy(e, 9, p.facing); emit("stomp", e.x, e.y - e.h); }
          else if (p.vy > 60 && p.y - p.vy * dt <= e.y - e.h + 14) { // écrasement (Mario)
            hurtEnemy(e, 1, p.facing); p.vy = -CFG.bounceV; p.jumps = 1; emit("stomp", e.x, e.y - e.h);
          } else hurtPlayer(e.x, 1);
        }
      }

      // --- pics, bits, cœurs, point de contrôle, terminal ---
      for (i = 0; i < sim.spikes.length; i++) if (p.star <= 0 && overlap(pr, sim.spikes[i])) { hurtPlayer(p.x, 1); p.vy = -260; }
      for (i = 0; i < sim.bits.length; i++) {
        var bt = sim.bits[i];
        if (!bt.got && overlap(pr, { l: bt.x - 8, r: bt.x + 8, t: bt.y - 8, b: bt.y + 8 })) { bt.got = true; sim.stats.bits++; emit("bit", bt.x, bt.y); }
      }
      for (i = 0; i < sim.items.length; i++) {
        var it = sim.items[i];
        if (!it.got && overlap(pr, { l: it.x - 8, r: it.x + 8, t: it.y - 8, b: it.y + 8 })) pickup(it);
      }
      for (i = 0; i < sim.checkpoints.length; i++) {
        var ck = sim.checkpoints[i];
        if (!ck.on && p.x > ck.x) { ck.on = true; sim.cp = { x: ck.x, y: ck.y }; emit("checkpoint", ck.x, ck.y); }
      }
      if (p.y > sim.h + 120) respawn(true);
      if (sim.terminal && !sim.finished && overlap(pr, sim.terminal)) { sim.finished = true; emit("finish", p.x, p.y); }
    }

    /** Avance de `dt` secondes (découpé en pas fixes de 1/120 s pour la stabilité). */
    sim.step = function (input, dt) {
      var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (var i = 0; i < n; i++) stepOnce(input || {}, h);
    };
    sim.progress = function () { return clamp(p.x / sim.w, 0, 1); };
    sim.nearestThreat = function () {
      var best = Infinity;
      sim.enemies.forEach(function (e) { if (e.alive) best = Math.min(best, Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 0.5); });
      return best;
    };
    return sim;
  }

  /* ======================================================================
   * 3. Simulation « brawl » (Double Dragon)
   *    def = { length, waves:[{ at, enemies:[[kind, side], …] }], crates:[{ x, y, kind, drop }], yMin, yMax }
   *    kinds : grunt (3 PV), fast (2 PV, rapide), heavy (6 PV, lent, coups forts),
   *            ninja (2 PV, bondit sur toi après avoir prévenu), slinger (2 PV, reste à distance et lance des bouteilles)
   *    crates : "crate" (en bois, cassable, laisse tomber drop = "heart" | "power") ou "block" (benne : obstacle fixe) ;
   *             ils bloquent joueur et ennemis ; on peut sauter dessus.
   * ==================================================================== */

  var KINDS = {
    grunt: { hp: 3, speed: 56, reach: 34, windup: 0.38, cd: 1.2, dmg: 1 },
    fast: { hp: 2, speed: 90, reach: 32, windup: 0.28, cd: 0.92, dmg: 1 },
    heavy: { hp: 6, speed: 38, reach: 40, windup: 0.55, cd: 1.55, dmg: 2 },
    ninja: { hp: 2, speed: 66, reach: 30, windup: 0.3, cd: 1.3, dmg: 1, lunge: true },
    slinger: { hp: 2, speed: 50, reach: 28, windup: 0.34, cd: 2.0, dmg: 1, ranged: true }
  };

  function createBrawl(def, viewW) {
    viewW = viewW || 600;
    var L = def.length, yMin = def.yMin || 262, yMax = def.yMax || 332, hpMax = def.hpMax || 6;
    var waves = (def.waves || []).map(function (w, i) { return { at: w.at, spec: w.enemies, started: false, done: false, idx: i }; });
    var sim = {
      mode: "brawl", w: L, h: 360, yMin: yMin, yMax: yMax, viewW: viewW, time: 0, finished: false, events: [],
      enemies: [], items: [], lock: null, goT: 0, stats: { deaths: 0, kills: 0, bits: 0, bitsTotal: 0 },
      terminal: { x: L - 40, y: (yMin + yMax) / 2 }, waves: waves, abilities: {}, shots: [], stars: []
    };
    sim.crates = (def.crates || []).map(function (c, i) {
      var block = c.kind === "block";
      return { x: c.x, y: c.y, kind: block ? "block" : "crate", hp: block ? 999 : 2, w: block ? 44 : 32, d: 12, h: block ? 30 : 26, alive: true, drop: c.drop || null, hit: 0, idx: i };
    });
    sim.stats.crates = 0;
    var p = sim.player = { x: 60, y: (yMin + yMax) / 2, jz: 0, vz: 0, facing: 1, hp: hpMax, hpMax: hpMax, inv: 0, atk: 0, atkCd: 0, combo: 0, comboT: 0, hitDone: false, air: false, star: 0, power: 0, throwCd: 0 };
    var prev = { jump: false, attack: false, throw: false };
    function emit(t, x, y) { sim.events.push({ t: t, x: x, y: y }); }

    function spawnWave(w) {
      var lock = sim.lock;
      w.spec.forEach(function (sp, i) {
        var kind = KINDS[sp[0]] || KINDS.grunt, left = sp[1] === "left";
        var e = {
          kind: sp[0], x: left ? lock.l - 24 - i * 16 : lock.r + 24 + i * 16, y: yMin + 10 + ((i * 29 + w.idx * 13) % (yMax - yMin - 20)),
          hp: kind.hp, maxHp: kind.hp, facing: left ? 1 : -1, cd: 0.8 + i * 0.25, wind: 0, hurt: 0, kb: 0, alive: true, w: 26, wave: w.idx, lunge: 0, lungeHit: false
        };
        sim.enemies.push(e);
      });
    }

    function startWave(w) {
      w.started = true;
      sim.lock = { l: Math.max(0, w.at - viewW * 0.42), r: Math.max(0, w.at - viewW * 0.42) + viewW - 20 };
      spawnWave(w);
      emit("wave", w.at, 0);
    }

    function hurtPlayer(e, dmg) {
      if (p.inv > 0 || p.star > 0 || sim.relax) return; // mode détente ou invincibilité : aucun dégât
      p.hp -= dmg; p.inv = 1.0; emit("hurt", p.x, p.y - 20);
      p.x += (p.x < e.x ? -1 : 1) * 14;
      if (p.hp <= 0) {
        sim.stats.deaths++; emit("die", p.x, p.y);
        var w = waves.filter(function (q) { return q.started && !q.done; })[0];
        p.hp = hpMax; p.inv = 1.5;
        if (w) { // la vague recommence
          sim.enemies = sim.enemies.filter(function (q) { return q.wave !== w.idx; });
          sim.shots.length = 0;
          p.x = sim.lock.l + 70; p.y = (yMin + yMax) / 2;
          spawnWave(w);
        }
      }
    }

    /* ----- caisses : obstacles, cassables, butin ----- */
    /** Repousse un corps (demi-largeur rx, demi-profondeur ry) hors des caisses ; renvoie la caisse touchée et l'axe, ou null. */
    function pushOut(b, rx, ry, jz) {
      var hit = null;
      for (var q = 0; q < sim.crates.length; q++) {
        var c = sim.crates[q];
        if (!c.alive || jz >= c.h - 1) continue; // au-dessus de la caisse : on passe
        var ox = c.w / 2 + rx - Math.abs(b.x - c.x), oy = c.d / 2 + ry - Math.abs(b.y - c.y);
        if (ox > 0 && oy > 0) {
          if (ox < oy) { b.x += (b.x >= c.x ? 1 : -1) * ox; hit = { c: c, axis: "x" }; }
          else { b.y += (b.y >= c.y ? 1 : -1) * oy; hit = { c: c, axis: "y" }; }
        }
      }
      return hit;
    }
    function groundZ(x, y) { // hauteur du sol sous (x, y) : le dessus d'une caisse si on est dessus
      var g = 0;
      for (var q = 0; q < sim.crates.length; q++) {
        var c = sim.crates[q];
        if (c.alive && Math.abs(x - c.x) < c.w / 2 + 3 && Math.abs(y - c.y) < c.d / 2 + 3) g = Math.max(g, c.h);
      }
      return g;
    }
    function breakCrate(c) {
      c.alive = false; sim.stats.crates++;
      emit("crate", c.x, c.y);
      if (c.drop) sim.items.push({ x: c.x, y: c.y, kind: c.drop, got: false });
    }
    function hitCrate(c, dmg) {
      if (!c.alive || c.kind === "block") return false;
      c.hp -= dmg; c.hit = 0.18;
      if (c.hp <= 0) breakCrate(c); else emit("crate-hit", c.x, c.y);
      return true;
    }
    function damageEnemy(e, dmg, knock, stun) {
      e.hp -= dmg; e.hurt = stun; e.kb = knock; e.lunge = 0; e.wind = 0;
      if (e.hp <= 0) { e.alive = false; sim.stats.kills++; emit("kill", e.x, e.y - 20); if ((e.wave + sim.stats.kills) % 3 === 0) sim.items.push({ x: e.x, y: e.y, kind: "heart", got: false }); }
      else emit("hit", e.x, e.y - 22);
    }
    function pickup(it) {
      it.got = true;
      if (it.kind === "power") { p.power = CFG.powerTime; emit("power", it.x, it.y); }
      else if (p.hp >= hpMax) { p.star = CFG.starTime; emit("star", it.x, it.y); }
      else { p.hp = Math.min(hpMax, p.hp + 2); emit("heart", it.x, it.y); }
    }

    function stepOnce(inp, dt) {
      var i, e;
      var jumpPressed = !!inp.jump && !prev.jump, attackPressed = !!inp.attack && !prev.attack, throwPressed = !!inp.throw && !prev.throw;
      prev.jump = !!inp.jump; prev.attack = !!inp.attack; prev.throw = !!inp.throw;
      sim.time += dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.atkCd > 0) p.atkCd -= dt;
      if (p.throwCd > 0) p.throwCd -= dt;
      if (p.star > 0) p.star -= dt;
      if (p.power > 0) p.power -= dt;
      if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
      if (sim.goT > 0) sim.goT -= dt;
      sim.crates.forEach(function (c) { if (c.hit > 0) c.hit -= dt; });

      // déplacement (x et profondeur y), interdit pendant un coup au sol
      var dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      var slow = p.atk > 0 && p.jz <= 0 ? 0.25 : 1;
      if (dx) p.facing = dx;
      p.x += dx * 118 * slow * dt; p.y = clamp(p.y + dy * 74 * slow * dt, yMin, yMax);
      pushOut(p, 7, 4, p.jz);
      p.y = clamp(p.y, yMin, yMax);
      var minX = sim.lock ? sim.lock.l + 14 : 14, maxX = sim.lock ? sim.lock.r - 14 : L - 14;
      p.x = clamp(p.x, minX, maxX);

      // saut : on peut atterrir sur une caisse et en retomber
      var gz = groundZ(p.x, p.y);
      if (jumpPressed && !p.air) { p.vz = 300; p.air = true; emit("jump", p.x, p.y); }
      if (!p.air && p.jz > gz + 0.5) { p.air = true; p.vz = 0; }
      if (p.air) {
        p.vz -= 900 * dt; p.jz += p.vz * dt;
        if (p.jz <= gz && p.vz <= 0) { p.jz = gz; p.vz = 0; p.air = false; emit("land", p.x, p.y); }
      }

      // coups : poing (enchaînement de 3, le dernier plus fort), coup de pied sauté
      if (attackPressed && p.atkCd <= 0) {
        p.atk = 0.3; p.atkCd = p.air ? 0.5 : 0.32; p.hitDone = false;
        p.combo = p.comboT > 0 ? p.combo + 1 : 1; p.comboT = 0.7; if (p.combo > 3) p.combo = 1;
        emit("swing", p.x, p.y - 22);
      }
      if (p.atk > 0) {
        p.atk -= dt;
        if (!p.hitDone && p.atk < 0.22) {
          p.hitDone = true;
          var reach = p.air ? 46 : 40, big = !p.air && p.combo === 3, dmg = p.air ? 2 : (big ? 2 : 1);
          for (i = 0; i < sim.enemies.length; i++) {
            e = sim.enemies[i];
            var fx = (e.x - p.x) * p.facing;
            if (e.alive && fx > -6 && fx < reach + e.w / 2 && Math.abs(e.y - p.y) < 16) damageEnemy(e, dmg, p.facing * (big ? 160 : 70), big ? 0.6 : 0.28);
          }
          for (i = 0; i < sim.crates.length; i++) {
            var cr = sim.crates[i], cfx = (cr.x - p.x) * p.facing;
            if (cr.alive && cfx > -6 && cfx < reach + cr.w / 2 && Math.abs(cr.y - p.y) < 16 + cr.d / 2 && p.jz < cr.h) hitCrate(cr, dmg);
          }
        }
      }

      // étoiles de l'étoile-shuriken (ramassée dans une caisse) : 3 en éventail sur les couloirs voisins, traversent les ennemis
      if (throwPressed && p.power > 0 && p.throwCd <= 0) {
        p.throwCd = CFG.powerCooldown + 0.08;
        [-9, 0, 9].forEach(function (oy) { sim.stars.push({ x: p.x + p.facing * 14, y: p.y + oy, vx: p.facing * 330, life: 1, hits: {} }); });
        emit("throw", p.x, p.y - 22);
      }
      for (i = sim.stars.length - 1; i >= 0; i--) {
        var st = sim.stars[i], gone = false;
        st.x += st.vx * dt; st.life -= dt;
        if (st.life <= 0 || st.x < 0 || st.x > L) gone = true;
        for (var m = 0; m < sim.enemies.length && !gone; m++) {
          var en = sim.enemies[m];
          if (en.alive && !st.hits["e" + m] && Math.abs(st.y - en.y) < 13 && Math.abs(st.x - en.x) < en.w / 2 + 6) { st.hits["e" + m] = true; damageEnemy(en, 2, Math.sign(st.vx) * 90, 0.3); }
        }
        for (var n = 0; n < sim.crates.length && !gone; n++) {
          var cc = sim.crates[n];
          if (cc.alive && Math.abs(st.y - cc.y) < cc.d / 2 + 8 && Math.abs(st.x - cc.x) < cc.w / 2 + 6) {
            if (cc.kind === "block") gone = true;
            else if (!st.hits["c" + n]) { st.hits["c" + n] = true; hitCrate(cc, 2); }
          }
        }
        if (gone) sim.stars.splice(i, 1);
      }

      // ennemis
      var alive = 0;
      for (i = 0; i < sim.enemies.length; i++) {
        e = sim.enemies[i];
        if (!e.alive) continue;
        alive++;
        var K = KINDS[e.kind] || KINDS.grunt;
        if (e.cd > 0) e.cd -= dt;
        if (e.hurt > 0) { e.hurt -= dt; e.x += e.kb * dt; e.kb *= 0.88; e.wind = 0; e.lunge = 0; pushOut(e, 10, 4, 0); continue; }
        e.facing = p.x >= e.x ? 1 : -1;
        var ddx = p.x - e.x, ddy = p.y - e.y, dist = Math.abs(ddx);
        if (K.lunge && e.lunge > 0) { // bond : ne s'arrête plus avant la fin
          e.lunge -= dt; e.x += e.facing * 250 * dt;
          if (!e.lungeHit && dist < 24 && Math.abs(ddy) < 14 && p.jz < 16) { e.lungeHit = true; hurtPlayer(e, K.dmg); }
          pushOut(e, 10, 4, 0);
          continue;
        }
        if (e.wind > 0) {
          e.wind -= dt;
          if (e.wind <= 0) {
            if (K.ranged) { sim.shots.push({ x: e.x + e.facing * 12, y: e.y, vx: e.facing * 175, life: 2.4 }); emit("shot", e.x, e.y - 20); }
            else if (K.lunge && !(dist <= K.reach && Math.abs(ddy) < 16)) { e.lunge = 0.26; e.lungeHit = false; emit("dash", e.x, e.y - 20); }
            else if (dist < K.reach + 8 && Math.abs(ddy) < 16 && p.jz < 16) hurtPlayer(e, K.dmg);
          }
          continue;
        }
        if (K.ranged) { // garde ses distances, vise le même couloir
          if (dist < 95) e.x -= Math.sign(ddx) * K.speed * dt; else if (dist > 150) e.x += Math.sign(ddx) * K.speed * dt;
          if (Math.abs(ddy) > 5) e.y += Math.sign(ddy) * K.speed * 0.8 * dt;
          e.x = clamp(e.x, sim.lock ? sim.lock.l + 12 : 12, sim.lock ? sim.lock.r - 12 : L - 12);
          if (e.cd <= 0 && Math.abs(ddy) < 12 && dist > 60 && dist < 300) { e.wind = K.windup; e.cd = K.cd; }
        } else {
          var want = K.reach - 6;
          if (Math.abs(ddx) > want) e.x += Math.sign(ddx) * K.speed * dt;
          if (Math.abs(ddy) > 6) e.y += Math.sign(ddy) * K.speed * 0.7 * dt;
          if (K.lunge && e.cd <= 0 && dist > 55 && dist < 150 && Math.abs(ddy) < 12) { e.wind = K.windup; e.cd = K.cd + 0.7; }
          else if (Math.abs(ddx) <= K.reach && Math.abs(ddy) < 14 && e.cd <= 0) { e.wind = K.windup; e.cd = K.cd; }
        }
        e.y = clamp(e.y, yMin, yMax);
        var blocked = pushOut(e, 10, 4, 0); // les caisses les arrêtent : ils les contournent par la profondeur
        if (blocked && blocked.axis === "x") e.y = clamp(e.y + (e.y >= blocked.c.y ? 1 : -1) * K.speed * 0.9 * dt, yMin, yMax);
      }
      // les ennemis ne se superposent pas
      for (i = 0; i < sim.enemies.length; i++) {
        for (var j = i + 1; j < sim.enemies.length; j++) {
          var a = sim.enemies[i], b = sim.enemies[j];
          if (!a.alive || !b.alive) continue;
          if (Math.abs(a.x - b.x) < 18 && Math.abs(a.y - b.y) < 10) { var sg = (a.x <= b.x ? -1 : 1); a.x += sg * 30 * dt; b.x -= sg * 30 * dt; }
        }
      }
      sim.enemies = sim.enemies.filter(function (q) { return q.alive; });

      // bouteilles des lanceurs : on les évite en sautant ou en changeant de couloir
      for (i = sim.shots.length - 1; i >= 0; i--) {
        var sh = sim.shots[i], sdead = false;
        sh.x += sh.vx * dt; sh.life -= dt;
        if (sh.life <= 0) sdead = true;
        for (var q2 = 0; q2 < sim.crates.length && !sdead; q2++) {
          var c2 = sim.crates[q2];
          if (c2.alive && sh.life < 2.35 && Math.abs(sh.x - c2.x) < c2.w / 2 && Math.abs(sh.y - c2.y) < c2.d / 2 + 4) sdead = true;
        }
        if (!sdead && Math.abs(sh.x - p.x) < 10 && Math.abs(sh.y - p.y) < 10 && p.jz < 14) { hurtPlayer(sh, 1); sdead = true; }
        if (sdead) sim.shots.splice(i, 1);
      }

      // objets : cœur (+2 ; à pleine vie : invincibilité) et étoile-shuriken
      for (i = 0; i < sim.items.length; i++) {
        var it = sim.items[i];
        if (!it.got && Math.abs(it.x - p.x) < 16 && Math.abs(it.y - p.y) < 14) pickup(it);
      }

      // vagues : on verrouille l'écran, on libère quand tout le monde est à terre
      if (sim.lock) {
        var cur = waves.filter(function (q) { return q.started && !q.done; })[0];
        if (cur && alive === 0) { cur.done = true; sim.lock = null; sim.goT = 3; sim.shots.length = 0; emit("clear", p.x, p.y); }
      } else {
        for (i = 0; i < waves.length; i++) if (!waves[i].started && p.x >= waves[i].at) { startWave(waves[i]); break; }
      }
      if (!sim.finished && !sim.lock && waves.every(function (q) { return q.done; }) && p.x >= L - 70) {
        sim.finished = true; emit("finish", p.x, p.y);
      }
    }

    sim.step = function (input, dt) {
      var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (var i = 0; i < n; i++) stepOnce(input || {}, h);
    };
    sim.progress = function () { return clamp(p.x / L, 0, 1); };
    sim.nearestThreat = function () {
      var best = Infinity;
      sim.enemies.forEach(function (e) { best = Math.min(best, Math.abs(e.x - p.x) + Math.abs(e.y - p.y)); });
      return best;
    };
    sim.battle = function () { return !!sim.lock; };
    return sim;
  }

  /* ======================================================================
   * 4. Bots (tests) : jouent le parcours avec les mêmes entrées qu'un joueur.
   * ==================================================================== */

  function platformBot(sim) {
    var p = sim.player, ab = sim.abilities, jumpHold = 0;
    function solidAt(x, y) {
      var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (tx < 0 || tx >= sim.solid[0].length) return true;
      if (ty < 0 || ty >= sim.solid.length) return false;
      return sim.solid[ty][tx];
    }
    return function (dt) {
      var inp = { right: true, left: false, jump: false, attack: false, throw: false };
      var dir = 1, ahead = p.x + dir * (p.w / 2 + 6);
      var wall = solidAt(ahead, p.y - 10) || solidAt(ahead, p.y - 36) && false;
      var floorAhead = solidAt(p.x + dir * 22, p.y + 4), floorHere = solidAt(p.x, p.y + 4);
      var spikeAhead = sim.spikes.some(function (s) { return s.l - p.x > 0 && s.l - p.x < 52 && Math.abs(s.b - p.y) < 40; });
      var enemyNear = null;
      sim.enemies.forEach(function (e) {
        if (!e.alive) return;
        var dx = (e.x - p.x) * dir;
        if (dx > 0 && dx < 70 && Math.abs(e.y - p.y) < 50) enemyNear = e;
      });
      var candleNear = sim.candles.some(function (c) { return c.alive && (c.x - p.x) * dir > 0 && (c.x - p.x) * dir < 40 && Math.abs(c.y - p.y) < 10; });
      var needJump = wall || (p.onGround && !floorAhead && floorHere) || spikeAhead;
      if (enemyNear) {
        var dx2 = (enemyNear.x - p.x) * dir;
        if (ab.shuriken && dx2 > 36) inp.throw = sim.time % 0.4 < 0.2;
        if (dx2 < 44 && enemyNear.type !== "flyer") inp.attack = sim.time % 0.5 < 0.25;
        if (dx2 < 52 && enemyNear.type === "flyer") inp.attack = sim.time % 0.5 < 0.25;
        if (dx2 < 52 && enemyNear.type === "flyer" && p.onGround && enemyNear.y > p.y - 70) needJump = false;
        else if (dx2 < 46 && p.onGround && enemyNear.type !== "flyer") needJump = needJump || false;
      }
      if (candleNear) inp.attack = sim.time % 0.5 < 0.25;
      if (p.onGround) jumpHold = 0;
      if (needJump && p.onGround) { inp.jump = true; jumpHold = 0.34; }
      else if (jumpHold > 0) { inp.jump = true; jumpHold -= dt; }
      // double saut : on le déclenche près du sommet si un mur ou un vide bloque encore
      if (!p.onGround && ab.doubleJump && p.jumps < 2 && p.vy > -60 && (wall || !solidAt(p.x + dir * 30, p.y + 20)) ) { inp.jump = !sim._lastJump; }
      sim._lastJump = inp.jump;
      return inp;
    };
  }

  function brawlBot(sim) {
    var p = sim.player;
    return function () {
      var inp = { left: false, right: false, up: false, down: false, attack: false, jump: false, throw: false };
      var target = null, best = Infinity;
      sim.enemies.forEach(function (e) { var d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 2; if (d < best) { best = d; target = e; } });
      var dirx = target ? (target.x >= p.x ? 1 : -1) : 1;
      if (target) {
        var fx = target.x - p.x, fy = target.y - p.y;
        if (Math.abs(fx) > 30) { inp.right = fx > 0; inp.left = fx < 0; }
        if (Math.abs(fy) > 6) { inp.down = fy > 0; inp.up = fy < 0; }
        p.facing = fx >= 0 ? 1 : -1;
        if (Math.abs(fx) < 46 && Math.abs(fy) < 12) inp.attack = sim.time % 0.36 < 0.18;
      } else { inp.right = true; }
      // un obstacle devant : une caisse se casse, une benne se contourne par un autre couloir
      var blocker = null;
      sim.crates.forEach(function (c) {
        if (c.alive && (c.x - p.x) * dirx > 0 && (c.x - p.x) * dirx < 48 && Math.abs(c.y - p.y) < 16 && p.jz < c.h) blocker = c;
      });
      if (blocker) {
        if (blocker.kind === "crate") { p.facing = dirx; inp.attack = sim.time % 0.36 < 0.18; inp.right = false; inp.left = false; }
        else { // on s'écarte du centre de la benne jusqu'à passer à côté (sans hésiter d'un côté à l'autre)
          inp.down = p.y > blocker.y; inp.up = !inp.down;
          if (p.y >= sim.yMax - 3) { inp.down = false; inp.up = true; } else if (p.y <= sim.yMin + 3) { inp.up = false; inp.down = true; }
        }
      }
      return inp;
    };
  }

  /** Joue un parcours avec un bot ; renvoie { finished, time, deaths, bits }. */
  function simulate(sim, bot, maxSeconds) {
    var dt = 1 / 60, b = bot(sim);
    while (sim.time < (maxSeconds || 120) && !sim.finished) {
      sim.step(b(dt), dt);
      sim.events.length = 0;
    }
    return { finished: sim.finished, time: sim.time, deaths: sim.stats.deaths, bits: sim.stats.bits, x: sim.player.x };
  }

  window.OctoSim = {
    TILE: TILE, ROWS: ROWS, CFG: CFG, KINDS: KINDS,
    buildCourse: buildCourse, createPlatform: createPlatform, createBrawl: createBrawl,
    platformBot: platformBot, brawlBot: brawlBot, simulate: simulate
  };
})();
