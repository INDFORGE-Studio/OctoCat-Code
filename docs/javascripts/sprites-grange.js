/* OctoCat-Code — Sprites de « La Grange » (cadeau de Noël) : la vieille grange retapée en maison de campagne en pierre, vue de dehors (accueil), et à l'intérieur les cadeaux, le sapin, la cheminée et les bûches.
 * Pixel art procédural comme le reste du jeu (0 octet d'image dans le dépôt), dessiné pour le projet.
 */
(function () {
  "use strict";

  var S = window.OctoSprites, Buf = S.Buf, single = S.single, sheet = S.sheet;
  var OUT = "#120a20";

  /** « La Grange » vue de dehors : une vieille grange retapée en belle maison de campagne en pierre (elle garde son nom, ce n'est plus du tout une étable) :
   *  murs en moellons, grand toit de tuiles sous la neige, cheminée, œil-de-bœuf sous le faîte, fenêtres éclairées à volets, grande porte cintrée vitrée
   *  sous un linteau de poutre, couronne de Noël. 72×56. */
  function houseBuf() {
    var b = new Buf(72, 56), x, y, row, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var STONES = ["#b9a68c", "#c8b79c", "#a8957a", "#9b8a72", "#bfae93"], JOINT = "#8a7a64";
    b.rect(4, 24, 64, 32, "#a8957a");
    for (y = 24, row = 0; y < 56; y += 4, row++) { // rangs de moellons décalés
      for (x = 4 - (row % 2) * 4; x < 68;) {
        var w = 6 + Math.floor(rnd() * 5), x0 = Math.max(4, x), x1 = Math.min(68, x + w);
        b.rect(x0, y, x1 - x0, 4, STONES[Math.floor(rnd() * STONES.length)]);
        b.rect(x0, y + 3, x1 - x0, 1, JOINT);
        if (x + w - 1 < 68) b.rect(x + w - 1, y, 1, 4, JOINT);
        x += w;
      }
    }
    for (y = 26; y < 56; y += 8) { b.rect(4, y, 4, 4, "#d6c8ae"); b.rect(64, y + 4, 4, 4, "#d6c8ae"); } // pierres d'angle
    b.poly([[0, 26], [36, 1], [72, 26]], "#9c4a38"); // grand toit de tuiles
    b.poly([[3, 25], [36, 4], [69, 25]], "#b85c45");
    for (y = 8; y < 25; y += 3) { var hw = (y - 1) / 25 * 36; b.rect(Math.round(36 - hw + 2), y, Math.round(hw * 2 - 4), 1, "#7e3a2c"); }
    b.rect(0, 24, 72, 3, "#6e3326");
    b.poly([[36, 1], [45, 8], [41, 10], [36, 6], [31, 10], [27, 8]], "#f4f8ff"); // la neige au faîte
    for (x = 0; x < 16; x++) b.rect(6 + Math.floor(rnd() * 60), 12 + Math.floor(rnd() * 12), 2, 1, "#eef3fb");
    b.rect(2, 23, 68, 1, "#eef3fb");
    b.rect(52, 7, 8, 14, "#9b8a72"); b.rect(52, 11, 8, 1, JOINT); b.rect(52, 15, 8, 1, JOINT); b.rect(51, 5, 10, 3, "#7a6a56"); b.rect(51, 4, 10, 1, "#f4f8ff"); b.rect(54, 5, 4, 1, "#1a0f0a"); // cheminée
    b.ellipse(36, 15, 4.5, 4.5, "#f0e6d2"); b.ellipse(36, 15, 3.4, 3.4, "#ffd27a"); b.rect(36, 12, 1, 7, "#f0e6d2"); b.rect(33, 15, 7, 1, "#f0e6d2"); // œil-de-bœuf de l'ancien fenil
    [9, 53].forEach(function (wx) { // deux fenêtres éclairées à volets
      b.rect(wx - 1, 31, 12, 14, "#f0e6d2"); b.rect(wx, 32, 10, 12, "#ffd27a"); b.rect(wx + 1, 33, 8, 5, "#ffe9a8");
      b.rect(wx + 4, 32, 2, 12, "#f0e6d2"); b.rect(wx, 37, 10, 1, "#f0e6d2");
      b.rect(wx - 4, 31, 3, 14, "#3f6f5a"); b.rect(wx + 11, 31, 3, 14, "#3f6f5a"); b.rect(wx - 3, 33, 1, 10, "#2d5444"); b.rect(wx + 12, 33, 1, 10, "#2d5444");
      b.rect(wx - 2, 45, 14, 2, JOINT);
    });
    b.rect(24, 30, 24, 3, "#6b4a2a"); b.rect(24, 30, 24, 1, "#9c6c3c"); // linteau : une vieille poutre de la grange
    b.ellipse(36, 41, 10, 9, "#cdbfa4"); b.rect(26, 41, 20, 15, "#cdbfa4"); // grande porte cintrée
    b.ellipse(36, 41, 8, 7.5, "#6b3f22"); b.rect(28, 41, 16, 15, "#6b3f22");
    b.ellipse(36, 41, 6, 5.5, "#ffd27a"); b.rect(30, 41, 12, 9, "#ffd27a"); b.rect(31, 42, 10, 5, "#ffe9a8"); // vitrage chaud
    b.rect(35, 36, 2, 14, "#6b3f22"); b.rect(30, 44, 12, 1, "#6b3f22"); b.rect(33, 50, 1, 6, "#4d2c18"); b.rect(38, 50, 1, 6, "#4d2c18");
    for (x = 0; x < 20; x++) { var a = x / 20 * 6.283; b.set(36 + Math.cos(a) * 4.5, 52 + Math.sin(a) * 3.5, x % 5 === 0 ? "#da3633" : "#2f8a4a"); } // couronne de Noël
    b.rect(35, 55, 3, 1, "#da3633");
    [22, 48].forEach(function (lx) { b.rect(lx, 38, 3, 5, "#ffd54a"); b.rect(lx + 1, 37, 1, 1, "#3a2d4d"); b.rect(lx, 43, 3, 1, "#3a2d4d"); }); // lanternes
    b.rect(24, 55, 24, 1, JOINT);
    for (x = 0; x < 22; x++) b.set(4 + (x % 3), 25 + x, x % 2 ? "#3f7f4a" : "#2f6a3c"); // lierre sur l'angle
    return b.outline(OUT);
  }

  /** Un cadeau : 2 images (fermé, ouvert : le couvercle saute et une lueur sort). 20×22. */
  function giftBuf(open, body, light, ribbon) {
    var b = new Buf(20, 22), x;
    b.rect(2, 11, 16, 11, body); b.rect(2, 11, 3, 11, light); b.rect(15, 11, 3, 11, "#00000033");
    b.rect(9, 11, 2, 11, ribbon);
    if (!open) {
      b.rect(1, 7, 18, 5, light); b.rect(1, 7, 18, 1, "#ffffff55"); b.rect(9, 7, 2, 5, ribbon);
      b.poly([[10, 7], [5, 2], [3, 5], [8, 7]], ribbon); b.poly([[10, 7], [15, 2], [17, 5], [12, 7]], ribbon); // nœud
      b.rect(9, 5, 2, 3, "#ffffff55");
    } else {
      b.rect(2, 11, 16, 2, "#1d1228"); // l'intérieur sombre
      b.poly([[2, 4], [13, 0.5], [18, 3], [8, 7]], light); b.poly([[8, 7], [18, 3], [18, 4.6], [8, 8.6]], body); // couvercle de travers
      for (x = 4; x < 17; x += 4) b.set(x, 10, "#fff4c2"); // quelques étincelles
    }
    return b.outline(OUT);
  }

  /** Sapin décoré (sans lumières : la scène pose les ampoules qui s'allument une à une). 34×46. */
  function treeBuf() {
    var b = new Buf(34, 46);
    var tiers = [[17, 5, 11, 15], [17, 13, 14, 23], [17, 22, 16.5, 32], [17, 31, 17, 41]]; // [cx, haut, demi-largeur, bas]
    tiers.forEach(function (t, n) {
      b.poly([[t[0], t[1]], [t[0] + t[2], t[3]], [t[0] - t[2], t[3]]], n % 2 ? "#2f8a4a" : "#3aa05a");
      b.poly([[t[0], t[1] + 2], [t[0] + t[2] * 0.7, t[3] - 1], [t[0] + 2, t[3] - 1]], "#256f3b");
    });
    b.rect(14, 41, 6, 5, "#7a5230"); b.rect(14, 41, 2, 5, "#9c6c3c");
    b.poly([[17, 0], [18.6, 3.3], [22, 3.7], [19.5, 6], [20.2, 9.4], [17, 7.6], [13.8, 9.4], [14.5, 6], [12, 3.7], [15.4, 3.3]], "#ffd54a");
    b.set(16, 3, "#fff4c2"); b.set(17, 4, "#fff4c2");
    return b.outline(OUT);
  }
  /** Où poser les ampoules du sapin (pixels du sprite). */
  var TREE_BULBS = [[17, 12], [13, 19], [21, 20], [9, 28], [17, 27], [25, 29], [6, 37], [13, 36], [21, 37], [28, 38]];

  /** Cheminée en pierre, avec les trois chaussettes de Noël (bleue : Liam, verte : Elias, rose : Izia). Les flammes sont animées par la scène. 44×40. */
  function fireplaceBuf() {
    var b = new Buf(44, 40), x, y;
    b.rect(0, 6, 44, 34, "#9b8a72");
    for (y = 8; y < 40; y += 4) { b.rect(0, y + 3, 44, 1, "#7a6a56"); for (x = (y / 4 % 2) * 5; x < 44; x += 10) b.rect(x, y, 1, 4, "#7a6a56"); }
    b.rect(0, 3, 44, 5, "#6b4a2a"); b.rect(0, 3, 44, 1, "#9c6c3c"); b.rect(0, 7, 44, 1, "#4a3018"); // le manteau en bois
    b.rect(2, 1, 40, 2, "#2f8a4a"); for (x = 4; x < 42; x += 6) b.set(x, 1, "#da3633"); // guirlande
    b.rect(11, 18, 22, 22, "#1a0f0a"); b.ellipse(22, 19, 11, 5, "#1a0f0a"); b.rect(13, 22, 18, 18, "#2a1810");
    b.rect(14, 36, 16, 3, "#5a3a22"); b.ellipse(15, 37, 2, 2, "#c28f52"); b.ellipse(29, 37, 2, 2, "#c28f52");
    [[7, "#2f6fd6"], [20, "#2e9a4a"], [33, "#f778ba"]].forEach(function (c) { // chaussettes
      b.rect(c[0], 8, 3, 8, c[1]); b.rect(c[0], 15, 6, 3, c[1]); b.rect(c[0], 8, 3, 2, "#f4f8ff"); b.rect(c[0] + 3, 17, 1, 1, "#f4f8ff");
    });
    b.rect(5, 38, 34, 2, "#7a6a56");
    return b.outline(OUT);
  }

  /** Pile de bûches : 30×18. */
  function logsBuf() {
    var b = new Buf(30, 18);
    [[5, 13], [15, 13], [25, 13], [10, 6], [20, 6]].forEach(function (p) {
      b.ellipse(p[0], p[1], 5, 5, "#8b5a2b"); b.ellipse(p[0], p[1], 3.2, 3.2, "#c28f52"); b.ellipse(p[0], p[1], 1.4, 1.4, "#8b5a2b");
    });
    return b.outline(OUT);
  }

  /** Petit pas de neige et ampoule (utilisés tels quels par la scène). */
  var GIFT_COLORS = {
    liam: { body: "#2f6fd6", light: "#58a6ff", ribbon: "#ffd54a" },
    elias: { body: "#2e9a4a", light: "#5fd47a", ribbon: "#ff7eb6" },
    izia: { body: "#c23f8f", light: "#f778ba", ribbon: "#58d6ff" }
  };

  function registerGrange(k) {
    k.loadSprite("house", single(houseBuf()));
    k.loadSprite("barn-tree", single(treeBuf()));
    k.loadSprite("barn-fire", single(fireplaceBuf()));
    k.loadSprite("barn-logs", single(logsBuf()));
    Object.keys(GIFT_COLORS).forEach(function (id) {
      var c = GIFT_COLORS[id];
      k.loadSprite("gift-" + id, sheet([giftBuf(false, c.body, c.light, c.ribbon), giftBuf(true, c.body, c.light, c.ribbon)], 20, 22), { sliceX: 2 });
    });
  }

  S.registerGrange = registerGrange;
  S.grange = { colors: GIFT_COLORS, treeBulbs: TREE_BULBS, houseBuf: houseBuf, giftBuf: giftBuf, treeBuf: treeBuf, fireplaceBuf: fireplaceBuf, logsBuf: logsBuf };
})();
