/* Niveau 2 — Le Village des Chaînes (texte et concaténation)
 * Trajet : beat'em up à la Double Dragon dans la rue du village. Énigme : donner au portier le mot de passe « octocat ».
 */
(function () {
  "use strict";

  window.gameEngine.registerLevel({
    id: 2,
    zone: 1,
    mood: 0.1,
    title: "Le Village des Chaînes",
    alt: "Un village : le portier Glitch garde une palissade devant le portail.",

    run: {
      mode: "brawl", theme: "village", length: 1700,
      crates: [
        { x: 230, y: 292, kind: "crate" },
        { x: 285, y: 322, kind: "crate", drop: "power" },
        { x: 520, y: 285, kind: "block" },
        { x: 700, y: 318, kind: "crate", drop: "heart" },
        { x: 900, y: 300, kind: "crate", drop: "power" },
        { x: 960, y: 275, kind: "crate" },
        { x: 1000, y: 322, kind: "block" },
        { x: 1380, y: 290, kind: "crate", drop: "heart" },
        { x: 1450, y: 318, kind: "crate" }
      ],
      waves: [
        { at: 420, enemies: [["grunt", "right"], ["grunt", "left"]] },
        { at: 820, enemies: [["grunt", "right"], ["fast", "left"], ["ninja", "right"]] },
        { at: 1260, enemies: [["fast", "right"], ["slinger", "left"], ["grunt", "right"], ["grunt", "left"]] }
      ]
    },

    starter:
      "# 🗝️ Le gardien veut le mot secret : \"octocat\".\n" +
      "# v_debut contient déjà le début : \"octo\".\n" +
      "# Colle la fin \"cat\" avec le signe + à la place des ???\n" +
      "\n" +
      "v_debut = \"octo\"\n" +
      "v_mot = ???",

    briefing: {
      title: "Le Village des Chaînes",
      lore: "Bienvenue à Chaînville ! Ici, tout le monde parle avec des **mots**. Le gardien Glitch ne laisse entrer que ceux qui connaissent le mot secret : `\"octocat\"`.",
      lesson: "Un mot ou une phrase, en programmation, s'appelle un **texte**. On l'écrit **entre guillemets** : `\"salut\"`. Et on peut **coller** deux textes ensemble avec le signe `+`, comme des briques de Lego : `\"octo\" + \"cat\"` fait `\"octocat\"`.",
      examples: {
        "Pseudo-code": "v_nom = \"Octo\" + \"Cat\"",
        "Python": "v_nom = \"Octo\" + \"Cat\"",
        "JavaScript": "let v_nom = \"Octo\" + \"Cat\";"
      },
      tips: [
        "Un texte s'écrit toujours entre **guillemets** : `\"octo\"`.",
        "`+` colle deux textes bout à bout : `\"a\" + \"b\"` donne `\"ab\"`.",
        "Les **majuscules** comptent : `\"Octo\"` n'est pas pareil que `\"octo\"`."
      ],
      goal: "Fais en sorte que **`v_mot`** contienne le mot secret `\"octocat\"`. `v_debut` vaut déjà `\"octo\"` : colle-lui la fin `\"cat\"` avec le signe `+`."
    },

    hints: [
      "Un texte s'écrit entre guillemets. Pour coller deux textes, on utilise le signe +.",
      "Le début du mot est déjà dans v_debut. Il reste à lui coller la fin : \"cat\".",
      "La réponse : v_mot = v_debut + \"cat\""
    ],

    validate: function (code, engine) {
      return OctoPuzzle.validateCases(code, engine, {
        name: "v_mot", type: "string", okMessage: "v_mot = \"octocat\"",
        cases: [{ env: {}, expect: "octocat" }]
      });
    },

    scene: OctoPuzzle.scene({
      title: "VILLAGE DES CHAINES - NIVEAU 2",
      wash: ["#f0883e", 0.06],
      lines: [{ text: "v_mot = ???", color: "#d29922" }],
      decorate: function (k, sc, h, hud, e) {
        var rgb = e.rgb, BASE_Y = sc.BASE_Y, planks = [], X0 = 372;
        for (var i = 0; i < 5; i++) {
          planks.push(k.add([k.rect(11, 78), k.pos(X0 + i * 12, BASE_Y - 78), k.color(rgb(i % 2 ? "#8a5a3a" : "#a1713b")), k.z(6.8)]));
        }
        var bar = k.add([k.rect(64, 6), k.pos(X0 - 2, BASE_Y - 50), k.color(rgb("#5a3a2a")), k.z(6.9)]);
        var lock = k.add([k.rect(14, 12), k.pos(X0 + 22, BASE_Y - 46), k.color(rgb("#e3b341")), k.z(7)]);
        var guard = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(330, BASE_Y), k.anchor("bot"), k.scale(2.2), k.color(rgb("#c9d1d9")), k.opacity(1), k.z(7.2)]);
        var bubbleBg = k.add([k.rect(120, 18), k.pos(330, BASE_Y - 92), k.anchor("center"), k.color(rgb("#1a1040")), k.opacity(0.8), k.z(7.5)]);
        var bubble = k.add([k.text("MOT DE PASSE ?", { size: 10, font: "monospace" }), k.pos(330, BASE_Y - 92), k.anchor("center"), k.color(rgb("#ffffff")), k.z(7.6)]);
        sc.onFrame(function (t) { if (guard.exists()) guard.pos.y = BASE_Y - Math.abs(Math.sin(t * 2)) * 3; });
        return {
          reveal: function (result) {
            var word = String(result.data.value).toUpperCase();
            bubble.text = "\"" + word + "\" !";
            hud.set(0, "v_mot = \"" + result.data.value + "\"", "#3fb950");
            return h.wait(0.5)
              .then(function () {
                sc.burst(guard.pos.x, BASE_Y - 40, ["#3fb950", "#ffffff", "#39c5cf"], 14);
                lock.color = rgb("#3fb950");
                return h.tween(0.5, function (t) {
                  planks.forEach(function (p, i) { p.pos.y = BASE_Y - 78 - 90 * t; p.opacity = 1 - t * 0.8; });
                  bar.pos.y = BASE_Y - 50 - 90 * t; bar.opacity = 1 - t; lock.pos.y = BASE_Y - 46 - 90 * t; lock.opacity = 1 - t;
                  guard.opacity = 1 - t; bubble.opacity = 1 - t; bubbleBg.opacity = 0.8 * (1 - t);
                });
              });
          },
          reset: function () {
            planks.forEach(function (p) { p.pos.y = BASE_Y - 78; p.opacity = 1; });
            bar.pos.y = BASE_Y - 50; bar.opacity = 1; lock.pos.y = BASE_Y - 46; lock.opacity = 1; lock.color = rgb("#e3b341");
            guard.opacity = 1; bubble.opacity = 1; bubbleBg.opacity = 0.8; bubble.text = "MOT DE PASSE ?";
          }
        };
      }
    })
  });
})();
