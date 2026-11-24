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

  /** Poêle à bois noir à foyer ouvert (40×30) : corps en fonte, grande ouverture arrondie sans vitre, plaque du dessus où dorment les chats,
   *  pieds, dalle de pierre. Le tuyau qui monte au plafond et les flammes sont posés par la scène (l'ouverture est centrée : x 12..28, y 13..27). */
  function fireplaceBuf() {
    var b = new Buf(40, 30), x;
    b.rect(3, 6, 34, 21, "#1c1c22"); b.rect(3, 6, 1, 21, "#2c2c34"); b.rect(36, 6, 1, 21, "#101014");
    b.rect(0, 3, 40, 4, "#2c2c34"); b.rect(0, 3, 40, 1, "#52525e"); b.rect(0, 6, 40, 1, "#101014"); // plaque du dessus
    b.rect(15, 1, 10, 3, "#26262e"); b.rect(15, 1, 10, 1, "#4a4a58"); // collier du tuyau
    b.rect(10, 11, 20, 17, "#2c2c34"); b.ellipse(20, 12, 10, 5, "#2c2c34"); // cadre de l'ouverture
    b.rect(12, 14, 16, 14, "#0a0606"); b.ellipse(20, 14, 8, 4.4, "#0a0606"); // foyer ouvert
    b.rect(13, 24, 14, 3, "#4a1c0a"); for (x = 14; x < 27; x += 3) b.set(x, 24, "#c8561e"); // lit de braises
    for (x = 6; x < 36; x += 8) { b.set(x, 9, "#3a3a46"); b.set(x, 22, "#3a3a46"); } // rivets
    b.rect(5, 27, 3, 2, "#101014"); b.rect(32, 27, 3, 2, "#101014"); // pieds
    b.rect(1, 28, 38, 2, "#6a6a74"); b.rect(1, 28, 38, 1, "#8a8a96"); // dalle de pierre
    return b.outline(OUT);
  }

  /** Barre en fer où pendent les trois chaussettes de Noël (bleue : Liam, verte : Elias, rose : Izia) : 40×20. */
  function stockingsBuf() {
    var b = new Buf(40, 20);
    b.rect(0, 0, 40, 2, "#26262e"); b.rect(0, 0, 40, 1, "#52525e"); b.set(0, 2, "#26262e"); b.set(39, 2, "#26262e");
    [[5, "#2f6fd6"], [17, "#2e9a4a"], [29, "#f778ba"]].forEach(function (c) {
      b.rect(c[0], 3, 6, 3, "#f4f8ff"); b.rect(c[0], 6, 5, 7, c[1]); b.rect(c[0], 12, 8, 4, c[1]); b.rect(c[0] + 5, 14, 1, 1, "#f4f8ff"); b.rect(c[0], 6, 1, 7, "#ffffff44");
    });
    return b.outline(OUT);
  }

  /** Les deux petits chats de la maison (14×12, 2 images) : un roux tigré assis (la queue remue) et un gris et blanc roulé en boule (il respire). */
  function catBuf(kind, f) {
    var b = new Buf(14, 12);
    if (kind === "a") {
      var fur = "#e8883a", dark = "#b8601e", belly = "#f6c58a";
      b.ellipse(6, 8, 4.6, 3.8, fur); b.ellipse(6.5, 10, 3, 1.6, belly);
      b.ellipse(10, 4.2, 3.3, 3, fur);
      b.poly([[8, 2.4], [8.6, 0], [10.2, 1.8]], fur); b.poly([[10.8, 1.8], [12.4, 0], [12.8, 2.6]], fur); b.set(9, 1, "#f4a0a0"); b.set(12, 1, "#f4a0a0");
      b.set(9, 4, "#1d1228"); b.set(11, 4, "#1d1228"); b.set(10, 5, "#e07a8a");
      b.set(4, 6, dark); b.set(6, 5, dark); b.set(5, 8, dark); b.set(7, 8, dark); b.set(9, 2, dark); b.set(11, 2, dark); // rayures
      if (f) { b.line(2, 9, 0, 10, fur); b.set(0, 11, dark); } else { b.line(2, 9, 1, 6, fur); b.set(1, 5, dark); }
    } else {
      var gray = "#8c93a6", white = "#f2f4fa", gdark = "#5f667a", dy = f ? -0.3 : 0;
      b.ellipse(6.5, 8 + dy, 6, 3.6 + (f ? 0.5 : 0), gray); b.ellipse(7, 9.6, 4.2, 1.6, white);
      b.ellipse(11, 8.4, 2.6, 2.3, white); b.set(10, 8, "#1d1228"); b.set(12, 8, "#1d1228"); b.set(11, 9, "#e07a8a");
      b.poly([[9.4, 6.6], [10.2, 4.6], [11.4, 6.2]], gray); b.poly([[11.8, 6.2], [13, 4.6], [13.2, 7]], gray);
      b.rect(1, 6, 3, 1, gdark); b.rect(3, 5, 3, 1, gdark); b.rect(0, 9, 3, 2, gray); b.set(0, 10, white); // la queue enroulée
    }
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

  /* ---- Papa et Maman : dessinés d'après la photo du PO, en grand (le double de la résolution des autres sprites de la scène, affichés à moitié d'échelle) ---- */
  /** Ombrage en trois bandes (clair à gauche, ton moyen, ombre à droite) pour un remplissage de polygone. */
  function band(c0, c1, c2, xa, xb) { return function (x) { var t = (x - xa) / (xb - xa); return t < 0.25 ? c0 : t < 0.7 ? c1 : c2; }; }
  /** Un membre rond : une suite de disques en trois épaisseurs (ombre, ton moyen, lumière en haut à gauche) ; cols = [clair, moyen, sombre]. */
  function limb(b, x0, y0, x1, y1, r, cols) {
    var n = Math.ceil(Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0))) * 2 + 1, i, t;
    [[0, 0, r, cols[2]], [-0.6, -0.4, r - 1, cols[1]], [-1.1, -0.9, Math.max(0.9, r - 2.3), cols[0]]].forEach(function (l) {
      for (i = 0; i <= n; i++) { t = i / n; b.ellipse(x0 + (x1 - x0) * t + l[0], y0 + (y1 - y0) * t + l[1], l[2], l[2], l[3]); }
    });
  }
  function noise(x, y) { return (((x * 73856093) ^ (y * 19349663)) >>> 0) % 100; }

  /** Papa (68×100, 4 poses) : 1,80 m, costaud, cheveux courts gris argent avec un dégradé propre sur les côtés, barbe brune soignée et moustache, grand sourire, T-shirt beige
   *  près du corps, pendentif vert, bracelet, jean et chaussures de chantier. Son bras droit (à droite du dessin) est plié pour que Maman y passe le sien ;
   *  le bras libre (à gauche) fait le geste : 0 repos, 1 la poêle à crêpes levée, 2 le marteau levé, 3 le marteau abaissé. */
  function dadBuf(pose) {
    var b = new Buf(68, 100), y, i;
    var SKIN = ["#eec3a0", "#dba47e", "#b97f5c"], TEE = ["#d9a29a", "#bd8680", "#93605c"], JEAN = band("#6a94d0", "#4d78b4", "#2f4f86", 32, 56);
    var BOOT = band("#b87c3e", "#8b5a2b", "#4a2f1c", 29, 45);
    // jambes en jean, le tombé du tissu, les poches, la couture
    b.poly([[33, 54], [44.5, 54], [44.5, 64], [43.4, 77], [43, 91], [33.5, 91], [33, 77], [32.5, 64]], JEAN);
    b.poly([[43.5, 54], [55, 54], [55.5, 64], [55, 77], [54.6, 91], [45, 91], [44.6, 77], [43.5, 64]], band("#6a94d0", "#4d78b4", "#2f4f86", 44, 56));
    b.rect(43, 64, 3, 23, "#35568e"); // entre-jambes
    [[35, 74], [36, 75], [37, 76], [38, 76], [51, 74], [50, 75], [49, 76], [48, 76], [36, 78], [37, 78], [50, 78], [49, 78]].forEach(function (p) { b.set(p[0], p[1], "#2f4f86"); });
    for (y = 56; y < 62; y++) { b.set(34 + (y - 56), y, "#2f4f86"); b.set(54 - (y - 56), y, "#2f4f86"); } // poches
    b.rect(34, 62, 3, 1, "#2f4f86"); b.rect(52, 62, 3, 1, "#2f4f86");
    for (y = 58; y < 90; y += 3) b.set(33, y, "#8fb2e4");
    b.rect(33, 88, 10, 1, "#2f4f86"); b.rect(45, 88, 10, 1, "#2f4f86"); // revers du bas
    // chaussures de chantier
    b.poly([[33.5, 89], [43, 89], [43.5, 94], [44, 98], [44, 100], [29, 100], [29, 97], [31, 95], [33, 93]], BOOT);
    b.poly([[45, 89], [54.5, 89], [54.5, 93], [57, 95], [59, 97], [59, 100], [44, 100], [44, 98], [44.5, 94]], band("#b87c3e", "#8b5a2b", "#4a2f1c", 44, 60));
    b.rect(29, 98, 15, 2, "#25201c"); b.rect(44, 98, 15, 2, "#25201c");
    b.rect(33, 89, 10, 1, "#5a381a"); b.rect(45, 89, 10, 1, "#5a381a");
    [36, 38, 40].forEach(function (lx) { b.set(lx, 91, "#e6d6b4"); b.set(lx, 93, "#e6d6b4"); b.set(lx + 9, 91, "#e6d6b4"); b.set(lx + 9, 93, "#e6d6b4"); });
    b.set(30, 96, "#d9a05e"); b.set(31, 96, "#d9a05e"); b.set(57, 96, "#a8703a");
    // cou
    b.poly([[40, 16], [48, 16], [48.6, 22], [44, 25], [39.4, 22]], band("#dba47e", "#b97f5c", "#a06a4a", 39, 49));
    // torse : T-shirt près du corps, épaules larges
    b.poly([[30, 23], [35, 20], [41, 19.6], [44, 24], [47, 19.6], [53, 20], [58, 23], [59, 34], [57.6, 46], [56, 54], [32, 54], [30.4, 46], [29, 34]], function (px, py) {
      var t = (px - 29) / 30, c = t < 0.22 ? TEE[0] : t < 0.72 ? TEE[1] : TEE[2];
      return py > 50 ? TEE[2] : c;
    });
    b.poly([[40.6, 19.6], [44, 25.5], [47.4, 19.6], [46.6, 19.6], [44, 23.6], [41.4, 19.6]], "#6e4744"); // encolure
    b.poly([[41.4, 19.8], [44, 23.8], [46.6, 19.8]], "#c98f68"); // le V de peau
    for (i = 0; i < 9; i++) { b.set(34 + i, 31 + (i < 4 ? Math.floor(i / 2) : Math.floor((8 - i) / 2)), "#93605c"); b.set(46 + i, 31 + (i < 4 ? Math.floor(i / 2) : Math.floor((8 - i) / 2)), "#93605c"); } // le dessous des pectoraux
    b.rect(34, 27, 6, 2, "#e8b8b0"); b.rect(48, 27, 5, 2, "#cf9a94"); // reflets sur la poitrine
    b.rect(44, 26, 1, 5, "#a8706c");
    [[36, 44], [37, 45], [38, 46], [51, 43], [52, 44], [53, 45], [41, 48], [42, 49], [48, 48], [47, 49]].forEach(function (p) { b.set(p[0], p[1], "#93605c"); }); // plis du tissu
    b.rect(31, 53, 26, 1, "#6e4744"); // ourlet
    // pendentif vert
    b.rect(44, 26, 2, 2, "#3fa070"); b.set(44, 26, "#9fe8c0"); b.set(45, 27, "#2a6a48"); b.set(44, 25, "#8a6a3a");
    // ceinture
    b.rect(32, 54, 24, 3, "#3a2a20"); b.rect(32, 54, 24, 1, "#5a4030"); b.rect(42, 54, 5, 3, "#c4a85a"); b.rect(43, 55, 3, 1, "#7a6228"); b.set(42, 54, "#f0dc8a");
    // bras droit plié, Maman y passe le sien
    limb(b, 62, 40, 65, 47, 3.7, SKIN); limb(b, 59.5, 33, 61, 42, 4.6, SKIN); b.ellipse(66, 50, 3.1, 3.4, band("#eec3a0", "#dba47e", "#b97f5c", 63, 69));
    limb(b, 58, 25, 59.5, 32, 5.2, TEE);
    // la tête : visage, oreilles
    b.ellipse(36.4, 10.5, 1.7, 2.5, "#b97f5c"); b.ellipse(51.6, 10.5, 1.7, 2.5, "#a06a4a");
    b.poly([[38.6, 3.5], [49.4, 3.5], [51, 7], [51, 12], [49.4, 16], [46.5, 19], [44, 19.8], [41.5, 19], [38.6, 16], [37, 12], [37, 7]], band("#f0c9a8", "#dba47e", "#b97f5c", 37, 51));
    b.rect(39, 10, 2, 2, "#eab998"); b.rect(47, 10, 2, 2, "#d4966f"); // pommettes
    // cheveux courts gris argent, dégradé propre sur les côtés
    b.poly([[37, 9], [36.6, 5], [38, 2.6], [41, 1], [47, 1], [50, 2.6], [51.4, 5], [51, 9], [49.8, 7], [48.6, 5.2], [44, 4.2], [39.4, 5.2], [38.2, 7]], function (px, py) {
      var v = noise(px, py);
      return py < 3 ? (v < 25 ? "#f2f0f4" : "#dcdae2") : py < 5 ? (v < 25 ? "#d2d0d8" : "#b9b6c0") : "#8c8896";
    });
    [[37, 6, "#8c8896"], [37, 7, "#79737e"], [37, 8, "#8a7a74"], [51, 6, "#7a7684"], [51, 7, "#67626e"], [51, 8, "#7a6a64"], [38, 7, "#9a96a2"], [50, 7, "#8a8692"]].forEach(function (p) { b.set(p[0], p[1], p[2]); });
    [[41, 1], [44, 1], [46, 2], [40, 2]].forEach(function (p) { b.set(p[0], p[1], "#ffffff"); });
    // visage : sourcils, yeux rieurs, nez
    b.rect(39, 6, 4, 1, "#3a2c27"); b.rect(45, 6, 4, 1, "#3a2c27"); b.set(39, 7, "#3a2c27"); b.set(48, 7, "#3a2c27");
    b.rect(40, 8, 3, 1, "#241a2c"); b.rect(46, 8, 3, 1, "#241a2c"); b.set(40, 8, "#f6f0ea"); b.set(48, 8, "#f6f0ea"); b.set(41, 7, "#5a4036"); b.set(47, 7, "#5a4036");
    b.set(44, 9, "#c98f68"); b.set(44, 10, "#b97f5c"); b.set(43, 11, "#a06a4a"); b.set(45, 11, "#a06a4a"); b.set(43, 10, "#e8b894");
    // barbe brune soignée (quelques poils gris) et moustache
    b.poly([[37.2, 9], [37.8, 14], [40, 18], [44, 20.2], [48, 18], [50.2, 14], [50.8, 9], [49.4, 11.6], [48, 13], [44, 12.2], [40, 13], [38.6, 11.6]], function (px, py) {
      var v = noise(px + 5, py + 9);
      return v < 11 ? "#857a76" : py > 18 ? "#2a1f1b" : v < 40 ? "#4a3a33" : "#3a2c27";
    });
    b.rect(41, 14, 6, 1, "#f8f4ee"); b.rect(41, 15, 6, 1, "#b8584a"); b.set(40, 14, "#4a3a33"); b.set(47, 14, "#4a3a33"); b.set(40, 13, "#2a1f1b"); b.set(47, 13, "#2a1f1b"); b.set(42, 14, "#ffffff"); b.set(44, 14, "#e8e2d8");
    // bras libre (à gauche du dessin) : le geste
    if (pose === 0) {
      b.ellipse(28.5, 58, 3.1, 3.6, band("#eec3a0", "#dba47e", "#b97f5c", 25, 32)); b.rect(26, 61, 5, 1, "#b97f5c");
      limb(b, 28.5, 43, 28.5, 53, 3.7, SKIN); limb(b, 28.5, 33, 28.5, 42, 4.6, SKIN);
      b.rect(25, 52, 7, 1, "#b88a52"); b.rect(25, 53, 7, 1, "#6a4a2a"); b.set(31, 52, "#e8d09a"); // bracelet
      limb(b, 29, 25, 28.5, 32, 5.2, TEE);
    } else if (pose === 1) { // la poêle à crêpes, bien haute
      b.rect(13, 23, 7, 2, "#2a2a30"); b.rect(13, 23, 7, 1, "#4a4a56");
      b.ellipse(7, 22, 7.4, 3.4, "#5c5c6a"); b.ellipse(7, 22.2, 6, 2.4, "#2c2c34"); b.rect(2, 21, 3, 1, "#4a4a58"); b.set(1, 21, "#a8a8b8"); b.set(2, 20, "#8a8a98");
      limb(b, 23.5, 38, 19, 28, 3.7, SKIN); limb(b, 26.5, 33, 23.5, 38, 4.6, SKIN); b.ellipse(18, 25.5, 3.1, 3, band("#eec3a0", "#dba47e", "#b97f5c", 15, 21));
      b.rect(15, 25, 5, 1, "#b88a52"); limb(b, 29, 25, 27, 32, 5.2, TEE);
    } else if (pose === 2) { // le marteau levé
      b.rect(20, 4, 2, 14, "#8b5a2b"); b.rect(20, 4, 1, 14, "#b07a3e");
      b.rect(15, 0, 11, 6, "#8a8f99"); b.rect(15, 0, 11, 1, "#d4d9e4"); b.rect(15, 5, 11, 1, "#5a5f69"); b.rect(15, 1, 2, 4, "#aeb4c0"); b.rect(24, 1, 2, 4, "#6a707c");
      limb(b, 23, 34, 21, 21, 3.7, SKIN); limb(b, 26.5, 32, 23, 34, 4.6, SKIN); b.ellipse(21, 17, 3.2, 3.1, band("#eec3a0", "#dba47e", "#b97f5c", 18, 24));
      b.rect(19, 28, 6, 1, "#b88a52"); limb(b, 29, 25, 27, 31, 5.2, TEE);
    } else { // le marteau abaissé
      b.rect(14, 38, 2, 18, "#8b5a2b"); b.rect(14, 38, 1, 18, "#b07a3e");
      b.rect(9, 54, 11, 6, "#8a8f99"); b.rect(9, 54, 11, 1, "#d4d9e4"); b.rect(9, 59, 11, 1, "#5a5f69"); b.rect(9, 55, 2, 4, "#aeb4c0"); b.rect(18, 55, 2, 4, "#6a707c");
      limb(b, 25, 36, 18.5, 40, 3.7, SKIN); limb(b, 28, 31, 25, 36, 4.6, SKIN); b.ellipse(17, 40.5, 3.3, 3.2, band("#eec3a0", "#dba47e", "#b97f5c", 14, 20));
      b.rect(22, 36, 1, 4, "#b88a52"); limb(b, 29, 25, 27.5, 31, 5.2, TEE);
    }
    return b.outline(OUT);
  }

  /** Maman (56×90, 4 poses) : plus petite que Papa, cheveux bruns mi-longs sur les épaules avec la frange droite, grand sourire, T-shirt blanc à petits motifs rouges noué sur la hanche,
   *  jean clair troué au genou aux revers roulés, baskets blanches. Son bras gauche (à gauche du dessin) se glisse dans celui de Papa ; le bras libre fait le geste :
   *  0 repos, 1 la cuillère en bois levée (la cheffe d'orchestre), 2 le doigt pointé (« au travail ! »), 3 la crêpe à la bouche. */
  function momBuf(pose) {
    var b = new Buf(56, 90), x;
    var SKIN = ["#f9e2c8", "#f0cfae", "#d9ad88"], TEE = ["#fbfaf8", "#ebe8e6", "#c9c7d2"], HAIR = "#3a2418", HAIR2 = "#5b3a28";
    var JEAN = band("#bcd6f2", "#94b8e2", "#6f96c6", 11, 30);
    // les cheveux, derrière : mi-longs, lisses, qui frôlent les épaules
    b.poly([[10, 9], [10.4, 4], [13, 1.4], [17, 0.2], [24, 0.2], [28, 1.4], [30, 4], [30.6, 10], [31, 20], [32, 29], [30, 32], [26, 31], [26, 22], [14, 22], [14, 31], [10, 32], [8, 29], [9, 20]], function (px, py) {
      return (px + py) % 7 === 0 && py > 6 ? HAIR2 : HAIR;
    });
    // jambes : jean clair, troué au genou gauche, revers roulés
    b.poly([[12, 45], [20.4, 45], [20.4, 56], [19.7, 70], [19.4, 83], [12, 83], [11.8, 70], [11.4, 56]], JEAN);
    b.poly([[19.6, 45], [28, 45], [28.6, 56], [28.2, 70], [27.8, 83], [21, 83], [20.6, 70], [19.6, 56]], band("#bcd6f2", "#94b8e2", "#6f96c6", 20, 29));
    b.rect(19, 56, 2, 25, "#7aa0d0"); // entre-jambes
    b.rect(13, 66, 6, 5, "#dce9f8"); [67, 69].forEach(function (yy) { for (x = 13; x < 19; x += 2) b.set(x, yy, "#ffffff"); b.set(14, yy + 1, "#c4d6ee"); }); b.set(12, 66, "#dce9f8"); b.set(19, 67, "#ffffff"); // le genou troué
    [[14, 62], [15, 63], [23, 63], [24, 64], [24, 72], [25, 73]].forEach(function (p) { b.set(p[0], p[1], "#6f96c6"); });
    b.rect(11.6, 78, 8, 5, "#a6c4e8"); b.rect(11.6, 78, 8, 1, "#d4e4f8"); b.rect(11.6, 82, 8, 1, "#6f96c6");
    b.rect(21, 78, 7, 5, "#8fb2dc"); b.rect(21, 78, 7, 1, "#c4d8f0"); b.rect(21, 82, 7, 1, "#6f96c6");
    // baskets blanches
    b.poly([[11.6, 83], [19.6, 83], [20, 86], [21.5, 88], [21.5, 90], [9, 90], [9, 87], [11, 85.5]], band("#ffffff", "#f1f1f4", "#c8c8d2", 9, 22));
    b.poly([[21, 83], [28, 83], [28.4, 86], [30.4, 88], [32, 90], [20.4, 90], [20.4, 86]], band("#ffffff", "#f1f1f4", "#c8c8d2", 20, 33));
    b.rect(9, 88, 12, 2, "#b8b8c4"); b.rect(20, 88, 12, 2, "#b8b8c4"); b.set(16, 85, "#7a7a88"); b.set(17, 86, "#7a7a88"); b.set(24, 85, "#7a7a88"); b.set(25, 86, "#7a7a88");
    b.rect(10, 87, 3, 1, "#e63946"); b.rect(29, 87, 3, 1, "#e63946"); // un petit liseré rouge
    // le cou, puis le T-shirt
    b.poly([[17.2, 17], [22.8, 17], [23.2, 22], [20, 24], [16.8, 22]], band("#f0cfae", "#d9ad88", "#c79a74", 16, 24));
    b.poly([[12, 24], [16, 21.6], [24, 21.6], [28, 24], [29, 32], [28.2, 40], [27.6, 46], [12.4, 46], [11.8, 40], [11, 32]], function (px, py) {
      var t = (px - 11) / 18, c = t < 0.22 ? TEE[0] : t < 0.72 ? TEE[1] : TEE[2];
      return (px * 7 + py * 13) % 41 === 0 ? "#d9534f" : c;
    });
    b.ellipse(20, 22.2, 3.4, 2.3, "#e0b088"); b.rect(16.6, 21.8, 7, 1, "#d6d2da"); b.rect(17, 23, 6, 1, "#c9c7d2");
    [[14, 36], [15, 37], [16, 38], [25, 33], [24, 34], [23, 35]].forEach(function (p) { b.set(p[0], p[1], "#c9c7d2"); }); // plis du tissu
    b.rect(12, 45, 16, 1, "#c9c7d2"); // ourlet noué
    b.ellipse(26, 45.5, 2.6, 1.8, "#ebe8e6"); b.set(24, 45, "#c9c7d2"); b.set(28, 46, "#c9c7d2"); b.set(27, 44, "#ffffff"); // le nœud sur la hanche
    b.rect(12, 46, 16, 1, "#6f96c6"); b.set(20, 47, "#3a5a8a"); b.rect(19, 46, 3, 1, "#c4a85a"); // ceinture du jean
    // bras gauche, glissé dans celui de Papa
    limb(b, 9, 37, 5, 42, 2.5, SKIN); limb(b, 12, 29, 9, 37, 3, SKIN); b.ellipse(3.6, 43.4, 2.6, 2.4, band("#f9e2c8", "#f0cfae", "#d9ad88", 1, 7)); b.rect(2, 45, 3, 1, "#d9ad88");
    limb(b, 13, 25, 12, 29, 3.7, TEE);
    // la tête : visage, oreilles
    b.poly([[13.4, 3], [26.6, 3], [27.8, 8], [27.6, 13], [25, 16.6], [22, 18.4], [20, 19], [18, 18.4], [15, 16.6], [12.4, 13], [12.2, 8]], band("#f9e2c8", "#f0cfae", "#d9ad88", 12, 28));
    b.ellipse(15, 13.6, 1.8, 1.4, "#f2a898"); b.ellipse(25, 13.6, 1.8, 1.4, "#e89a8a"); // les joues
    b.rect(18, 6, 4, 1, "#f9e2c8");
    // les mèches devant les épaules, puis la frange droite
    b.poly([[11.4, 8], [14.6, 9], [14, 20], [13, 30], [10.6, 31], [9.6, 20]], function (px, py) { return (px + py) % 6 === 0 ? HAIR2 : HAIR; });
    b.poly([[28.6, 8], [25.4, 9], [26, 20], [27, 30], [29.4, 31], [30.4, 20]], function (px, py) { return (px + py) % 6 === 0 ? HAIR2 : HAIR; });
    b.poly([[11.4, 9], [11, 5], [13, 2], [17, 0.3], [23, 0.3], [27, 2], [29, 5], [28.6, 9], [27.4, 8.8], [20, 9.2], [12.6, 8.8]], function (px, py) {
      return py === 2 && px > 14 && px < 24 ? "#7a5238" : (px * 3 + py) % 5 === 0 && py > 3 ? HAIR2 : HAIR;
    });
    b.rect(14, 7, 12, 1, "#2a1810"); // le bord de la frange
    // yeux en amande, sourcils, nez, grand sourire
    b.rect(15, 9, 4, 1, "#2a1810"); b.rect(22, 9, 4, 1, "#2a1810");
    b.rect(15, 11, 4, 1, "#241a2c"); b.rect(22, 11, 4, 1, "#241a2c"); b.rect(16, 12, 2, 1, "#4a3a4a"); b.rect(23, 12, 2, 1, "#4a3a4a"); b.set(19, 10, "#241a2c"); b.set(26, 10, "#241a2c"); b.set(16, 11, "#fff8f0"); b.set(23, 11, "#fff8f0");
    b.set(20, 13, "#d9ad88"); b.set(20, 14, "#c79a74");
    b.set(17, 15, "#c8605a"); b.set(23, 15, "#c8605a"); b.rect(18, 16, 5, 1, "#ffffff"); b.rect(18, 17, 5, 1, "#c8605a");
    // bras libre (à droite du dessin) : le geste
    if (pose === 0) {
      limb(b, 30, 41, 31, 48, 2.5, SKIN); limb(b, 28.5, 31, 30, 40, 3, SKIN); b.ellipse(31.3, 50.4, 2.5, 2.8, band("#f9e2c8", "#f0cfae", "#d9ad88", 28, 34));
      limb(b, 27, 25, 28.5, 30, 3.7, TEE);
    } else if (pose === 1) { // la cuillère en bois, comme une baguette
      b.rect(38, 8, 2, 12, "#c28f52"); b.rect(38, 8, 1, 12, "#e0b070");
      b.ellipse(39, 5.2, 3.8, 4.6, "#d9a666"); b.ellipse(39, 5.4, 2.6, 3.4, "#c28f52"); b.set(37, 2, "#f6dca4"); b.set(38, 1, "#f6dca4");
      limb(b, 33, 32, 36.5, 22, 2.5, SKIN); limb(b, 28, 27, 33, 32, 3, SKIN); b.ellipse(37, 20, 2.6, 2.6, band("#f9e2c8", "#f0cfae", "#d9ad88", 34, 40));
      limb(b, 27, 25, 29, 28, 3.7, TEE);
    } else if (pose === 2) { // le doigt pointé : « au travail ! »
      limb(b, 34, 30, 46, 30, 2.5, SKIN); limb(b, 28, 27, 34, 30, 3, SKIN);
      b.ellipse(48.5, 30.5, 2.8, 2.6, band("#f9e2c8", "#f0cfae", "#d9ad88", 46, 52)); b.rect(50, 29, 6, 2, "#f0cfae"); b.rect(50, 29, 6, 1, "#f9e2c8"); b.set(55, 30, "#d9ad88");
      limb(b, 27, 25, 30, 28, 3.7, TEE);
    } else { // la crêpe roulée à la bouche
      limb(b, 32, 34, 30, 23, 2.5, SKIN); limb(b, 28, 28, 32, 34, 3, SKIN); b.ellipse(29.6, 20.6, 2.5, 2.5, band("#f9e2c8", "#f0cfae", "#d9ad88", 27, 33));
      b.ellipse(27, 16, 4.8, 3, function (nx, ny) { return ny < -0.3 ? "#f6cd70" : "#e0a844"; }); [[24, 16], [27, 15], [29, 16], [26, 17]].forEach(function (p) { b.set(p[0], p[1], "#a8742a"); });
      limb(b, 27, 25, 29, 29, 3.7, TEE);
    }
    return b.outline(OUT);
  }

  /** L'enseigne « LA GRANGE » (177×63) : plaque d'acier martelé suspendue à deux chaînes, rivets, cadre gravé, bord chauffé à blanc, et de GROSSES lettres
   *  de forge (dégradé de feu or → rouge, relief, double contour, ombre portée). Les flammes, les braises et la lueur sont posées par la scène. */
  var SIGN_FONT = {
    L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
    A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
    G: [".XXXX", "X....", "X....", "X..XX", "X...X", "X...X", ".XXX."],
    R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
    N: ["X...X", "XX..X", "XX..X", "X.X.X", "X..XX", "X..XX", "X...X"],
    E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"]
  };
  function hexMix(a, b, t) {
    function h(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    var x = h(a), y = h(b);
    return "#" + [0, 1, 2].map(function (j) { var v = Math.round(x[j] + (y[j] - x[j]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }
  function signBuf() {
    var W = 177, PW = 175, PH = 49, CH = 13, b = new Buf(W, CH + PH + 1), x0 = 1, y0 = CH, seed = 7, x, y, i;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    // les deux chaînes, maillons alternés
    [x0 + 16, x0 + PW - 17].forEach(function (cx) {
      for (y = 0; y < CH; y += 3) {
        if ((y / 3) % 2) { b.rect(cx - 1, y, 3, 3, "#8a8f9c"); b.set(cx, y + 1, "#14151a"); } else { b.rect(cx, y, 1, 3, "#6a6f7c"); b.rect(cx - 1, y, 1, 1, "#9aa0ac"); b.rect(cx + 1, y + 2, 1, 1, "#4a4f5a"); }
      }
    });
    // la plaque : acier brossé en dégradé, coins coupés
    b.poly([[x0 + 4, y0], [x0 + PW - 4, y0], [x0 + PW, y0 + 4], [x0 + PW, y0 + PH - 4], [x0 + PW - 4, y0 + PH], [x0 + 4, y0 + PH], [x0, y0 + PH - 4], [x0, y0 + 4]],
      function (px, py) { return hexMix("#5d6372", "#2a2d37", (py - y0) / PH); });
    for (i = 0; i < 380; i++) { x = x0 + 3 + Math.floor(rnd() * (PW - 6)); y = y0 + 3 + Math.floor(rnd() * (PH - 6)); b.set(x, y, rnd() < 0.5 ? "#6d7384" : "#22252e"); } // martelage
    b.rect(x0 + 4, y0, PW - 8, 2, "#9ba1b2"); b.rect(x0, y0 + 4, 2, PH - 8, "#868c9c"); // reflets en haut et à gauche
    b.rect(x0 + 4, y0 + PH - 2, PW - 8, 2, "#12131a"); b.rect(x0 + PW - 2, y0 + 4, 2, PH - 8, "#1a1b22"); // ombres en bas et à droite
    // cadre gravé et champ sombre des lettres
    b.rect(x0 + 5, y0 + 5, PW - 10, PH - 10, "#0e0d12"); b.rect(x0 + 6, y0 + 6, PW - 12, PH - 12, "#1b1820");
    b.rect(x0 + 6, y0 + PH - 7, PW - 12, 1, "#7a3414"); b.rect(x0 + 7, y0 + PH - 8, PW - 14, 1, "#b8501a"); // le bas du champ rougeoie, chauffé par la forge
    for (i = 0; i < 90; i++) b.set(x0 + 7 + Math.floor(rnd() * (PW - 14)), y0 + 7 + Math.floor(rnd() * (PH - 14)), "#241f2a");
    // quatre gros rivets
    [[x0 + 3, y0 + 3], [x0 + PW - 5, y0 + 3], [x0 + 3, y0 + PH - 5], [x0 + PW - 5, y0 + PH - 5]].forEach(function (r) {
      b.rect(r[0], r[1], 3, 3, "#8a8f9c"); b.set(r[0], r[1], "#e4e8f2"); b.set(r[0] + 2, r[1] + 2, "#3a3e4a");
    });
    // les lettres : cases de 3×3 pixels
    var text = "LA GRANGE", PX = 3, GAP = 1, cells = [], cx = 0, n, r, c, ch, g;
    var total = 0;
    for (n = 0; n < text.length; n++) total += (text[n] === " " ? 3 : 5) + (n < text.length - 1 ? GAP : 0);
    var ox = x0 + Math.round((PW - total * PX) / 2), oy = y0 + Math.round((PH - 7 * PX) / 2) - 1;
    for (n = 0; n < text.length; n++) {
      ch = text[n]; g = SIGN_FONT[ch];
      if (g) for (r = 0; r < 7; r++) for (c = 0; c < 5; c++) if (g[r][c] === "X") cells.push({ x: ox + (cx + c) * PX, y: oy + r * PX, r: r, c: c, ch: ch });
      cx += (ch === " " ? 3 : 5) + GAP;
    }
    var has = {};
    cells.forEach(function (q) { has[q.x + "," + q.y] = true; });
    cells.forEach(function (q) { b.rect(q.x + 2, q.y + 4, PX, PX, "#000000aa"); });                       // ombre portée
    cells.forEach(function (q) { b.rect(q.x - 2, q.y - 2, PX + 4, PX + 4, "#2a0a02"); });                 // contour épais
    cells.forEach(function (q) { b.rect(q.x - 1, q.y - 1, PX + 2, PX + 2, "#ff7a22"); });                 // liseré de braise
    var FIRE = ["#fff4b0", "#ffd84a", "#ffb52e", "#ff9a1e", "#f2701a", "#d9481a", "#b02a18"];
    cells.forEach(function (q) {
      var base = FIRE[q.r], up = !has[q.x + "," + (q.y - PX)], lf = !has[(q.x - PX) + "," + q.y], dn = !has[q.x + "," + (q.y + PX)], rt = !has[(q.x + PX) + "," + q.y];
      b.rect(q.x, q.y, PX, PX, base);
      if (up) b.rect(q.x, q.y, PX, 1, hexMix(base, "#ffffff", 0.55));
      if (lf) b.rect(q.x, q.y, 1, PX, hexMix(base, "#ffffff", 0.4));
      if (dn) b.rect(q.x, q.y + PX - 1, PX, 1, hexMix(base, "#000000", 0.45));
      if (rt) b.rect(q.x + PX - 1, q.y, 1, PX, hexMix(base, "#000000", 0.35));
      if (up && lf) b.set(q.x, q.y, "#ffffff");                                                             // éclat sur les angles
    });
    return b.outline("#0a0a0e");
  }

  /** La pleine lune de la fenêtre (26×26) : ombrée côté bas-droite, cratères avec un liseré clair, quelques grains de poussière. */
  function moonBuf() {
    var b = new Buf(26, 26), i;
    b.ellipse(13, 13, 12, 12, function (nx, ny) { var v = nx * 0.38 + ny * 0.42; return v < -0.5 ? "#fffdf0" : v < -0.1 ? "#fff3c4" : v < 0.3 ? "#f4e0a0" : v < 0.65 ? "#e2c985" : "#cdb06c"; });
    [[8, 9, 3.2, 2.8], [17, 15, 3.8, 3.4], [11, 19, 2.2, 2], [18, 7, 2, 1.8], [6, 15, 1.6, 1.5]].forEach(function (c) {
      b.ellipse(c[0], c[1], c[2], c[3], "#d9c07c"); b.ellipse(c[0] + 0.6, c[1] + 0.6, c[2] * 0.7, c[3] * 0.7, "#c9ae68");
      b.set(c[0] - c[2] + 0.5, c[1] - 0.5, "#fffbe0"); b.set(c[0] - 1, c[1] - c[3] + 0.5, "#fffbe0");
    });
    for (i = 0; i < 6; i++) b.set(4 + ((i * 7) % 17), 3 + ((i * 5) % 19), "#e8d396");
    return b;
  }

  /** Une crêpe dorée (12×6). */
  function crepeBuf() {
    var b = new Buf(12, 6);
    b.ellipse(6, 3, 5.4, 2.4, function (nx, ny) { return ny < -0.3 ? "#f6cd70" : "#e0a844"; });
    [[3, 3], [6, 2], [8, 3], [5, 4], [9, 2]].forEach(function (p) { b.set(p[0], p[1], "#a8742a"); });
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
    k.loadSprite("barn-stock", single(stockingsBuf()));
    k.loadSprite("cat-a", sheet([catBuf("a", 0), catBuf("a", 1)], 14, 12), { sliceX: 2 });
    k.loadSprite("cat-b", sheet([catBuf("b", 0), catBuf("b", 1)], 14, 12), { sliceX: 2 });
    k.loadSprite("dad", sheet([dadBuf(0), dadBuf(1), dadBuf(2), dadBuf(3)], 68, 100), { sliceX: 4 });
    k.loadSprite("mom", sheet([momBuf(0), momBuf(1), momBuf(2), momBuf(3)], 56, 90), { sliceX: 4 });
    k.loadSprite("crepe", single(crepeBuf()));
    k.loadSprite("moon", single(moonBuf()));
    k.loadSprite("grange-sign", single(signBuf()));
    Object.keys(GIFT_COLORS).forEach(function (id) {
      var c = GIFT_COLORS[id];
      k.loadSprite("gift-" + id, sheet([giftBuf(false, c.body, c.light, c.ribbon), giftBuf(true, c.body, c.light, c.ribbon)], 20, 22), { sliceX: 2 });
    });
  }

  S.registerGrange = registerGrange;
  S.grange = { colors: GIFT_COLORS, treeBulbs: TREE_BULBS, dadBuf: dadBuf, momBuf: momBuf, crepeBuf: crepeBuf, signBuf: signBuf, houseBuf: houseBuf, giftBuf: giftBuf, treeBuf: treeBuf, fireplaceBuf: fireplaceBuf, stockingsBuf: stockingsBuf, catBuf: catBuf, logsBuf: logsBuf };
})();
