/* Niveau 3 — La Mine des Opérations (arithmétique)
 * Trajet : plateformes à la Castlevania (fouet, bougies, chauves-souris, pics). Énigme : calculer la charge de l'ascenseur.
 */
(function () {
  "use strict";

  var CASES = [[6, 25], [3, 40], [10, 15], [1, 80], [0, 50]];

  window.gameEngine.registerLevel({
    id: 3,
    zone: 1,
    mood: 0.2,
    title: "La Mine des Opérations",
    alt: "Une mine : un ascenseur chargé de caisses mène vers le portail.",

    run: {
      mode: "platform", theme: "mine", abilities: { whip: true },
      course: [
        { t: "flat", n: 9, candles: [5] },
        { t: "flat", n: 8, fly: [4], bits: [2, 3] },
        { t: "gap", n: 2 },
        { t: "flat", n: 8, en: [3], hop: [5], candles: [6], cp: 1 },
        { t: "flat", n: 7, spikes: [3], bits: [1, 2] },
        { t: "up", n: 1 }, { t: "flat", n: 7, tough: [3], candles: [1] },
        { t: "down", n: 1 }, { t: "gap", n: 2 },
        { t: "flat", n: 9, fly: [3, 6], dash: [8], cp: 0 },
        { t: "up", n: 2 }, { t: "flat", n: 6, spikes: [2, 3], bits: [4] },
        { t: "down", n: 2 }, { t: "flat", n: 4, candles: [2] },
        { t: "end", n: 9 }
      ]
    },

    starter:
      "# 📦 v_caisses = le nombre de caisses. v_poids_caisse = le poids d'une caisse.\n" +
      "# La charge totale = le nombre de caisses × le poids d'une caisse.\n" +
      "# (Le signe pour multiplier est * )\n" +
      "\n" +
      "v_charge = ???",

    briefing: {
      title: "La Mine des Opérations",
      lore: "Au fond de la mine, un vieil ascenseur ne démarre que si on lui dit combien pèsent **toutes** les caisses. Les Glitches ont effacé le calcul du chef de mine. Aide-le !",
      lesson: "Un ordinateur est très fort en calcul ! On utilise `+` (ajouter), `-` (enlever), `*` (**multiplier**), `/` (diviser) et `%` (le **reste** d'une division). On peut même calculer avec des variables : `v_a * v_b`.",
      examples: {
        "Pseudo-code": "v_surface = v_largeur * v_hauteur",
        "Python": "v_surface = v_largeur * v_hauteur\nv_reste = 17 % 5   # 2",
        "JavaScript": "let v_surface = v_largeur * v_hauteur;\nlet v_reste = 17 % 5;   // 2"
      },
      tips: [
        "`*` multiplie : 3 sacs de 5 billes, c'est `3 * 5` = 15 billes.",
        "`%` donne le **reste** : `17 % 5` = 2 (17, c'est 5 + 5 + 5, et il reste 2).",
        "Ton calcul doit marcher avec **n'importe quel** nombre de caisses, pas seulement celui que tu vois."
      ],
      goal: "Calcule **`v_charge`** : le **nombre de caisses** multiplié par le **poids d'une caisse**. Utilise les deux variables qui existent déjà : `v_caisses` et `v_poids_caisse`."
    },

    hints: [
      "La charge totale, c'est le nombre de caisses multiplié par le poids d'une seule caisse.",
      "Le signe pour multiplier est *. Utilise les deux variables qui existent déjà.",
      "La réponse : v_charge = v_caisses * v_poids_caisse"
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_charge", type: "number", okMessage: "v_charge = v_caisses * v_poids_caisse",
        cases: CASES.map(function (c) { return { env: { v_caisses: c[0], v_poids_caisse: c[1] }, expect: c[0] * c[1] }; })
      });
    },

    scene: OctoPuzzle.scene({
      title: "MINE DES OPERATIONS - NIVEAU 3",
      wash: ["#0b0716", 0.28],
      lines: [{ text: "v_charge = ???", color: "#d29922" }, { text: "v_caisses = 6   v_poids_caisse = 25", color: "#58a6ff" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, CX = 380, parts = [], crates = [];
        // puits de l'ascenseur
        [CX - 46, CX + 40].forEach(function (x) { k.add([k.rect(6, 190), k.pos(x, BASE_Y - 190), k.color(rgb("#4a3a63")), k.z(6.5)]); });
        k.add([k.rect(98, 6), k.pos(CX - 48, BASE_Y - 190), k.color(rgb("#4a3a63")), k.z(6.5)]);
        var cage = k.add([k.rect(84, 8), k.pos(CX - 42, BASE_Y - 8), k.color(rgb("#8b949e")), k.z(7)]);
        var rope = k.add([k.rect(2, 150), k.pos(CX - 1, BASE_Y - 160), k.color(rgb("#6e7681")), k.z(6.9)]);
        parts.push(cage);
        // 6 caisses (3 × 2)
        for (var i = 0; i < 6; i++) {
          var c = k.add([k.rect(22, 20), k.pos(CX - 38 + (i % 3) * 26, BASE_Y - 28 - Math.floor(i / 3) * 22), k.color(rgb("#a1713b")), k.opacity(0), k.z(7.1)]);
          crates.push(c);
        }
        var gauge = k.add([k.text("", { size: 11, font: "monospace" }), k.pos(CX, BASE_Y - 100), k.anchor("center"), k.color(rgb("#ffe08a")), k.z(7.3)]);
        return {
          reveal: function (result) {
            var n = 6, per = 25, chain = Promise.resolve();
            for (var j = 0; j < n; j++) {
              (function (idx) {
                chain = chain.then(function () {
                  crates[idx].opacity = 1; gauge.text = ((idx + 1) * per) + " KG";
                  sc.burst(crates[idx].pos.x + 11, crates[idx].pos.y, ["#e3b341", "#ffffff"], 4);
                  return h.wait(0.13);
                });
              })(j);
            }
            return chain.then(function () {
              hud.set(0, "v_charge = " + result.data.value, "#3fb950");
              gauge.text = result.data.value + " KG  OK";
              return h.wait(0.3);
            }).then(function () {
              return h.tween(0.7, function (t) { // l'ascenseur monte : le chemin se dégage
                var dy = -100 * t;
                cage.pos.y = BASE_Y - 8 + dy; rope.pos.y = BASE_Y - 160 + dy * 0.5;
                crates.forEach(function (c2, idx) { c2.pos.y = BASE_Y - 28 - Math.floor(idx / 3) * 22 + dy; });
                gauge.pos.y = BASE_Y - 100 + dy;
              });
            });
          },
          reset: function () {
            cage.pos.y = BASE_Y - 8; rope.pos.y = BASE_Y - 160; gauge.text = ""; gauge.pos.y = BASE_Y - 100;
            crates.forEach(function (c2, idx) { c2.opacity = 0; c2.pos.y = BASE_Y - 28 - Math.floor(idx / 3) * 22; });
          }
        };
      }
    })
  });
})();
