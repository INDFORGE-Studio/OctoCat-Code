/* OctoCat-Code — Décor partagé de la Forêt des Syntaxes (niveaux + page d'accueil).
 * OctoScenery.build(k, h, opts) construit ciel, forêt, sol, props, torches, portail,
 * lucioles et vignette, puis renvoie des poignées pour les scènes qui l'utilisent.
 *   opts.portalOpen  portail ouvert dès le départ (page d'accueil)
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

    // ---------- ciel, lune, collines, lisière ----------
    k.add([k.sprite("bg"), k.pos(0, 0), k.scale(2), k.z(0)]);

    // ---------- arbres lointains (teintés bleu nuit) ----------
    [[40, "pine"], [118, "oak"], [262, "pine"], [352, "oak"], [446, "pine"], [586, "oak"]].forEach(function (t, idx) {
      k.add([k.sprite(t[1]), k.pos(t[0], GROUND_Y - 4), k.anchor("bot"), k.scale(2),
        k.color(rgb(idx % 2 ? "#5a7896" : "#6b88a5")), k.z(1)]);
    });

    // brume basse (2 bandes qui dérivent)
    [[GROUND_Y - 30, 0.055, 7, 0], [GROUND_Y - 12, 0.07, -5, 60]].forEach(function (f) {
      var fog = k.add([k.rect(900, 12), k.pos(-150 + f[3], f[0]), k.color(rgb("#9ecbff")), k.opacity(f[1]), k.z(2)]);
      fog.onUpdate(function () {
        fog.pos.x += f[2] * k.dt();
        if (fog.pos.x > 0) fog.pos.x = -300; else if (fog.pos.x < -300) fog.pos.x = 0;
      });
    });

    // ---------- arbres moyens ----------
    [[22, "oak", 3], [168, "pine", 3], [388, "oak", 2], [552, "pine", 3]].forEach(function (t) {
      k.add([k.sprite(t[1]), k.pos(t[0], GROUND_Y + 2), k.anchor("bot"), k.scale(t[2]),
        k.color(rgb("#c8d6c8")), k.z(3)]);
    });

    // ---------- sol ----------
    for (var gx = 0, g = 0; gx < 600; gx += 32, g++) {
      k.add([k.sprite("grass" + (g % 3)), k.pos(gx, GROUND_Y), k.scale(2), k.z(5)]);
      k.add([k.sprite("dirt" + ((g + 1) % 3)), k.pos(gx, GROUND_Y + 32), k.scale(2), k.z(5)]);
    }
    // binaire fossilisé dans la terre
    ["0101", "1100", "0110", "1001", "0011"].forEach(function (bits, idx) {
      k.add([k.text(bits, { size: 9, font: "monospace" }), k.pos(30 + idx * 125, GROUND_Y + 30 + (idx % 2) * 10),
        k.color(rgb("#238636")), k.opacity(0.35), k.z(6)]);
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
      k.add([k.sprite("mushroom"), k.pos(p[0], BASE_Y + 2), k.anchor("bot"), k.scale(3 * p[1]), k.z(10)]);
      k.add([k.sprite("glow"), k.pos(p[0], BASE_Y - 12), k.anchor("center"), k.scale(1.1), k.color(rgb("#39c5cf")), k.opacity(0.22), k.z(9)]);
    });

    // ---------- torches du portail ----------
    var flames = [];
    [PORTAL_X - 62, PORTAL_X + 62].forEach(function (tx) {
      k.add([k.sprite("torch"), k.pos(tx, BASE_Y), k.anchor("bot"), k.scale(3), k.z(4)]);
      var fy = BASE_Y - 20 * 3 + 6;
      var glow = k.add([k.sprite("glow"), k.pos(tx, fy), k.anchor("center"), k.scale(2.2), k.color(rgb("#f0883e")), k.opacity(0.3), k.z(4)]);
      var core = k.add([k.rect(8, 12), k.pos(tx, fy + 4), k.anchor("bot"), k.color(rgb("#f0883e")), k.z(4)]);
      var tip = k.add([k.rect(4, 8), k.pos(tx, fy + 3), k.anchor("bot"), k.color(rgb("#e3b341")), k.z(4)]);
      flames.push({ glow: glow, core: core, tip: tip, seed: tx });
    });

    // ---------- portail + halo ----------
    var portalOpen = !!opts.portalOpen;
    var portalGlow = k.add([k.sprite("glow"), k.pos(PORTAL_X, GROUND_Y - 58), k.anchor("center"), k.scale(4.2),
      k.color(rgb(portalOpen ? "#58a6ff" : "#f85149")), k.opacity(0.12), k.z(3)]);
    var portal = k.add([k.sprite("portal", { anim: portalOpen ? "open" : "closed" }), k.pos(PORTAL_X, BASE_Y),
      k.anchor("bot"), k.scale(3), k.z(4)]);

    // ---------- lucioles + glyphes de code ----------
    var flies = [];
    for (i = 0; i < 16; i++) {
      var fx = k.rand(10, 590), fy2 = k.rand(110, 195);
      var fly = k.add([k.rect(2, 2), k.pos(fx, fy2), k.color(rgb("#d2f56a")), k.opacity(0.8), k.z(12)]);
      var aura = fly.add([k.sprite("glow"), k.pos(1, 1), k.anchor("center"), k.scale(0.28), k.color(rgb("#d2f56a")), k.opacity(0.3)]);
      flies.push({ o: fly, aura: aura, bx: fx, by: fy2, p: k.rand(0, 6.28), sx: k.rand(0.4, 1), sy: k.rand(0.5, 1.2) });
    }
    var GLYPHS = ["{ }", "</>", ";", "01", "=>", "[]", "()", "#"];
    for (n = 0; n < 9; n++) {
      (function (idx) {
        var gl = k.add([k.text(GLYPHS[idx % GLYPHS.length], { size: 11, font: "monospace" }),
          k.pos(k.rand(0, 600), k.rand(20, 150)), k.color(rgb("#3fb950")), k.opacity(0.22), k.z(1)]);
        var sp = k.rand(5, 14), fall = k.rand(2, 6);
        gl.onUpdate(function () {
          gl.pos.x -= sp * k.dt(); gl.pos.y += fall * k.dt();
          if (gl.pos.x < -30) gl.pos.x = 630;
          if (gl.pos.y > 170) gl.pos.y = 20;
        });
      })(n);
    }

    // ---------- vignette ----------
    k.add([k.sprite("vignette"), k.pos(0, 0), k.z(30)]);

    // ---------- vie du décor ----------
    var frameHooks = [];
    k.onUpdate(function () {
      time += k.dt();
      flies.forEach(function (f) {
        f.o.pos.x = f.bx + Math.sin(time * f.sx + f.p) * 16;
        f.o.pos.y = f.by + Math.cos(time * f.sy + f.p * 1.3) * 9;
        var tw = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.6 + f.p));
        f.o.opacity = tw; f.aura.opacity = 0.32 * tw;
      });
      flames.forEach(function (f) {
        var fl = 0.85 + 0.15 * Math.sin(time * 14 + f.seed) + 0.1 * Math.sin(time * 23 + f.seed * 2);
        f.core.height = 12 * fl; f.tip.height = 8 * fl;
        f.glow.opacity = 0.26 * fl; f.glow.scale = k.vec2(2.2 * fl, 2.2 * fl);
      });
      var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
      portalGlow.opacity = portalOpen ? 0.3 + 0.12 * pulse : 0.1 + 0.05 * pulse;
      frameHooks.forEach(function (fn) { fn(time); });
    });

    return {
      GROUND_Y: GROUND_Y, BASE_Y: BASE_Y, PORTAL_X: PORTAL_X,
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
          k.color(rgb("#010409")), k.opacity(0.6), k.z(7)]);
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
