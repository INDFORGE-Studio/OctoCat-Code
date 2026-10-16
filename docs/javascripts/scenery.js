/* OctoCat-Code — Décor partagé de GitHubia (niveaux + page d'accueil).
 * OctoScenery.build(k, h, opts) construit ciel, nuages, canyon/cité, arbres, sol, props, torches,
 * portail, particules et feuillage d'avant-plan, puis renvoie des poignées pour les scènes.
 *   opts.portalOpen  portail ouvert dès le départ (page d'accueil)
 *   opts.hudBar      bandeau sombre sous le HUD (défaut : oui)
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
    k.camPos(VW > WORLD_W ? WORLD_W / 2 : VW / 2, 250 - VH / 2);

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
      var core = k.add([k.rect(8, 12), k.pos(tx, fy + 4), k.anchor("bot"), k.color(rgb("#f0883e")), k.z(4)]);
      var tip = k.add([k.rect(4, 8), k.pos(tx, fy + 3), k.anchor("bot"), k.color(rgb("#e3b341")), k.z(4)]);
      flames.push({ glow: glow, core: core, tip: tip, seed: tx });
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
    var frameHooks = [];
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
        var fl = 0.85 + 0.15 * Math.sin(time * 14 + f.seed) + 0.1 * Math.sin(time * 23 + f.seed * 2);
        f.core.height = 12 * fl; f.tip.height = 8 * fl;
        f.glow.opacity = 0.2 * fl; f.glow.scale = k.vec2(2 * fl, 2 * fl);
      });
      var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
      portalGlow.opacity = portalOpen ? 0.22 + 0.1 * pulse : 0.08 + 0.04 * pulse;
      if (camTarget && VW <= WORLD_W) { // la caméra suit la cible en douceur
        var want = Math.max(VW / 2, Math.min(WORLD_W - VW / 2, camTarget.pos.x + 60)), cur = k.camPos();
        k.camPos(cur.x + (want - cur.x) * Math.min(1, 5 * k.dt()), cur.y);
      }
      frameHooks.forEach(function (fn) { fn(time); });
    });

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
