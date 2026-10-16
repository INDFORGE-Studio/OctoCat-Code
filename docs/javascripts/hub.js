/* OctoCat-Code — Scène d'accueil : le site est le jeu.
 * L'OctoCat patrouille dans la forêt devant le portail ouvert ; un clic (ou Entrée / Espace)
 * le fait courir dans le portail, puis ouvre le premier niveau non terminé.
 *   <div class="octo-scene" data-scene="hub" data-root="./"></div>
 */
(function () {
  "use strict";

  var S = 3;

  function nextTarget(root) {
    var P = window.OctoProgress, levels = P.levels, state = P.get(), target = null, i;
    for (i = 0; i < levels.length; i++) {
      if (levels[i].id <= state.unlocked && !state.completed[levels[i].id]) { target = levels[i]; break; }
    }
    return { level: target || levels[levels.length - 1], started: !!state.completed[1] || state.unlocked > 1, root: root };
  }

  window.gameEngine.registerScene("hub", {
    alt: "L'OctoCat se promène dans une forêt nocturne devant un portail ouvert : cliquer pour entrer dans l'aventure.",

    scene: function (k, h, ctx) {
      var sc = OctoScenery.build(k, h, { portalOpen: true });
      var rgb = sc.rgb, BASE_Y = sc.BASE_Y, PORTAL_X = sc.PORTAL_X;
      var root = ctx.host.getAttribute("data-root") || "./";
      var info = nextTarget(root);
      var P = window.OctoProgress;
      var done = Object.keys(P.get().completed).length;

      // ----- titre (police KAPLAY sans accents) -----
      k.add([k.text("OCTOCAT-CODE", { size: 38, font: "monospace" }), k.pos(302, 48), k.anchor("center"), k.color(rgb("#196c2e")), k.z(31)]);
      k.add([k.text("OCTOCAT-CODE", { size: 38, font: "monospace" }), k.pos(300, 46), k.anchor("center"), k.color(rgb("#f0f6fc")), k.z(32)]);
      k.add([k.text("APPRENDS A CODER - LE SITE EST LE JEU", { size: 11, font: "monospace" }), k.pos(300, 78), k.anchor("center"),
        k.color(rgb("#8b949e")), k.z(32)]);
      var prompt = k.add([k.text(info.started ? "[ CLIQUE : CONTINUER L'AVENTURE ]" : "[ CLIQUE : ENTRER DANS LE PORTAIL ]", { size: 12, font: "monospace" }),
        k.pos(300, 102), k.anchor("center"), k.color(rgb("#e3b341")), k.z(32)]);
      k.add([k.text("NIVEAUX TERMINES : " + done + "/" + P.levels.length, { size: 10, font: "monospace" }), k.pos(10, 236),
        k.color(rgb("#8b949e")), k.z(32)]);

      // ----- l'OctoCat patrouille -----
      var shadow = sc.shadow(80, 0.85);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(80, BASE_Y), k.anchor("bot"), k.scale(S), k.opacity(1), k.z(9)]);
      var goal = 80, wait = 1.2, state = "wait", entering = false;

      sc.onFrame(function (t) {
        prompt.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.6));
        shadow.pos.x = octo.pos.x;
        shadow.opacity = 0.6 * octo.opacity;
        if (entering) return;
        if (state === "wait") {
          wait -= k.dt();
          if (wait <= 0) { goal = k.rand(40, 380); state = "walk"; octo.play("run"); }
        } else {
          var dx = goal - octo.pos.x, step = 70 * k.dt();
          octo.flipX = dx < 0;
          if (Math.abs(dx) <= step) { octo.pos.x = goal; state = "wait"; wait = k.rand(1.2, 3); octo.play("idle"); }
          else octo.pos.x += Math.sign(dx) * step;
        }
      });

      function enter() {
        if (entering) return;
        entering = true;
        prompt.text = "[ ... ]";
        octo.flipX = false;
        octo.play("run");
        var x0 = octo.pos.x, dist = PORTAL_X - 55 - x0, dur = Math.max(0.5, Math.abs(dist) / 230);
        h.tween(dur, function (e) { octo.pos.x = x0 + dist * e; }, function (p) { return p; })
          .then(function () {
            octo.play("success");
            sc.burst(PORTAL_X, sc.GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 26);
            k.shake(4);
            return h.wait(0.25);
          })
          .then(function () {
            octo.play("run");
            return h.tween(0.6, function (e) {
              octo.pos.x = PORTAL_X - 55 + 55 * e;
              octo.opacity = 1 - e;
              var s = S * (1 - 0.6 * e); octo.scale = k.vec2(s, s);
            });
          })
          .then(function () { return h.wait(0.2); })
          .then(function () { ctx.go(info.root + info.level.path); });
      }

      ctx.host.tabIndex = 0;
      ctx.host.style.cursor = "pointer";
      ctx.host.addEventListener("click", enter);
      ctx.host.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); }
      });

      return { reset: function () {} };
    }
  });
})();
