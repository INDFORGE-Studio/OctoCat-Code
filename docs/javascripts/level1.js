/* Niveau 1 — La Forêt des Syntaxes
 * Énigme : assigner la variable v_speed = 200 pour que l'OctoCat fonce à travers le Glitch.
 */
(function () {
  "use strict";

  var GROUND_Y = 200;
  var BASE_Y = GROUND_Y + 3;           // ligne de pieds des personnages
  var OCTO_X = 70, GLITCH_X = 300, PORTAL_X = 520;
  var S = 3;                           // échelle des personnages (sprites 24×24)

  window.gameEngine.registerLevel({
    id: 1,
    zone: 1,
    title: "La Forêt des Syntaxes",
    alt: "Une forêt nocturne : l'OctoCat à gauche, un Glitch au centre et un portail verrouillé à droite.",

    starter:
      "# Un Glitch bloque le chemin !\n" +
      "# Donne à l'OctoCat une vitesse de 200.\n" +
      "\n" +
      "v_speed = ???",

    hints: [
      "Une variable se déclare avec un nom, le signe = puis une valeur.",
      "Remplace les ??? par un nombre. Ici, la variable s'appelle v_speed (attention aux majuscules).",
      "La solution tient en une ligne : v_speed = 200"
    ],

    validate: function (code, engine) {
      var NAME = "v_speed", EXPECTED = 200;
      var msgs = [];
      if (!code.trim()) return { ok: false, messages: ["Aucun code détecté : l'éditeur est vide."] };
      if (/\?\?\?/.test(code)) {
        return { ok: false, messages: ["Il reste des « ??? » à remplacer par une vraie valeur."] };
      }

      var res = engine.validators.assignment(code, NAME, EXPECTED);
      if (res.run.errors.length) {
        res.run.errors.forEach(function (e) { msgs.push("Ligne " + e.line + " — SyntaxError : " + e.msg); });
        return { ok: false, messages: msgs };
      }
      if (!res.defined) {
        var near = Object.keys(res.run.vars).filter(function (n) { return n.toLowerCase().replace(/_/g, "") === "vspeed"; });
        msgs.push(near.length
          ? "NameError : « " + near[0] + " » n'est pas « " + NAME + " ». Les noms de variables respectent la casse et les underscores."
          : "NameError : la variable « " + NAME + " » n'a jamais été définie.");
        return { ok: false, messages: msgs };
      }
      if (typeof res.value !== "number") {
        return { ok: false, messages: ["TypeError : " + NAME + " doit être un nombre, pas du texte."] };
      }
      if (res.value !== EXPECTED) {
        msgs.push(NAME + " vaut " + res.value + " (attendu : " + EXPECTED + ") — " +
          (res.value < EXPECTED ? "l'OctoCat est trop lent pour percer le Glitch." : "trop rapide, le portail ne peut pas le synchroniser."));
        return { ok: false, messages: msgs };
      }
      return { ok: true, messages: ["v_speed = " + res.value + "  ✓"], data: { speed: res.value } };
    },

    scene: function (k, h) {
      var rgb = function (hex) { return k.Color.fromHex(hex); };
      var time = 0;
      var i;

      // ---------- ciel, lune, collines, lisière ----------
      k.add([k.sprite("bg"), k.pos(0, 0), k.scale(2), k.z(0)]);

      // ---------- arbres lointains (teintés bleu nuit) ----------
      [[40, "pine"], [118, "oak"], [262, "pine"], [352, "oak"], [446, "pine"], [586, "oak"]].forEach(function (t, n) {
        k.add([k.sprite(t[1]), k.pos(t[0], GROUND_Y - 4), k.anchor("bot"), k.scale(2),
          k.color(rgb(n % 2 ? "#5a7896" : "#6b88a5")), k.z(1)]);
      });

      // brume basse (2 bandes qui dérivent)
      var fogs = [];
      [[GROUND_Y - 30, 0.055, 7], [GROUND_Y - 12, 0.07, -5]].forEach(function (f, n) {
        var fog = k.add([k.rect(900, 12), k.pos(-150 + n * 60, f[0]), k.color(rgb("#9ecbff")), k.opacity(f[1]), k.z(2)]);
        fog.__speed = f[2];
        fogs.push(fog);
      });
      fogs.forEach(function (fog) {
        fog.onUpdate(function () {
          fog.pos.x += fog.__speed * k.dt();
          if (fog.pos.x > 0) fog.pos.x = -300; else if (fog.pos.x < -300) fog.pos.x = 0;
        });
      });

      // ---------- arbres moyens ----------
      [[22, "oak", 3], [168, "pine", 3], [388, "oak", 2], [552, "pine", 3]].forEach(function (t) {
        k.add([k.sprite(t[1]), k.pos(t[0], GROUND_Y + 2), k.anchor("bot"), k.scale(t[2]),
          k.color(rgb("#c8d6c8")), k.z(3)]);
      });

      // ---------- sol ----------
      for (var gx = 0, n = 0; gx < 600; gx += 32, n++) {
        k.add([k.sprite("grass" + (n % 3)), k.pos(gx, GROUND_Y), k.scale(2), k.z(5)]);
        k.add([k.sprite("dirt" + ((n + 1) % 3)), k.pos(gx, GROUND_Y + 32), k.scale(2), k.z(5)]);
      }
      // binaire fossilisé dans la terre
      ["0101", "1100", "0110", "1001", "0011"].forEach(function (bits, idx) {
        k.add([k.text(bits, { size: 9, font: "monospace" }), k.pos(30 + idx * 125, GROUND_Y + 30 + (idx % 2) * 10),
          k.color(rgb("#238636")), k.opacity(0.35), k.z(6)]);
      });

      // ---------- décors du sentier ----------
      k.add([k.sprite("bush"), k.pos(150, BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
      k.add([k.sprite("rock"), k.pos(395, BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
      var sign = k.add([k.sprite("sign"), k.pos(205, BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
      k.add([k.text("v_speed?", { size: 9, font: "monospace" }), k.pos(205, BASE_Y - 84 + 18 + 1), k.anchor("center"),
        k.color(rgb("#e3b341")), k.z(7)]);
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
      var portalGlow = k.add([k.sprite("glow"), k.pos(PORTAL_X, GROUND_Y - 58), k.anchor("center"), k.scale(4.2),
        k.color(rgb("#f85149")), k.opacity(0.12), k.z(3)]);
      var portal = k.add([k.sprite("portal", { anim: "closed" }), k.pos(PORTAL_X, BASE_Y), k.anchor("bot"), k.scale(3), k.z(4)]);
      var portalOpen = false;

      // ---------- personnages + ombres ----------
      // ombres : sprite « glow » aplati (KAPLAY n'a pas de composant ellipse)
      var octoShadow = k.add([k.sprite("glow"), k.pos(OCTO_X, BASE_Y), k.anchor("center"), k.scale(0.85, 0.17), k.color(rgb("#010409")), k.opacity(0.6), k.z(7)]);
      var glitchShadow = k.add([k.sprite("glow"), k.pos(GLITCH_X, BASE_Y), k.anchor("center"), k.scale(0.9, 0.17), k.color(rgb("#010409")), k.opacity(0.6), k.z(7)]);
      var glitch = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(GLITCH_X, BASE_Y), k.anchor("bot"), k.scale(S),
        k.color(), k.opacity(1), k.z(8)]);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(OCTO_X, BASE_Y), k.anchor("bot"), k.scale(S),
        k.color(), k.opacity(1), k.rotate(0), k.z(9)]);

      // ---------- lucioles + glyphes de code ----------
      var flies = [];
      for (i = 0; i < 16; i++) {
        var fx = k.rand(10, 590), fy2 = k.rand(110, 195);
        var fly = k.add([k.rect(2, 2), k.pos(fx, fy2), k.color(rgb("#d2f56a")), k.opacity(0.8), k.z(12)]);
        var aura = fly.add([k.sprite("glow"), k.pos(1, 1), k.anchor("center"), k.scale(0.28), k.color(rgb("#d2f56a")), k.opacity(0.3)]);
        flies.push({ o: fly, aura: aura, bx: fx, by: fy2, p: k.rand(0, 6.28), sx: k.rand(0.4, 1), sy: k.rand(0.5, 1.2) });
      }
      var GLYPHS = ["{ }", "</>", ";", "01", "=>", "[]", "()", "#"];
      for (i = 0; i < 9; i++) {
        (function (idx) {
          var g = k.add([k.text(GLYPHS[idx % GLYPHS.length], { size: 11, font: "monospace" }),
            k.pos(k.rand(0, 600), k.rand(20, 150)), k.color(rgb("#3fb950")), k.opacity(0.22), k.z(1)]);
          var sp = k.rand(5, 14), fall = k.rand(2, 6);
          g.onUpdate(function () {
            g.pos.x -= sp * k.dt(); g.pos.y += fall * k.dt();
            if (g.pos.x < -30) g.pos.x = 630;
            if (g.pos.y > 170) g.pos.y = 20;
          });
        })(i);
      }

      // ---------- vignette + HUD ----------
      k.add([k.sprite("vignette"), k.pos(0, 0), k.z(30)]);
      k.add([k.text("FORET DES SYNTAXES - NIVEAU 1", { size: 11, font: "monospace" }), k.pos(10, 8), k.color(rgb("#8b949e")), k.z(31)]);
      var speedTxt = k.add([k.text("v_speed = ???", { size: 14, font: "monospace" }), k.pos(10, 24), k.color(rgb("#d29922")), k.z(31)]);
      var banner = k.add([k.text("", { size: 18, font: "monospace" }), k.pos(300, 70), k.anchor("center"),
        k.color(rgb("#3fb950")), k.opacity(0), k.z(32)]);

      // ---------- vie du décor ----------
      var glitchBob = 0;
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
        if (!glitch.__locked) { glitchBob = Math.abs(Math.sin(time * 3)) * 5; glitch.pos.y = BASE_Y - glitchBob; }
        octoShadow.pos.x = octo.pos.x;
        octoShadow.opacity = 0.6 * octo.opacity;
        glitchShadow.pos.x = glitch.pos.x;
        glitchShadow.opacity = glitch.exists() ? 0.6 * glitch.opacity * (1 - glitchBob / 14) : 0;
      });

      function burst(x, y, colors, count) {
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
      }

      function floatText(str, x, y, color) {
        var t = k.add([k.text(str, { size: 16, font: "monospace" }), k.pos(x, y), k.anchor("center"), k.color(rgb(color)), k.opacity(1), k.z(32)]);
        h.tween(0.9, function (e) { t.pos.y = y - 30 * e; t.opacity = 1 - e * e; }).then(function () { t.destroy(); });
      }

      function setPortal(open) {
        portalOpen = open;
        portalGlow.color = rgb(open ? "#58a6ff" : "#f85149");
      }

      function resetState() {
        octo.pos.x = OCTO_X; octo.pos.y = BASE_Y; octo.opacity = 1; octo.scale = k.vec2(S, S); octo.angle = 0;
        octo.color = k.Color.WHITE; octo.play("idle");
        glitch.pos.x = GLITCH_X; glitch.__locked = false; glitch.color = k.Color.WHITE; glitch.opacity = 1; glitch.play("idle");
        portal.play("closed"); setPortal(false); banner.opacity = 0;
        speedTxt.text = "v_speed = ???";
      }

      return {
        reset: resetState,

        success: function (result) {
          var speed = result.data.speed;
          var run = 190 / speed; // durée = distance / vitesse
          return h.tween(0.6, function (e) { speedTxt.text = "v_speed = " + Math.round(speed * e); })
            .then(function () {
              octo.play("run");
              return h.tween(run, function (e) { octo.pos.x = OCTO_X + 190 * e; }, function (p) { return p; });
            })
            .then(function () { // impact
              k.shake(9);
              glitch.__locked = true;
              glitch.play("hurt");
              burst(glitch.pos.x, glitch.pos.y - 36, ["#3fb950", "#39c5cf", "#f85149", "#f0f6fc"], 24);
              return h.tween(0.45, function (e) {
                glitch.opacity = 1 - e; glitch.scale = k.vec2(S + e * 1.8, S * (1 - e * 0.8));
                glitch.pos.y = BASE_Y;
              });
            })
            .then(function () {
              glitch.destroy();
              octo.play("run");
              return h.tween(0.7, function (e) { octo.pos.x = OCTO_X + 190 + (PORTAL_X - 60 - (OCTO_X + 190)) * e; }, function (p) { return p; });
            })
            .then(function () {
              octo.play("success");
              portal.play("opening");
              k.shake(4);
              return h.wait(0.35);
            })
            .then(function () {
              portal.play("open"); setPortal(true);
              banner.text = "ACCES AUTORISE"; banner.opacity = 1;
              burst(PORTAL_X, GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 28);
              return h.wait(0.5);
            })
            .then(function () {
              octo.play("run");
              return h.tween(0.7, function (e) {
                octo.pos.x = PORTAL_X - 60 + 60 * e;
                octo.opacity = 1 - e;
                var s = S * (1 - 0.6 * e); octo.scale = k.vec2(s, s);
              });
            });
        },

        fail: function () {
          k.shake(14);
          glitch.__locked = true;
          glitch.play("attack");
          octo.play("fail");
          floatText("ERREUR", octo.pos.x, octo.pos.y - 84, "#f85149");
          var gx0 = glitch.pos.x;
          return h.tween(0.22, function (e) {
            glitch.pos.x = gx0 - 140 * e;
            glitch.pos.y = BASE_Y - Math.sin(e * Math.PI) * 18;
          }, function (p) { return p * p; })
            .then(function () {
              octo.color = rgb("#f85149");
              octo.angle = -12;
              burst(octo.pos.x + 20, octo.pos.y - 36, ["#f85149", "#d29922"], 12);
              k.shake(8);
              return h.tween(0.25, function (e) { octo.pos.x = OCTO_X - 25 * e; });
            })
            .then(function () { return h.wait(0.2); })
            .then(function () {
              return h.tween(0.5, function (e) {
                glitch.pos.x = gx0 - 140 * (1 - e);
                octo.pos.x = OCTO_X - 25 * (1 - e);
              });
            })
            .then(function () {
              octo.color = k.Color.WHITE; octo.angle = 0;
              octo.play("idle");
              glitch.__locked = false; glitch.play("idle");
            });
        }
      };
    }
  });
})();
