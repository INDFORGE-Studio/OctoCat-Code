/* OctoCat-Code — Générique de fin (à la façon des vieux jeux vidéo).
 * Il se lance une seule fois, quand le joueur termine les 10 niveaux pour la 3e fois : le texte monte lentement sur un ciel
 * étoilé pendant qu'OctoCat et Laita (dans leur dernière apparence) courent sous les feux d'artifice. Maintenir un clic ou Espace
 * accélère, Entrée passe à la fin. Puis, quelques secondes après « FIN », on revient à l'accueil.
 * Les textes sont en capitales sans accents (la police du canvas n'a pas les accents).
 */
(function () {
  "use strict";

  function plain(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); }

  /** [style, texte] ; styles : title, sub, head, name, small, gap. */
  function script(P) {
    var out = [
      ["title", "OCTOCAT-CODE"], ["sub", "APPRENDS A CODER EN T'AMUSANT"], ["gap"],
      ["head", "UN JEU DE"], ["name", "INDFORGE STUDIO"], ["gap"],
      ["head", "IDEE, DIRECTION ET TESTS"], ["name", "MICKAEL"], ["gap"],
      ["head", "CODE, PIXEL ART ET MUSIQUE"], ["name", "FABRIQUES PAR ORDINATEUR"], ["name", "AVEC CLAUDE, D'ANTHROPIC"],
      ["small", "AUCUNE IMAGE, AUCUN FICHIER DE SON :"], ["small", "TOUT EST DESSINE ET JOUE PAR DU CODE"], ["gap"],
      ["head", "LES HEROS"],
      ["name", "OCTOCAT"], ["small", "LE CHAT-PIEUVRE QUI CODE"],
      ["name", "LAITA"], ["small", "LA CHIENNE FIDELE QUI FAIT PEUR AUX MONSTRES"], ["small", "D'APRES LA VRAIE LAITA"],
      ["name", "LES GLITCHS"], ["small", "LES BUGS : ILS ONT PERDU CETTE FOIS"], ["gap"],
      ["head", "LES 10 MONDES"]
    ];
    P.levels.forEach(function (lv) { out.push(["name", lv.id + "  " + plain(lv.title)]); });
    out.push(["gap"], ["head", "CE QUE TU AS APPRIS"],
      ["name", "VARIABLES ET TEXTES"], ["name", "CALCULS ET BOOLEENS"], ["name", "SI ... SINON"], ["name", "BOUCLES : POUR ET TANT QUE"],
      ["small", "EN PYTHON, EN JAVASCRIPT ET EN PSEUDO-CODE"], ["gap"],
      ["head", "OUTILS LIBRES"],
      ["name", "KAPLAY"], ["small", "LE MOTEUR 2D (MIT)"],
      ["name", "MKDOCS + MATERIAL"], ["small", "LE SITE (MIT)"],
      ["name", "PRESS START 2P"], ["small", "LA POLICE PIXEL (OFL)"],
      ["name", "GITHUB PAGES"], ["small", "L'HEBERGEMENT"], ["gap"],
      ["head", "TES EXPLOITS"],
      ["name", "TOURS TERMINES : " + P.LAPS + "/" + P.LAPS], ["name", "NIVEAUX REUSSIS : " + P.LAPS * P.levels.length],
      ["name", "PIECES EN POCHE : " + P.coins()], ["gap"],
      ["head", "MERCI A TOI !"], ["name", "TU AS CODE JUSQU'AU BOUT"], ["small", "MAINTENANT, A TOI DE CREER TES PROPRES JEUX"], ["gap"], ["gap"]);
    return out;
  }

  var STYLE = {
    title: { size: 24, color: "#ffe08a", h: 40 }, sub: { size: 10, color: "#ffffff", h: 22 }, head: { size: 12, color: "#58d6ff", h: 22 },
    name: { size: 11, color: "#ffffff", h: 17 }, small: { size: 8, color: "#9fb0c3", h: 14 }, gap: { size: 0, color: "#ffffff", h: 20 }
  };

  window.gameEngine.registerScene("credits", {
    alt: "Le générique de fin défile sur un ciel étoilé pendant qu'OctoCat et Laita courent sous des feux d'artifice.",

    scene: function (k, h, ctx) {
      var P = window.OctoProgress, M = window.OctoMusic, VW = k.width(), VH = k.height();
      function rgb(hex) { return k.Color.fromHex(hex); }
      var GY = Math.round(VH - Math.max(48, VH * 0.2)), BASE = GY + 3, SPEED = 26, CAM_V = 46;

      // ----- décor : ciel de nuit, étoiles, montagnes qui défilent, sol -----
      k.add([k.rect(VW + 200, VH + 200), k.pos(-100, -100), k.color(rgb("#0a0820")), k.fixed(), k.z(-6)]);
      function layer(sprite, factor, yFn, z, tint, op) {
        var items = [0, 1, 2].map(function () { return k.add([k.sprite(sprite), k.pos(0, 0), k.scale(2), k.color(rgb(tint)), k.opacity(op), k.z(z)]); });
        return function (cx) {
          var shift = cx * factor, base = Math.floor(shift / 600);
          items.forEach(function (o, i) { o.pos.x = cx - VW / 2 + (base + i) * 600 - shift; o.pos.y = yFn(); o.flipX = ((base + i) % 2 + 2) % 2 === 1; });
        };
      }
      var skyL = layer("sky", 0.04, function () { return 0; }, -5, "#3a2a7a", 0.55);
      var landL = layer("land", 0.3, function () { return GY - 150; }, -4, "#5a4a9a", 0.8);
      var stars = [];
      for (var i = 0; i < 46; i++) stars.push({ o: k.add([k.rect(i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1), k.pos(k.rand(0, VW), k.rand(4, GY - 40)), k.color(rgb(i % 5 === 0 ? "#ffe08a" : "#ffffff")), k.opacity(0.7), k.fixed(), k.z(-4.5)]), p: k.rand(0, 6.28), sp: k.rand(1.2, 3.4) });

      function cull(o) { if (typeof k.offscreen === "function") o.use(k.offscreen({ hide: true, distance: 60 })); return o; }
      var WORLD = Math.ceil(VW + 90 * CAM_V) + 200, tx; // le sol et le décor sont posés une fois sur toute la distance parcourue
      for (tx = 0; tx < WORLD; tx += 32) {
        cull(k.add([k.sprite("grass" + (Math.floor(tx / 32) % 3)), k.pos(tx, GY), k.scale(2), k.color(rgb("#9a7ab0")), k.z(5)]));
        for (var dy = 1; GY + dy * 32 < VH + 40; dy++) cull(k.add([k.sprite("dirt" + ((Math.floor(tx / 32) + dy) % 3)), k.pos(tx, GY + dy * 32), k.scale(2), k.color(rgb("#9a7ab0")), k.z(5)]));
      }
      var PROPS = ["tree", "bush", "palm", "rock", "mushroom", "tuft0", "flower0", "tuft1", "torch"];
      for (tx = 150, i = 0; tx < WORLD; tx += k.rand(55, 120), i++) {
        var nm = PROPS[(i * 7 + 3) % PROPS.length];
        k.add([k.sprite(nm), k.pos(tx, BASE + 1), k.anchor("bot"), k.scale(nm === "tree" || nm === "palm" ? 2.2 : 2.6), k.color(rgb("#c9b8e8")), k.z(3.5)]);
      }

      // ----- les héros : OctoCat et Laita courent côte à côte -----
      var heroX = 86, octoShadow = k.add([k.sprite("glow"), k.pos(0, BASE), k.anchor("center"), k.scale(0.7, 0.18), k.color(rgb("#0a0820")), k.opacity(0.6), k.z(5.9)]);
      var dogShadow = k.add([k.sprite("glow"), k.pos(0, BASE), k.anchor("center"), k.scale(0.5, 0.14), k.color(rgb("#0a0820")), k.opacity(0.5), k.z(5.9)]);
      var aura = k.add([k.sprite("glow"), k.pos(0, BASE - 26), k.anchor("center"), k.scale(3.4), k.color(rgb("#8f7cff")), k.opacity(0.22), k.z(8.5)]); // un halo doux : la dernière apparence se détache du ciel sombre
      var octo = k.add([k.sprite("octo", { anim: "run" }), k.pos(0, BASE), k.anchor("bot"), k.scale(3), k.z(9)]);
      var dog = k.add([k.sprite("laita", { anim: "run" }), k.pos(0, BASE), k.anchor("bot"), k.scale(2.6), k.z(8.9)]);

      // ----- texte qui monte (placé une fois, déplacé à chaque image) -----
      var band = k.add([k.rect(Math.min(VW - 16, 430), VH + 20), k.pos(VW / 2, VH / 2), k.anchor("center"), k.color(rgb("#07061a")), k.opacity(0.42), k.fixed(), k.z(29)]);
      var rows = [], y = 0;
      // le titre est le même logo que sur l'accueil, mais ses reflets changent de couleur bien plus vite ; repli sur du texte si le module manque
      var tlogo = window.OctoLogo ? window.OctoLogo.add(k, { cx: VW / 2, top: -300, maxW: Math.min(VW - 16, 440), maxH: 90, rgb: rgb, z: 31, speed: 2.6, rainbow: true, still: true }) : null;
      script(P).forEach(function (ln) {
        var st = STYLE[ln[0]];
        if (ln[0] === "title" && tlogo) { rows.push({ logo: true, y: y + (tlogo.height + 12) / 2 }); y += tlogo.height + 12; return; }
        if (ln[1]) {
          var shadow = k.add([k.text(ln[1], { size: st.size, font: "monospace" }), k.pos(VW / 2 + 1, 0), k.anchor("center"), k.color(rgb("#000000")), k.opacity(0.8), k.fixed(), k.z(30.9)]);
          var t = k.add([k.text(ln[1], { size: st.size, font: "monospace" }), k.pos(VW / 2, 0), k.anchor("center"), k.color(rgb(st.color)), k.fixed(), k.z(31)]);
          rows.push({ o: t, s: shadow, y: y + st.h / 2, title: ln[0] === "title" });
        }
        y += st.h;
      });
      var totalH = y;
      var finTxt = k.add([k.text("FIN", { size: 34, font: "monospace" }), k.pos(VW / 2, VH / 2 - 8), k.anchor("center"), k.color(rgb("#ffe08a")), k.opacity(0), k.fixed(), k.z(32)]);
      var finSub = k.add([k.text("A BIENTOT, CODEUR !", { size: 10, font: "monospace" }), k.pos(VW / 2, VH / 2 + 22), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);
      k.add([k.text("CLIC / ESPACE : ACCELERER    ENTREE : PASSER", { size: 7, font: "monospace" }), k.pos(8, 8), k.anchor("topleft"), k.color(rgb("#8b949e")), k.opacity(0.75), k.fixed(), k.z(32)]);
      var fade = k.add([k.rect(VW + 200, VH + 200), k.pos(-100, -100), k.color(rgb("#000000")), k.opacity(1), k.fixed(), k.z(40)]);

      // ----- feux d'artifice et étoiles filantes -----
      var sparks = [], fireT = 0.8, shootT = 3, FIRE = ["#ffe08a", "#ff7eb6", "#58d6ff", "#7ee787", "#bc8cff", "#ffffff"];
      function firework(x, yy, n) {
        var col = FIRE[Math.floor(k.rand(0, FIRE.length))], col2 = FIRE[Math.floor(k.rand(0, FIRE.length))], j;
        for (j = 0; j < (n || 26); j++) {
          var a = (j / (n || 26)) * Math.PI * 2, sp = k.rand(34, 70);
          sparks.push({ o: k.add([k.rect(3, 3), k.pos(x, yy), k.color(rgb(j % 2 ? col : col2)), k.opacity(1), k.fixed(), k.z(12)]), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: k.rand(0.9, 1.5), t: 0 });
        }
      }

      var scroll = 0, camX = VW / 2, time = 0, phase = "in", phaseT = 0, jumpT = 2, jumpA = null, dogJumpA = null, skipped = false, posed = false;
      if (M) { M.setMood(0); M.setBattle(false); M.victory(); }
      function toEnd() { if (phase === "scroll" || phase === "in") { phase = "fin"; phaseT = 0; scroll = totalH + VH; } }
      k.onKeyPress("enter", function () { if (phase === "scroll") toEnd(); });

      k.onUpdate(function () {
        var dt = Math.min(k.dt(), 0.05);
        time += dt; phaseT += dt;
        var fast = k.isMouseDown() || k.isKeyDown("space");
        // fondu d'entrée / de sortie
        if (phase === "in") { fade.opacity = Math.max(0, 1 - phaseT / 1.2); if (phaseT >= 1.2) { phase = "scroll"; phaseT = 0; } }
        else if (phase === "scroll") {
          scroll += SPEED * (fast ? 4.5 : 1) * dt;
          if (scroll > totalH + VH) { phase = "fin"; phaseT = 0; }
        } else if (phase === "fin") {
          var fa = Math.min(1, phaseT / 1.2);
          finTxt.opacity = fa; finSub.opacity = fa; finTxt.pos.y = VH / 2 - 8 + Math.sin(time * 4) * 2;
          if (!posed) { posed = true; octo.play("success"); dog.play("sit"); if (M) M.sfx("bark"); }
          if (phaseT > 5) { phase = "out"; phaseT = 0; }
        } else if (phase === "out") {
          fade.opacity = Math.min(1, phaseT / 1.2);
          if (phaseT >= 1.4 && !skipped) { skipped = true; P.finishCredits(); ctx.go("hub"); return; }
        }

        // caméra et parallaxe : le monde défile vers la gauche
        camX += CAM_V * (phase === "fin" || phase === "out" ? 0.4 : 1) * (fast ? 2 : 1) * dt;
        k.camPos(camX, VH / 2);
        skyL(camX); landL(camX);
        stars.forEach(function (s) { s.o.opacity = 0.35 + 0.5 * Math.abs(Math.sin(time * s.sp + s.p)); });

        // texte
        rows.forEach(function (r) {
          var yy = VH + 10 + r.y - scroll;
          if (r.logo) { tlogo.setTop(yy - tlogo.height / 2); tlogo.setVisible(yy > -tlogo.height && yy < VH + tlogo.height); tlogo.update(time + 5); return; }
          r.o.pos.y = yy; r.s.pos.y = yy + 1;
          var vis = yy > -20 && yy < VH + 20;
          r.o.opacity = vis ? 1 : 0; r.s.opacity = vis ? 0.8 : 0;
          if (r.title) r.o.color = rgb(Math.floor(time * 3) % 2 ? "#ffe08a" : "#fff4c2");
        });
        band.opacity = phase === "fin" || phase === "out" ? Math.max(0.15, 0.42 - phaseT * 0.1) : 0.42;

        // héros : ils courent à gauche de l'écran, sautent de temps en temps, puis posent à la fin
        var fin = phase === "fin" || phase === "out";
        var ox = camX - VW / 2 + heroX + (fin ? 18 : 0), dx2 = ox - (fin ? 70 : 62);
        jumpT -= dt;
        if (!fin && jumpT <= 0) { jumpT = k.rand(3.2, 5); jumpA = 0; dogJumpA = -0.25; }
        var oy = 0, dyy = 0;
        if (jumpA !== null) { jumpA += dt; var u = jumpA / 0.72; if (u >= 1) jumpA = null; else oy = -Math.sin(u * Math.PI) * 34; }
        if (dogJumpA !== null) { dogJumpA += dt; if (dogJumpA > 0) { var v = dogJumpA / 0.6; if (v >= 1) dogJumpA = null; else dyy = -Math.sin(v * Math.PI) * 24; } }
        octo.pos.x = ox; octo.pos.y = BASE + oy; dog.pos.x = dx2; dog.pos.y = BASE + dyy;
        octo.flipX = false; dog.flipX = false;
        aura.pos.x = ox + 4; aura.pos.y = BASE - 28 + oy * 0.6; aura.opacity = 0.18 + 0.06 * Math.sin(time * 3);
        octoShadow.pos.x = ox; octoShadow.opacity = 0.6 - Math.min(0.4, -oy / 60);
        dogShadow.pos.x = dx2; dogShadow.opacity = 0.5 - Math.min(0.35, -dyy / 50);

        // feux d'artifice (plus fréquents à la fin) et étoile filante
        fireT -= dt;
        if (fireT <= 0 && phase !== "in") {
          fireT = fin ? k.rand(0.2, 0.5) : k.rand(0.6, 1.4);
          firework(camX - VW / 2 + k.rand(20, VW - 20), k.rand(20, GY - 70) - 0, fin ? 34 : 24);
          if (M && Math.random() < 0.4) M.sfx(Math.random() < 0.5 ? "bit" : "checkpoint");
        }
        shootT -= dt;
        if (shootT <= 0) {
          shootT = k.rand(4, 8);
          var sx = k.rand(VW * 0.3, VW), sy = k.rand(6, GY * 0.4), streak = k.add([k.rect(14, 1), k.pos(sx, sy), k.color(rgb("#ffffff")), k.opacity(0.9), k.rotate(25), k.fixed(), k.z(-4.4)]);
          sparks.push({ o: streak, vx: -120, vy: 56, life: 0.9, t: 0, noGrav: true });
        }
        sparks = sparks.filter(function (p) {
          p.t += dt;
          if (p.t >= p.life) { p.o.destroy(); return false; }
          var o = p.o;
          o.pos.x += p.vx * dt; o.pos.y += p.vy * dt;
          if (!p.noGrav) { p.vy += 60 * dt; p.vx *= 0.985; }
          o.opacity = 1 - p.t / p.life;
          return true;
        });
      });

      return { reset: function () {} };
    }
  });
})();
