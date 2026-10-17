/* Niveau 5 — Le Pont des Booléens
 * Énigme : écrire la condition qui rend le pont solide quand v_energie >= 50.
 * Le code du joueur est exécuté (par l'interpréteur sécurisé) avec plusieurs valeurs d'énergie : la condition
 * doit être juste dans tous les cas, pas seulement pour l'énergie montrée à l'écran.
 */
(function () {
  "use strict";

  var OCTO_X = 60, S = 3;
  var CHASM_X = 165, PLANKS = 8, PLANK_W = 30; // gouffre de 240 px, 8 planches
  var THRESHOLD = 50, SHOWN_ENERGY = 80;
  var CASES = [0, 20, 49, 50, 51, 80, 100];

  window.gameEngine.registerLevel({
    id: 5,
    zone: 1,
    mood: 0.25, // musique : joyeuse, avec une légère alerte (le pont s'effondre)
    title: "Le Pont des Booléens",
    run: {
      mode: "platform", theme: "bridge", abilities: {},
      course: [
        { t: "flat", n: 9 },
        { t: "flat", n: 5, hop: [2], bits: [3, 4] },
        { t: "gap", n: 2 }, { t: "flat", n: 4, bits: [1, 2] }, { t: "gap", n: 2 }, { t: "flat", n: 4, en: [1] }, { t: "gap", n: 2 },
        { t: "flat", n: 8, cp: 2, bits: [3, 4, 5] },
        { t: "up", n: 1 }, { t: "flat", n: 5, en: [2] }, { t: "down", n: 1 },
        { t: "gap", n: 2 }, { t: "flat", n: 4 }, { t: "gap", n: 2 }, { t: "flat", n: 4, en: [1], bits: [2] }, { t: "gap", n: 2 },
        { t: "flat", n: 6, bits: [2, 3] },
        { t: "end", n: 9 }
      ]
    },
    alt: "Un pont de planches au-dessus d'un gouffre : l'OctoCat à gauche, un portail fermé à droite.",

    starter:
      "# 🌉 Le pont s'effondre case par case !\n" +
      "# Il tient seulement si l'OctoCat a assez d'énergie : 50 ou plus.\n" +
      "# v_energie contient son énergie.\n" +
      "\n" +
      "v_pont = \"fragile\"\n" +
      "\n" +
      "if ???:\n" +
      "    v_pont = \"solide\"",

    briefing: {
      title: "Le Pont des Booléens",
      lore: "Tu as passé le premier portail ! Devant toi, un pont de pixels s'effondre case par case… Seuls les endroits où la condition est **vraie** tiennent encore.",
      lesson: "Une **condition** est une question dont la réponse est « vrai » ou « faux » : par exemple « as-tu au moins 50 d'énergie ? ». On la pose avec le mot `if` (« **si** »). Si c'est vrai, l'ordinateur fait ce qui est écrit dessous. Sinon, il passe son chemin. Pour comparer, on a `==` (égal), `!=` (différent), `<` (plus petit), `>` (plus grand), `<=` et `>=`.",
      examples: {
        "Pseudo-code": 'si v_vie > 0 alors\n  v_etat = "vivant"\nsinon\n  v_etat = "perdu"\nfin si',
        "Python": 'if v_vie > 0:\n    v_etat = "vivant"\nelse:\n    v_etat = "perdu"',
        "JavaScript": 'if (v_vie > 0) {\n  v_etat = "vivant";\n} else {\n  v_etat = "perdu";\n}'
      },
      tips: [
        "Un seul `=` **met** une valeur dans une boîte. Deux `==` **comparent**.",
        "En Python, ce qui dépend du `if` est **décalé vers la droite** (4 espaces). En JavaScript, c'est entre `{ }`.",
        "`>=` veut dire « plus grand **ou égal** » : `50 >= 50` est vrai !"
      ],
      goal: "Écris la condition qui rend le pont `\"solide\"` quand **`v_energie`** vaut **50 ou plus**. Remplace les `???` juste après le `if`."
    },

    hints: [
      "Une condition compare deux choses avec ==, !=, <, >, <= ou >=. Elle se met juste après if.",
      "Le pont tient avec au moins 50 d'énergie. Compare v_energie à 50 avec « plus grand ou égal ».",
      "La réponse : if v_energie >= 50:"
    ],

    validate: function (code, engine) {
      var run = engine.interpreter.run;
      if (!code.trim()) return { ok: false, messages: [OctoPuzzle.msg.empty] };
      if (/\?\?\?/.test(code)) return { ok: false, messages: ["Oups, il reste des « ??? » ! Écris ta condition à leur place."] };

      // 1. Le code doit être correct, quelle que soit l'énergie.
      var first = run(code, { v_energie: SHOWN_ENERGY });
      if (first.errors.length) {
        return { ok: false, messages: first.errors.map(OctoPuzzle.msg.syntax) };
      }

      // 2. Il doit donner le bon résultat pour toutes les énergies testées.
      for (var i = 0; i < CASES.length; i++) {
        var energy = CASES[i], r = run(code, { v_energie: energy });
        if (r.errors.length) {
          return { ok: false, messages: r.errors.map(function (e) { return "Ligne " + e.line + " : " + e.msg; }) };
        }
        var bridge = r.vars.v_pont, solid = bridge === "solide";
        if (energy >= THRESHOLD && !solid) {
          var tip = typeof bridge === "string" && bridge.toLowerCase() === "solide" ? " (attention à la casse : « solide » en minuscules)" : "";
          return {
            ok: false,
            messages: ["Avec v_energie = " + energy + ", le pont devrait être solide (v_pont vaut " + JSON.stringify(bridge) + ")" + tip + "."],
            data: { energy: energy, collapse: true }
          };
        }
        if (energy < THRESHOLD && solid) {
          return {
            ok: false,
            messages: ["Avec v_energie = " + energy + ", le pont devient solide alors que l'énergie est trop faible : il faut une condition."],
            data: { energy: energy, collapse: true }
          };
        }
      }
      return { ok: true, messages: ["Le pont tient pour v_energie >= " + THRESHOLD + "  ✓ (testé avec " + CASES.join(", ") + ")"], data: { energy: SHOWN_ENERGY } };
    },

    scene: function (k, h, ctx) {
      var sc = OctoScenery.build(k, h, { portalOpen: false, reserve: ctx.reserve });
      var rgb = sc.rgb, BASE_Y = sc.BASE_Y, GROUND_Y = sc.GROUND_Y, PORTAL_X = sc.PORTAL_X;
      var CHASM_END = CHASM_X + PLANKS * PLANK_W;

      // gouffre : la roche est « creusée » entre deux piliers, de la lueur rouge remonte du fond
      k.add([k.rect(PLANKS * PLANK_W, 70), k.pos(CHASM_X, GROUND_Y), k.color(rgb("#0b0716")), k.z(5.6)]);
      var rift = k.add([k.rect(PLANKS * PLANK_W, 26), k.pos(CHASM_X, GROUND_Y + 44), k.color(rgb("#f85149")), k.opacity(0.16), k.z(5.7)]);
      [CHASM_X - 5, CHASM_END + 1].forEach(function (px) {
        k.add([k.rect(5, 26), k.pos(px, GROUND_Y - 22), k.color(rgb("#4a3a63")), k.z(6.8)]);
        k.add([k.rect(5, 3), k.pos(px, GROUND_Y - 22), k.color(rgb("#8957e5")), k.z(6.9)]);
      });

      // planches : « fragile » = bois pourri qui clignote en rouge, « solide » = bois clair surligné de vert
      var planks = [];
      for (var i = 0; i < PLANKS; i++) {
        var x = CHASM_X + i * PLANK_W;
        planks.push({
          x: x,
          body: k.add([k.rect(PLANK_W - 3, 7), k.pos(x + 1, BASE_Y - 1), k.color(rgb("#6b3f35")), k.opacity(1), k.z(7)]),
          top: k.add([k.rect(PLANK_W - 3, 2), k.pos(x + 1, BASE_Y - 1), k.color(rgb("#f85149")), k.opacity(0.55), k.z(7.1)])
        });
      }
      function plankState(pl, state) {
        pl.body.color = rgb(state === "solid" ? "#c08a4f" : "#6b3f35");
        pl.top.color = rgb(state === "solid" ? "#3fb950" : "#f85149");
        pl.top.opacity = state === "solid" ? 1 : 0.55;
      }

      var octoShadow = sc.shadow(OCTO_X, 0.85);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(OCTO_X, BASE_Y), k.anchor("bot"), k.scale(S),
        k.color(), k.opacity(1), k.rotate(0), k.z(9)]);

      // HUD (capitales sans accents : la police par défaut de KAPLAY n'a pas les accents)
      k.add([k.rect(sc.viewW, 16), k.pos(0, 40), k.color(rgb("#0d1117")), k.opacity(0.42), k.fixed(), k.z(30.5)]); // prolonge la barre du HUD sous la 3e ligne
      k.add([k.text("PONT DES BOOLEENS - NIVEAU 5", { size: 11, font: "monospace" }), k.pos(10, 8), k.color(rgb("#e6edf3")), k.fixed(), k.z(31)]);
      var energyTxt = k.add([k.text("v_energie = " + SHOWN_ENERGY, { size: 12, font: "monospace" }), k.pos(10, 24), k.color(rgb("#58a6ff")), k.fixed(), k.z(31)]);
      var bridgeTxt = k.add([k.text('v_pont = "fragile"', { size: 12, font: "monospace" }), k.pos(10, 40), k.color(rgb("#d29922")), k.fixed(), k.z(31)]);
      var banner = k.add([k.text("", { size: 18, font: "monospace" }), k.pos(sc.viewW / 2, 70), k.anchor("center"),
        k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);

      sc.onFrame(function (t) {
        octoShadow.pos.x = octo.pos.x;
        octoShadow.opacity = octo.pos.y >= BASE_Y - 1 ? 0.6 * octo.opacity : 0;
        rift.opacity = 0.14 + 0.06 * Math.sin(t * 2.4);
        planks.forEach(function (pl, n) { // le bois pourri clignote tant qu'il n'est pas réparé
          if (pl.body.__solid || pl.body.__fallen) return;
          pl.top.opacity = 0.4 + 0.25 * Math.sin(t * 5 + n);
        });
      });

      function resetState() {
        octo.pos.x = OCTO_X; octo.pos.y = BASE_Y; octo.opacity = 1; octo.scale = k.vec2(S, S); octo.angle = 0;
        octo.color = k.Color.WHITE; octo.play("idle");
        planks.forEach(function (pl) {
          pl.body.__solid = false; pl.body.__fallen = false;
          pl.body.pos.y = BASE_Y - 1; pl.top.pos.y = BASE_Y - 1; pl.body.opacity = 1; pl.body.angle = 0; pl.top.angle = 0;
          plankState(pl, "fragile");
        });
        sc.setPortal(false); banner.opacity = 0;
        energyTxt.text = "v_energie = " + SHOWN_ENERGY;
        bridgeTxt.text = 'v_pont = "fragile"'; bridgeTxt.color = rgb("#d29922");
      }

      function lightPlanks() { // les planches s'allument l'une après l'autre
        var chain = Promise.resolve();
        planks.forEach(function (pl) {
          chain = chain.then(function () {
            pl.body.__solid = true; plankState(pl, "solid");
            sc.burst(pl.x + PLANK_W / 2, BASE_Y - 4, ["#3fb950", "#39c5cf"], 3);
            return h.wait(0.07);
          });
        });
        return chain;
      }

      return {
        reset: resetState,

        success: function (result) {
          energyTxt.text = "v_energie = " + result.data.energy;
          return h.wait(0.3)
            .then(function () { bridgeTxt.text = 'v_pont = "solide"'; bridgeTxt.color = rgb("#3fb950"); return lightPlanks(); })
            .then(function () {
              octo.play("run");
              return h.tween(1.5, function (e) { octo.pos.x = OCTO_X + (PORTAL_X - 70 - OCTO_X) * e; }, function (p) { return p; });
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
              sc.burst(PORTAL_X, GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 28);
              return h.wait(0.5);
            })
            .then(function () {
              octo.play("run");
              return h.tween(0.7, function (e) {
                octo.pos.x = PORTAL_X - 70 + 70 * e;
                octo.opacity = 1 - e;
                var s = S * (1 - 0.6 * e); octo.scale = k.vec2(s, s);
              });
            });
        },

        fail: function (result) {
          var d = result && result.data;
          if (d && d.energy != null) energyTxt.text = "v_energie = " + d.energy;
          if (!d || !d.collapse) { // erreur de syntaxe : le pont tremble, rien ne tombe
            k.shake(10);
            octo.play("fail");
            sc.floatText("ERREUR", octo.pos.x, octo.pos.y - 84, "#f85149");
            return h.wait(0.9).then(function () { octo.play("idle"); });
          }
          // erreur de logique : l'OctoCat s'engage, le pont cède sous lui
          octo.play("run");
          var stopX = CHASM_X + 28;
          return h.tween(0.55, function (e) { octo.pos.x = OCTO_X + (stopX - OCTO_X) * e; }, function (p) { return p; })
            .then(function () {
              k.shake(12);
              octo.play("fail");
              sc.floatText("ERREUR", octo.pos.x, octo.pos.y - 84, "#f85149");
              planks.forEach(function (pl, n) {
                pl.body.__fallen = true;
                var y0 = BASE_Y - 1;
                h.wait(n * 0.07).then(function () {
                  return h.tween(0.55, function (e) {
                    pl.body.pos.y = y0 + 90 * e * e; pl.top.pos.y = y0 + 90 * e * e;
                    pl.body.angle = (n % 2 ? 1 : -1) * 40 * e; pl.top.angle = pl.body.angle;
                    pl.body.opacity = 1 - e; pl.top.opacity = 0.6 * (1 - e);
                  });
                });
              });
              return h.tween(0.6, function (e) {
                octo.pos.y = BASE_Y + 120 * e * e; octo.angle = -25 * e; octo.opacity = 1 - e * 0.9;
              });
            })
            .then(function () { return h.wait(0.5); })
            .then(function () { resetState(); });
        }
      };
    }
  });
})();
