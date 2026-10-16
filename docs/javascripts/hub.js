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
      var sc = OctoScenery.build(k, h, { portalOpen: true, hudBar: false });
      var rgb = sc.rgb, BASE_Y = sc.BASE_Y, PORTAL_X = sc.PORTAL_X;
      var root = ctx.host.getAttribute("data-root") || "./";
      var info = nextTarget(root);
      var P = window.OctoProgress;
      var done = Object.keys(P.get().completed).length;

      // ----- interface fixe (indépendante de la caméra et du format d'écran ; police KAPLAY sans accents) -----
      var VW = sc.viewW, cx = VW / 2, fit = Math.min(1, VW / 420); // réduit les textes sur écrans étroits
      function fsz(n) { return Math.max(7, Math.round(n * fit)); }
      k.add([k.rect(Math.min(420, VW - 12), 92 * Math.max(0.7, fit)), k.pos(cx, 70), k.anchor("center"),
        k.color(rgb("#1a1040")), k.opacity(0.38), k.fixed(), k.z(30.6)]);
      k.add([k.text("OCTOCAT-CODE", { size: fsz(38), font: "monospace" }), k.pos(cx + 2, 50), k.anchor("center"), k.color(rgb("#1a1040")), k.fixed(), k.z(31)]);
      k.add([k.text("OCTOCAT-CODE", { size: fsz(38), font: "monospace" }), k.pos(cx, 48), k.anchor("center"), k.color(rgb("#f0f6fc")), k.fixed(), k.z(32)]);
      k.add([k.text("APPRENDS A CODER EN T'AMUSANT", { size: fsz(11), font: "monospace" }), k.pos(cx, 80), k.anchor("center"),
        k.color(rgb("#f0f6fc")), k.fixed(), k.z(32)]);
      var prompt = k.add([k.text(info.started ? "[ CLIQUE : CONTINUER ]" : "[ CLIQUE : ENTRER DANS LE PORTAIL ]", { size: fsz(12), font: "monospace" }),
        k.pos(cx, 104), k.anchor("center"), k.color(rgb("#ffe08a")), k.fixed(), k.z(32)]);
      k.add([k.text("NIVEAUX TERMINES : " + done + "/" + P.levels.length, { size: 10, font: "monospace" }), k.pos(10, 8),
        k.color(rgb("#f0f6fc")), k.fixed(), k.z(32)]);

      // ----- l'OctoCat patrouille -----
      var shadow = sc.shadow(80, 0.85);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(80, BASE_Y), k.anchor("bot"), k.scale(S), k.opacity(1), k.z(9)]);
      sc.follow(octo);
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
          .then(function () { ctx.go("level" + info.level.id); });
      }

      // entrées du canvas : nettoyées automatiquement au changement de scène
      k.onClick(enter);
      k.onKeyPress("enter", enter);
      k.onKeyPress("space", enter);

      return { reset: function () {} };
    }
  });
})();
