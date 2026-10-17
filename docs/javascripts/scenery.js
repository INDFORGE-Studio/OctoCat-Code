/* OctoCat-Code — Décor partagé de GitHubia (niveaux + page d'accueil).
 * OctoScenery.build(k, h, opts) construit ciel, nuages, canyon/cité, arbres, sol, props, torches,
 * portail, particules et feuillage d'avant-plan, puis renvoie des poignées pour les scènes.
 *   opts.portalOpen  portail ouvert dès le départ (page d'accueil)
 *   opts.hudBar      bandeau sombre sous le HUD (défaut : oui)
 *   opts.magic       Easter egg : cliquer sur les deux torches du portail les éteint avec de la magie (défaut : oui ; non sur l'accueil)
 */
(function () {
  "use strict";

  var GROUND_Y = 200;
  var BASE_Y = GROUND_Y + 3;   // ligne de pieds des personnages
  var PORTAL_X = 520;

  function build(k, h, opts) {
    opts = opts || {};
    var rgb = function (hex) { return k.Color.fromHex(hex); };
    var time = 0, i, n;
    // Vue : hauteur fixe, largeur selon l'écran. Le bas de la vue reste aligné sur le bas du monde (y = 250) ;
    // si la vue est plus étroite que le monde (600), la caméra suit la cible, sinon elle se centre.
    var VW = k.width(), VH = k.height(), WORLD_W = 600, camTarget = null;
    // opts.reserve : part basse de l'écran laissée à l'interface (éditeur de code) ; le monde remonte d'autant
    var reserve = opts.reserve || 0;
    k.camPos(VW > WORLD_W ? WORLD_W / 2 : VW / 2, 250 + VH * reserve - VH / 2);
    k.add([k.rect(3600, 900), k.pos(-1500, 250), k.color(rgb("#150e24")), k.z(4.5)]);   // sous le monde

    // ---------- ciel, nuages qui dérivent, canyon + cité ----------
    k.add([k.rect(3600, 700), k.pos(-1500, -640), k.color(rgb("#3a47b4")), k.z(-1)]);   // ciel au-dessus du décor
    // décor prolongé de part et d'autre par des copies en miroir (écrans plus larges que 600)
    var MIRRORED = [[-600, true], [0, false], [600, true]];
    MIRRORED.forEach(function (c) { k.add([k.sprite("sky", { flipX: c[1] }), k.pos(c[0], 0), k.scale(2), k.z(0)]); });
    [[40, 30, "cloud0", 4], [330, 58, "cloud1", 6], [470, 18, "cloud0", 3], [200, 74, "cloud1", 5]].forEach(function (c) {
      var cl = k.add([k.sprite(c[2]), k.pos(c[0], c[1]), k.scale(2), k.opacity(0.95), k.z(0.5)]);
      cl.onUpdate(function () {
        cl.pos.x -= c[3] * k.dt();
        if (cl.pos.x < -140) cl.pos.x = 610;
      });
    });
    MIRRORED.forEach(function (c) { k.add([k.sprite("land", { flipX: c[1] }), k.pos(c[0], 0), k.scale(2), k.z(1)]); });

    // brume basse (2 bandes qui dérivent)
    [[GROUND_Y - 30, 0.09, 7, 0], [GROUND_Y - 12, 0.07, -5, 60]].forEach(function (f) {
      var fog = k.add([k.rect(2800, 12), k.pos(-1100 + f[3], f[0]), k.color(rgb("#ffffff")), k.opacity(f[1]), k.z(2)]);
      fog.onUpdate(function () {
        fog.pos.x += f[2] * k.dt();
        if (fog.pos.x > -800) fog.pos.x = -1400; else if (fog.pos.x < -1400) fog.pos.x = -800;
      });
    });

    // ---------- végétation moyenne : arbres corail, palmiers violets ----------
    [[34, "tree", 2.6], [262, "palm", 2.4], [392, "tree", 2], [598, "palm", 2.4]].forEach(function (t) {
      k.add([k.sprite(t[1]), k.pos(t[0], GROUND_Y + 2), k.anchor("bot"), k.scale(t[2]), k.z(3)]);
    });

    // ---------- sol : plateau de roche mauve ----------
    for (var gx = -640, g = 0; gx < 1280; gx += 32, g++) {
      k.add([k.sprite("grass" + (g % 3)), k.pos(gx, GROUND_Y), k.scale(2), k.z(5)]);
      k.add([k.sprite("dirt" + ((g + 1) % 3)), k.pos(gx, GROUND_Y + 32), k.scale(2), k.z(5)]);
    }
    // binaire fossilisé dans la roche
    ["0101", "1100", "0110", "1001", "0011"].forEach(function (bits, idx) {
      k.add([k.text(bits, { size: 9, font: "monospace" }), k.pos(30 + idx * 125, GROUND_Y + 30 + (idx % 2) * 10),
        k.color(rgb("#a8747c")), k.opacity(0.35), k.z(6)]);
    });

    // ---------- décors du sentier ----------
    k.add([k.sprite("bush"), k.pos(150, BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
    k.add([k.sprite("rock"), k.pos(395, BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
    [[34, "tuft0"], [95, "tuft1"], [252, "tuft1"], [360, "tuft0"], [430, "tuft1"], [580, "tuft0"]].forEach(function (p) {
      k.add([k.sprite(p[1]), k.pos(p[0], BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
    });
    [[120, "flower0"], [282, "flower1"], [410, "flower0"]].forEach(function (p) {
      k.add([k.sprite(p[1]), k.pos(p[0], BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
    });
    [[16, 0.9], [352, 1.0], [572, 0.85]].forEach(function (p) {
      k.add([k.sprite("mushroom"), k.pos(p[0], BASE_Y + 2), k.anchor("bot"), k.scale(3 * p[1]), k.z(6)]);
    });

    // ---------- torches du portail ----------
    var flames = [];
    [PORTAL_X - 62, PORTAL_X + 62].forEach(function (tx) {
      k.add([k.sprite("torch"), k.pos(tx, BASE_Y), k.anchor("bot"), k.scale(3), k.z(4)]);
      var fy = BASE_Y - 20 * 3 + 6;
      var glow = k.add([k.sprite("glow"), k.pos(tx, fy), k.anchor("center"), k.scale(2), k.color(rgb("#f0883e")), k.opacity(0.2), k.z(4)]);
      var core = k.add([k.rect(8, 12), k.pos(tx, fy + 4), k.anchor("bot"), k.color(rgb("#f0883e")), k.opacity(1), k.z(4)]);
      var tip = k.add([k.rect(4, 8), k.pos(tx, fy + 3), k.anchor("bot"), k.color(rgb("#e3b341")), k.opacity(1), k.z(4)]);
      flames.push({ glow: glow, core: core, tip: tip, seed: tx, x: tx, fy: fy, out: false, magic: false });
    });

    // ---------- portail + halo ----------
    var portalOpen = !!opts.portalOpen;
    var portalGlow = k.add([k.sprite("glow"), k.pos(PORTAL_X, GROUND_Y - 58), k.anchor("center"), k.scale(4.2),
      k.color(rgb(portalOpen ? "#58a6ff" : "#f85149")), k.opacity(0.1), k.z(3)]);
    var portal = k.add([k.sprite("portal", { anim: portalOpen ? "open" : "closed" }), k.pos(PORTAL_X, BASE_Y),
      k.anchor("bot"), k.scale(3), k.z(4)]);

    // ---------- particules : grains de lumière + glyphes de code qui flottent ----------
    var motes = [];
    for (i = 0; i < 16; i++) {
      var mx = k.rand(10, 590), my = k.rand(90, 195);
      var mote = k.add([k.rect(2, 2), k.pos(mx, my), k.color(rgb("#ffffff")), k.opacity(0.5), k.z(12)]);
      motes.push({ o: mote, bx: mx, y: my, p: k.rand(0, 6.28), sx: k.rand(0.4, 1), rise: k.rand(3, 9) });
    }
    var GLYPHS = ["{ }", "</>", ";", "01", "=>", "[]", "()", "#"];
    for (n = 0; n < 9; n++) {
      (function (idx) {
        var gl = k.add([k.text(GLYPHS[idx % GLYPHS.length], { size: 11, font: "monospace" }),
          k.pos(k.rand(0, 600), k.rand(20, 150)), k.color(rgb("#ffffff")), k.opacity(0.3), k.z(1.5)]);
        var sp = k.rand(5, 14), fall = k.rand(2, 6);
        gl.onUpdate(function () {
          gl.pos.x -= sp * k.dt(); gl.pos.y += fall * k.dt();
          if (gl.pos.x < -30) gl.pos.x = 630;
          if (gl.pos.y > 170) gl.pos.y = 20;
        });
      })(n);
    }

    // ---------- feuillage d'avant-plan (violet sombre) + vignette ----------
    k.add([k.sprite("leavesCorner"), k.pos(0, 250), k.anchor("botleft"), k.scale(2), k.z(6.5)]);
    [-600, 0, 600].forEach(function (bx) { k.add([k.sprite("leavesBand"), k.pos(bx, 250), k.anchor("botleft"), k.scale(2), k.z(28)]); });
    k.add([k.sprite("vignette"), k.pos(0, 0), k.scale(VW / 600, VH / 250), k.fixed(), k.z(30)]);
    if (opts.hudBar !== false) k.add([k.rect(VW, 40), k.pos(0, 0), k.color(rgb("#0d1117")), k.opacity(0.42), k.fixed(), k.z(30.5)]);

    // ---------- vie du décor ----------
    var frameHooks = [], portalFlash = 0, magicListeners = [];
    k.onUpdate(function () {
      time += k.dt();
      motes.forEach(function (m) {
        m.y -= m.rise * k.dt();
        if (m.y < 60) m.y = 195;
        m.o.pos.x = m.bx + Math.sin(time * m.sx + m.p) * 14;
        m.o.pos.y = m.y;
        m.o.opacity = 0.25 + 0.4 * Math.abs(Math.sin(time * 1.4 + m.p));
      });
      flames.forEach(function (f) {
        if (f.out) { f.core.opacity = 0; f.tip.opacity = 0; f.glow.opacity = 0.03; return; } // flamme éteinte (Easter egg)
        var fl = 0.85 + 0.15 * Math.sin(time * 14 + f.seed) + 0.1 * Math.sin(time * 23 + f.seed * 2), big = f.magic ? 1.45 : 1;
        f.core.opacity = 1; f.tip.opacity = 1;
        f.core.height = 12 * fl * big; f.tip.height = 8 * fl * big;
        f.glow.opacity = (f.magic ? 0.34 : 0.2) * fl; f.glow.scale = k.vec2(2 * fl * big, 2 * fl * big);
        if (f.magic) { // flamme enchantée : les couleurs de l'arc-en-ciel défilent
          f.core.color = k.hsl2rgb ? k.hsl2rgb((time * 0.35 + f.seed * 0.003) % 1, 0.9, 0.6) : rgb("#bc8cff");
          f.tip.color = k.hsl2rgb ? k.hsl2rgb((time * 0.35 + f.seed * 0.003 + 0.18) % 1, 0.9, 0.78) : rgb("#ffffff");
          f.glow.color = f.core.color;
        }
      });
      var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
      portalGlow.opacity = (portalOpen ? 0.22 + 0.1 * pulse : 0.08 + 0.04 * pulse) + portalFlash * 0.5;
      portalFlash = Math.max(0, portalFlash - 2.2 * k.dt());
      if (camTarget && VW <= WORLD_W) { // la caméra suit la cible en douceur
        var want = Math.max(VW / 2, Math.min(WORLD_W - VW / 2, camTarget.pos.x + 60)), cur = k.camPos();
        k.camPos(cur.x + (want - cur.x) * Math.min(1, 5 * k.dt()), cur.y);
      }
      frameHooks.forEach(function (fn) { fn(time); });
    });

    /* ---------- Easter egg : cliquer sur les DEUX torches du portail ----------
     * Chaque torche s'éteint dans un « pschiit » (fumée, étincelles) et libère un feu follet qui file vers le portail.
     * Quand les deux sont éteintes : la nuit tombe, le portail explose en anneaux arc-en-ciel, une pluie d'étoiles tombe,
     * OctoCat et Laita fêtent ça, puis les torches se rallument — enchantées, aux couleurs de l'arc-en-ciel. Succès « Magicien ». */
    var magicOn = opts.magic !== false, magicDone = false;
    var RAINBOW = ["#ff5d73", "#ffb347", "#ffe066", "#7ee787", "#58d6ff", "#bc8cff", "#ff7eb6"];
    function sfx(name) { if (window.OctoMusic && window.OctoMusic.sfx) window.OctoMusic.sfx(name); }
    /** Particule simple : (x, y, vx, vy, durée, gravité, forme, couleur, taille). */
    function dust(x, y, vx, vy, life, grav, color, size, circle) {
      var o = k.add([circle ? k.circle(size) : k.rect(size, size), k.pos(x, y), k.color(rgb(color)), k.opacity(1), k.z(8)]), age = 0;
      o.onUpdate(function () {
        age += k.dt(); vy += grav * k.dt();
        o.pos.x += vx * k.dt(); o.pos.y += vy * k.dt();
        var u = age / life;
        o.opacity = Math.max(0, 1 - u);
        if (circle) o.scale = k.vec2(1 + u * 3, 1 + u * 3);
        if (age >= life) o.destroy();
      });
      return o;
    }
    function snuffFlame(f) {
      var j;
      f.out = true; sfx("snuff");
      for (j = 0; j < 8; j++) dust(f.x + k.rand(-4, 4), f.fy, k.rand(-12, 12), k.rand(-38, -18), k.rand(0.9, 1.5), -4, "#9aa4c8", k.rand(2, 4), true); // fumée
      for (j = 0; j < 16; j++) dust(f.x, f.fy, k.rand(-50, 50), k.rand(-90, -20), k.rand(0.6, 1), 140, RAINBOW[j % RAINBOW.length], 2); // poussière magique
      wisp(f).then(function () {
        portalFlash = 1; sfx("bit");
        if (!magicDone && flames.every(function (q) { return q.out; })) finale();
      });
    }
    /** Le feu follet : une petite lumière bleue qui s'envole en arc vers le portail en laissant des étincelles. */
    function wisp(f) {
      var orb = k.add([k.sprite("glow"), k.pos(f.x, f.fy), k.anchor("center"), k.scale(0.55), k.color(rgb("#9ff0ff")), k.opacity(0.95), k.z(8)]);
      var core = k.add([k.rect(3, 3), k.pos(f.x, f.fy), k.anchor("center"), k.color(rgb("#ffffff")), k.z(8.1)]), n = 0;
      var x1 = PORTAL_X, y1 = GROUND_Y - 58;
      return h.tween(1.15, function (e) {
        var x = f.x + (x1 - f.x) * e + Math.sin(e * 9) * 9 * (1 - e), y = f.fy + (y1 - f.fy) * e - Math.sin(e * Math.PI) * 78;
        orb.pos.x = x; orb.pos.y = y; core.pos.x = x; core.pos.y = y;
        orb.opacity = 0.7 + 0.25 * Math.sin(e * 40);
        if ((n++ % 2) === 0) dust(x + k.rand(-2, 2), y + k.rand(-2, 2), k.rand(-12, 12), k.rand(-10, 14), 0.55, 30, RAINBOW[n % RAINBOW.length], 2);
      }).then(function () { orb.destroy(); core.destroy(); });
    }
    function finale() {
      magicDone = true;
      if (window.OctoProgress && window.OctoProgress.grant) window.OctoProgress.grant("magic");
      sfx("magic");
      var cy = k.camPos().y, veil = k.add([k.rect(3600, 1200), k.pos(-1500, cy - 600), k.color(rgb("#05030f")), k.opacity(0), k.z(7.4)]);
      var pz = portal.z, gz = portalGlow.z;
      portal.z = 7.6; portalGlow.z = 7.5; // le portail reste lumineux dans la nuit
      magicListeners.forEach(function (fn) { fn(); });
      h.tween(0.5, function (e) { veil.opacity = 0.62 * e; })
        .then(function () {
          RAINBOW.forEach(function (c, r) { // anneaux de lumière qui s'élargissent depuis le portail
            h.wait(r * 0.13).then(function () {
              var ring = k.add([k.sprite("glow"), k.pos(PORTAL_X, GROUND_Y - 58), k.anchor("center"), k.scale(1), k.color(rgb(c)), k.opacity(0.7), k.z(7.7)]);
              h.tween(0.95, function (e) { ring.scale = k.vec2(1 + e * 10, 1 + e * 10); ring.opacity = 0.7 * (1 - e); }).then(function () { ring.destroy(); });
            });
          });
          var top = k.camPos().y - k.height() / 2, j;
          for (j = 0; j < 56; j++) { // pluie d'étoiles
            (function (jj) {
              var x = k.rand(0, 600), delay = k.rand(0, 0.9), age = 0, sz = jj % 6 === 0 ? 3 : 2;
              var st = k.add([k.rect(sz, sz), k.pos(x, top - 10), k.color(rgb(RAINBOW[jj % RAINBOW.length])), k.opacity(0), k.z(8)]), vy = k.rand(60, 120);
              st.onUpdate(function () {
                age += k.dt();
                if (age < delay) return;
                st.pos.y += vy * k.dt(); st.pos.x += Math.sin(age * 5 + jj) * 12 * k.dt();
                st.opacity = 0.6 + 0.4 * Math.abs(Math.sin(age * 14 + jj));
                if (st.pos.y > GROUND_Y + 6) { dust(st.pos.x, GROUND_Y, k.rand(-20, 20), k.rand(-40, -10), 0.4, 120, RAINBOW[jj % RAINBOW.length], 2); st.destroy(); }
              });
            })(j);
          }
          return h.wait(1.1);
        })
        .then(function () { // les torches se rallument, enchantées
          flames.forEach(function (f) { f.out = false; f.magic = true; for (var q = 0; q < 14; q++) dust(f.x, f.fy, k.rand(-60, 60), k.rand(-110, -30), 0.8, 160, RAINBOW[q % RAINBOW.length], 2); });
          sfx("star");
          var msg = k.add([k.text("~ MAGIE ! ~", { size: 14, font: "monospace" }), k.pos(PORTAL_X - 30, GROUND_Y - 118), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(1), k.z(32)]);
          h.tween(1.4, function (e) { msg.pos.y = GROUND_Y - 118 - 26 * e; msg.opacity = 1 - e * e; }).then(function () { msg.destroy(); });
          return h.tween(0.7, function (e) { veil.opacity = 0.62 * (1 - e); });
        })
        .then(function () { veil.destroy(); portal.z = pz; portalGlow.z = gz; });
    }
    /** Position (en pixels de la page) des deux torches : sert aux tests de navigateur (dev/magic-check.mjs). */
    window.OctoScenery.torchPoints = function () {
      var r = k.canvas.getBoundingClientRect(), f = r.width / k.width();
      return flames.map(function (q) { var p = k.toScreen(k.vec2(q.x, q.fy + 14)); return { x: r.left + p.x * f, y: r.top + p.y * f }; });
    };
    if (magicOn) {
      // la souris est lue directement sur le canvas (pointerdown/move : souris ET doigt) et convertie en coordonnées du monde
      var canvas = k.canvas, overTorch = false, ptr = null;
      var toWorld = function (e) {
        var r = canvas.getBoundingClientRect();
        return k.toWorld(k.vec2((e.clientX - r.left) * k.width() / r.width, (e.clientY - r.top) * k.height() / r.height));
      };
      var hitTorch = function (p) {
        for (var q = 0; q < flames.length; q++) {
          var f = flames[q];
          if (!f.out && !f.magic && Math.abs(p.x - f.x) < 24 && p.y > BASE_Y - 96 && p.y < BASE_Y + 4) return f;
        }
        return null;
      };
      var onDown = function (e) { var f = hitTorch(toWorld(e)); if (f) snuffFlame(f); };
      var onMove = function (e) { ptr = toWorld(e); };
      if (build.offMagic) build.offMagic(); // une seule scène à la fois : on retire les écouteurs de la précédente
      canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
      build.offMagic = function () { canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); build.offMagic = null; };
      frameHooks.push(function () { // la souris devient une main au-dessus d'une torche : un indice discret pour les curieux
        if (!ptr) return;
        var now = !!hitTorch(ptr);
        if (now !== overTorch) { overTorch = now; canvas.style.cursor = now ? "pointer" : ""; }
      });
    }

    return {
      GROUND_Y: GROUND_Y, BASE_Y: BASE_Y, PORTAL_X: PORTAL_X,
      viewW: VW, viewH: VH,
      follow: function (obj) { camTarget = obj; },
      portal: portal,
      rgb: rgb,
      time: function () { return time; },
      /** Appelle fn(t) à chaque frame (après la vie du décor). */
      onFrame: function (fn) { frameHooks.push(fn); },
      isPortalOpen: function () { return portalOpen; },
      setPortal: function (open) {
        portalOpen = open;
        portalGlow.color = rgb(open ? "#58a6ff" : "#f85149");
        portal.play(open ? "open" : "closed");
      },
      /** Ombre au sol : sprite « glow » aplati (KAPLAY n'a pas de composant ellipse). */
      shadow: function (x, width) {
        return k.add([k.sprite("glow"), k.pos(x, BASE_Y), k.anchor("center"), k.scale(width, 0.17),
          k.color(rgb("#1a1040")), k.opacity(0.55), k.z(7)]);
      },
      /**
       * Laita attend assise devant l'OctoCat (face à lui) pendant qu'il cherche la solution. Quand il court vers le portail elle le suit ;
       * quand il revient elle retourne s'asseoir à sa place. `octo` = le sprite de l'OctoCat, `ox` = sa place de départ.
       */
      laita: function (octo, ox) {
        var homeX = ox + 84, dog = k.add([k.sprite("laita", { anim: "sit" }), k.pos(homeX, BASE_Y), k.anchor("bot"), k.scale(3), k.opacity(1), k.z(8.5)]);
        var shade = this.shadow(homeX, 0.6), mode = "sit";
        dog.flipX = true;
        frameHooks.push(function () {
          var dt = k.dt(), want = octo.pos.x > ox + 6 ? octo.pos.x - 56 : homeX, dx = want - dog.pos.x, step = 320 * dt;
          if (Math.abs(dx) > step) { dog.pos.x += Math.sign(dx) * step; dog.flipX = dx < 0; if (mode !== "run") { mode = "run"; dog.play("run"); } }
          else {
            dog.pos.x = want;
            if (mode !== "sit") { mode = "sit"; dog.play("sit"); }
            dog.flipX = want === homeX ? true : octo.pos.x < dog.pos.x ? true : false;
          }
          dog.opacity = octo.opacity; shade.pos.x = dog.pos.x; shade.opacity = 0.5 * octo.opacity;
        });
        magicListeners.push(function () { // Easter egg des torches : OctoCat saute de joie, Laita aboie et saute aussi
          if (octo.opacity < 1 || Math.abs(octo.pos.y - BASE_Y) > 1 || Math.abs(octo.pos.x - ox) > 2) return;
          var y0 = octo.pos.y, d0 = dog.pos.y;
          octo.play("success");
          function hop(e) { octo.pos.y = y0 - Math.sin(e * Math.PI) * 30; }
          h.tween(0.5, hop).then(function () { return h.tween(0.5, hop); }).then(function () { octo.pos.y = y0; octo.play("idle"); });
          h.wait(0.25).then(function () {
            if (window.OctoMusic) window.OctoMusic.sfx("bark");
            return h.tween(0.5, function (e) { dog.pos.y = d0 - Math.sin(e * Math.PI) * 22; });
          }).then(function () { dog.pos.y = d0; });
        });
        return dog;
      },
      burst: function (x, y, colors, count) {
        for (var j = 0; j < count; j++) {
          (function (jj) {
            var vx = k.rand(-140, 140), vy = k.rand(-220, -40), life = k.rand(0.5, 0.9), age = 0;
            var p = k.add([k.rect(4, 4), k.pos(x, y), k.color(rgb(colors[jj % colors.length])), k.opacity(1), k.z(15)]);
            p.onUpdate(function () {
              age += k.dt(); vy += 520 * k.dt();
              p.pos.x += vx * k.dt(); p.pos.y += vy * k.dt();
              p.opacity = Math.max(0, 1 - age / life);
              if (age >= life) p.destroy();
            });
          })(j);
        }
      },
      floatText: function (str, x, y, color) {
        var t = k.add([k.text(str, { size: 16, font: "monospace" }), k.pos(x, y), k.anchor("center"), k.color(rgb(color)), k.opacity(1), k.z(32)]);
        h.tween(0.9, function (e) { t.pos.y = y - 30 * e; t.opacity = 1 - e * e; }).then(function () { t.destroy(); });
      }
    };
  }

  window.OctoScenery = { build: build, GROUND_Y: GROUND_Y, BASE_Y: BASE_Y, PORTAL_X: PORTAL_X };
})();
