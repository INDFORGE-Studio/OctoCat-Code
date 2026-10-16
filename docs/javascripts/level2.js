/* Niveau 2 — Le Pont des Booléens (bientôt)
 * Le niveau 1 débloque ce niveau ; son gameplay arrive après le Vertical Slice.
 */
(function () {
  "use strict";

  window.gameEngine.registerLevel({
    id: 2,
    zone: 1,
    title: "Le Pont des Booléens",
    comingSoon: true,
    mood: 0,
    briefing: {
      title: "Le Pont des Booléens",
      lore: "Tu as franchi le premier portail. Devant toi, un pont de pixels s'effondre case par case : seules les conditions vraies tiennent encore.",
      lesson: "Ce niveau n'est pas encore jouable. Il introduira les booléens et les conditions (if / sinon).",
      tips: [],
      goal: ""
    },

    scene: function (k, h, ctx) {
      var sc = OctoScenery.build(k, h, { portalOpen: true, reserve: ctx.reserve });
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(120, sc.BASE_Y), k.anchor("bot"), k.scale(3), k.z(9)]);
      sc.shadow(120, 0.85);
      k.add([k.text("NIVEAU 2 - BIENTOT", { size: 14, font: "monospace" }), k.pos(10, 8), k.color(sc.rgb("#e6edf3")), k.fixed(), k.z(31)]);
      return { reset: function () { octo.play("idle"); } };
    }
  });
})();
