/* OctoCat-Code — Sprites supplémentaires pour la phase « trajet » (pixel art procédural, comme sprites.js).
 * bit, cœur, pics, terminal, bougie, chauve-souris, shuriken, trait d'épée. 0 octet d'image dans le dépôt.
 */
(function () {
  "use strict";

  var S = window.OctoSprites, Buf = S.Buf, single = S.single, sheet = S.sheet;
  var OUT = "#120a20";

  function bitBuf() { // puce de données : losange doré
    var b = new Buf(10, 10);
    b.poly([[5, 0.6], [9.4, 5], [5, 9.4], [0.6, 5]], "#e3b341");
    b.poly([[5, 2.2], [7.6, 5], [5, 7.8], [2.4, 5]], "#f7d774");
    b.set(4, 3, "#ffffff"); b.set(4, 4, "#fff4c2");
    return b.outline(OUT);
  }

  function heartBuf() {
    var b = new Buf(11, 10), rows = [
      "..rr...rr..", ".rrrr.rrrr.", "rrWrrrrrrrr", "rrrrrrrrrrr", ".rrrrrrrrr.", "..rrrrrrr..", "...rrrrr...", "....rrr....", ".....r....."
    ];
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var ch = row.charAt(x);
        if (ch === "r") b.set(x, y + 0.5, y > 4 ? "#da3633" : "#f85149");
        else if (ch === "W") b.set(x, y + 0.5, "#ffd6d6");
      }
    });
    return b.outline(OUT);
  }

  function spikeBuf() { // deux pointes
    var b = new Buf(16, 16);
    [[0, 8], [8, 16]].forEach(function (r, i) {
      b.poly([[r[0] + 0.5, 15.5], [(r[0] + r[1]) / 2, 5], [r[1] - 0.5, 15.5]], "#aab4c5");
      b.poly([[(r[0] + r[1]) / 2, 5], [r[1] - 0.5, 15.5], [(r[0] + r[1]) / 2 + 0.5, 15.5]], i ? "#8591a8" : "#8591a8");
    });
    b.rect(0, 14, 16, 2, "#6e7a90");
    return b.outline(OUT);
  }

  function terminalBuf() { // borne d'accès : écran vert, antenne rouge
    var b = new Buf(24, 32);
    b.rect(11, 1, 2, 5, "#6e7681"); b.rect(10, 0, 4, 2, "#f85149");
    b.rect(2, 6, 20, 22, "#2b2147"); b.rect(2, 6, 20, 2, "#4a3a78"); b.rect(2, 26, 20, 2, "#1a1040");
    b.rect(4, 9, 16, 12, "#0d1117");
    b.rect(6, 11, 9, 1, "#3fb950"); b.rect(6, 14, 12, 1, "#3fb950"); b.rect(6, 17, 5, 1, "#3fb950"); b.rect(13, 16, 3, 3, "#7ee787");
    [5, 9, 13, 17].forEach(function (x) { b.rect(x, 23, 2, 2, "#8957e5"); });
    b.rect(6, 28, 12, 3, "#4a3a63");
    return b.outline(OUT);
  }

  function candleBuf() {
    var b = new Buf(10, 18);
    b.rect(3, 7, 4, 9, "#f0e6d2"); b.rect(3, 7, 1, 9, "#ffffff"); b.rect(6, 7, 1, 9, "#cdbf9f");
    b.rect(1, 15, 8, 2, "#8a78a0");
    b.poly([[5, 0.5], [7.5, 4], [5, 6.5], [2.5, 4]], "#f0883e");
    b.poly([[5, 2.5], [6.4, 4.4], [5, 6], [3.6, 4.4]], "#ffe08a");
    return b.outline(OUT);
  }

  function batBuf(flap) { // chauve-souris, 2 images
    var b = new Buf(18, 14), up = flap ? 0 : 3;
    b.ellipse(9, 8, 3.2, 3.6, "#6e4aa8");
    b.poly([[6, 6], [0.5, 2 + up], [2, 8 + up * 0.5], [4, 6.5], [5.5, 9]], "#4a2f7a");
    b.poly([[12, 6], [17.5, 2 + up], [16, 8 + up * 0.5], [14, 6.5], [12.5, 9]], "#4a2f7a");
    b.set(8, 7, "#ffe08a"); b.set(10, 7, "#ffe08a");
    b.set(7, 4, "#6e4aa8"); b.set(11, 4, "#6e4aa8");
    return b.outline(OUT);
  }

  function shurikenBuf() {
    var b = new Buf(12, 12);
    b.poly([[6, 0.5], [7.4, 4.6], [11.5, 6], [7.4, 7.4], [6, 11.5], [4.6, 7.4], [0.5, 6], [4.6, 4.6]], "#d0d7de");
    b.ellipse(6, 6, 1.4, 1.4, "#4a3a63");
    return b.outline(OUT);
  }

  function crateBuf(broken) { // caisse en bois cerclée de fer (16×13, affichée ×2 = 32×26)
    var b = new Buf(16, 13), x, y;
    b.rect(0, 0, 16, 13, "#a1713b");
    for (y = 0; y < 13; y += 4) b.rect(0, y, 16, 1, "#7a5226");          // joints des planches
    b.rect(0, 0, 16, 1, "#d4a05a"); b.rect(0, 12, 16, 1, "#6a4520");     // lumière en haut, ombre en bas
    b.rect(0, 0, 2, 13, "#5a3a1a"); b.rect(14, 0, 2, 13, "#5a3a1a");     // montants
    for (x = 2; x < 14; x++) { b.set(x, x * 13 / 16 | 0, "#8a5a2a"); b.set(15 - x, x * 13 / 16 | 0, "#8a5a2a"); } // croix
    [[1, 1], [14, 1], [1, 11], [14, 11]].forEach(function (p) { b.set(p[0], p[1], "#c9d1d9"); });  // clous
    if (broken) { b.rect(5, 3, 1, 3, "#2a1a0a"); b.rect(6, 5, 2, 1, "#2a1a0a"); b.rect(10, 7, 1, 3, "#2a1a0a"); b.rect(9, 9, 2, 1, "#2a1a0a"); }
    return b.outline(OUT);
  }

  function blockBuf() { // benne / conteneur métallique (22×15, affichée ×2 = 44×30) : obstacle qu'on ne peut pas casser
    var b = new Buf(22, 15), x;
    b.rect(0, 2, 22, 13, "#3f6e8c"); b.rect(0, 0, 22, 3, "#2f566e"); b.rect(0, 2, 22, 1, "#6a9ab8");
    for (x = 2; x < 22; x += 4) b.rect(x, 4, 1, 9, "#2f566e");            // tôle ondulée
    b.rect(0, 13, 22, 2, "#1f3a4c");
    b.rect(2, 14, 3, 1, "#0d1117"); b.rect(17, 14, 3, 1, "#0d1117");
    b.rect(8, 6, 6, 3, "#e3b341"); b.rect(9, 7, 4, 1, "#7a5a10");          // plaque jaune
    return b.outline(OUT);
  }

  function bottleBuf() { // bouteille lancée par les lanceurs (6×10)
    var b = new Buf(6, 10);
    b.rect(2, 0, 2, 3, "#9ad0a0"); b.rect(1, 3, 4, 6, "#4aa96c"); b.rect(2, 4, 1, 4, "#a8f0c0"); b.rect(1, 8, 4, 1, "#2e7a4a");
    return b.outline(OUT);
  }

  function powerBuf() { // étoile-shuriken dorée : le butin des caisses
    var b = new Buf(16, 16);
    b.poly([[8, 0.2], [10.2, 5.8], [15.8, 8], [10.2, 10.2], [8, 15.8], [5.8, 10.2], [0.2, 8], [5.8, 5.8]], "#ffd54a"); // grande étoile à 4 branches
    b.poly([[8, 2.2], [9.4, 6.6], [13.8, 8], [9.4, 9.4], [8, 13.8], [6.6, 9.4], [2.2, 8], [6.6, 6.6]], "#fff0a8");
    b.poly([[8, 0.2], [10.2, 5.8], [8, 8], [5.8, 5.8]], "#ffe680");  // reflet sur la branche du haut
    b.poly([[8, 15.8], [10.2, 10.2], [8, 8], [5.8, 10.2]], "#c9921c"); // ombre sur la branche du bas
    b.ellipse(8, 8, 1.9, 1.9, "#7a5a10"); b.set(7, 7, "#ffffff");
    return b.outline(OUT);
  }

  function slashBuf() { // croissant de lumière bombé vers la droite (le jeu l'inverse pour frapper à gauche)
    var b = new Buf(30, 22);
    for (var y = 0; y < 22; y++) {
      for (var x = 0; x < 30; x++) {
        var oy = (y - 10.5) / 11, ox = (x - 0) / 29, ix = (x + 9) / 29; // ellipse extérieure et ellipse intérieure décalée vers la gauche
        if (ox * ox + oy * oy <= 1 && ix * ix + oy * oy > 1) b.set(x, y, x > 21 ? "#ffffff" : x > 12 ? "#d6f3ff" : "#8fd0ff");
      }
    }
    return b;
  }

  /* ====================================================================
   * Ville à la Double Dragon : façades, skyline, mobilier urbain (pixel art « demi-résolution » : 1 pixel = 2 unités du monde).
   * Chaque façade est dessinée une fois dans un tampon puis posée comme un seul sprite : 0 objet par fenêtre à l'écran.
   * ================================================================== */

  var CITIES = {
    village: { // crépuscule : briques rouges, fenêtres chaudes
      wall: ["#8a5260", "#744458", "#9a6a68"], trim: "#d2a8a8", win: "#ffd27a", dark: "#2a1a30", awn: ["#d65a4a", "#e3b341", "#3fb9a0"],
      walk: "#9a93ad", road: "#3a3548", far: "#c8c0e8", label: ["CODE", "OCTO", "BITS"]
    },
    market: { // marché de nuit : néons et auvents colorés
      wall: ["#6a4a86", "#563a74", "#7e5a94"], trim: "#d8b8e8", win: "#7ae7ff", dark: "#1f1438", awn: ["#ff7ab0", "#7ae7ff", "#ffd54a"],
      walk: "#8f88b0", road: "#33304a", far: "#c0c8f0", label: ["24H", "SHOP", "{ }"]
    },
    arena: { // quartier industriel rouge et noir
      wall: ["#5a3040", "#482634", "#6a3a48"], trim: "#c090a0", win: "#ff8a6a", dark: "#1c0f1a", awn: ["#f85149", "#b23fb0", "#e3b341"],
      walk: "#7e6a80", road: "#2f2736", far: "#d0a8b8", label: ["BOSS", "VS", "01"]
    }
  };
  var CITY_W = [76, 88, 100, 112, 84, 96];   // largeurs des façades (en pixels de sprite ; ×2 dans le monde)
  var CITY_H = [78, 66, 88, 72, 84, 62];     // hauteurs des murs
  var ROOF = 14;                              // marge au-dessus du mur pour les toits (climatiseurs, antennes, château d'eau)

  function mixc(a, b, t) {
    function h(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    var x = h(a), y = h(b);
    return "#" + [0, 1, 2].map(function (j) { var v = Math.round(x[j] + (y[j] - x[j]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }

  function buildingBuf(C, v, seed) {
    var wv = CITY_W[v], hv = CITY_H[v], rnd = S.seeded(seed), wall = C.wall[v % 3], top = ROOF;
    var b = new Buf(wv, hv + ROOF), x, y, r, c, gy = top + hv - 30;
    // toit : climatiseur, antenne ou château d'eau
    var kind = Math.floor(rnd() * 3);
    if (kind === 0) { b.rect(8, 5, 12, 9, "#6e7a90"); b.rect(8, 5, 12, 2, "#9aa6ba"); b.rect(11, 8, 6, 4, "#3a4152"); }
    else if (kind === 1) { b.rect(wv - 14, 0, 1, 14, "#4a4a62"); b.rect(wv - 17, 3, 7, 1, "#4a4a62"); b.set(wv - 14, 0, "#f85149"); }
    else { b.rect(wv - 22, 4, 12, 8, "#8a6a4a"); b.rect(wv - 22, 3, 12, 1, "#b08a5a"); b.rect(wv - 20, 12, 1, 2, "#4a4a62"); b.rect(wv - 13, 12, 1, 2, "#4a4a62"); }
    b.rect(0, top, wv, hv, wall);
    for (y = top + 4; y < gy; y += 4) {            // briques : filets + joints décalés
      b.rect(0, y, wv, 1, mixc(wall, C.dark, 0.3));
      for (x = ((y >> 2) % 2) * 4; x < wv; x += 8) b.set(x, y + 1, mixc(wall, C.dark, 0.2));
    }
    b.rect(0, top, wv, 3, C.trim); b.rect(0, top + 3, wv, 1, mixc(C.trim, C.dark, 0.55)); // corniche
    var floors = Math.floor((gy - top - 8) / 19), cols = Math.floor((wv - 8) / 16), pad = Math.floor((wv - cols * 16) / 2) + 3;
    for (r = 0; r < floors; r++) {
      for (c = 0; c < cols; c++) {
        var wx = pad + c * 16, wy = top + 8 + r * 19, lit = rnd() < 0.55;
        b.rect(wx - 1, wy - 1, 12, 16, C.dark);
        b.rect(wx, wy, 10, 14, lit ? C.win : mixc(C.dark, "#4a4a7a", 0.35));
        if (lit) { b.rect(wx, wy, 10, 3, mixc(C.win, "#ffffff", 0.45)); if (rnd() < 0.35) b.rect(wx + 6, wy + 4, 3, 9, mixc(C.win, C.dark, 0.5)); } // rideau
        b.rect(wx + 4, wy, 1, 14, C.dark); b.rect(wx, wy + 6, 10, 1, C.dark);                                                                  // croisillons
        b.rect(wx - 2, wy + 14, 14, 2, C.trim);                                                                                                  // appui
      }
    }
    // rez-de-chaussée
    b.rect(0, gy, wv, 30, mixc(wall, C.dark, 0.38));
    b.rect(0, gy, wv, 1, C.trim);
    var type = v % 3;
    if (type === 0) { // boutique : auvent à rayures, vitrine, porte
      var aw = Math.floor(wv * 0.62);
      for (x = 0; x < aw; x += 6) { b.rect(4 + x, gy + 2, 6, 6, (x / 6) % 2 ? "#f0f6fc" : C.awn[v % 3]); }
      b.rect(4, gy + 8, aw, 1, mixc(C.awn[v % 3], "#000000", 0.4));
      b.rect(5, gy + 10, aw - 2, 16, C.dark);
      [[8, "#e3b341"], [16, "#f85149"], [24, "#39c5cf"], [32, "#a371f7"]].forEach(function (g) { if (g[0] < aw - 6) b.rect(5 + g[0], gy + 18, 6, 8, g[1]); });
      b.rect(wv - 22, gy + 6, 14, 24, C.dark); b.rect(wv - 20, gy + 8, 10, 14, mixc(C.win, C.dark, 0.35)); b.set(wv - 12, gy + 20, "#e3b341");
    } else if (type === 1) { // garage : rideau métallique et graffiti
      b.rect(5, gy + 6, Math.floor(wv * 0.62), 24, "#59506b");
      for (y = gy + 8; y < gy + 30; y += 3) b.rect(5, y, Math.floor(wv * 0.62), 1, "#3f384e");
      for (x = 0; x < 14; x++) { b.set(10 + x, gy + 18 + Math.round(Math.sin(x * 0.7) * 3), C.awn[0]); b.set(10 + x, gy + 19 + Math.round(Math.sin(x * 0.7) * 3), C.awn[1]); }
      b.rect(wv - 20, gy + 8, 12, 22, C.dark); b.rect(wv - 18, gy + 10, 8, 4, mixc(C.win, C.dark, 0.3));
    } else { // entrée : double porte, lanterne, marches
      var dx = Math.floor(wv / 2) - 10;
      b.rect(dx - 2, gy + 4, 24, 26, mixc(C.trim, C.dark, 0.4)); b.rect(dx, gy + 6, 20, 24, C.dark);
      b.rect(dx + 2, gy + 8, 7, 18, mixc(C.win, C.dark, 0.45)); b.rect(dx + 11, gy + 8, 7, 18, mixc(C.win, C.dark, 0.45));
      b.rect(dx + 9, gy + 6, 2, 24, C.trim);
      b.rect(dx + 8, gy - 2, 4, 5, C.win); b.rect(dx + 9, gy - 1, 2, 3, "#ffffff");
      b.rect(dx - 4, gy + 28, 28, 2, C.trim);
    }
    b.rect(wv - 4, top + 4, 2, hv - 6, "#2a2438");   // gouttière
    b.rect(0, top + hv - 3, wv, 3, mixc(C.dark, "#000000", 0.3)); // soubassement
    return b;
  }

  function farCityBuf() { // skyline lointaine (300×105) teintée ensuite par le thème
    var b = new Buf(300, 105), rnd = S.seeded(99), x = 0, base = "#ffffff";
    while (x < 300) {
      var w = 14 + Math.floor(rnd() * 22), h = 30 + Math.floor(rnd() * 62), shade = mixc(base, "#9aa0d0", 0.25 + rnd() * 0.35);
      b.rect(x, 105 - h, w, h, shade);
      b.rect(x, 105 - h, w, 1, "#ffffff");
      if (rnd() < 0.3) b.rect(x + Math.floor(w / 2), 105 - h - 8, 1, 8, shade);
      for (var wy = 105 - h + 5; wy < 100; wy += 7) for (var wx = x + 3; wx < x + w - 3; wx += 5) if (rnd() < 0.4) b.rect(wx, wy, 2, 3, "#fff3b0");
      x += w + 1 + Math.floor(rnd() * 3);
    }
    return b;
  }

  function lampBuf() { // lampadaire (8×34)
    var b = new Buf(8, 34);
    b.rect(3, 6, 2, 28, "#3a3450"); b.rect(2, 31, 4, 3, "#2a2438"); b.rect(3, 6, 1, 28, "#5a5478");
    b.rect(3, 3, 5, 2, "#3a3450"); b.rect(5, 4, 3, 3, "#ffe08a"); b.rect(6, 4, 1, 2, "#ffffff");
    return b.outline(OUT);
  }
  function binBuf() { var b = new Buf(8, 9); b.rect(0, 0, 8, 2, "#8a94a8"); b.rect(1, 2, 6, 7, "#6a758a"); b.rect(2, 3, 1, 5, "#8a94a8"); b.rect(4, 3, 1, 5, "#8a94a8"); return b.outline(OUT); }
  function hydrantBuf() { var b = new Buf(7, 9); b.rect(2, 0, 3, 2, "#d65a4a"); b.rect(1, 2, 5, 5, "#f85149"); b.rect(0, 3, 7, 2, "#d65a4a"); b.rect(1, 7, 5, 2, "#a23430"); return b.outline(OUT); }
  function carBuf() { // voiture garée vue de profil (34×13), teintée ensuite
    var b = new Buf(34, 13);
    b.rect(1, 6, 32, 5, "#e8eef8"); b.rect(7, 2, 18, 5, "#e8eef8"); b.rect(9, 3, 7, 3, "#7ac8e8"); b.rect(17, 3, 7, 3, "#7ac8e8");
    b.rect(1, 8, 32, 1, "#b8c0d0"); b.rect(31, 7, 2, 2, "#ffe08a"); b.rect(1, 7, 2, 2, "#f85149");
    b.ellipse(8, 11, 3, 3, "#1a1a28"); b.ellipse(26, 11, 3, 3, "#1a1a28"); b.ellipse(8, 11, 1.2, 1.2, "#8a94a8"); b.ellipse(26, 11, 1.2, 1.2, "#8a94a8");
    return b.outline(OUT);
  }

  function registerCity(k) {
    Object.keys(CITIES).forEach(function (name, ti) {
      for (var v = 0; v < 6; v++) k.loadSprite("bld-" + name + "-" + v, single(buildingBuf(CITIES[name], v, 1000 + ti * 77 + v * 13)));
    });
    k.loadSprite("cityfar", single(farCityBuf()));
    k.loadSprite("lamp", single(lampBuf()));
    k.loadSprite("bin", single(binBuf()));
    k.loadSprite("hydrant", single(hydrantBuf()));
    k.loadSprite("car", single(carBuf()));
  }
  S.cities = CITIES; S.cityMeta = { widths: CITY_W, heights: CITY_H, roof: ROOF };

  function registerRun(k) {
    k.loadSprite("bit", single(bitBuf()));
    k.loadSprite("heart", single(heartBuf()));
    k.loadSprite("spike", single(spikeBuf()));
    k.loadSprite("terminal", single(terminalBuf()));
    k.loadSprite("candle", single(candleBuf()));
    k.loadSprite("bat", sheet([batBuf(true), batBuf(false)], 18, 14), { sliceX: 2, anims: { fly: { from: 0, to: 1, loop: true, speed: 8 } } });
    k.loadSprite("shuriken", single(shurikenBuf()));
    k.loadSprite("slash", single(slashBuf()));
    k.loadSprite("crate", single(crateBuf(false)));
    k.loadSprite("crate2", single(crateBuf(true)));
    k.loadSprite("block", single(blockBuf()));
    k.loadSprite("bottle", single(bottleBuf()));
    k.loadSprite("power", single(powerBuf()));
    registerCity(k);
  }

  window.OctoSprites.registerRun = registerRun;
})();
