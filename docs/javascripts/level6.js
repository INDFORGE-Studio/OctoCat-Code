/* Niveau 6 — Le Marché des Cristaux (if / elif / else)
 * Trajet : beat'em up dans les allées du marché. Énigme : classer le client selon son or.
 */
(function () {
  "use strict";

  var GOLD = [75, 0, 49, 50, 99, 100, 250];
  function titleFor(or) { return or >= 100 ? "riche" : or >= 50 ? "aise" : "pauvre"; }

  window.gameEngine.registerLevel({
    id: 6,
    zone: 1,
    mood: 0.2,
    title: "Le Marché des Cristaux",
    alt: "Un étal de cristaux : le marchand classe l'OctoCat selon son or.",

    run: {
      mode: "brawl", theme: "market", length: 2000,
      waves: [
        { at: 450, enemies: [["grunt", "right"], ["grunt", "left"]] },
        { at: 850, enemies: [["fast", "left"], ["fast", "right"], ["grunt", "right"]] },
        { at: 1300, enemies: [["heavy", "right"], ["grunt", "left"]] },
        { at: 1700, enemies: [["fast", "right"], ["fast", "left"], ["grunt", "right"], ["grunt", "left"]] }
      ]
    },

    starter:
      "# v_or contient l'or de l'OctoCat. Le marchand le classe :\n" +
      "#   100 ou plus -> \"riche\"   |   de 50 à 99 -> \"aise\"   |   moins de 50 -> \"pauvre\"\n" +
      "\n" +
      "v_titre = \"pauvre\"\n" +
      "if v_or >= 100:\n" +
      "    v_titre = \"riche\"\n" +
      "elif ???:\n" +
      "    v_titre = \"aise\"",

    briefing: {
      title: "Le Marché des Cristaux",
      lore: "Au marché de GitHubia, le marchand de cristaux traite chaque client selon sa bourse. Les Glitches ont brouillé sa règle : il ne sait plus reconnaître les clients aisés.",
      lesson: "if / elif / else enchaîne plusieurs cas. Le premier cas vrai gagne et les suivants sont ignorés ; else (« sinon ») couvre tout le reste. On teste d'abord le cas le plus exigeant.",
      examples: {
        "Pseudo-code": "si v_note >= 15 alors\n  v_mention = \"bien\"\nsinon si v_note >= 10 alors\n  v_mention = \"passable\"\nsinon\n  v_mention = \"refuse\"\nfin si",
        "Python": "if v_note >= 15:\n    v_mention = \"bien\"\nelif v_note >= 10:\n    v_mention = \"passable\"\nelse:\n    v_mention = \"refuse\"",
        "JavaScript": "if (v_note >= 15) {\n  v_mention = \"bien\";\n} else if (v_note >= 10) {\n  v_mention = \"passable\";\n} else {\n  v_mention = \"refuse\";\n}"
      },
      tips: [
        "elif (« sinon si ») n'est testé que si les cas au-dessus sont faux.",
        ">= veut dire « supérieur ou égal » : 50 >= 50 est vrai.",
        "Ta règle doit marcher pour toutes les bourses : 0, 49, 50, 99, 100…"
      ],
      goal: "complète le elif pour que 50 à 99 d'or donne \"aise\"."
    },

    hints: [
      "Un client est « aise » à partir de 50 d'or. Le premier if a déjà traité les riches.",
      "La condition du elif compare v_or à 50 avec « supérieur ou égal ».",
      "elif v_or >= 50:"
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_titre", type: "string", okMessage: "v_titre est juste",
        cases: GOLD.map(function (g) { return { env: { v_or: g }, expect: titleFor(g) }; })
      });
    },

    scene: OctoPuzzle.scene({
      title: "MARCHE DES CRISTAUX - NIVEAU 6",
      wash: ["#ff9f40", 0.06],
      lines: [{ text: "v_titre = ???", color: "#d29922" }, { text: "v_or = 75", color: "#e3b341" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, SX = 330, crystals = [];
        // étal : auvent rayé, table, cristaux
        for (var i = 0; i < 7; i++) k.add([k.rect(16, 12), k.pos(SX - 56 + i * 16, BASE_Y - 80), k.color(rgb(i % 2 ? "#f0f6fc" : "#da3633")), k.z(6.6)]);
        k.add([k.rect(4, 80), k.pos(SX - 56, BASE_Y - 80), k.color(rgb("#5a3a2a")), k.z(6.5)]);
        k.add([k.rect(4, 80), k.pos(SX + 52, BASE_Y - 80), k.color(rgb("#5a3a2a")), k.z(6.5)]);
        k.add([k.rect(112, 30), k.pos(SX - 56, BASE_Y - 30), k.color(rgb("#a1713b")), k.z(6.8)]);
        k.add([k.rect(112, 4), k.pos(SX - 56, BASE_Y - 30), k.color(rgb("#c28f52")), k.z(6.9)]);
        ["#39c5cf", "#bc8cff", "#f778ba", "#3fb950", "#58a6ff"].forEach(function (c, idx) {
          crystals.push(k.add([k.sprite("bit"), k.pos(SX - 40 + idx * 20, BASE_Y - 42), k.anchor("center"), k.scale(2.2), k.color(rgb(c)), k.z(7)]));
        });
        k.add([k.sprite("glitch", { anim: "idle" }), k.pos(SX, BASE_Y - 30), k.anchor("bot"), k.scale(1.6), k.color(rgb("#e3b341")), k.z(6.7)]);
        k.add([k.rect(112, 18), k.pos(SX, BASE_Y - 94), k.anchor("center"), k.color(rgb("#1a1040")), k.opacity(0.8), k.z(7.5)]);
        var bubble = k.add([k.text("TU ES... ?", { size: 11, font: "monospace" }), k.pos(SX, BASE_Y - 94), k.anchor("center"), k.color(rgb("#ffffff")), k.z(7.6)]);
        return {
          reveal: function (result) {
            var title = String(result.data.value);
            bubble.text = "CLIENT " + title.toUpperCase();
            hud.set(0, "v_titre = \"" + title + "\"", "#3fb950");
            return h.wait(0.5).then(function () {
              sc.burst(SX, BASE_Y - 70, ["#39c5cf", "#bc8cff", "#f778ba", "#ffffff"], 20);
              return h.tween(0.5, function (t) { crystals.forEach(function (c, i) { c.pos.y = BASE_Y - 42 - 14 * Math.sin(t * Math.PI + i); }); });
            }).then(function () { return h.wait(0.2); });
          },
          reset: function () { bubble.text = "TU ES... ?"; crystals.forEach(function (c, i) { c.pos.y = BASE_Y - 42; }); }
        };
      }
    })
  });
})();
