/* Niveau 7 — La Forge des Répétitions (boucle for)
 * Trajet : plateformes à la Castlevania au-dessus de la lave. Énigme : forger exactement v_commande épées, une par tour de boucle.
 */
(function () {
  "use strict";

  var ORDERS = [5, 0, 1, 3, 8];

  window.gameEngine.registerLevel({
    id: 7,
    zone: 1,
    mood: 0.25,
    title: "La Forge des Répétitions",
    alt: "Une forge : une enclume, un râtelier d'épées et un portail.",

    run: {
      mode: "platform", theme: "forge", abilities: { whip: true },
      course: [
        { t: "flat", n: 9, candles: [4] },
        { t: "flat", n: 7, spikes: [3], bits: [1, 2] },
        { t: "gap", n: 2 },
        { t: "flat", n: 8, tough: [4], candles: [1, 6], cp: 1 },
        { t: "up", n: 1 }, { t: "flat", n: 7, fly: [2, 5], bits: [3, 4] },
        { t: "down", n: 1 }, { t: "gap", n: 2 },
        { t: "flat", n: 5, spikes: [2], en: [4] },
        { t: "gap", n: 2 },
        { t: "flat", n: 9, tough: [3], en: [7], candles: [5], cp: 0 },
        { t: "up", n: 2 }, { t: "flat", n: 6, spikes: [2, 3], bits: [4, 5] },
        { t: "down", n: 2 }, { t: "flat", n: 4, candles: [1] },
        { t: "end", n: 9 }
      ]
    },

    starter:
      "# L'enclume forge UNE épée par tour de boucle.\n" +
      "# La commande est dans v_commande : forge exactement cette quantité !\n" +
      "\n" +
      "v_epees = 0\n" +
      "\n" +
      "for i in range(???):\n" +
      "    v_epees = v_epees + 1",

    briefing: {
      title: "La Forge des Répétitions",
      lore: "La forge de GitHubia tourne jour et nuit, mais le forgeron Glitch tape toujours le même coup au lieu de répéter. Apprends-lui à compter.",
      lesson: "Quand on connaît le nombre de répétitions, on utilise une boucle for : for i in range(5) répète 5 fois (i vaut 0, 1, 2, 3, 4). Le bloc répété est décalé en Python et entre { } en JavaScript.",
      examples: {
        "Pseudo-code": "pour i de 1 a 5 faire\n  v_total = v_total + 1\nfin pour",
        "Python": "for i in range(5):\n    v_total = v_total + 1",
        "JavaScript": "for (let i = 0; i < 5; i++) {\n  v_total = v_total + 1;\n}"
      },
      tips: [
        "range(n) répète n fois : le compteur i va de 0 à n - 1.",
        "Le corps de la boucle est répété à chaque tour, dans l'ordre.",
        "La commande change : utilise la variable v_commande, pas un nombre fixe."
      ],
      goal: "complète range(…) pour forger exactement v_commande épées."
    },

    hints: [
      "Une épée par tour : il faut autant de tours que d'épées commandées.",
      "Le nombre de tours est v_commande : mets cette variable dans range(...).",
      "for i in range(v_commande):"
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_epees", type: "number", okMessage: "v_epees = v_commande",
        cases: ORDERS.map(function (n) { return { env: { v_commande: n }, expect: n }; })
      });
    },

    scene: OctoPuzzle.scene({
      title: "FORGE DES REPETITIONS - NIVEAU 7",
      wash: ["#f85149", 0.12],
      lines: [{ text: "v_epees = ???", color: "#d29922" }, { text: "v_commande = 5", color: "#58a6ff" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, AX = 290, swords = [];
        // enclume et fourneau
        k.add([k.rect(44, 10), k.pos(AX - 22, BASE_Y - 36), k.color(rgb("#6e7681")), k.z(6.8)]);
        k.add([k.rect(20, 26), k.pos(AX - 10, BASE_Y - 26), k.color(rgb("#4a4f58")), k.z(6.7)]);
        var FX = AX - 120, flames = [];
        k.add([k.rect(60, 70), k.pos(FX, BASE_Y - 70), k.color(rgb("#4a3a63")), k.z(6.4)]);
        k.add([k.rect(18, 18), k.pos(FX + 36, BASE_Y - 88), k.color(rgb("#4a3a63")), k.z(6.4)]);
        k.add([k.rect(24, 4), k.pos(FX + 33, BASE_Y - 92), k.color(rgb("#2e2340")), k.z(6.45)]);
        for (var r = 1; r < 7; r++) k.add([k.rect(60, 1), k.pos(FX, BASE_Y - r * 10), k.color(rgb("#2e2340")), k.z(6.45)]); // briques
        for (var r2 = 0; r2 < 7; r2++) for (var c2 = 0; c2 < 3; c2++) k.add([k.rect(1, 10), k.pos(FX + 8 + c2 * 20 + (r2 % 2) * 10, BASE_Y - 70 + r2 * 10), k.color(rgb("#2e2340")), k.z(6.45)]);
        k.add([k.rect(34, 34), k.pos(FX + 13, BASE_Y - 36), k.color(rgb("#1a0f14")), k.z(6.5)]); // gueule du fourneau
        k.add([k.rect(26, 4), k.pos(FX + 17, BASE_Y - 40), k.color(rgb("#1a0f14")), k.z(6.5)]);
        [["#f85149", 8, 20], ["#f0883e", 7, 16], ["#ffe08a", 5, 10]].forEach(function (f, i) {
          for (var j = 0; j < 3; j++) flames.push({ r: k.add([k.rect(f[1], f[2]), k.pos(FX + 16 + j * 9 + i, BASE_Y - 2 - f[2]), k.color(rgb(f[0])), k.z(6.6 + i * 0.01)]), h0: f[2], j: j, i: i });
        });
        sc.onFrame(function (t) {
          flames.forEach(function (f) {
            var hh = Math.max(4, Math.round(f.h0 * (0.75 + 0.25 * Math.sin(t * 9 + f.j * 2 + f.i))));
            f.r.height = hh; f.r.pos.y = BASE_Y - 2 - hh;
          });
        });
        // râtelier : 8 emplacements d'épées
        k.add([k.rect(5, 62), k.pos(340, BASE_Y - 102), k.color(rgb("#5a3a2a")), k.z(6.5)]);
        k.add([k.rect(5, 62), k.pos(497, BASE_Y - 102), k.color(rgb("#5a3a2a")), k.z(6.5)]);
        k.add([k.rect(160, 5), k.pos(342, BASE_Y - 98), k.color(rgb("#5a3a2a")), k.z(6.5)]);
        k.add([k.rect(160, 5), k.pos(342, BASE_Y - 52), k.color(rgb("#5a3a2a")), k.z(6.5)]);
        for (var i = 0; i < 8; i++) {
          var x = 350 + i * 19;
          var blade = k.add([k.rect(4, 40), k.pos(x, BASE_Y - 100), k.color(rgb("#d0d7de")), k.opacity(0), k.z(6.9)]);
          var guard = k.add([k.rect(12, 4), k.pos(x - 4, BASE_Y - 62), k.color(rgb("#e3b341")), k.opacity(0), k.z(7)]);
          var grip = k.add([k.rect(4, 12), k.pos(x, BASE_Y - 58), k.color(rgb("#8a5a3a")), k.opacity(0), k.z(6.9)]);
          swords.push([blade, guard, grip]);
        }
        function setSwords(n) { swords.forEach(function (s, idx) { s.forEach(function (p) { p.opacity = idx < n ? 1 : 0; }); }); }
        return {
          reveal: function (result) {
            var n = 5, chain = Promise.resolve();
            for (var j = 0; j < n; j++) {
              (function (idx) {
                chain = chain.then(function () {
                  k.shake(3);
                  sc.burst(AX, BASE_Y - 40, ["#ffe08a", "#f0883e", "#ffffff"], 10);
                  return h.wait(0.18).then(function () {
                    setSwords(idx + 1);
                    hud.set(0, "v_epees = " + (idx + 1), "#3fb950");
                    return h.wait(0.12);
                  });
                });
              })(j);
            }
            return chain.then(function () { return h.wait(0.3); });
          },
          reset: function () { setSwords(0); }
        };
      }
    })
  });
})();
