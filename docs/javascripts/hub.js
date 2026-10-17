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
      // logo animé (pixel art procédural, voir logo.js) ; repli sur du texte si le module manque
      var logo = window.OctoLogo ? window.OctoLogo.add(k, { cx: cx, top: 12, maxW: Math.min(VW - 16, 560), maxH: k.height() * 0.22, rgb: rgb, z: 32 }) : null;
      var logoBottom = logo ? 12 + logo.height + 4 : 60;
      if (!logo) k.add([k.text("OCTOCAT-CODE", { size: fsz(38), font: "monospace" }), k.pos(cx, 48), k.anchor("center"), k.color(rgb("#f0f6fc")), k.fixed(), k.z(32)]);
      // bandeau de la devise : filets or, fond sombre
      var tagW = Math.min(VW - 12, Math.max(260 * fit, 300)), tagY = logoBottom + 14 * fit;
      k.add([k.rect(tagW, 18 * Math.max(0.8, fit)), k.pos(cx, tagY), k.anchor("center"), k.color(rgb("#150c33")), k.opacity(0.7), k.fixed(), k.z(30.6)]);
      k.add([k.rect(tagW, 1), k.pos(cx, tagY - 9 * Math.max(0.8, fit)), k.anchor("center"), k.color(rgb("#e3b341")), k.opacity(0.9), k.fixed(), k.z(30.7)]);
      k.add([k.rect(tagW, 1), k.pos(cx, tagY + 9 * Math.max(0.8, fit)), k.anchor("center"), k.color(rgb("#e3b341")), k.opacity(0.9), k.fixed(), k.z(30.7)]);
      k.add([k.text("APPRENDS A CODER EN T'AMUSANT", { size: fsz(11), font: "monospace" }), k.pos(cx, tagY + 1), k.anchor("center"),
        k.color(rgb("#f0f6fc")), k.fixed(), k.z(32)]);
      // invite : bandeau sombre presque opaque, filets or, ombre portée ; la lueur pulse sans jamais devenir illisible
      var pw = Math.min(VW - 12, 360 * fit), ph = 20 * Math.max(0.85, fit), py = tagY + 28 * fit;
      k.add([k.rect(pw, ph), k.pos(cx, py), k.anchor("center"), k.color(rgb("#150c33")), k.opacity(0.88), k.fixed(), k.z(30.6)]);
      k.add([k.rect(pw, 1), k.pos(cx, py - ph / 2), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(0.9), k.fixed(), k.z(30.7)]);
      k.add([k.rect(pw, 1), k.pos(cx, py + ph / 2), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(0.9), k.fixed(), k.z(30.7)]);
      var promptTxt = info.started ? "[ CLIQUE : CONTINUER ]" : "[ CLIQUE : ENTRER DANS LE PORTAIL ]";
      var promptShadow = k.add([k.text(promptTxt, { size: fsz(12), font: "monospace" }), k.pos(cx + 1, py + 2), k.anchor("center"), k.color(rgb("#000000")), k.opacity(0.8), k.fixed(), k.z(31.9)]);
      var prompt = k.add([k.text(promptTxt, { size: fsz(12), font: "monospace" }), k.pos(cx, py + 1), k.anchor("center"), k.color(rgb("#ffe08a")), k.fixed(), k.z(32)]);
      k.add([k.text("NIVEAUX TERMINES : " + done + "/" + P.levels.length, { size: 10, font: "monospace" }), k.pos(10, 8),
        k.color(rgb("#f0f6fc")), k.fixed(), k.z(32)]);

      // ----- l'OctoCat patrouille -----
      var shadow = sc.shadow(80, 0.85);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(80, BASE_Y), k.anchor("bot"), k.scale(S), k.opacity(1), k.z(9)]);
      sc.follow(octo);
      var goal = 80, wait = 1.2, state = "wait", entering = false;

      sc.onFrame(function (t) {
        if (logo) logo.update(t);
        prompt.opacity = 0.8 + 0.2 * Math.abs(Math.sin(t * 2.6));
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
        prompt.text = "[ ... ]"; promptShadow.text = "[ ... ]";
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

      // sélecteur de niveaux : rejouer un niveau terminé ou reprendre là où l'on s'est arrêté
      var state2 = P.get(), picker = document.createElement("div"), panel = document.createElement("div"), open = false;
      picker.className = "octo-picker";
      var toggle = document.createElement("button");
      toggle.type = "button"; toggle.className = "octo-picker__toggle"; toggle.textContent = "▦ NIVEAUX";
      toggle.setAttribute("aria-label", "Choisir un niveau");
      panel.className = "octo-picker__panel";
      var head = document.createElement("div");
      head.className = "octo-picker__head"; head.textContent = "CHOISIS UN NIVEAU";
      panel.appendChild(head);
      P.levels.forEach(function (lv) {
        var row = document.createElement("button");
        row.type = "button";
        var locked = lv.id > state2.unlocked, done = !!state2.completed[lv.id];
        row.className = "octo-picker__row" + (locked ? " is-locked" : "") + (done ? " is-done" : "");
        row.disabled = locked;
        row.textContent = lv.id + "  " + lv.title + (done ? "  ✓" : locked ? "  🔒" : "");
        row.addEventListener("click", function () { ctx.go("level" + lv.id); });
        panel.appendChild(row);
      });
      toggle.addEventListener("click", function () { open = !open; picker.classList.toggle("is-open", open); });
      picker.appendChild(panel); picker.appendChild(toggle);
      ctx.host.appendChild(picker);

      return { reset: function () {}, destroy: function () { picker.remove(); } };
    }
  });
})();
