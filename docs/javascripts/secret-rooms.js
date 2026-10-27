/* OctoCat-Code — Les 21 salles secrètes (7 niveaux × 3 mondes), toutes différentes.
 * Module PUR (testable sous Node) : chaque salle est une petite grille de caractères (# sol, ~ sol qui s'effrite, J ressort, o pièce)
 * plus un thème de décor (couleurs, fond, particules) que `play.js` dessine. Chaque salle contient exactement 28 pièces
 * (l'équilibrage du jeu en dépend : §26) et pose ses pièces en dessin (cœur, étoile, fusée, spirale…) ou sur un relief à elle.
 *
 * Clé d'une salle = monde × 100 + niveau (`key(monde, niveau)`). Sans clé connue, `playsim.js` garde l'ancienne grotte.
 * Hauteurs : y = rangée comptée depuis le bas (0 = tout en bas) ; le sol de base fait 2 rangées, donc la 1re case libre est y = 2.
 * Portée d'un saut (gravité normale) : 3 cases au-dessus de ses pieds, 4 avec le double saut ; sur la Lune (monde 2), le double.
 */
(function () {
  "use strict";

  var COINS = 28;

  function Builder(W, R) {
    var hs = [], cells = {}, coins = [], i;
    for (i = 0; i < W; i++) hs.push(2);
    var b = {
      W: W, R: R, hs: hs,
      ground: function (c0, c1, h) { for (var c = c0; c <= c1; c++) hs[c] = h; return b; },
      coin: function (c, y) { coins.push([Math.round(c), Math.round(y)]); return b; },
      row: function (c0, c1, y, step) { for (var c = c0; c <= c1; c += step || 1) b.coin(c, y); return b; },
      col: function (c, y0, y1, step) { for (var y = y0; y <= y1; y += step || 1) b.coin(c, y); return b; },
      /** Plateforme dont la surface est au niveau L (1re case libre = L) ; ch : # ou ~ (qui s'effrite). */
      plat: function (c0, c1, L, ch) { for (var c = c0; c <= c1; c++) cells[c + "," + (L - 1)] = ch || "#"; return b; },
      pad: function (c) { cells[c + "," + hs[c]] = "J"; return b; },
      /** Dessin en pièces : lignes du haut vers le bas, `o` = pièce, `J` = ressort ; c0 = colonne de gauche, y0 = rangée de la ligne du bas. */
      art: function (c0, y0, lines) {
        for (var li = 0; li < lines.length; li++) for (var ci = 0; ci < lines[li].length; ci++) {
          var ch = lines[li].charAt(ci), y = y0 + lines.length - 1 - li;
          if (ch === "o") b.coin(c0 + ci, y); else if (ch === "J") cells[(c0 + ci) + "," + y] = "J";
        }
        return b;
      },
      /** Ellipse de n pièces (angles en tours : a0 .. a1). */
      ellipse: function (cx, cy, rx, ry, n, a0, a1) {
        a0 = a0 || 0; a1 = a1 === undefined ? 1 : a1;
        for (var j = 0; j < n; j++) { var a = (a0 + (a1 - a0) * (n > 1 && a1 - a0 < 1 ? j / (n - 1) : j / n)) * Math.PI * 2; b.coin(cx + rx * Math.cos(a), cy + ry * Math.sin(a)); }
        return b;
      },
      /** Courbe y = f(c) sur les colonnes c0..c1. */
      curve: function (c0, c1, fn, step) { for (var c = c0; c <= c1; c += step || 1) b.coin(c, fn(c)); return b; }
    };
    /** Fabrique les lignes de la salle (du haut vers le bas) avec exactement COINS pièces. */
    b.finish = function () {
      var c, y, seen = {}, list = [], rows = [], grid = [];
      for (c = 0; c < 4; c++) hs[c] = 2;
      for (c = W - 3; c < W; c++) hs[c] = 2; // le départ et le tuyau de sortie sont toujours sur le sol de base
      for (y = 0; y < R; y++) { grid.push([]); for (c = 0; c < W; c++) grid[y].push(y < hs[c] ? "#" : cells[c + "," + y] || " "); }
      function ok(cc, yy) { return cc >= 1 && cc <= W - 2 && yy >= 0 && yy < R && grid[yy][cc] === " "; }
      coins.forEach(function (p) { var kk = p[0] + "," + p[1]; if (!seen[kk] && ok(p[0], p[1])) { seen[kk] = true; list.push(p); } });
      if (list.length > COINS) { // trop de pièces : on en retire de façon régulière
        var extra = list.length - COINS, drop = {};
        for (i = 0; i < extra; i++) drop[Math.floor((i + 0.5) * list.length / extra)] = true;
        list = list.filter(function (p, idx) { return !drop[idx]; });
      }
      if (list.length < COINS) { // pas assez : on complète sur le sol, régulièrement
        var cand = [];
        for (c = 4; c <= W - 4; c++) if (ok(c, hs[c]) && !seen[c + "," + hs[c]]) cand.push([c, hs[c]]);
        var need = COINS - list.length;
        for (i = 0; i < need && cand.length; i++) { list.push(cand[Math.min(cand.length - 1, Math.floor((i + 0.5) * cand.length / need))]); }
      }
      list.forEach(function (p) { grid[p[1]][p[0]] = "o"; });
      for (y = R - 1; y >= 0; y--) rows.push(grid[y].join(""));
      return rows;
    };
    return b;
  }

  /* ----- les thèmes de décor (couleurs du fond en dégradé, teinte du sol, lueur, décor, particules) ----- */
  function T(bg0, bg1, tile, glow, deco, decoCol, pkind, pcol) { return { bg: [bg0, bg1], tile: tile, glow: glow, deco: deco, decoCol: decoCol, pkind: pkind, pcol: pcol }; }

  var ROOMS = {};
  function room(key, name, W, theme, fn) { ROOMS[key] = { name: name, W: W, theme: theme, fn: fn }; }

  /* ===== Monde 0 — GitHubia ===== */

  room(1, "LE COEUR D'OR", 28, T("#2a0f1f", "#6a2144", "#ffc9a0", "#ff7aa8", "hearts", "#ff8fb4", "rise", ["#ff8fb4", "#ffd54a", "#ffffff"]), function (b) {
    b.ground(6, 7, 3).ground(8, 19, 4).ground(20, 21, 3);
    b.art(11, 4, [".oo.oo.", "ooooooo", ".ooooo.", "..ooo..", "...o..."]);
    b.row(8, 10, 4).row(18, 19, 4).coin(6, 3).coin(7, 3).coin(20, 3).coin(21, 3);
  });

  room(3, "LA FORET DE STALAGMITES", 32, T("#0b1b27", "#17424f", "#9fe9ff", "#39c5cf", "stalactites", "#1d5566", "fall", ["#9fe9ff", "#ffffff"]), function (b) {
    [[5, 4], [9, 5], [13, 4], [17, 6], [21, 5], [25, 4], [28, 3]].forEach(function (s) {
      b.ground(s[0], s[0] + 1, s[1]);
      b.coin(s[0], s[1]).coin(s[0] + 1, s[1]).coin(s[0] + 0.5, s[1] + 2);
    });
    b.row(7, 7, 2).row(11, 11, 2).row(15, 15, 2).row(19, 19, 2).row(23, 23, 2);
  });

  room(4, "LE DOJO DES ETOILES", 32, T("#070a1c", "#1d2554", "#a9bbff", "#7c93ff", "mountains", "#141b45", "fall", ["#ffb3d1", "#ffd6e6", "#ffffff"]), function (b) {
    b.plat(4, 6, 3, "~").plat(8, 11, 4, "~").plat(14, 20, 4).plat(23, 25, 4, "~").plat(27, 29, 3, "~");
    b.art(15, 4, ["o.o.o", ".ooo.", "ooooo", ".ooo.", "o.o.o"]);
    b.row(4, 6, 3).row(8, 11, 4).row(23, 25, 4).row(27, 29, 3);
  });

  room(5, "L'ARC-EN-CIEL", 32, T("#151039", "#3b2a7a", "#ffe0b0", "#ffd54a", "aurora", "#ff6a6a,#ffa24a,#ffd54a,#7ee787,#58a6ff,#bc8cff", "drift", ["#ffffff", "#ffd54a"]), function (b) {
    b.ground(13, 18, 3);
    b.ellipse(15.5, 3, 4, 2, 5, 0, 0.5).ellipse(15.5, 3, 6, 3, 7, 0, 0.5).ellipse(15.5, 3, 8, 4, 9, 0, 0.5);
    b.row(7, 9, 2).row(22, 24, 2).coin(13, 3).coin(18, 3);
  });

  room(7, "LA FORGE AUX RESSORTS", 32, T("#260c05", "#6b2a0b", "#ffa45a", "#ff7a2a", "gears", "#8a3a14", "rise", ["#ff9a4a", "#ffd54a", "#ff5a2a"]), function (b) {
    b.pad(7).pad(15).pad(23);
    [7, 15, 23].forEach(function (c) { b.col(c, 5, 8); });
    b.row(9, 13, 8, 1).row(17, 21, 8, 1);
    b.coin(5, 2).coin(11, 2).coin(19, 2);
  });

  room(8, "LE LABYRINTHE EN ZIGZAG", 36, T("#0a1b14", "#17422f", "#8bf0a8", "#3fb950", "pillars", "#143a28", "drift", ["#7ee787", "#ffffff"]), function (b) {
    b.plat(4, 10, 4).plat(12, 18, 6).plat(20, 26, 4).plat(28, 32, 6);
    b.row(4, 10, 4, 2).row(12, 18, 6, 2).row(20, 26, 4, 2).row(28, 32, 6, 2);
    b.row(5, 9, 2, 2).row(21, 25, 2, 2).col(11, 4, 6, 1).col(19, 4, 6, 1).col(27, 4, 6, 1);
  });

  room(9, "LA PYRAMIDE AU TRESOR", 34, T("#2d1e08", "#80531a", "#ffd88a", "#ffd54a", "pillars", "#5a3b0f", "fall", ["#ffd88a", "#ffffff"]), function (b) {
    b.ground(8, 9, 3).ground(10, 11, 4).ground(12, 13, 5).ground(14, 19, 6).ground(20, 21, 5).ground(22, 23, 4).ground(24, 25, 3);
    b.art(15, 6, [".oo.", "oooo", "oooo"]);
    b.row(8, 9, 3).row(10, 11, 4).row(12, 13, 5).row(20, 21, 5).row(22, 23, 4).row(24, 25, 3);
    b.row(14, 14, 6).row(19, 19, 6);
  });

  /* ===== Monde 1 — La Tour du Serpent (Python) ===== */

  room(101, "LE SERPENT D'OR", 36, T("#06201a", "#0d4f3c", "#8affc7", "#3fe0a0", "bamboo", "#0f5a43", "drift", ["#c8ff7a", "#ffffff"]), function (b) {
    b.curve(5, 28, function (c) { return 4 + 1.8 * Math.sin((c - 5) / 3.2); }, 1);
    b.art(29, 3, ["ooo", "o.o", "ooo"]); // la tête
  });

  room(103, "LA CASCADE DE JADE", 34, T("#06232b", "#0c5a63", "#9ff0e8", "#2bd4c0", "waves", "#0f6e78", "fall", ["#bff7ff", "#ffffff"]), function (b) {
    b.ground(7, 8, 3).ground(9, 10, 4).ground(11, 12, 5).ground(21, 22, 5).ground(23, 24, 4).ground(25, 26, 3);
    [14, 16, 18].forEach(function (c) { b.col(c, 3, 6, 1); });
    b.row(9, 12, 5).row(21, 24, 5).row(11, 12, 7).row(21, 22, 7);
  });

  room(104, "LES TROIS LANTERNES", 34, T("#2a0c0c", "#702020", "#ffd2a0", "#ff6a3a", "lanterns", "#ffb347", "rise", ["#ffb347", "#ffe08a"]), function (b) {
    [8, 16, 24].forEach(function (cx) { b.ground(cx - 1, cx + 1, 4); b.ellipse(cx, 6.5, 2.2, 2, 8, 0.0625, 1); });
    b.row(5, 6, 2).row(12, 13, 2).row(19, 20, 2).row(27, 28, 2);
  });

  room(105, "LE TOURBILLON", 32, T("#0d0a2a", "#2a1f6a", "#b9a8ff", "#8f7cff", "crystals", "#5a49b8", "drift", ["#d8c8ff", "#ffffff"]), function (b) {
    b.ground(13, 18, 4);
    for (var j = 0; j < 30; j++) { var a = j * 0.62, r = 0.6 + j * 0.11; b.coin(15.5 + r * 2 * Math.cos(a), 5.3 + r * 0.75 * Math.sin(a)); }
  });

  room(107, "L'ILE FLOTTANTE", 36, T("#102a4a", "#2f6fa8", "#c8f0ff", "#7ec8ff", "clouds", "#a8d4f0", "drift", ["#ffffff", "#ffe08a"]), function (b) {
    b.plat(4, 6, 4).plat(9, 11, 5).plat(14, 16, 6).plat(19, 21, 5).plat(24, 26, 4).plat(29, 31, 5);
    [[4, 6, 4], [9, 11, 5], [14, 16, 6], [19, 21, 5], [24, 26, 4], [29, 31, 5]].forEach(function (p) { b.row(p[0], p[1], p[2]); });
    b.coin(7.5, 5).coin(12.5, 6).coin(17.5, 6).coin(22.5, 5).coin(27.5, 5).row(6, 30, 2, 3);
  });

  room(108, "LE PONT DU TAMBOUR", 34, T("#1a0f06", "#573314", "#e9b97a", "#e3a14a", "lanterns", "#d98c3a", "fall", ["#ffd9a0", "#ffffff"]), function (b) {
    b.ground(4, 5, 3).ground(6, 7, 4).ground(26, 27, 4).ground(28, 29, 3);
    b.plat(8, 25, 5, "~");
    b.row(8, 25, 5).row(4, 7, 4).row(26, 29, 4).row(10, 22, 2, 4);
  });

  room(109, "LE CERCLE DE JADE", 34, T("#04201a", "#0a5a43", "#7affc9", "#3fe0a0", "rings", "#1c8a67", "rise", ["#7affc9", "#ffffff"]), function (b) {
    b.pad(17);
    b.ellipse(17, 5.4, 4.4, 3, 20, 0, 1);
    b.row(9, 11, 2).row(23, 25, 2).coin(17, 7).coin(15, 6).coin(19, 6);
  });

  /* ===== Monde 2 — La Galaxie JavaScript (gravité lunaire : on monte deux fois plus haut) ===== */

  room(201, "LA GRANDE OURSE", 36, T("#03041a", "#161a52", "#c8d4ff", "#8fa4ff", "planet", "#4a5ad0", "twinkle", ["#ffffff", "#ffe08a", "#9fc4ff"]), function (b) {
    var pts = [[5, 4], [9, 5], [13, 6], [17, 7], [21, 6], [26, 5], [31, 7]];
    pts.forEach(function (p, i) {
      b.coin(p[0], p[1]).coin(p[0] + 1, p[1]).coin(p[0], p[1] + 1).coin(p[0] + 1, p[1] + 1);
      if (i) { var q = pts[i - 1]; b.coin((p[0] + q[0]) / 2 + 0.5, (p[1] + q[1]) / 2 + 0.5); }
    });
  });

  room(203, "SATURNE ET SES ANNEAUX", 36, T("#07041f", "#2a1560", "#d8c0ff", "#d9a0ff", "planet", "#9a6fe0", "twinkle", ["#ffffff", "#ffd9a0"]), function (b) {
    for (var c = 12; c <= 24; c++) b.ground(c, c, 2 + Math.round(Math.sqrt(Math.max(0, 36 - (c - 18) * (c - 18)))));
    b.ellipse(18, 6.2, 11, 2.2, 26, 0, 1);
  });

  room(204, "LA FUSEE", 32, T("#02031a", "#0c1f5a", "#b8d4ff", "#58a6ff", "planet", "#3a6ae0", "rise", ["#ff9a4a", "#ffd54a", "#ffffff"]), function (b) {
    b.art(13, 2, ["..o..", ".ooo.", ".o.o.", ".o.o.", "ooooo", "o.J.o", "o...o"]);
    b.row(8, 12, 2, 2).row(20, 24, 2, 2).row(4, 6, 2).row(26, 28, 2);
  });

  room(205, "LA GALAXIE EN SPIRALE", 36, T("#0a0220", "#2b0f5a", "#e0b8ff", "#c07aff", "crystals", "#6a2fb0", "twinkle", ["#ffffff", "#ffb3f0", "#9fc4ff"]), function (b) {
    for (var arm = 0; arm < 2; arm++) for (var j = 0; j < 16; j++) {
      var a = j * 0.5 + arm * Math.PI, r = 0.9 + j * 0.28;
      b.coin(18 + r * 2 * Math.cos(a), 5 + r * 0.6 * Math.sin(a));
    }
  });

  room(207, "LES BONDS LUNAIRES", 38, T("#05061c", "#1a2058", "#d8dcff", "#9fa8ff", "planet", "#5a68d0", "twinkle", ["#ffffff", "#c8d4ff"]), function (b) {
    [5, 12, 19, 26, 33].forEach(function (c) { b.ground(c, c + 1, 3); });
    [5, 12, 19, 26].forEach(function (c) { for (var j = 0; j < 7; j++) b.coin(c + 2 + j, 3 + 4 * Math.sin(Math.PI * (j + 0.5) / 7)); });
  });

  room(208, "LA SOUCOUPE", 34, T("#04051f", "#133a4a", "#b8ffe8", "#3fe0b8", "planet", "#2fb090", "rise", ["#7affc9", "#ffffff"]), function (b) {
    b.pad(17);
    b.art(12, 5, ["...ooooo...", "..o.....o..", "ooooooooooo", ".o.o.o.o.o."]);
    b.col(16, 3, 4, 1).col(18, 3, 4, 1).row(6, 10, 2, 2).row(24, 28, 2, 2);
  });

  room(209, "LE FEU D'ARTIFICE", 38, T("#02020f", "#1a0f3a", "#ffd9f0", "#ff7ab8", "stars", "#ffffff", "rise", ["#ff6a6a", "#ffd54a", "#7ee787", "#58a6ff", "#bc8cff"]), function (b) {
    [[7, 5], [19, 6], [31, 5]].forEach(function (p) {
      b.coin(p[0], p[1]);
      for (var k2 = 0; k2 < 8; k2++) { var a = k2 * Math.PI / 4; b.coin(p[0] + 2.6 * Math.cos(a) * 1.3, p[1] + 2.2 * Math.sin(a)); }
    });
    b.coin(13, 3).coin(25, 3);
  });

  /* ----- API ----- */

  function key(world, level) { return (world | 0) * 100 + (level | 0); }
  function has(k) { return !!ROOMS[k]; }

  /** Construit la salle `k` pour une grille de R rangées : { name, W, rows (haut -> bas), theme } ou null si la clé est inconnue. */
  function build(k, R) {
    var d = ROOMS[k];
    if (!d) return null;
    var b = Builder(d.W, R);
    d.fn(b);
    return { name: d.name, W: d.W, rows: b.finish(), theme: d.theme };
  }

  window.OctoRooms = { COINS: COINS, keys: function () { return Object.keys(ROOMS).map(Number); }, key: key, has: has, build: build };
})();
