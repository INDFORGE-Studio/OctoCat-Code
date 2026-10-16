/* Niveau 1 — La Forêt des Syntaxes
 * Énigme : assigner la variable v_speed = 200 pour que l'OctoCat fonce à travers le Glitch.
 * Le décor vient de scenery.js ; ce fichier ne contient que ce qui est propre au niveau.
 */
(function () {
  "use strict";

  var OCTO_X = 70, GLITCH_X = 300;
  var S = 3; // échelle des personnages (sprites 24×24)

  window.gameEngine.registerLevel({
    id: 1,
    zone: 1,
    mood: 0.35, // musique : joyeuse, avec une légère alerte (un Glitch rôde) ; `combat: true` = musique épique
    title: "La Forêt des Syntaxes",
    alt: "Une forêt nocturne : l'OctoCat à gauche, un Glitch au centre et un portail verrouillé à droite.",

    starter:
      "# Un Glitch bloque le chemin !\n" +
      "# Donne à l'OctoCat une vitesse de 200.\n" +
      "\n" +
      "v_speed = ???",

    briefing: {
      title: "La Forêt des Syntaxes",
      lore: "Les arbres de GitHubia murmurent en { } et en ;. Un Glitch, fragment de code corrompu, bloque le sentier menant au premier Portail à Code.",
      lesson: "Une variable est une boîte étiquetée qui garde une valeur. On lui donne un nom, puis on lui assigne une valeur avec le signe =.",
      examples: { "Pseudo-code": "v_vie = 3", "Python": "v_vie = 3", "JavaScript": "let v_vie = 3;" },
      tips: ["= donne une valeur ; == compare deux valeurs.", "Les noms respectent la casse : v_speed et V_Speed sont deux boîtes différentes."],
      goal: "déclare la variable v_speed et donne-lui la valeur 200."
    },

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

    scene: function (k, h, ctx) {
      var sc = OctoScenery.build(k, h, { portalOpen: false, reserve: ctx.reserve });
      var rgb = sc.rgb, BASE_Y = sc.BASE_Y, PORTAL_X = sc.PORTAL_X;

      // panneau du sentier
      k.add([k.sprite("sign"), k.pos(205, BASE_Y + 1), k.anchor("bot"), k.scale(3), k.z(6)]);
      k.add([k.text("v_speed?", { size: 9, font: "monospace" }), k.pos(205, BASE_Y - 84 + 18 + 1), k.anchor("center"),
        k.color(rgb("#e3b341")), k.z(7)]);

      // personnages + ombres
      var octoShadow = sc.shadow(OCTO_X, 0.85);
      var glitchShadow = sc.shadow(GLITCH_X, 0.9);
      var glitch = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(GLITCH_X, BASE_Y), k.anchor("bot"), k.scale(S),
        k.color(), k.opacity(1), k.z(8)]);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(OCTO_X, BASE_Y), k.anchor("bot"), k.scale(S),
        k.color(), k.opacity(1), k.rotate(0), k.z(9)]);

      // HUD (la police par défaut de KAPLAY n'a pas les accents : texte en capitales sans accents)
      k.add([k.text("FORET DES SYNTAXES - NIVEAU 1", { size: 11, font: "monospace" }), k.pos(10, 8), k.color(rgb("#e6edf3")), k.fixed(), k.z(31)]);
      var speedTxt = k.add([k.text("v_speed = ???", { size: 14, font: "monospace" }), k.pos(10, 24), k.color(rgb("#d29922")), k.fixed(), k.z(31)]);
      var banner = k.add([k.text("", { size: 18, font: "monospace" }), k.pos(sc.viewW / 2, 70), k.anchor("center"),
        k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);

      var glitchBob = 0;
      sc.onFrame(function (t) {
        if (!glitch.__locked) { glitchBob = Math.abs(Math.sin(t * 3)) * 5; glitch.pos.y = BASE_Y - glitchBob; }
        octoShadow.pos.x = octo.pos.x;
        octoShadow.opacity = 0.6 * octo.opacity;
        glitchShadow.pos.x = glitch.pos.x;
        glitchShadow.opacity = glitch.exists() ? 0.6 * glitch.opacity * (1 - glitchBob / 14) : 0;
      });

      function resetState() {
        octo.pos.x = OCTO_X; octo.pos.y = BASE_Y; octo.opacity = 1; octo.scale = k.vec2(S, S); octo.angle = 0;
        octo.color = k.Color.WHITE; octo.play("idle");
        glitch.pos.x = GLITCH_X; glitch.__locked = false; glitch.color = k.Color.WHITE; glitch.opacity = 1; glitch.play("idle");
        sc.setPortal(false); banner.opacity = 0;
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
              sc.burst(glitch.pos.x, glitch.pos.y - 36, ["#3fb950", "#39c5cf", "#f85149", "#f0f6fc"], 24);
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
              sc.portal.play("opening");
              k.shake(4);
              return h.wait(0.35);
            })
            .then(function () {
              sc.setPortal(true);
              banner.text = "ACCES AUTORISE"; banner.opacity = 1;
              sc.burst(PORTAL_X, sc.GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 28);
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
          sc.floatText("ERREUR", octo.pos.x, octo.pos.y - 84, "#f85149");
          var gx0 = glitch.pos.x;
          return h.tween(0.22, function (e) {
            glitch.pos.x = gx0 - 140 * e;
            glitch.pos.y = BASE_Y - Math.sin(e * Math.PI) * 18;
          }, function (p) { return p * p; })
            .then(function () {
              octo.color = rgb("#f85149");
              octo.angle = -12;
              sc.burst(octo.pos.x + 20, octo.pos.y - 36, ["#f85149", "#d29922"], 12);
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
