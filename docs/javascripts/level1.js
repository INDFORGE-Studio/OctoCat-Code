/* Niveau 1 — La Forêt des Syntaxes
 * Énigme : assigner la variable v_speed = 200 pour que l'OctoCat fonce à travers le Glitch.
 */
(function () {
  "use strict";

  var GROUND_Y = 200;
  var OCTO_X = 70, GLITCH_X = 300, PORTAL_X = 520;

  window.gameEngine.registerLevel({
    id: 1,
    zone: 1,
    title: "La Forêt des Syntaxes",
    alt: "L'OctoCat à gauche, un Glitch au centre et un portail verrouillé à droite.",

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
      var col = h.palette;
      var rgb = function (hex) { return k.Color.fromHex(hex); };

      // ---- décor ----
      for (var gx = 0; gx < 600; gx += 32) {
        k.add([k.sprite("grass"), k.pos(gx, GROUND_Y), k.scale(2), k.z(5)]);
        k.add([k.sprite("dirt"), k.pos(gx, GROUND_Y + 32), k.scale(2), k.z(5)]);
      }
      [20, 130, 225, 395, 470, 568].forEach(function (tx, i) {
        k.add([k.sprite("tree"), k.pos(tx, GROUND_Y + 2), k.anchor("bot"), k.scale(i % 2 ? 2 : 3),
          k.color(i % 2 ? rgb("#6e7681") : rgb("#a0a8b0")), k.z(1)]);
      });

      // glyphes de code qui dérivent dans la forêt
      var GLYPHS = ["{ }", "</>", ";", "01", "=>", "[]", "()"];
      for (var i = 0; i < 12; i++) {
        (function (i) {
          var g = k.add([k.text(GLYPHS[i % GLYPHS.length], { size: 12, font: "monospace" }),
            k.pos(k.rand(0, 600), k.rand(20, 150)), k.color(rgb("#238636")), k.opacity(0.25), k.z(0)]);
          var sp = k.rand(6, 18);
          g.onUpdate(function () { g.pos.x -= sp * k.dt(); if (g.pos.x < -30) g.pos.x = 630; });
        })(i);
      }

      // ---- personnages ----
      var portal = k.add([k.sprite("portal", { anim: "closed" }), k.pos(PORTAL_X, GROUND_Y + 2), k.anchor("bot"), k.scale(3), k.z(4)]);
      var glitch = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(GLITCH_X, GROUND_Y + 2), k.anchor("bot"), k.scale(4),
        k.color(), k.opacity(1), k.z(8)]);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(OCTO_X, GROUND_Y + 2), k.anchor("bot"), k.scale(4),
        k.color(), k.opacity(1), k.rotate(0), k.z(9)]);

      // ---- HUD ----
      k.add([k.text("FORÊT DES SYNTAXES · NIVEAU 1", { size: 11, font: "monospace" }), k.pos(10, 8), k.color(rgb("#8b949e")), k.z(20)]);
      var speedTxt = k.add([k.text("v_speed = ???", { size: 14, font: "monospace" }), k.pos(10, 24), k.color(rgb("#d29922")), k.z(20)]);
      var banner = k.add([k.text("", { size: 18, font: "monospace" }), k.pos(300, 70), k.anchor("center"),
        k.color(rgb("#3fb950")), k.opacity(0), k.z(20)]);

      // le Glitch flotte légèrement
      var t0 = 0;
      glitch.onUpdate(function () {
        t0 += k.dt();
        if (!glitch.__locked) glitch.pos.y = GROUND_Y + 2 - Math.abs(Math.sin(t0 * 3)) * 5;
      });

      function burst(x, y, colors, n) {
        for (var i = 0; i < n; i++) {
          (function () {
            var vx = k.rand(-140, 140), vy = k.rand(-220, -40), life = k.rand(0.5, 0.9), age = 0;
            var p = k.add([k.rect(4, 4), k.pos(x, y), k.color(rgb(colors[i % colors.length])), k.opacity(1), k.z(15)]);
            p.onUpdate(function () {
              age += k.dt(); vy += 520 * k.dt();
              p.pos.x += vx * k.dt(); p.pos.y += vy * k.dt();
              p.opacity = Math.max(0, 1 - age / life);
              if (age >= life) p.destroy();
            });
          })();
        }
      }

      function floatText(str, x, y, color) {
        var t = k.add([k.text(str, { size: 16, font: "monospace" }), k.pos(x, y), k.anchor("center"), k.color(rgb(color)), k.opacity(1), k.z(20)]);
        h.tween(0.9, function (e) { t.pos.y = y - 30 * e; t.opacity = 1 - e * e; }).then(function () { t.destroy(); });
      }

      function resetState() {
        octo.pos.x = OCTO_X; octo.pos.y = GROUND_Y + 2; octo.opacity = 1; octo.scale = k.vec2(4, 4); octo.angle = 0;
        octo.color = k.Color.WHITE; octo.play("idle");
        glitch.pos.x = GLITCH_X; glitch.__locked = false; glitch.color = k.Color.WHITE; glitch.opacity = 1; glitch.play("idle");
        portal.play("closed"); banner.opacity = 0;
        speedTxt.text = "v_speed = ???";
      }

      return {
        reset: resetState,

        success: function (result) {
          var speed = result.data.speed;
          var run = (OCTO_X + 190 - OCTO_X) / speed; // durée = distance / vitesse
          return h.tween(0.6, function (e) { speedTxt.text = "v_speed = " + Math.round(speed * e); })
            .then(function () {
              octo.play("run");
              return h.tween(run, function (e) { octo.pos.x = OCTO_X + 190 * e; }, function (p) { return p; });
            })
            .then(function () { // impact
              k.shake(9);
              glitch.__locked = true;
              glitch.play("hurt");
              burst(glitch.pos.x, glitch.pos.y - 30, ["#3fb950", "#39c5cf", "#f85149", "#f0f6fc"], 22);
              return h.tween(0.45, function (e) {
                glitch.opacity = 1 - e; glitch.scale = k.vec2(4 + e * 2, 4 * (1 - e * 0.8));
                glitch.pos.y = GROUND_Y + 2;
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
              portal.play("open");
              banner.text = "ACCÈS AUTORISÉ"; banner.opacity = 1;
              burst(PORTAL_X, GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 26);
              return h.wait(0.5);
            })
            .then(function () {
              octo.play("run");
              return h.tween(0.7, function (e) {
                octo.pos.x = PORTAL_X - 60 + 60 * e;
                octo.opacity = 1 - e;
                var s = 4 * (1 - 0.6 * e); octo.scale = k.vec2(s, s);
              });
            });
        },

        fail: function () {
          k.shake(14);
          glitch.__locked = true;
          glitch.play("attack");
          octo.play("fail");
          floatText("ERREUR", octo.pos.x, octo.pos.y - 70, "#f85149");
          var gx0 = glitch.pos.x;
          return h.tween(0.22, function (e) {
            glitch.pos.x = gx0 - 140 * e;
            glitch.pos.y = GROUND_Y + 2 - Math.sin(e * Math.PI) * 18;
          }, function (p) { return p * p; })
            .then(function () {
              octo.color = rgb("#f85149");
              octo.angle = -12;
              burst(octo.pos.x + 20, octo.pos.y - 30, ["#f85149", "#d29922"], 12);
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
