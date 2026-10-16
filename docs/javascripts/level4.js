/* Niveau 4 — Le Dojo des Torches (logique : and / or / not)
 * Trajet : toits à la Shinobi (double saut, shuriken). Énigme : la porte à runes ne s'ouvre que si l'OctoCat a la clé ET qu'aucun garde ne veille.
 */
(function () {
  "use strict";

  var COMBOS = [[true, false], [true, true], [false, false], [false, true]];

  window.gameEngine.registerLevel({
    id: 4,
    zone: 1,
    mood: 0.3,
    title: "Le Dojo des Torches",
    alt: "Un dojo : une porte à runes, deux lampes et un portail.",

    run: {
      mode: "platform", theme: "dojo", abilities: { doubleJump: true, shuriken: true },
      course: [
        { t: "flat", n: 8, bits: [4, 5] },
        { t: "gap", n: 3 },
        { t: "flat", n: 6, en: [3], bits: [1, 2] },
        { t: "up", n: 2 }, { t: "flat", n: 5, bits: [1, 2, 3] },
        { t: "up", n: 2 }, { t: "flat", n: 5, en: [2], cp: 0 },
        { t: "gap", n: 3 },
        { t: "down", n: 3 }, { t: "flat", n: 7, en: [2], fly: [5] },
        { t: "up", n: 3 }, { t: "flat", n: 5, bits: [1, 2, 3] },
        { t: "gap", n: 3 }, { t: "flat", n: 4, bits: [1, 2] },
        { t: "end", n: 9 }
      ]
    },

    starter:
      "# v_cle : l'OctoCat possède la clé (true ou false).\n" +
      "# v_garde : un garde veille devant la porte (true ou false).\n" +
      "# La porte ne s'ouvre que s'il a la clé ET qu'il n'y a PAS de garde.\n" +
      "\n" +
      "v_porte_ouverte = ???",

    briefing: {
      title: "Le Dojo des Torches",
      lore: "Dans le dojo, une porte à runes obéit à la logique pure. Deux lampes indiquent ce qu'elle voit : la clé de l'OctoCat et la présence d'un garde.",
      lesson: "On combine les booléens avec and (« et » : vrai si les deux sont vrais), or (« ou » : vrai si au moins un est vrai) et not (« non » : inverse la valeur). En JavaScript on écrit && || !.",
      examples: {
        "Pseudo-code": "v_ok = v_a et non v_b",
        "Python": "v_ok = v_a and not v_b\nv_ou = v_a or v_b",
        "JavaScript": "let v_ok = v_a && !v_b;\nlet v_ou = v_a || v_b;"
      },
      tips: [
        "a and b : vrai seulement si a ET b sont vrais.",
        "not inverse : not true vaut false.",
        "Ton expression doit marcher pour les 4 combinaisons de v_cle et v_garde."
      ],
      goal: "écris l'expression qui donne à v_porte_ouverte true seulement avec la clé et sans garde."
    },

    hints: [
      "Il faut deux conditions en même temps : avoir la clé, et ne pas avoir de garde.",
      "« et » se dit and ; « ne pas avoir » se dit not.",
      "v_porte_ouverte = v_cle and not v_garde"
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_porte_ouverte", type: "boolean", okMessage: "v_porte_ouverte = v_cle and not v_garde",
        cases: COMBOS.map(function (c) { return { env: { v_cle: c[0], v_garde: c[1] }, expect: c[0] && !c[1] }; })
      });
    },

    scene: OctoPuzzle.scene({
      title: "DOJO DES TORCHES - NIVEAU 4",
      wash: ["#3a1060", 0.14],
      lines: [{ text: "v_porte_ouverte = ???", color: "#d29922" }, { text: "v_cle = true   v_garde = false", color: "#58a6ff" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, DX = 372;
        // portique et porte (hauteur limitée : la scène laisse ~95 px au-dessus du sol sous l'interface)
        k.add([k.rect(8, 88), k.pos(DX - 6, BASE_Y - 88), k.color(rgb("#6e2a2a")), k.z(6.5)]);
        k.add([k.rect(8, 88), k.pos(DX + 62, BASE_Y - 88), k.color(rgb("#6e2a2a")), k.z(6.5)]);
        k.add([k.rect(90, 9), k.pos(DX - 12, BASE_Y - 96), k.color(rgb("#8a3a3a")), k.z(6.5)]);
        var door = k.add([k.rect(56, 82), k.pos(DX + 2, BASE_Y - 82), k.color(rgb("#2b2147")), k.z(6.6)]);
        var runes = [];
        for (var i = 0; i < 4; i++) runes.push(k.add([k.rect(26, 3), k.pos(DX + 17, BASE_Y - 70 + i * 16), k.color(rgb("#f85149")), k.z(6.7)]));
        // tableau des lampes : clé (or), garde (rouge), porte
        k.add([k.rect(96, 44), k.pos(DX - 130, BASE_Y - 82), k.color(rgb("#1a1040")), k.opacity(0.85), k.z(6.5)]);
        function lamp(x, color, label) { // lampe en pixels nets : cadre, ampoule, reflet (la couleur de l'ampoule change)
          k.add([k.rect(16, 16), k.pos(x - 8, BASE_Y - 72), k.color(rgb("#0d0a1f")), k.z(6.75)]);
          var bulb = k.add([k.rect(12, 12), k.pos(x - 6, BASE_Y - 70), k.color(rgb(color)), k.z(6.8)]);
          k.add([k.rect(3, 3), k.pos(x - 4, BASE_Y - 68), k.color(rgb("#ffffff")), k.opacity(0.7), k.z(6.85)]);
          k.add([k.text(label, { size: 8, font: "monospace" }), k.pos(x, BASE_Y - 46), k.anchor("center"), k.color(rgb("#e6edf3")), k.z(6.9)]);
          return bulb;
        }
        var lKey = lamp(DX - 110, "#e3b341", "CLE"), lGuard = lamp(DX - 82, "#8b949e", "GARDE"), lDoor = lamp(DX - 54, "#f85149", "PORTE");
        return {
          reveal: function (result) {
            var env = result.data.env;
            lKey.color = rgb(env.v_cle ? "#e3b341" : "#4a4f58"); lGuard.color = rgb(env.v_garde ? "#f85149" : "#4a4f58");
            hud.set(0, "v_porte_ouverte = " + result.data.value, "#3fb950");
            return h.wait(0.6).then(function () {
              lDoor.color = rgb("#3fb950");
              runes.forEach(function (r) { r.color = rgb("#3fb950"); });
              sc.burst(DX - 54, BASE_Y - 64, ["#3fb950", "#ffffff"], 14);
              return h.tween(0.6, function (t) { door.pos.y = BASE_Y - 82 - 90 * t; door.opacity = 1 - t; runes.forEach(function (r, i) { r.pos.y = BASE_Y - 70 + i * 16 - 90 * t; r.opacity = 1 - t; }); });
            });
          },
          reset: function () {
            lKey.color = rgb("#e3b341"); lGuard.color = rgb("#8b949e"); lDoor.color = rgb("#f85149");
            door.pos.y = BASE_Y - 82; door.opacity = 1;
            runes.forEach(function (r, i) { r.color = rgb("#f85149"); r.pos.y = BASE_Y - 70 + i * 16; r.opacity = 1; });
          }
        };
      }
    })
  });
})();
