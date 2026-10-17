/* Niveau 8 — Le Temple des Cumuls (boucle + accumulateur)
 * Trajet : toits et colonnes à la Shinobi (double saut, shuriken). Énigme : additionner 1 + 2 + … + v_marches.
 */
(function () {
  "use strict";

  var STEPS = [6, 1, 4, 10, 0, 7];
  function sum(n) { return n * (n + 1) / 2; }

  window.gameEngine.registerLevel({
    id: 8,
    mood: 0.3,
    title: "Le Temple des Cumuls",
    alt: "Un temple : un escalier dont chaque marche porte plus de pièces que la précédente.",

    run: {
      mode: "platform", theme: "temple", abilities: { doubleJump: true, shuriken: true },
      course: [
        { t: "flat", n: 8, bits: [3, 4], candles: [6] },
        { t: "up", n: 2 }, { t: "flat", n: 4, hop: [2] },
        { t: "up", n: 2 }, { t: "flat", n: 4, bits: [1, 2], candles: [3] },
        { t: "gap", n: 3 },
        { t: "flat", n: 5, fly: [2], cp: 0 },
        { t: "up", n: 3 }, { t: "flat", n: 5, en: [2], bits: [3, 4] },
        { t: "gap", n: 3 },
        { t: "down", n: 2 }, { t: "flat", n: 7, dash: [2], en: [5], fly: [4] },
        { t: "up", n: 2 }, { t: "flat", n: 4, bits: [1, 2] },
        { t: "up", n: 2 }, { t: "flat", n: 4, cp: 0 },
        { t: "down", n: 6 }, { t: "flat", n: 4 }, // on descend vers le dernier trou : la falaise d en face est trop haute pour y grimper
        { t: "gap", n: 3 }, // le dernier saut se fait DANS le trou : l entree de la grotte est sur sa paroi
        { t: "cave", n: 14, open: 5 }
      ]
    },

    starter:
      "# 🏯 Le temple a v_marches marches. La 1re donne 1 pièce, la 2e en donne 2, etc.\n" +
      "# Additionne toutes les pièces dans v_total.\n" +
      "\n" +
      "v_total = 0\n" +
      "for i in range(1, ???):\n" +
      "    v_total = v_total + ???",

    briefing: {
      title: "Le Temple des Cumuls",
      lore: "Le gardien du temple compte les offrandes **marche par marche**. Pour ouvrir la porte, il veut la **somme** de toutes les pièces posées sur l'escalier.",
      lesson: "Une boucle peut **additionner au fur et à mesure** : on part d'une boîte à `0`, et à chaque tour on ajoute quelque chose dedans, comme une tirelire 🐷. Attention : `range(1, 5)` s'arrête **avant** 5 (il donne 1, 2, 3, 4). Pour aller **jusqu'à** 5, il faut écrire `range(1, 5 + 1)`.",
      examples: {
        "Pseudo-code": "v_total = 0\npour i de 1 a 4 faire\n  v_total = v_total + i\nfin pour",
        "Python": "v_total = 0\nfor i in range(1, 5):\n    v_total = v_total + i\n# v_total vaut 10",
        "JavaScript": "let v_total = 0;\nfor (let i = 1; i <= 4; i++) {\n  v_total = v_total + i;\n}"
      },
      tips: [
        "`i` est le numéro de la marche en cours : 1, puis 2, puis 3…",
        "`range(1, 5)` donne 1, 2, 3, 4 : le 5 n'est **pas** compris.",
        "Ton code doit marcher quel que soit le nombre de marches."
      ],
      goal: "Complète la boucle pour que **`v_total`** soit **1 + 2 + 3 + … jusqu'à `v_marches`**. Il y a **2 trous** à remplir : la fin du `range` et ce qu'on ajoute à chaque tour."
    },

    hints: [
      "À chaque tour, ajoute à v_total le numéro de la marche : c'est la valeur de i.",
      "La dernière marche est v_marches : range(1, ...) doit aller jusqu'à elle, donc s'arrêter à v_marches + 1.",
      "La réponse : for i in range(1, v_marches + 1):\n    v_total = v_total + i"
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_total", type: "number", okMessage: "v_total = 1 + 2 + … + v_marches",
        cases: STEPS.map(function (n) { return { env: { v_marches: n }, expect: sum(n) }; })
      });
    },

    scene: OctoPuzzle.scene({
      title: "TEMPLE DES CUMULS - NIVEAU 8",
      wash: ["#39c5cf", 0.08],
      lines: [{ text: "v_total = ???", color: "#d29922" }, { text: "v_marches = 6", color: "#58a6ff" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, X0 = 230, W = 34, N = 6, steps = [], coins = [];
        for (var i = 0; i < N; i++) {
          var hgt = 14 + i * 12;
          steps.push(k.add([k.rect(W - 2, hgt), k.pos(X0 + i * W, BASE_Y - hgt), k.color(rgb("#6e8a96")), k.z(6.6)]));
          k.add([k.rect(W - 2, 3), k.pos(X0 + i * W, BASE_Y - hgt), k.color(rgb("#a8d0d8")), k.z(6.7)]);
          var col = [];
          for (var c = 0; c <= i; c++) {
            col.push(k.add([k.sprite("bit"), k.pos(X0 + i * W + 8 + (c % 2) * 12, BASE_Y - hgt - 12 - Math.floor(c / 2) * 12), k.anchor("center"), k.scale(1.1), k.opacity(0), k.z(7)]));
          }
          coins.push(col);
        }
        function setCoins(upTo) { coins.forEach(function (col, idx) { col.forEach(function (c) { c.opacity = idx < upTo ? 1 : 0; }); }); }
        return {
          reveal: function (result) {
            var total = 0, chain = Promise.resolve();
            for (var j = 0; j < N; j++) {
              (function (idx) {
                chain = chain.then(function () {
                  total += idx + 1;
                  setCoins(idx + 1);
                  steps[idx].color = rgb("#3fb950");
                  sc.burst(X0 + idx * W + 16, BASE_Y - 14 - idx * 12, ["#e3b341", "#ffffff"], 5);
                  hud.set(0, "v_total = " + total, "#3fb950");
                  return h.wait(0.22);
                });
              })(j);
            }
            return chain.then(function () { return h.wait(0.3); });
          },
          reset: function () { setCoins(0); steps.forEach(function (s) { s.color = rgb("#6e8a96"); }); }
        };
      }
    })
  });
})();
