/* Niveau 9 — Le Tri des Glitches (boucle + condition + reste de la division)
 * Trajet : mélange fouet + shuriken. Énigme : compter les glitches pairs numérotés de 1 à v_n.
 */
(function () {
  "use strict";

  var NS = [10, 1, 4, 15, 0, 7];
  function evens(n) { return Math.floor(n / 2); }

  window.gameEngine.registerLevel({
    id: 9,
    zone: 1,
    mood: 0.35,
    title: "Le Tri des Glitches",
    alt: "Un tapis roulant de caisses numérotées : les pairs doivent être comptés.",

    run: {
      mode: "platform", theme: "sort", abilities: { whip: true, shuriken: true },
      course: [
        { t: "flat", n: 8, candles: [4] },
        { t: "flat", n: 8, en: [3], hop: [6], bits: [1, 2] },
        { t: "gap", n: 2 },
        { t: "flat", n: 7, fly: [2, 5], cp: 1 },
        { t: "up", n: 1 }, { t: "flat", n: 8, tough: [3], en: [6], spikes: [1] },
        { t: "down", n: 1 }, { t: "gap", n: 2 },
        { t: "flat", n: 7, tough: [2], dash: [5], bits: [3, 4] },
        { t: "up", n: 2 }, { t: "flat", n: 7, fly: [2], en: [5], spikes: [3], candles: [1] },
        { t: "down", n: 2 }, { t: "gap", n: 2 },
        { t: "flat", n: 8, tough: [3], fly: [5], cp: 0 },
        { t: "end", n: 9 }
      ]
    },

    starter:
      "# 🔢 Les glitches sont numérotés de 1 à v_n. Les numéros PAIRS sont dangereux !\n" +
      "# Compte-les dans v_pairs.\n" +
      "# Astuce : un nombre est pair si le reste de sa division par 2 vaut 0.\n" +
      "\n" +
      "v_pairs = 0\n" +
      "\n" +
      "for i in range(1, v_n + 1):\n" +
      "    if ???:\n" +
      "        v_pairs = v_pairs + 1",

    briefing: {
      title: "Le Tri des Glitches",
      lore: "Une machine fabrique des Glitches numérotés. Seuls ceux qui ont un numéro **pair** sont instables : il faut les repérer avant qu'ils n'explosent !",
      lesson: "On peut mettre un `if` **dans** une boucle : il est vérifié à **chaque tour**. Pour savoir si un nombre est **pair**, on utilise `%` (le **reste** de la division) : un nombre est pair quand le reste de sa division par 2 est `0`. Par exemple `8 % 2` vaut 0 (pair) et `7 % 2` vaut 1 (impair).",
      examples: {
        "Pseudo-code": "pour i de 1 a 10 faire\n  si i % 3 == 0 alors\n    v_n = v_n + 1\n  fin si\nfin pour",
        "Python": "for i in range(1, 11):\n    if i % 3 == 0:\n        v_n = v_n + 1",
        "JavaScript": "for (let i = 1; i <= 10; i++) {\n  if (i % 3 === 0) {\n    v_n = v_n + 1;\n  }\n}"
      },
      tips: [
        "`==` **compare** (deux signes `=`) et `=` **range**. Écris bien `i % 2 == 0`.",
        "`%` donne le reste : `9 % 2` vaut 1 (impair), `10 % 2` vaut 0 (pair).",
        "Le `if` est vérifié à chaque tour, avec le `i` du moment."
      ],
      goal: "Écris la condition qui reconnaît un numéro **pair**, pour compter combien il y en a de 1 à `v_n`. Remplace les `???` juste après le `if`."
    },

    hints: [
      "Un nombre est pair quand le reste de sa division par 2 est 0.",
      "Le reste s'obtient avec %. Pour comparer à 0, on écrit ==.",
      "La réponse : if i % 2 == 0:"
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_pairs", type: "number", okMessage: "v_pairs compte bien les pairs",
        cases: NS.map(function (n) { return { env: { v_n: n }, expect: evens(n) }; })
      });
    },

    scene: OctoPuzzle.scene({
      title: "TRI DES GLITCHES - NIVEAU 9",
      wash: ["#bc8cff", 0.1],
      lines: [{ text: "v_pairs = ???", color: "#d29922" }, { text: "v_n = 10", color: "#58a6ff" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, X0 = 180, W = 26, N = 10, boxes = [];
        k.add([k.rect(N * W + 6, 8), k.pos(X0 - 3, BASE_Y - 10), k.color(rgb("#4a3a63")), k.z(6.6)]);
        k.add([k.rect(N * W + 6, 2), k.pos(X0 - 3, BASE_Y - 10), k.color(rgb("#8a78a0")), k.z(6.7)]);
        for (var i = 0; i < N; i++) {
          var b = k.add([k.rect(W - 4, 24), k.pos(X0 + i * W, BASE_Y - 34), k.color(rgb("#6e5a98")), k.z(6.8)]);
          var t = k.add([k.text(String(i + 1), { size: 11, font: "monospace" }), k.pos(X0 + i * W + (W - 4) / 2, BASE_Y - 22), k.anchor("center"), k.color(rgb("#f0f6fc")), k.z(6.9)]);
          boxes.push({ b: b, t: t });
        }
        return {
          reveal: function (result) {
            var count = 0, chain = Promise.resolve();
            for (var j = 0; j < N; j++) {
              (function (idx) {
                chain = chain.then(function () {
                  var even = (idx + 1) % 2 === 0;
                  boxes[idx].b.color = rgb(even ? "#f85149" : "#3fb950");
                  if (even) { count++; sc.burst(boxes[idx].b.pos.x + 11, BASE_Y - 34, ["#f85149", "#ffe08a"], 5); hud.set(0, "v_pairs = " + count, "#3fb950"); }
                  return h.wait(0.17);
                });
              })(j);
            }
            return chain.then(function () { return h.wait(0.3); });
          },
          reset: function () { boxes.forEach(function (x) { x.b.color = rgb("#6e5a98"); }); }
        };
      }
    })
  });
})();
