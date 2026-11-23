/* OctoCat-Code — La Grange (la vieille grange retapée en maison de campagne de la famille) : le cadeau de Noël caché dans le jeu.
 * On y entre depuis l'accueil (la maison à côté de la niche de Laita, ou le bouton 🏠 GRANGE). À l'intérieur : poutres, guirlandes, neige à la fenêtre,
 * cheminée avec trois chaussettes, sapin et trois cadeaux, un par héros de la famille (Liam, Elias, Izia). Ouvrir un cadeau fait lire un petit mot de tonton ; quand les trois sont
 * ouverts, le sapin s'allume. Laita, la chienne, suit l'OctoCat (elle n'est pas un héros : c'est leur chienne).
 * Les textes sont en capitales sans accents (la police du canvas n'a pas les accents). Rien n'est enregistré ailleurs que dans le navigateur du joueur.
 */
(function () {
  "use strict";

  var KEY = "octocat-code:grange:v1";

  /** Un héros = un cadeau. `icon` est un sprite déjà chargé par le jeu (étoile, pièce, cœur). */
  var HEROES = [
    { id: "liam", name: "LIAM", icon: "power", power: "LE COURAGE", color: "#58a6ff",
      text: "QUAND OCTOCAT SAUTE PAR-DESSUS UN TROU SANS AVOIR PEUR, C'EST UN PEU TOI. DANS CE JEU, LIAM, TU ES SON COURAGE !" },
    { id: "elias", name: "ELIAS", icon: "bit", power: "LA CURIOSITE", color: "#5fd47a",
      text: "QUAND OCTOCAT PART DECOUVRIR UNE SALLE SECRETE OU FAIT UNE MAGIE, C'EST UN PEU TOI. DANS CE JEU, ELIAS, TU ES SA CURIOSITE !" },
    { id: "izia", name: "IZIA", icon: "heart", power: "LE GRAND COEUR", color: "#f778ba",
      text: "QUAND OCTOCAT PROTEGE SES AMIS ET QUE SON COEUR LE REND INVINCIBLE, C'EST UN PEU TOI. DANS CE JEU, IZIA, TU ES SON GRAND COEUR !" }
  ];
  var FINALE = {
    title: "JOYEUX NOEL 2026 !",
    text: "LIAM, ELIAS, IZIA : VOUS ETES LES 3 HEROS DE CE JEU, ET UNE PART DE CHACUN VIT DANS OCTOCAT. MERCI POUR TOUT... ET A BIENTOT A LA GRANGE ! LAITA AUSSI VOUS DIT OUAF !",
    sign: "- TONTON -"
  };

  /** Cadeaux déjà ouverts : { opened: { liam: true, … } }. Lecture prudente (le stockage peut manquer ou contenir n'importe quoi). */
  function load() {
    var s = { opened: {} };
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (o && typeof o === "object" && o.opened && typeof o.opened === "object") HEROES.forEach(function (hero) { if (o.opened[hero.id] === true) s.opened[hero.id] = true; });
    } catch { /* stockage absent ou illisible : on repart de zéro */ }
    return s;
  }
  function save(s) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ opened: s.opened })); } catch { /* navigation privée : tant pis, la visite reste jouable */ }
  }
  function count(s) { return HEROES.filter(function (hero) { return s.opened[hero.id]; }).length; }
  function allOpened(s) { return count(s) === HEROES.length; }

  window.OctoGrange = { HEROES: HEROES, FINALE: FINALE, KEY: KEY, load: load, save: save, count: count, allOpened: allOpened };

  if (!window.gameEngine) return;

  window.gameEngine.registerScene("grange", {
    alt: "L'intérieur de La Grange, la maison de campagne de la famille, décorée pour Noël : une cheminée, un sapin, des guirlandes, la neige à la fenêtre et trois cadeaux à ouvrir, un pour chaque héros.",

    scene: function (k, h, ctx) {
      var M = window.OctoMusic, kit = window.OctoPlay && window.OctoPlay.kit;
      var VW = k.width(), VH = k.height();
      function rgb(hex) { return k.Color.fromHex(hex); }
      function add(list) { list.push(k.fixed()); return k.add(list); }
      function sfx(name) { try { if (M) M.sfx(name); } catch { /* le son est un bonus */ } }
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      var fit = Math.min(1, VW / 420), u = VH / 250;
      function fsz(n) { return Math.max(7, Math.round(n * fit)); }
      var SO = Math.max(2, Math.round(VH / 100)), SG = Math.max(2, SO - 1), ST = Math.max(2, SO - 1);
      var FLOOR = Math.round(VH * 0.74), BASE = Math.round(FLOOR + (VH - FLOOR) * 0.62), GBASE = Math.round(FLOOR + (VH - FLOOR) * 0.5), TBASE = Math.round(FLOOR + (VH - FLOOR) * 0.34);
      var state = load(), alive = true, time = 0;
      var touch = false;
      try { touch = window.matchMedia("(pointer: coarse)").matches; } catch { /* ancien navigateur */ }
      if (M) { try { M.setMood(0); M.setBattle(false); } catch { /* ignoré */ } }
      k.camPos(VW / 2, VH / 2);

      // ----- décor : mur en planches, poutres, fenêtre sur la nuit enneigée, sol de paille -----
      add([k.rect(VW, VH), k.pos(0, 0), k.color(rgb("#4a2f1c")), k.z(-8)]);
      var x, i, plank = Math.round(22 * u);
      for (x = 0, i = 0; x < VW; x += plank, i++) {
        if (i % 2 === 0) add([k.rect(plank, FLOOR), k.pos(x, 0), k.color(rgb("#553723")), k.opacity(0.55), k.z(-7.95)]);
        add([k.rect(Math.max(1, Math.round(u)), FLOOR), k.pos(x, 0), k.color(rgb("#2f1c10")), k.z(-7.9)]);
      }
      for (i = 0; i < 9; i++) add([k.rect(Math.round(3 * u), Math.round(4 * u)), k.pos(k.rand(8, VW - 8), k.rand(VH * 0.3, FLOOR - 10)), k.color(rgb("#35210f")), k.opacity(0.7), k.z(-7.8)]); // nœuds du bois
      add([k.rect(VW, Math.round(9 * u)), k.pos(0, Math.round(VH * 0.045)), k.color(rgb("#2a190e")), k.z(-7.5)]);
      add([k.rect(VW, Math.max(1, Math.round(2 * u))), k.pos(0, Math.round(VH * 0.045)), k.color(rgb("#6b4a2a")), k.z(-7.49)]);
      [0.012, 0.972].forEach(function (fx) { add([k.rect(Math.round(10 * u), FLOOR), k.pos(Math.round(VW * fx), 0), k.color(rgb("#2a190e")), k.z(-7.4)]); });
      // fenêtre : nuit bleue, lune, étoiles, neige qui tombe
      var ww = Math.round(Math.min(58 * u, VW * 0.13)), wh = Math.round(ww * 1.15), wx = Math.round(VW * 0.045), wy = Math.round(VH * 0.16);
      add([k.rect(ww + 8, wh + 8), k.pos(wx - 4, wy - 4), k.color(rgb("#6b4a2a")), k.z(-7)]);
      add([k.rect(ww, wh), k.pos(wx, wy), k.color(rgb("#101c3e")), k.z(-6.9)]);
      add([k.circle(Math.max(4, ww * 0.16)), k.pos(wx + ww * 0.7, wy + wh * 0.22), k.anchor("center"), k.color(rgb("#fff4c2")), k.z(-6.8)]);
      for (i = 0; i < 7; i++) add([k.rect(1, 1), k.pos(wx + k.rand(3, ww - 3), wy + k.rand(3, wh * 0.6)), k.color(rgb("#ffffff")), k.opacity(0.8), k.z(-6.8)]);
      add([k.rect(ww, Math.round(wh * 0.12)), k.pos(wx, wy + wh - Math.round(wh * 0.12)), k.color(rgb("#e8eef8")), k.z(-6.7)]); // neige sur la rive
      add([k.rect(ww, 2), k.pos(wx, wy + wh / 2 - 1), k.color(rgb("#6b4a2a")), k.z(-6.6)]);
      add([k.rect(2, wh), k.pos(wx + ww / 2 - 1, wy), k.color(rgb("#6b4a2a")), k.z(-6.6)]);
      // guirlande lumineuse sous la poutre
      var bulbs = [], GY = Math.round(VH * 0.105), arcs = 4, seg = VW / arcs, COLS = ["#ff5c5c", "#ffd54a", "#5fd47a", "#58a6ff", "#f778ba"];
      function garlandY(px) { var f = (px % seg) / seg; return GY + Math.sin(Math.PI * f) * 12 * u; }
      for (x = 0; x < VW; x += 3) add([k.rect(3, 1), k.pos(x, Math.round(garlandY(x))), k.color(rgb("#1d1228")), k.z(-5.2)]);
      for (x = 10, i = 0; x < VW - 6; x += Math.max(16, Math.round(19 * u)), i++) {
        var by = Math.round(garlandY(x)) + 2;
        bulbs.push({ o: add([k.rect(3, 4), k.pos(x, by), k.anchor("top"), k.color(rgb(COLS[i % COLS.length])), k.opacity(1), k.z(-5.1)]), p: k.rand(0, 6.28), sp: k.rand(1.5, 3.2) });
      }
      // parquet en vieilles lames, cheminée à gauche, pile de bûches à droite
      add([k.rect(VW, VH - FLOOR), k.pos(0, FLOOR), k.color(rgb("#7a5230")), k.z(-3)]);
      add([k.rect(VW, Math.max(2, Math.round(2 * u))), k.pos(0, FLOOR), k.color(rgb("#9c6c3c")), k.z(-2.9)]);
      var boardH = (VH - FLOOR) / 4;
      for (i = 1; i < 4; i++) add([k.rect(VW, 1), k.pos(0, Math.round(FLOOR + i * boardH)), k.color(rgb("#4d3018")), k.opacity(0.8), k.z(-2.8)]);
      for (i = 0; i < 4; i++) for (x = (i % 2) * 40 * u; x < VW; x += 80 * u) add([k.rect(1, Math.round(boardH)), k.pos(Math.round(x + k.rand(0, 30 * u)), Math.round(FLOOR + i * boardH)), k.color(rgb("#4d3018")), k.opacity(0.8), k.z(-2.8)]);
      var fireX = Math.round(VW * 0.075), fireY = FLOOR + Math.round((VH - FLOOR) * 0.3);
      var fireGlow = add([k.sprite("glow"), k.pos(fireX, fireY - 14 * SG), k.anchor("center"), k.scale(SG * 2.6), k.color(rgb("#ff9a3c")), k.opacity(0.2), k.z(0.9)]);
      add([k.sprite("barn-fire"), k.pos(fireX, fireY), k.anchor("bot"), k.scale(SG), k.z(1)]);
      var flames = [-5, 0, 5].map(function (dx, n) { // flammes qui dansent dans l'âtre
        var o = add([k.rect(Math.round(4 * SG), Math.round(8 * SG)), k.pos(fireX + dx * SG, fireY - 3 * SG), k.anchor("bot"), k.color(rgb("#f0883e")), k.z(1.1)]);
        var inn = add([k.rect(Math.round(2 * SG), Math.round(5 * SG)), k.pos(fireX + dx * SG, fireY - 3 * SG), k.anchor("bot"), k.color(rgb("#ffe08a")), k.z(1.11)]);
        return { o: o, inn: inn, p: n * 1.7 };
      });
      add([k.sprite("barn-logs"), k.pos(Math.round(VW * 0.955), FLOOR + Math.round((VH - FLOOR) * 0.28)), k.anchor("bot"), k.scale(SG), k.z(1)]);

      // ----- le sapin -----
      var treeX = Math.round(VW * 0.83);
      add([k.sprite("barn-tree"), k.pos(treeX, TBASE), k.anchor("bot"), k.scale(ST), k.z(2)]);
      var treeGlow = add([k.sprite("glow"), k.pos(treeX, TBASE - 24 * ST), k.anchor("center"), k.scale(ST * 1.8), k.color(rgb("#ffd27a")), k.opacity(0), k.z(1.9)]);
      var treeLights = (window.OctoSprites.grange ? window.OctoSprites.grange.treeBulbs : []).map(function (p, n) {
        return { o: add([k.rect(Math.max(2, ST + 1), Math.max(2, ST + 1)), k.pos(treeX + (p[0] - 17) * ST, TBASE - (46 - p[1]) * ST), k.anchor("center"), k.color(rgb(COLS[n % COLS.length])), k.opacity(0.25), k.z(2.1)]), p: n * 0.7 };
      });
      var lit = allOpened(state) ? treeLights.length : 0, litT = 0, finaleOn = lit > 0;

      // ----- les trois cadeaux -----
      var gifts = HEROES.map(function (hero, n) {
        var gx = Math.round(VW * (0.26 + n * 0.16));
        var glow = add([k.sprite("glow"), k.pos(gx, GBASE - 11 * SG), k.anchor("center"), k.scale(SG * 1.5), k.color(rgb(hero.color)), k.opacity(state.opened[hero.id] ? 0 : 0.35), k.z(2.9)]);
        var obj = add([k.sprite("gift-" + hero.id, { frame: state.opened[hero.id] ? 1 : 0 }), k.pos(gx, GBASE), k.anchor("bot"), k.scale(SG), k.z(3)]);
        var nameY = GBASE + 7 * SG + fsz(9);
        add([k.text(hero.name, { size: fsz(9), font: "monospace" }), k.pos(gx + 1, nameY + 1), k.anchor("center"), k.color(rgb("#000000")), k.opacity(0.8), k.z(3.9)]);
        add([k.text(hero.name, { size: fsz(9), font: "monospace" }), k.pos(gx, nameY), k.anchor("center"), k.color(rgb(hero.color)), k.z(4)]);
        var g = { hero: hero, id: hero.id, x: gx, obj: obj, glow: glow, icon: null, baseY: GBASE };
        if (state.opened[hero.id]) g.icon = makeIcon(g);
        return g;
      });
      function makeIcon(g) {
        return add([k.sprite(g.hero.icon), k.pos(g.x, g.baseY - 27 * SG), k.anchor("center"), k.scale(SG), k.z(3.5)]);
      }

      // ----- OctoCat et Laita -----
      var shadowO = add([k.sprite("glow"), k.pos(0, BASE), k.anchor("center"), k.scale(0.75, 0.2), k.color(rgb("#1a0f08")), k.opacity(0.55), k.z(8.9)]);
      var shadowL = add([k.sprite("glow"), k.pos(0, BASE), k.anchor("center"), k.scale(0.5, 0.15), k.color(rgb("#1a0f08")), k.opacity(0.5), k.z(8.8)]);
      var octo = add([k.sprite("octo", { anim: "idle" }), k.pos(Math.round(VW * 0.14), BASE), k.anchor("bot"), k.scale(SO), k.z(9)]);
      var laita = add([k.sprite("laita", { anim: "sit" }), k.pos(Math.round(VW * 0.14) - 50, BASE), k.anchor("bot"), k.scale(Math.max(2, SO - 0.4)), k.z(8.9)]);
      var oAnim = "idle", lAnim = "sit", faceR = true, SPEED = 95 * Math.max(1, u), minX = Math.round(VW * 0.06), maxX = Math.round(VW * 0.94);
      var celebrate = 0, laitaHop = 0;
      function playO(a) { if (oAnim !== a) { oAnim = a; octo.play(a); } }
      function playL(a) { if (lAnim !== a) { lAnim = a; laita.play(a); } }

      // ----- textes fixes -----
      function label(str, size, color, cx, cy, z) {
        var sh = add([k.text(str, { size: size, font: "monospace" }), k.pos(cx + 1, cy + 1), k.anchor("center"), k.color(rgb("#000000")), k.opacity(0.8), k.z(z - 0.1)]);
        var o = add([k.text(str, { size: size, font: "monospace" }), k.pos(cx, cy), k.anchor("center"), k.color(rgb(color)), k.z(z)]);
        o.sh = sh; // l'ombre suit le texte (voir show / place)
        return o;
      }
      function show(o, v) { o.opacity = v; o.sh.opacity = 0.8 * v; }
      function place(o, px, py) { o.pos.x = px; o.pos.y = py; o.sh.pos.x = px + 1; o.sh.pos.y = py + 1; }
      label("LA GRANGE DE LAITA", fsz(11), "#ffe08a", VW / 2, Math.round(VH * 0.075) + 2, 30);
      var counter = label("CADEAUX : " + count(state) + "/3", fsz(9), "#7ae7ff", VW / 2, Math.round(VH * 0.185), 30);
      var hint = label(touch ? "TOUCHE L'ECRAN POUR MARCHER, TOUCHE UN CADEAU" : "FLECHES : MARCHER   ESPACE : OUVRIR   OU CLIQUE !", fsz(8), "#ffe9b0", VW / 2, Math.round(VH * 0.285), 30);
      var prompt = label(touch ? "TOUCHE LE CADEAU" : "ESPACE : OUVRIR", fsz(8), "#ffffff", 0, 0, 30);
      show(prompt, 0);

      // ----- particules (étincelles, confettis, neige) -----
      var parts = [], snowT = 0, confT = 0;
      function spark(px, py, vx, vy, life, col, size, grav) {
        if (parts.length > 170) return;
        parts.push({ o: add([k.rect(size, size), k.pos(px, py), k.anchor("center"), k.color(rgb(col)), k.opacity(1), k.z(20)]), vx: vx, vy: vy, life: life, t: 0, g: grav || 0 });
      }
      function burst(px, py, cols, n) {
        for (var j = 0; j < n; j++) { var a = k.rand(0, 6.283), sp = k.rand(30, 120) * Math.max(1, u * 0.8); spark(px, py, Math.cos(a) * sp, Math.sin(a) * sp - 30, k.rand(0.6, 1.2), cols[j % cols.length], j % 3 ? 3 : 2, 160); }
      }

      // ----- cartes (le petit mot de tonton) -----
      var card = null;
      function showCard(spec, onClose) {
        if (card) return;
        var pw = Math.min(VW - 16, Math.round(330 * Math.max(0.8, fit))), inner = pw - 28, pad = 12, rows = [], total = pad;
        function row(o, hgt, gap) { rows.push({ o: o, y: total, h: hgt }); total += hgt + gap; }
        var ic = null;
        if (spec.icon) { ic = add([k.sprite(spec.icon), k.pos(VW / 2, 0), k.anchor("top"), k.scale(3), k.z(32)]); row(ic, Math.max(24, ic.height * 3), 6); }
        var title = add([k.text(spec.title, { size: fsz(14), font: "monospace", align: "center", width: inner }), k.pos(VW / 2, 0), k.anchor("top"), k.color(rgb(spec.color || "#ffe08a")), k.z(32)]);
        row(title, title.height, 8);
        var body = add([k.text(spec.text, { size: fsz(9), font: "monospace", align: "center", width: inner, lineSpacing: 3 }), k.pos(VW / 2, 0), k.anchor("top"), k.color(rgb("#ffffff")), k.z(32)]);
        row(body, body.height, 8);
        if (spec.power) { var pw2 = add([k.text(spec.power, { size: fsz(11), font: "monospace", align: "center", width: inner }), k.pos(VW / 2, 0), k.anchor("top"), k.color(rgb("#7ae7ff")), k.z(32)]); row(pw2, pw2.height, 8); }
        if (spec.sign) { var sg = add([k.text(spec.sign, { size: fsz(10), font: "monospace", align: "center", width: inner }), k.pos(VW / 2, 0), k.anchor("top"), k.color(rgb("#ffe08a")), k.z(32)]); row(sg, sg.height, 8); }
        var foot = add([k.text("[ CLIC / ESPACE ]", { size: fsz(7), font: "monospace" }), k.pos(VW / 2, 0), k.anchor("top"), k.color(rgb("#9fb0c3")), k.opacity(0.9), k.z(32)]);
        row(foot, foot.height, 0);
        total += pad;
        var y0 = Math.max(6, Math.round((VH - total) / 2 - VH * 0.03));
        rows.forEach(function (r) { r.o.pos.y = y0 + r.y; });
        var panel = add([k.rect(pw, total, { radius: 4 }), k.pos(VW / 2, y0 + total / 2), k.anchor("center"), k.color(rgb("#150c33")), k.opacity(0.95), k.outline(3, rgb(spec.color || "#ffe08a")), k.z(31)]);
        var shade = add([k.rect(VW + 40, VH + 40), k.pos(-20, -20), k.color(rgb("#000000")), k.opacity(0.35), k.z(30.5)]);
        card = { objs: rows.map(function (r) { return r.o; }).concat([panel, shade]), title: title, blink: !!spec.blink, onClose: onClose, born: Date.now() };
      }
      function closeCard() {
        if (!card || Date.now() - card.born < 350) return; // garde de temps réel (pas d'images) : un appareil lent ne bloque pas la carte
        var c = card; card = null;
        c.objs.forEach(function (o) { if (o.exists()) o.destroy(); });
        sfx("checkpoint");
        if (c.onClose) c.onClose();
      }

      // ----- ouvrir un cadeau, allumer le sapin -----
      var pending = null, nearGift = null;
      function openGift(g) {
        if (card) return;
        var first = !state.opened[g.id];
        if (first) { state.opened[g.id] = true; save(state); counter.text = "CADEAUX : " + count(state) + "/3"; }
        g.obj.frame = 1; g.glow.opacity = 0;
        if (!g.icon) g.icon = makeIcon(g);
        burst(g.x, g.baseY - 18 * SG, [g.hero.color, "#ffffff", "#ffe08a"], first ? 30 : 12);
        sfx(first ? "star" : "bit"); if (first) sfx("magic");
        celebrate = 0.9; playO("success");
        h.tween(0.35, function (e) { g.obj.pos.y = g.baseY - Math.sin(e * Math.PI) * 8 * SG; });
        showCard({ icon: g.hero.icon, title: "POUR " + g.hero.name, color: g.hero.color, text: g.hero.text, power: "+ POUVOIR : " + g.hero.power }, function () {
          if (first && allOpened(state)) h.wait(0.5).then(function () { if (alive) startFinale(); });
        });
      }
      function startFinale() {
        finaleOn = true; litT = 0;
        burst(treeX, TBASE - 40 * ST, ["#ffd54a", "#ffffff", "#ff7eb6", "#58d6ff", "#7ee787"], 40);
        sfx("magic"); laitaHop = 1; celebrate = 2.2; playO("success");
        h.wait(0.9).then(function () { if (alive) sfx("bark"); });
        h.wait(2.4).then(function () { if (alive) showFinaleCard(); });
      }
      function showFinaleCard() {
        showCard({ title: FINALE.title, color: "#ffe08a", text: FINALE.text, sign: FINALE.sign, blink: true }, function () { sfx("bark"); laitaHop = 1; });
      }
      function nearOf(g) { return Math.abs(octo.pos.x - g.x) <= 10 * SO + 8 * SG + 20; }
      function standX(g) { var off = 10 * SO + 8 * SG; return clamp(octo.pos.x < g.x ? g.x - off : g.x + off, minX, maxX); }
      var target = null;
      function walkToGift(g) {
        if (nearOf(g)) { target = null; pending = null; openGift(g); return; }
        target = standX(g); pending = g;
      }
      function treeAct() {
        if (allOpened(state)) { showFinaleCard(); return; }
        sfx("bit"); hint.text = "OUVRE D'ABORD LES 3 CADEAUX !"; hint.sh.text = hint.text; show(hint, 1); hintLife = 4;
      }
      var treeNear = function () { return Math.abs(octo.pos.x - treeX) <= 16 * ST + 10 * SO + 10; };
      function walkToTree() {
        if (treeNear()) { target = null; pending = null; treeAct(); return; }
        target = clamp(treeX - (16 * ST + 10 * SO + 4), minX, maxX); pending = "tree";
      }

      // ----- entrées : flèches (réglages du joueur), clavier, souris et doigt -----
      var input = kit && kit.createInput ? kit.createInput(false) : null;
      function menuOpen() { return !!(kit && kit.menuOpen && kit.menuOpen()); }
      function act() {
        if (menuOpen()) return;
        if (card) { closeCard(); return; }
        for (var q = 0; q < gifts.length; q++) if (nearOf(gifts[q])) { openGift(gifts[q]); return; }
        if (treeNear()) treeAct();
      }
      k.onKeyPress("space", act);
      k.onKeyPress("enter", act);
      var canvas = k.canvas;
      function toLocal(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height }; }
      function hit(p) {
        for (var q = 0; q < gifts.length; q++) { var g = gifts[q]; if (Math.abs(p.x - g.x) < 14 * SG + 6 && p.y > GBASE - 30 * SG && p.y < GBASE + 20 * SG) return g; }
        if (Math.abs(p.x - treeX) < 17 * ST + 4 && p.y > TBASE - 48 * ST && p.y < TBASE + 6) return "tree";
        return null;
      }
      function onDown(e) {
        if (menuOpen() || (e.pointerType === "mouse" && e.button !== 0)) return;
        if (card) { closeCard(); return; }
        var p = toLocal(e), t = hit(p);
        if (t === "tree") walkToTree();
        else if (t) walkToGift(t);
        else { target = clamp(p.x, minX, maxX); pending = null; }
      }
      var cursorOn = false;
      function onMove(e) {
        if (e.pointerType !== "mouse") return;
        var now = !card && !!hit(toLocal(e));
        if (now !== cursorOn) { cursorOn = now; canvas.style.cursor = now ? "pointer" : ""; }
      }
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);

      // bouton « retour » (même place que le sélecteur de niveaux de l'accueil)
      var back = document.createElement("div"); back.className = "octo-picker octo-picker--top"; // en haut à gauche : en bas, il cachait Laita
      var backBtn = document.createElement("button"); backBtn.type = "button"; backBtn.className = "octo-picker__toggle"; backBtn.textContent = "◀ RETOUR";
      backBtn.setAttribute("aria-label", "Retourner à l'accueil");
      backBtn.addEventListener("click", function () { backBtn.blur(); sfx("checkpoint"); ctx.go("hub"); });
      back.appendChild(backBtn); ctx.host.appendChild(back);

      var hintLife = 14;
      k.onUpdate(function () {
        var dt = Math.min(k.dt(), 0.05);
        time += dt;
        // marche : flèches ou cible touchée / cliquée
        var inp = input ? input.get() : {};
        var dir = 0;
        if (!card) {
          dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
          if (dir) { target = null; pending = null; }
          else if (target !== null) {
            var d = target - octo.pos.x;
            if (Math.abs(d) <= SPEED * dt + 1) {
              octo.pos.x = target; target = null;
              var pg = pending; pending = null;
              if (pg === "tree") treeAct(); else if (pg) openGift(pg);
            } else dir = d > 0 ? 1 : -1;
          }
        }
        if (dir) { faceR = dir > 0; octo.pos.x = clamp(octo.pos.x + dir * SPEED * dt, minX, maxX); }
        octo.flipX = !faceR;
        if (celebrate > 0) { celebrate -= dt; if (celebrate <= 0) playO(dir ? "run" : "idle"); else playO("success"); }
        else playO(dir ? "run" : "idle");
        // Laita suit, assise quand elle est arrivée
        var goal = clamp(octo.pos.x + (faceR ? -1 : 1) * 56, Math.round(VW * 0.02), maxX), dl = goal - laita.pos.x;
        if (Math.abs(dl) > 5) { laita.pos.x += Math.sign(dl) * Math.min(Math.abs(dl), SPEED * 1.25 * dt); laita.flipX = dl < 0; playL("run"); }
        else { playL("sit"); laita.flipX = !faceR ? true : false; }
        if (laitaHop > 0) { laitaHop -= dt * 1.2; laita.pos.y = BASE - Math.abs(Math.sin(laitaHop * 9)) * 16 * u * (laitaHop > 0 ? 1 : 0); if (laitaHop <= 0) laita.pos.y = BASE; }
        shadowO.pos.x = octo.pos.x; shadowL.pos.x = laita.pos.x;
        // invite « ouvrir » près d'un cadeau
        nearGift = null;
        if (!card) for (var q = 0; q < gifts.length; q++) if (nearOf(gifts[q])) { nearGift = gifts[q]; break; }
        if (nearGift || (!card && treeNear())) { place(prompt, octo.pos.x, BASE - 24 * SO - 8); show(prompt, 0.7 + 0.3 * Math.sin(time * 6)); }
        else show(prompt, 0);
        // décor vivant
        flames.forEach(function (f) {
          var a1 = 0.75 + 0.25 * Math.sin(time * 11 + f.p), a2 = 0.75 + 0.25 * Math.sin(time * 14 + f.p * 2);
          f.o.height = Math.round(8 * SG * a1); f.inn.height = Math.round(5 * SG * a2);
        });
        fireGlow.opacity = 0.17 + 0.07 * Math.sin(time * 9);
        bulbs.forEach(function (b) { b.o.opacity = 0.45 + 0.55 * Math.abs(Math.sin(time * b.sp + b.p)); });
        gifts.forEach(function (g) {
          if (!state.opened[g.id]) g.glow.opacity = 0.22 + 0.16 * Math.sin(time * 3 + g.x);
          if (g.icon) g.icon.pos.y = g.baseY - 27 * SG + Math.sin(time * 2.4 + g.x) * 3;
        });
        if (finaleOn && lit < treeLights.length) { litT += dt; if (litT > 0.2) { litT = 0; lit++; sfx("bit"); } }
        treeLights.forEach(function (l, n) { l.o.opacity = n < lit ? 0.6 + 0.4 * Math.abs(Math.sin(time * 3 + l.p)) : 0.25; });
        treeGlow.opacity = lit ? 0.12 + 0.1 * Math.sin(time * 2) + 0.12 * (lit / treeLights.length) : 0;
        if (hintLife > 0) { hintLife -= dt; if (hintLife < 1.5) show(hint, Math.max(0, hintLife / 1.5)); }
        // neige à la fenêtre ; confettis quand le sapin est allumé
        snowT -= dt;
        if (snowT <= 0) { snowT = 0.14; spark(wx + k.rand(2, ww - 2), wy + 2, k.rand(-6, 6), k.rand(14, 26) * u, (wh - 12) / (20 * u), "#ffffff", 2, 0); }
        if (finaleOn && lit >= treeLights.length) { confT -= dt; if (confT <= 0) { confT = 0.22; spark(k.rand(0, VW), -4, k.rand(-12, 12), k.rand(30, 55) * u, 5, COLS[Math.floor(k.rand(0, COLS.length))], 3, 0); } }
        parts = parts.filter(function (p) {
          p.t += dt;
          if (p.t >= p.life || p.o.pos.y > VH + 6) { p.o.destroy(); return false; }
          p.o.pos.x += p.vx * dt; p.o.pos.y += p.vy * dt; p.vy += p.g * dt;
          p.o.opacity = Math.min(1, (p.life - p.t) * 2);
          return true;
        });
        // carte ouverte : le titre du mot final change de couleur
        if (card) {
          if (card.blink && card.title.exists()) card.title.color = rgb(kit && kit.rainbowHex ? kit.rainbowHex(time * 0.6, 0.6) : (Math.floor(time * 3) % 2 ? "#ffe08a" : "#fff4c2"));
        }
      });

      /** Positions (en pixels de la page) des cadeaux et du sapin : sert aux tests de navigateur (dev/grange-check.mjs). */
      window.OctoGrange.points = function () {
        var r = canvas.getBoundingClientRect(), f = r.width / VW;
        function P(px, py) { return { x: r.left + px * f, y: r.top + py * f }; }
        return { gifts: gifts.map(function (g) { var p = P(g.x, GBASE - 10 * SG); p.id = g.id; p.open = !!state.opened[g.id]; return p; }), tree: P(treeX, TBASE - 20 * ST), octo: P(octo.pos.x, BASE - 30), card: !!card, lit: lit, lights: treeLights.length };
      };
      sfx("checkpoint");
      return {
        reset: function () {},
        destroy: function () {
          alive = false; window.OctoGrange.points = null;
          canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.style.cursor = "";
          if (input) input.destroy();
          back.remove();
        }
      };
    }
  });
})();
