/* OctoCat-Code — Scène d'accueil : le site est le jeu.
 * L'OctoCat patrouille dans la forêt devant le portail ouvert ; un clic (ou Entrée / Espace)
 * le fait courir dans le portail, puis ouvre le premier niveau non terminé.
 *   <div class="octo-scene" data-scene="hub" data-root="./"></div>
 */
(function () {
  "use strict";

  var S = 3;
  var CARD = window.location.search.indexOf("card=1") >= 0; // lu au chargement : le moteur nettoie l'adresse dès l'arrivée sur l'accueil

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
      var sc = OctoScenery.build(k, h, { portalOpen: true, hudBar: false, magic: false });
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
      var promptTxt = "[ CLIQUE = COMMENCER ]";
      var tw; // encadré à la taille du texte
      try { tw = k.formatText({ text: promptTxt, size: fsz(12), font: "monospace" }).width; } catch { tw = 0; }
      if (!tw || !isFinite(tw)) tw = promptTxt.length * fsz(12) * 0.62;
      var pw = Math.min(VW - 12, tw + 34 * fit), ph = 20 * Math.max(0.85, fit), py = tagY + 28 * fit;
      k.add([k.rect(pw, ph), k.pos(cx, py), k.anchor("center"), k.color(rgb("#150c33")), k.opacity(0.88), k.fixed(), k.z(30.6), "hudchrome"]);
      k.add([k.rect(pw, 1), k.pos(cx, py - ph / 2), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(0.9), k.fixed(), k.z(30.7), "hudchrome"]);
      k.add([k.rect(pw, 1), k.pos(cx, py + ph / 2), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(0.9), k.fixed(), k.z(30.7), "hudchrome"]);
      var promptShadow = k.add([k.text(promptTxt, { size: fsz(12), font: "monospace" }), k.pos(cx + 1, py + 2), k.anchor("center"), k.color(rgb("#000000")), k.opacity(0.8), k.fixed(), k.z(31.9), "hudchrome"]);
      var prompt = k.add([k.text(promptTxt, { size: fsz(12), font: "monospace" }), k.pos(cx, py + 1), k.anchor("center"), k.color(rgb("#ffe08a")), k.fixed(), k.z(32), "hudchrome"]);
      // compteur de score : toutes les pièces gagnées depuis le début (style borne d'arcade), il défile jusqu'au total à l'arrivée
      var score = P.earned(), digits = Math.max(4, String(score).length);
      function measure(txt, size) { var w; try { w = k.formatText({ text: txt, size: size, font: "monospace" }).width; } catch { w = 0; } return w && isFinite(w) ? w : txt.length * size * 0.62; }
      var scSize = fsz(12), lblW = measure("PIECES", scSize), numW = measure(new Array(digits + 1).join("0"), scSize), icon = 16 * Math.max(0.8, fit);
      var scW = Math.min(VW - 12, icon + 10 + lblW + 16 + numW + 34 * fit), scH = 22 * Math.max(0.85, fit), scY = py + ph / 2 + 8 * fit + scH / 2;
      var scLeft = cx - scW / 2 + 17 * fit, scRight = cx + scW / 2 - 17 * fit;
      k.add([k.rect(scW, scH), k.pos(cx, scY), k.anchor("center"), k.color(rgb("#150c33")), k.opacity(0.88), k.fixed(), k.z(30.6), "hudchrome"]);
      k.add([k.rect(scW, 1), k.pos(cx, scY - scH / 2), k.anchor("center"), k.color(rgb("#58d6ff")), k.opacity(0.9), k.fixed(), k.z(30.7), "hudchrome"]);
      k.add([k.rect(scW, 1), k.pos(cx, scY + scH / 2), k.anchor("center"), k.color(rgb("#58d6ff")), k.opacity(0.9), k.fixed(), k.z(30.7), "hudchrome"]);
      var coin = k.add([k.sprite("bit"), k.pos(scLeft + icon / 2, scY), k.anchor("center"), k.scale(icon / 10), k.fixed(), k.z(32), "hudchrome"]);
      k.add([k.text("PIECES", { size: scSize, font: "monospace" }), k.pos(scLeft + icon + 10 + 1, scY + 2), k.anchor("left"), k.color(rgb("#000000")), k.opacity(0.8), k.fixed(), k.z(31.9), "hudchrome"]);
      k.add([k.text("PIECES", { size: scSize, font: "monospace" }), k.pos(scLeft + icon + 10, scY + 1), k.anchor("left"), k.color(rgb("#7ae7ff")), k.fixed(), k.z(32), "hudchrome"]);
      function pad(n) { var t = String(n); while (t.length < digits) t = "0" + t; return t; }
      var scoreShadow = k.add([k.text(pad(0), { size: scSize, font: "monospace" }), k.pos(scRight + 1, scY + 2), k.anchor("right"), k.color(rgb("#000000")), k.opacity(0.8), k.fixed(), k.z(31.9), "hudchrome"]);
      var scoreTxt = k.add([k.text(pad(0), { size: scSize, font: "monospace" }), k.pos(scRight, scY + 1), k.anchor("right"), k.color(rgb("#ffe08a")), k.fixed(), k.z(32), "hudchrome"]);
      var scoreT = 0, scoreDur = Math.min(1.6, 0.4 + score / 400), scoreDone = score <= 0, scoreFlash = 0;
      k.add([k.text("NIVEAUX TERMINES : " + done + "/" + P.levels.length, { size: 10, font: "monospace" }), k.pos(10, 8),
        k.color(rgb("#f0f6fc")), k.fixed(), k.z(32), "hudchrome"]);
      var fin = P.get().finished, WI = window.OctoWorlds ? window.OctoWorlds.info[P.world()] : null;
      var tourTxt = fin ? "JEU TERMINE - " + P.LAPS + "/" + P.LAPS + " TOURS" : "TOUR " + Math.min(P.LAPS, P.laps() + 1) + "/" + P.LAPS + " - " + P.lang().toUpperCase();
      if (WI && P.world() > 0) tourTxt += " - " + WI.short; // le monde du langage en cours
      k.add([k.text(tourTxt, { size: 9, font: "monospace" }), k.pos(10, 22), k.color(rgb(fin ? "#ffe08a" : "#a5d6ff")), k.fixed(), k.z(32), "hudchrome"]);

      if (CARD) k.get("hudchrome").forEach(function (o) { o.destroy(); }); // image de partage (dev/social.mjs) : l'accueil sans invite ni compteurs

      // ----- l'OctoCat patrouille -----
      var shadow = sc.shadow(80, 0.85);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(80, BASE_Y), k.anchor("bot"), k.scale(S), k.opacity(1), k.z(9)]);
      sc.follow(octo);
      // Laita attend devant sa niche (son nom sur une petite plaque), tournée vers l'OctoCat
      var KX = 352, LX = 288;
      k.add([k.sprite("kennel"), k.pos(KX, BASE_Y + 1), k.anchor("bot"), k.scale(2.6), k.z(6.6)]);
      var PY = BASE_Y - 53; // le nom est peint directement sur le pan du toit (lettres claires, ombre rouge sombre)
      k.add([k.text("LAITA", { size: 10, font: "monospace" }), k.pos(KX + 1, PY + 1.5), k.anchor("center"), k.color(rgb("#5a1a22")), k.z(6.8)]);
      k.add([k.text("LAITA", { size: 10, font: "monospace" }), k.pos(KX, PY), k.anchor("center"), k.color(rgb("#fff0c2")), k.z(6.9)]);
      var laitaShadow = sc.shadow(LX, 0.6);
      var laita = k.add([k.sprite("laita", { anim: "sit" }), k.pos(LX, BASE_Y), k.anchor("bot"), k.scale(3), k.opacity(1), k.z(8.5)]);
      laita.flipX = true;
      var goal = 80, wait = 1.2, state = "wait", entering = false;

      sc.onFrame(function (t) {
        if (logo) logo.update(t);
        if (prompt.exists()) prompt.opacity = 0.8 + 0.2 * Math.abs(Math.sin(t * 2.6));
        if (coin.exists()) {
          coin.scale = k.vec2(Math.max(0.12, Math.abs(Math.cos(t * 3))) * icon / 10, icon / 10); // la pièce tourne sur elle-même
          if (!scoreDone) { // le score défile jusqu'au total, puis la pièce et le chiffre brillent un instant
            scoreT += k.dt();
            var q = Math.min(1, scoreT / scoreDur), shown = Math.round(score * (1 - (1 - q) * (1 - q)));
            scoreTxt.text = pad(shown); scoreShadow.text = pad(shown);
            if (q >= 1) { scoreDone = true; scoreFlash = 0.9; }
          } else if (scoreFlash > 0) { scoreFlash -= k.dt(); scoreTxt.color = rgb(Math.floor(scoreFlash * 10) % 2 ? "#ffffff" : "#ffe08a"); if (scoreFlash <= 0) scoreTxt.color = rgb("#ffe08a"); }
        }
        shadow.pos.x = octo.pos.x;
        shadow.opacity = 0.6 * octo.opacity;
        laitaShadow.pos.x = laita.pos.x; laitaShadow.opacity = 0.5 * octo.opacity; laita.opacity = octo.opacity;
        if (entering) return;
        if (state === "wait") {
          wait -= k.dt();
          if (wait <= 0) { goal = k.rand(40, 235); state = "walk"; octo.play("run"); }
        } else {
          var dx = goal - octo.pos.x, step = 70 * k.dt();
          octo.flipX = dx < 0;
          if (Math.abs(dx) <= step) { octo.pos.x = goal; state = "wait"; wait = k.rand(1.2, 3); octo.play("idle"); }
          else octo.pos.x += Math.sign(dx) * step;
        }
      });

      var lapDialog = null;
      function enter() {
        if (entering || lapDialog) return;
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
        row.textContent = lv.id + "  " + ((window.OctoWorlds && window.OctoWorlds.title(lv.id, P.world())) || lv.title) + (done ? "  ✓" : locked ? "  🔒" : "");
        row.addEventListener("click", function () { ctx.go("level" + lv.id); });
        panel.appendChild(row);
      });
      toggle.addEventListener("click", function () { open = !open; picker.classList.toggle("is-open", open); });
      picker.appendChild(panel); picker.appendChild(toggle);
      ctx.host.appendChild(picker);

      /** Un tour de 10 niveaux vient d'être fini : on présente la nouvelle apparence et on fait choisir le langage du tour suivant. */
      var SKIN_NAMES = ["OctoCat", "OctoNinja", "OctoPrincesse", "OctoCosmos", "OctoBot"], DOG_NAMES = ["Laita", "Laita Bandana", "Laita Royale", "Laita Etoilee", "Laita Turbo"];
      function openLapUp() {
        var tour = P.laps(), L = window.OctoLangs, WD = window.OctoWorlds, dlg = document.createElement("div"), card = document.createElement("div"), opts = P.nextLangs();
        dlg.className = "octo-dialog is-open octo-lapup"; card.className = "octo-dialog__card";
        function add(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; card.appendChild(n); return n; }
        add("h2", "octo-dialog__title", "🎉 TOUR " + tour + " TERMINE !");
        var intro = add("p", "octo-dialog__text", "Tu as vaincu les 10 niveaux ! Regarde : OctoCat et Laita ont une toute nouvelle apparence. Voici " + SKIN_NAMES[tour] + " et " + DOG_NAMES[tour].replace("Etoilee", "Étoilée") + " ✨");
        intro.className = "octo-dialog__text";
        add("div", "octo-dialog__label", opts.length > 1 ? "🌍 CHOISIS TON PROCHAIN MONDE (TOUR " + (tour + 1) + ")" : "🌍 TON DERNIER MONDE : TOUR " + (tour + 1));
        add("p", "octo-dialog__tip", opts.length > 1 ? "Chaque langage a son propre monde, avec d'autres décors et d'autres jeux. Les énigmes sont les mêmes, tu les écriras dans ce langage. Tu feras l'autre monde au dernier tour. Tes pièces sont gardées !" : "Il ne reste qu'un monde à découvrir : c'est le dernier tour ! Tes pièces sont gardées.");
        var row = add("div", "octo-lang-row");
        opts.forEach(function (lang) {
          var wi = WD ? WD.info[WD.ofLang(lang)] : null, b = document.createElement("button"); b.type = "button"; b.className = "octo-lang";
          var nm = document.createElement("span"); nm.className = "octo-lang__name"; nm.textContent = wi ? wi.icon + " " + wi.name : lang;
          var tg = document.createElement("span"); tg.className = "octo-lang__tag"; tg.textContent = (wi ? wi.blurb + ". " : "") + "Langage : " + lang + (L ? ". " + L.INFO[lang].tagline : "");
          b.appendChild(nm); b.appendChild(tg);
          b.addEventListener("click", function () {
            P.startLap(lang);
            dlg.remove(); lapDialog = null;
            if (window.OctoMusic) window.OctoMusic.sfx("magic");
            sc.burst(octo.pos.x + 20, octo.pos.y - 40, ["#ffe08a", "#ffffff", "#58a6ff", "#bc8cff"], 40);
            h.wait(0.5).then(function () { ctx.go("hub"); }); // la scène est refaite : le décor du nouveau monde apparaît
          });
          row.appendChild(b);
        });
        dlg.appendChild(card); ctx.host.appendChild(dlg); lapDialog = dlg;
        var first = row.querySelector("button"); if (first) first.focus();
        if (window.OctoMusic) window.OctoMusic.sfx("star");
        h.wait(0.4).then(function () { sc.burst(octo.pos.x + 20, octo.pos.y - 40, ["#ffe08a", "#ffffff", "#f778ba", "#39c5cf"], 40); });
      }
      if (P.pendingLap()) openLapUp();

      // le robot : gagné en finissant le jeu sans la magie des torches ; l'accueil le présente une seule fois
      var robotDlg = null;
      if (P.robotNew() && !CARD && !P.pendingLap()) {
        robotDlg = document.createElement("div"); robotDlg.className = "octo-dialog is-open octo-lapup";
        var rc = document.createElement("div"); rc.className = "octo-dialog__card"; robotDlg.appendChild(rc);
        var rAdd = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; n.textContent = text; rc.appendChild(n); return n; };
        rAdd("h2", "octo-dialog__title", "🤖 COSTUME SECRET DÉBLOQUÉ !");
        rAdd("p", "octo-dialog__text", "Tu as fini le jeu sans jamais utiliser la magie des torches : bravo, c'est très fort ! Voici OctoBot, le robot d'acier à visière lumineuse, et sa chienne Laita Turbo, avec son sac à réaction.");
        rAdd("p", "octo-dialog__tip", "Tu peux le mettre quand tu veux avec le bouton 🎭 COSTUME.");
        var rRow = document.createElement("div"); rRow.className = "octo-lang-row"; rc.appendChild(rRow);
        [["🤖 Mettre OctoBot !", true], ["Plus tard", false]].forEach(function (o) {
          var bt = document.createElement("button"); bt.type = "button"; bt.className = "octo-lang";
          var nm = document.createElement("span"); nm.className = "octo-lang__name"; nm.textContent = o[0]; bt.appendChild(nm);
          bt.addEventListener("click", function () { P.robotSeen(); robotDlg.remove(); robotDlg = null; if (o[1] && P.pickSkin(4)) ctx.go("hub"); });
          rRow.appendChild(bt);
        });
        ctx.host.appendChild(robotDlg);
        if (window.OctoMusic) window.OctoMusic.sfx("magic");
        rRow.querySelector("button").focus();
      }

      // choix du costume (à côté du bouton du son) : seulement une fois plus de 499 pièces gagnées ; on peut alors reprendre n'importe quelle apparence
      var skinBox = null;
      if (P.canPickSkin() && !CARD) {
        var audioBox = ctx.host.querySelector(".octo-audio");
        if (audioBox) {
          skinBox = document.createElement("div"); skinBox.className = "octo-skin";
          var skinBtn = document.createElement("button"); skinBtn.type = "button"; skinBtn.className = "octo-mute octo-skin__toggle";
          skinBtn.appendChild(document.createTextNode("🎭"));
          var skinLbl = document.createElement("span"); skinLbl.className = "octo-skin__label"; skinLbl.textContent = " COSTUME"; skinBtn.appendChild(skinLbl); // le mot disparaît sur petit écran (CSS) : le bouton ne recouvre pas le logo
          skinBtn.setAttribute("aria-label", "Choisir l'apparence d'OctoCat et de Laita");
          skinBtn.setAttribute("aria-expanded", "false");
          var skinPanel = document.createElement("div"); skinPanel.className = "octo-skin__panel";
          var skinHead = document.createElement("div"); skinHead.className = "octo-skin__head"; skinHead.textContent = "CHOISIS TON COSTUME";
          skinPanel.appendChild(skinHead);
          var ICONS = ["🐱", "🥷", "👑", "🌌", "🤖"], now = P.skin(), choices = P.skinChoices(), list = choices.slice();
          if (choices.length && choices.indexOf(P.laps()) < 0 && P.laps() <= 3) list.unshift(-1); // moins de 500 pièces : on peut revenir au costume du tour
          list.forEach(function (i) {
            var auto = i === -1, nm = auto ? "Costume du tour" : SKIN_NAMES[i];
            var row = document.createElement("button"); row.type = "button"; row.className = "octo-skin__row" + ((auto ? now === P.laps() : i === now) ? " is-on" : "");
            row.textContent = (auto ? "↺" : ICONS[i]) + "  " + nm + (auto ? " (" + SKIN_NAMES[P.laps()] + ")" : " + " + DOG_NAMES[i].replace("Etoilee", "Étoilée")) + ((auto ? now === P.laps() : i === now) ? "  ✓" : "");
            row.addEventListener("click", function () { var target = auto ? -1 : i; if ((auto ? now !== P.laps() : i !== now) && P.pickSkin(target)) ctx.go("hub"); else { skinBox.classList.remove("is-open"); skinBtn.setAttribute("aria-expanded", "false"); } }); // la scène est refaite : les sprites prennent le nouveau costume
            skinPanel.appendChild(row);
          });
          skinBtn.addEventListener("click", function () { var o = skinBox.classList.toggle("is-open"); skinBtn.setAttribute("aria-expanded", String(o)); skinBtn.blur(); });
          skinBox.appendChild(skinBtn); skinBox.appendChild(skinPanel);
          audioBox.insertBefore(skinBox, audioBox.firstChild);
        }
      }

      // jeu fini : on peut rejouer n'importe lequel des trois mondes (bouton à côté du costume)
      var worldBox = null;
      if (P.get().finished && !CARD && window.OctoWorlds) {
        var audioBox2 = ctx.host.querySelector(".octo-audio");
        if (audioBox2) {
          worldBox = document.createElement("div"); worldBox.className = "octo-skin octo-worldpick";
          var wBtn = document.createElement("button"); wBtn.type = "button"; wBtn.className = "octo-mute octo-skin__toggle";
          wBtn.appendChild(document.createTextNode("🌍"));
          var wLbl = document.createElement("span"); wLbl.className = "octo-skin__label"; wLbl.textContent = " MONDE"; wBtn.appendChild(wLbl);
          wBtn.setAttribute("aria-label", "Choisir le monde à rejouer"); wBtn.setAttribute("aria-expanded", "false");
          var wPanel = document.createElement("div"); wPanel.className = "octo-skin__panel";
          var wHead = document.createElement("div"); wHead.className = "octo-skin__head"; wHead.textContent = "REJOUER UN MONDE"; wPanel.appendChild(wHead);
          window.OctoWorlds.info.forEach(function (wi) {
            var r = document.createElement("button"); r.type = "button"; r.className = "octo-skin__row" + (wi.id === P.world() ? " is-on" : "");
            r.textContent = wi.icon + "  " + wi.name + " (" + wi.lang + ")" + (wi.id === P.world() ? "  ✓" : "");
            r.addEventListener("click", function () { if (wi.id !== P.world() && P.pickWorld(wi.lang)) ctx.go("hub"); else { worldBox.classList.remove("is-open"); wBtn.setAttribute("aria-expanded", "false"); } });
            wPanel.appendChild(r);
          });
          wBtn.addEventListener("click", function () { var o = worldBox.classList.toggle("is-open"); wBtn.setAttribute("aria-expanded", String(o)); wBtn.blur(); });
          worldBox.appendChild(wBtn); worldBox.appendChild(wPanel);
          audioBox2.insertBefore(worldBox, audioBox2.firstChild);
        }
      }

      // jeu fini (quelle que soit la fin : avec ou sans OctoBot) : on peut revoir le générique quand on veut
      var credBtn = null;
      if (P.get().finished && !CARD) {
        var audioBox3 = ctx.host.querySelector(".octo-audio");
        if (audioBox3) {
          credBtn = document.createElement("button"); credBtn.type = "button"; credBtn.className = "octo-mute octo-skin__toggle octo-credits-btn";
          credBtn.appendChild(document.createTextNode("🎬"));
          var cLbl = document.createElement("span"); cLbl.className = "octo-skin__label"; cLbl.textContent = " CREDITS"; credBtn.appendChild(cLbl);
          credBtn.setAttribute("aria-label", "Revoir le générique de fin");
          credBtn.addEventListener("click", function () { credBtn.blur(); ctx.go("credits"); });
          audioBox3.insertBefore(credBtn, audioBox3.firstChild);
        }
      }
      return { reset: function () {}, destroy: function () { picker.remove(); if (skinBox) skinBox.remove(); if (worldBox) worldBox.remove(); if (credBtn) credBtn.remove(); if (lapDialog) lapDialog.remove(); if (robotDlg) robotDlg.remove(); } };
    }
  });
})();
