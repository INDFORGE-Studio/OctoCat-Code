/* OctoCat-Code — Les décors des mondes 2 et 3 (pixel art procédural, 0 octet de fichier).
 *
 * Un langage = un monde :
 *   monde 0  GitHubia (pseudo-code)      décor de sprites.js, inchangé
 *   monde 1  La Tour du Serpent (Python) crépuscule de jade : jungle, îles flottantes, temple, lune ; pierre moussue
 *   monde 2  La Galaxie JavaScript       l'espace : étoiles, nébuleuses, planète à anneaux, station ; plaques métalliques néon
 *
 * Chaque variante porte le nom du sprite d'origine suivi de « -w1 » ou « -w2 » (« sky-w1 », « grass0-w2 »…). Le moteur (engine.js) enveloppe
 * k.sprite : selon le monde en cours, « sky » devient « sky-w1 » à la création de l'objet. Ainsi l'accueil, les énigmes et les trajets changent
 * d'univers sans qu'aucune scène ne soit réécrite. Les sprites propres à un mode de jeu (tour, espace, serpent) sont dans sprites-space.js.
 */
(function () {
  "use strict";

  var S = window.OctoSprites, Buf = S.Buf, single = S.single, sheet = S.sheet, seeded = S.seeded;
  var BD = S.builders, RB = S.runBuilders, BAYER = BD.BAYER, OUT = "#120a20";

  /* ---------- couleurs ---------- */
  function h2r(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function r2h(r, g, b) {
    function c(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }
    return "#" + c(r) + c(g) + c(b);
  }
  function mix(a, b, t) { var p = h2r(a), q = h2r(b); return r2h(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    if (!s) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  /** Copie d'un tampon dont chaque couleur passe par fn (les couleurs inhabituelles sont gardées telles quelles). */
  function recolor(buf, fn) {
    var o = new Buf(buf.w, buf.h), i, c;
    for (i = 0; i < buf.d.length; i++) { c = buf.d[i]; o.d[i] = c ? (c.length === 7 ? fn(c) : c) : null; }
    return o;
  }
  /** Change la teinte (degrés), la saturation et la clarté d'un dessin : même sprite, autre ambiance. */
  function shift(buf, deg, sat, lit) {
    return recolor(buf, function (c) {
      var p = h2r(c), h = rgbToHsl(p[0], p[1], p[2]), rgb = hslToRgb((h[0] + deg / 360 + 1) % 1, Math.min(1, h[1] * (sat == null ? 1 : sat)), Math.min(1, h[2] * (lit == null ? 1 : lit)));
      return r2h(rgb[0], rgb[1], rgb[2]);
    });
  }

  /** Dégradé vertical tramé (comme le ciel de GitHubia) : stops du haut vers le bas, `span` = hauteur du dégradé en pixels. */
  function fillGradient(b, stops, span) {
    var last = stops.length - 1, x, y;
    for (y = 0; y < b.h; y++) {
      var f = Math.min(1, y / span) * last, lo = Math.min(last - 1, Math.floor(f)), fr = f - lo;
      for (x = 0; x < b.w; x++) b.set(x, y, stops[lo + ((BAYER[y & 3][x & 3] + 0.5) / 16 < fr ? 1 : 0)]);
    }
  }
  /** Tache douce tramée (nébuleuse, brume, halo) : plus dense au centre. */
  function blob(b, cx, cy, rx, ry, col, strength) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
      if (d <= 1 && b.inside(x, y) && (BAYER[y & 3][x & 3] + 0.5) / 16 < (1 - d) * strength) b.set(x, y, col);
    }
  }
  function mirror(b) { var m = new Buf(b.w, b.h); for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) m.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x]; return m; }

  /* ====================================================================
   * Sprites communs aux modes de jeu (une variante par monde quand il en faut)
   * ================================================================== */

  /** Ressort : le joueur repart très haut. 0 = ressort doré, 1 = champignon rebondissant, 2 = propulseur néon. */
  function padBuf(kind) {
    var b = new Buf(16, 10), i;
    if (kind === 1) {
      b.rect(6, 5, 4, 5, "#f0e6d2"); b.rect(6, 5, 1, 5, "#ffffff");
      b.ellipse(8, 4, 7.4, 3.9, function (nx, ny) { return nx * 0.4 + ny * 0.8 < -0.2 ? "#ff8f98" : "#e8505a"; });
      b.rect(0, 5, 16, 1, null);
      [[4, 3], [9, 2], [12, 4], [7, 4]].forEach(function (q) { b.set(q[0], q[1], "#ffffff"); });
      return b.outline("#4a1a2a");
    }
    if (kind === 2) {
      b.rect(1, 6, 14, 3, "#39406a"); b.rect(1, 6, 14, 1, "#4be3ff"); b.rect(3, 9, 10, 1, "#1b1d3a");
      for (i = 0; i < 3; i++) { b.set(4 + i * 4, 4, "#7ae7ff"); b.set(3 + i * 4, 5, "#7ae7ff"); b.set(5 + i * 4, 5, "#7ae7ff"); }
      return b.outline(OUT);
    }
    b.rect(1, 1, 14, 3, "#e3b341"); b.rect(1, 1, 14, 1, "#fff4c2");
    for (i = 0; i < 4; i++) { b.line(4 + i * 2, 4, 5 + i * 2, 6, "#aab4c5"); b.line(5 + i * 2, 6, 4 + i * 2 + 2, 8, "#8b949e"); }
    b.rect(2, 8, 12, 2, "#6e7681");
    return b.outline(OUT);
  }

  /** Plateforme qui s'effrite : un bloc fissuré. */
  function crumbBuf(p) {
    var b = new Buf(16, 16);
    b.rect(0, 0, 16, 16, p.base); b.rect(0, 0, 16, 3, p.top); b.rect(0, 0, 16, 1, p.hi); b.rect(0, 3, 16, 1, p.crack);
    b.line(4, 3, 7, 9, p.crack); b.line(7, 9, 5, 15, p.crack); b.line(11, 3, 9, 8, p.crack); b.line(9, 8, 13, 15, p.crack); b.line(7, 9, 9, 8, p.crack);
    [[0, 15], [15, 15], [0, 14], [15, 14], [1, 15], [14, 15]].forEach(function (q) { b.set(q[0], q[1], null); }); // coins rongés
    return b;
  }

  /** Portail doré de la salle secrète (16×24, 4 images qui tournent). */
  function warpBuf(ph) {
    var b = new Buf(16, 24);
    b.ellipse(8, 12, 7, 11, function (nx, ny) {
      var a = Math.atan2(ny, nx) + ph, r = Math.sqrt(nx * nx + ny * ny), v = Math.sin(a * 3 + r * 7);
      return r > 0.82 ? "#ffd54a" : v > 0.55 ? "#fff4c2" : v > -0.1 ? "#ffb02e" : "#a35a00";
    });
    b.set(8, 12, "#ffffff"); b.set(7, 11, "#ffffff");
    return b.outline("#3a2200");
  }

  /** Lune (40×40) pour le ciel des tours. */
  function moonBuf() {
    var b = new Buf(40, 40);
    b.ellipse(20, 20, 19.5, 19.5, function (nx, ny) { return nx * 0.5 + ny * 0.7 > 0.35 ? "#d8cfb0" : nx * 0.5 + ny * 0.7 > -0.1 ? "#f2e9c6" : "#fff8dc"; });
    [[13, 12, 4], [26, 22, 5], [16, 28, 3], [28, 11, 2.4]].forEach(function (q) { b.ellipse(q[0], q[1], q[2], q[2] * 0.8, "#cfc59f"); b.ellipse(q[0] - 0.6, q[1] - 0.6, q[2] * 0.6, q[2] * 0.5, "#e6dcb8"); });
    return b;
  }

  /** Brique de fond de tour (16×16, en gris : le thème la teinte). */
  function wallBuf(v) {
    var b = new Buf(16, 16), rnd = seeded(500 + v * 29), x, y;
    b.rect(0, 0, 16, 16, "#c8c8c8");
    for (y = 0; y < 16; y += 4) {
      b.rect(0, y + 3, 16, 1, "#9a9a9a");
      var off = (y / 4) % 2 ? 4 : 0;
      for (x = off; x < 16; x += 8) b.rect(x, y, 1, 4, "#9a9a9a");
      for (x = 0; x < 16; x += 4) if (rnd() < 0.35) b.rect(x + 1, y, 3, 3, rnd() < 0.5 ? "#dcdcdc" : "#b4b4b4");
    }
    if (v) { b.line(3, 2, 6, 7, "#8a8a8a"); b.line(6, 7, 5, 12, "#8a8a8a"); }
    return b;
  }
  function windowBuf() { // fenêtre en arc, éclairée de l'intérieur
    var b = new Buf(12, 16);
    b.ellipse(6, 6, 5, 5, "#ffd27a"); b.rect(1, 6, 10, 10, "#ffd27a");
    b.rect(5, 2, 2, 14, "#5a4a3a"); b.rect(1, 8, 10, 1, "#5a4a3a");
    b.set(3, 4, "#fff4c2"); b.set(8, 4, "#fff4c2");
    return b.outline("#2a2440");
  }
  function vineBuf() { // liane qui pend
    var b = new Buf(10, 24), rnd = seeded(9), y;
    for (y = 0; y < 24; y++) b.set(4 + Math.round(Math.sin(y * 0.5) * 1.5), y, "#2f8a54");
    for (y = 3; y < 24; y += 5) { var s2 = rnd() < 0.5 ? -1 : 1; b.ellipse(5 + s2 * 3, y, 2.6, 1.6, "#52b878"); b.set(5 + s2 * 3, y, "#9af0b0"); }
    return b.outline("#0f3a24");
  }
  function lanternBuf() {
    var b = new Buf(8, 20);
    b.rect(3, 0, 1, 8, "#6a6a8a"); b.rect(4, 0, 1, 8, "#4a4a6a");
    b.rect(1, 8, 6, 2, "#8a6a2a"); b.rect(1, 10, 6, 7, "#ffd27a"); b.rect(2, 11, 2, 4, "#fff4c2"); b.rect(1, 17, 6, 2, "#8a6a2a");
    return b.outline("#2a1a0a");
  }

  /* ====================================================================
   * Monde 1 : La Tour du Serpent (Python) — crépuscule de jade
   * ================================================================== */

  function skyJade() {
    var W = 300, H = 125, b = new Buf(W, H), rnd = seeded(41), i, x, y;
    fillGradient(b, ["#14143a", "#1e1a52", "#2f2470", "#53307f", "#8a3c7c", "#c75a68", "#ee8a5a", "#f8c27a"], 92);
    for (i = 0; i < 100; i++) { x = Math.floor(rnd() * W); y = Math.floor(rnd() * rnd() * 70); b.set(x, y, rnd() < 0.2 ? "#fff0b0" : "#ffffff"); if (rnd() < 0.08) { b.set(x + 1, y, "#cfd8ff"); b.set(x, y + 1, "#cfd8ff"); } }
    blob(b, 236, 32, 26, 22, "#8a7ad8", 0.5); // halo de la lune
    b.ellipse(236, 32, 13, 13, function (nx, ny) { return nx * 0.5 + ny * 0.7 > 0.35 ? "#d9cfae" : nx * 0.5 + ny * 0.7 > -0.1 ? "#f3ebc8" : "#fff8de"; });
    [[231, 27, 3], [241, 36, 3.4], [237, 25, 2]].forEach(function (q) { b.ellipse(q[0], q[1], q[2], q[2] * 0.8, "#cfc59f"); });
    function island(cx, cy, w, fall) { // île flottante lointaine : dessus plat, pointe de roche dessous, lianes et petit arbre
      b.poly([[cx - w / 2, cy], [cx + w / 2, cy], [cx + w * 0.22, cy + w * 0.5], [cx, cy + w * 0.78], [cx - w * 0.28, cy + w * 0.42]], "#1f2860");
      b.rect(cx - w / 2, cy - 1, w, 2, "#3a8a6a"); b.rect(cx - w / 2 + 2, cy - 2, w - 4, 1, "#52b878");
      b.poly([[cx - 3, cy - 2], [cx, cy - 9], [cx + 3, cy - 2]], "#2f7a58");
      for (var q = 0; q < 3; q++) b.line(cx - w / 3 + q * w / 3, cy + 2, cx - w / 3 + q * w / 3, cy + 6 + q * 2, "#3a8a6a");
      if (fall) b.line(cx + 2, cy + 3, cx + 2, cy + fall, "#9fd8ff");
    }
    island(48, 62, 40, 36); island(118, 76, 24, 0); island(268, 70, 34, 30); island(196, 86, 18, 0);
    return b;
  }

  function landJade() {
    var b = new Buf(300, 105), rnd = seeded(61), x, y, i;
    // mont lointains (bleu nuit) et brume
    function ridge(base, col, hmin, hmax, step) {
      for (x = 0; x < 300; x += step) { var h = hmin + rnd() * (hmax - hmin); b.poly([[x - step, base], [x, base - h], [x + step, base]], col); }
      b.rect(0, base - 1, 300, 106 - base, col);
    }
    ridge(80, "#2b3768", 14, 30, 14); ridge(86, "#243060", 8, 20, 10);
    // arbres-tours géants : tronc, couronne, fenêtres dorées
    [[34, 0.95], [150, 1.1], [262, 1.0]].forEach(function (t) {
      var tx = t[0], th = Math.floor(70 * t[1]);
      b.rect(tx - 5, 105 - th, 10, th, "#1b3a4a"); b.rect(tx - 5, 105 - th, 3, th, "#25506a"); b.rect(tx + 3, 105 - th, 2, th, "#12293a");
      [[0, 0, 22, 9], [-14, 6, 14, 7], [14, 7, 14, 7], [-6, -6, 12, 6], [8, -5, 11, 6]].forEach(function (c2) {
        b.ellipse(tx + c2[0], 105 - th + c2[1], c2[2], c2[3], function (nx, ny) { return nx * 0.4 + ny * 0.9 < -0.3 ? "#2f8a66" : nx * 0.4 + ny * 0.9 < 0.3 ? "#1f6a52" : "#154a3e"; });
      });
      for (i = 0; i < 4; i++) { var wy = 105 - th + 18 + i * 12; b.rect(tx - 1, wy, 2, 3, "#ffd27a"); }
      for (i = 0; i < 5; i++) b.line(tx - 18 + i * 9, 105 - th + 8, tx - 18 + i * 9, 105 - th + 14 + (i % 3) * 5, "#2f8a66"); // lianes
    });
    // temple à gradins (le Serpent y dort) : 4 marches, porte dorée, tête de serpent de pierre
    var cx = 205;
    [[cx - 36, 94, 72, 11], [cx - 28, 83, 56, 11], [cx - 20, 72, 40, 11], [cx - 12, 61, 24, 11]].forEach(function (t, ti) {
      b.rect(t[0], t[1], t[2], t[3], ti % 2 ? "#8c90b4" : "#9fa4c8"); b.rect(t[0], t[1], t[2], 1, "#d6dafc"); b.rect(t[0] + t[2] - 5, t[1], 5, t[3], "#6a6e92");
      for (var gx = t[0] + 3; gx < t[0] + t[2] - 6; gx += 6) b.rect(gx, t[1] + 4, 2, 5, "#7b80a6");
    });
    b.rect(cx - 5, 66, 10, 7, "#ffd27a"); b.rect(cx - 3, 67, 6, 6, "#fff4c2"); // porte lumineuse
    b.poly([[cx - 9, 61], [cx - 4, 51], [cx + 4, 51], [cx + 9, 61]], "#7d86b0"); // tête de serpent
    b.set(cx - 2, 55, "#7ee787"); b.set(cx + 2, 55, "#7ee787"); b.rect(cx - 1, 58, 2, 3, "#da3633");
    // chutes d'eau et brume
    [[96, 68, 30], [286, 60, 36]].forEach(function (f) { b.rect(f[0], f[1], 2, f[2], "#9fd8ff"); b.rect(f[0] + 1, f[1], 1, f[2], "#e0f4ff"); });
    for (y = 70; y < 90; y++) for (x = 0; x < 300; x++) if ((BAYER[y & 3][x & 3] + 0.5) / 16 < 0.16 * (1 - Math.abs(y - 80) / 10)) b.set(x, y, "#cfe8e8");
    // canopée du premier plan
    for (x = -6; x < 306; x += 4) { var top = 84 + Math.floor(2.5 * Math.sin(x * 0.13) + rnd() * 3); b.ellipse(x, top + 7, 6 + rnd() * 3, 6 + rnd() * 2, function (nx, ny) { return nx * 0.4 + ny * 0.9 < -0.3 ? "#3aa070" : nx * 0.4 + ny * 0.9 < 0.4 ? "#1f7a52" : "#145a3c"; }); }
    for (y = 90; y < 105; y++) for (x = 0; x < 300; x++) if (!b.get(x, y)) b.set(x, y, (x + y) % 5 === 0 ? "#0f4a32" : "#145a3c");
    for (i = 0; i < 30; i++) { b.set(Math.floor(rnd() * 300), 86 + Math.floor(rnd() * 14), "#ffe9a0"); } // lucioles
    return b;
  }

  function cloudPal(w, h, seed, pal) { // nuage cerné (même forme que GitHubia), autre palette
    var b = new Buf(w, h), rnd = seeded(seed * 97 + 13), baseY = h - 4, n = Math.max(4, Math.floor(w / 9)), i;
    for (i = 0; i < n; i++) {
      var t = (i + 0.5) / n, cx = 6 + t * (w - 12), tall = Math.sin(Math.PI * t) * 0.8 + 0.25 + rnd() * 0.25, ry = (h - 8) * 0.5 * tall, rx = w / n * (0.85 + rnd() * 0.5);
      b.ellipse(cx, baseY - ry, rx, ry, function (nx, ny, x) { if (ny > 0.35 && x > w * 0.55) return pal[3]; return ny > 0.5 ? pal[2] : ny > 0.05 ? pal[1] : pal[0]; });
    }
    for (var yy = baseY; yy < h; yy++) for (var xx = 0; xx < w; xx++) b.set(xx, yy, null);
    return b.outline(pal[4]);
  }

  function tilesJade() {
    var out = {}, rnd = seeded(71), v, i, g, d;
    for (v = 0; v < 3; v++) {
      g = new Buf(16, 16); d = new Buf(16, 16);
      g.rect(0, 0, 16, 16, "#5c6080");
      for (i = 4; i < 16; i += 4) { g.rect(0, i, 16, 1, "#3e4160"); d.rect(0, i - 4, 16, 1, "#2f3250"); }
      d.rect(0, 0, 16, 16, "#4a4e6c");
      for (i = 0; i < 4; i++) { d.rect(0, i * 4 + 3, 16, 1, "#2f3250"); var off = i % 2 ? 4 : 10; d.rect((off + v * 3) % 16, i * 4, 1, 4, "#2f3250"); d.rect(1 + Math.floor(rnd() * 12), i * 4 + 1, 3, 2, "#5c6080"); }
      for (i = 5; i < 16; i += 4) g.rect((i * 3 + v * 5) % 16, i, 1, 3, "#3e4160");
      g.rect(0, 0, 16, 4, "#3f9a58"); g.rect(0, 0, 16, 2, "#5fcf7a"); g.rect(0, 0, 16, 1, "#9af0a8"); g.rect(0, 4, 16, 1, "#2a6a40");
      for (i = 0; i < 16; i++) if (rnd() < 0.5) { g.set(i, 4, "#3f9a58"); if (rnd() < 0.4) g.set(i, 5, "#2f8a4a"); }
      for (i = 0; i < 3; i++) g.set(1 + Math.floor(rnd() * 14), 2, "#ffe9a0"); // petites fleurs
      out["grass" + v] = single(g); out["dirt" + v] = single(d);
    }
    return out;
  }

  function treeJade() { // grand arbre à feuilles larges, lianes pendantes
    var b = new Buf(36, 44), rnd = seeded(5), x, y, n;
    b.rect(15, 24, 6, 19, "#6b4a32"); b.rect(15, 24, 2, 19, "#8a6444"); b.rect(19, 24, 2, 19, "#4a3222");
    b.poly([[15, 40], [11, 43.5], [15, 43.5]], "#6b4a32"); b.poly([[21, 40], [25, 43.5], [21, 43.5]], "#4a3222");
    [[9, 20, 8, 7], [27, 20, 8, 7], [18, 21, 13, 8], [18, 12, 12, 10], [11, 13, 7, 6], [25, 14, 7, 6]].forEach(function (p) {
      b.ellipse(p[0], p[1], p[2], p[3], function (nx, ny) { var s = nx * 0.45 + ny * 0.85; return s < -0.45 ? "#7ee787" : s < 0.1 ? "#3fb970" : s < 0.55 ? "#2a9a5a" : "#1f7a48"; });
    });
    for (n = 0; n < 36; n++) { x = 3 + Math.floor(rnd() * 30); y = 3 + Math.floor(rnd() * 26); var c = b.get(x, y); if (c === "#3fb970" || c === "#7ee787") b.set(x, y, rnd() < 0.6 ? "#b8f5c0" : "#e0ffe6"); }
    for (n = 0; n < 4; n++) { var vx = 7 + n * 7; for (y = 24; y < 34 + (n % 2) * 4; y++) b.set(vx, y, "#2a9a5a"); }
    return b.outline("#0f3a24");
  }
  function palmJade() { // plante géante (feuilles en éventail, fruits dorés)
    var b = new Buf(46, 54), s, cx = 23, cy = 17;
    b.line(22, 53, 22, cy, "#5a4a32"); b.line(23, 53, 23, cy, "#7a6444"); b.line(24, 53, 24, cy, "#4a3a22");
    for (s = 30; s < 53; s += 5) b.line(21, s, 25, s, "#3a2a18");
    [-178, -154, -128, -100, -72, -46, -22, 2].forEach(function (deg, idx) {
      var a = deg * Math.PI / 180, L = 19 + (idx % 3) * 2, droop = 6 + (idx % 2) * 5, prev = null;
      for (s = 0; s <= 16; s++) {
        var t = s / 16, x = cx + Math.cos(a) * L * t, y = cy + Math.sin(a) * L * t + droop * t * t;
        b.set(x, y, "#2f9a58");
        if (prev && s > 1) {
          var nx = -(y - prev[1]), ny = x - prev[0], m = Math.sqrt(nx * nx + ny * ny) || 1, ll = 5.4 * (1 - t * 0.5);
          b.line(x, y, x + nx / m * ll, y + ny / m * ll + 1.5, s % 2 ? "#2a8a4a" : "#3fb970");
          b.line(x, y, x - nx / m * ll, y - ny / m * ll + 1.5, s % 2 ? "#1f6a3a" : "#2a8a4a");
        }
        prev = [x, y];
      }
    });
    [[20, 20], [26, 21], [23, 23]].forEach(function (q) { b.ellipse(q[0], q[1], 2, 2.6, "#ffd54a"); b.set(q[0] - 1, q[1] - 1, "#fff4c2"); });
    return b.outline("#0f3a24");
  }

  function leaf(b, cx, cy, rx, ry, rot, cols) { // grande feuille : ellipse inclinée, nervure et petites déchirures
    var n = 14, pts = [], i, a;
    for (i = 0; i < n; i++) { a = i / n * 6.2832; var rr = 1 + (i % 3 === 0 ? -0.18 : 0); pts.push([cx + Math.cos(a) * rx * rr * Math.cos(rot) - Math.sin(a) * ry * Math.sin(rot) * rr, cy + Math.cos(a) * rx * rr * Math.sin(rot) + Math.sin(a) * ry * Math.cos(rot) * rr]); }
    b.poly(pts, function (x, y) { return (x * 0.5 + y) % 7 < 1 ? cols[2] : ((x + y * 2) % 9 < 4 ? cols[0] : cols[1]); });
    b.line(cx - Math.cos(rot) * rx * 0.9, cy - Math.sin(rot) * rx * 0.9, cx + Math.cos(rot) * rx * 0.9, cy + Math.sin(rot) * rx * 0.9, cols[2]);
  }
  function leavesCornerJade() {
    var b = new Buf(64, 56), C = ["#165a3a", "#0f4a30", "#27995a"];
    [[14, 44, 20, 8, -0.9], [8, 52, 16, 7, -0.2], [26, 46, 22, 9, -0.5], [4, 34, 14, 6, -1.3], [36, 52, 16, 6, -0.15]].forEach(function (l) { leaf(b, l[0], l[1], l[2], l[3], l[4], C); });
    return b.outline("#06241a");
  }
  function leavesBandJade() {
    var b = new Buf(300, 16), rnd = seeded(33), C = ["#165a3a", "#0f4a30", "#27995a"], x;
    for (x = 0; x < 300; x += 11) leaf(b, x + 4, 14, 8 + rnd() * 6, 3 + rnd() * 2, (rnd() - 0.5) * 1.2 - 1.2, C);
    b.rect(0, 12, 300, 4, "#0a2a1c");
    return b.outline("#06241a");
  }

  /** Portail (32×40, 5 images) peint avec une palette : pierre, tourbillon, runes, clé de voûte. */
  function portalPal(mode, phase, pal) {
    var W = 32, H = 40, cx = 16, cy = 16, b = new Buf(W, H), x, y;
    var runeOn = mode === "closed" ? pal.runeClosed : pal.runeOpen;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var dx = x - cx + 0.5, dy = y - cy + 0.5, d2 = dx * dx + dy * dy;
      var outer = y < cy ? d2 < 14.5 * 14.5 : x >= 1 && x < 31, inner = y < cy ? d2 < 10 * 10 : x >= 6 && x < 26;
      if (!outer) continue;
      if (!inner) {
        var row = y >> 2, mortar = ((x + row * 3) % 8 === 0) || (y % 4 === 0), col = mortar ? pal.stone[0] : ((x + y) % 5 === 0 ? pal.stone[1] : pal.stone[2]);
        if (x < 9 && !mortar) col = pal.stone[3];
        b.set(x, y, col); continue;
      }
      if (mode === "closed") b.set(x, y, (x + 2) % 5 === 0 ? pal.dark[0] : (y % 4 === 0 ? pal.dark[1] : pal.dark[2]));
      else {
        var r = Math.sqrt(d2), a = Math.atan2(dy, dx), v = Math.sin(r * 0.75 - phase * 2) + Math.sin(a * 3 + phase), idx = Math.floor(((v + 2) / 4) * pal.swirl.length) % pal.swirl.length;
        b.set(x, y, mode === "opening" ? (idx % 2 ? pal.dark[1] : pal.swirl[0]) : pal.swirl[idx]);
      }
    }
    b.rect(0, 37, 32, 3, pal.stone[2]); b.rect(0, 37, 32, 1, pal.stone[3]);
    b.rect(2, 34, 28, 3, pal.stone[3]); b.rect(2, 34, 28, 1, pal.stone[1]);
    [[-60, 12.2], [-35, 12.2], [-12, 12.2], [12, 12.2], [35, 12.2], [60, 12.2]].forEach(function (p) { var ang = (p[0] - 90) * Math.PI / 180; b.set(cx + Math.cos(ang) * p[1], cy + Math.sin(ang) * p[1], runeOn); });
    b.rect(3, 22, 1, 2, runeOn); b.rect(28, 22, 1, 2, runeOn); b.rect(3, 28, 1, 2, runeOn); b.rect(28, 28, 1, 2, runeOn);
    b.poly([[16, 0.5], [18.5, 3], [16, 5.5], [13.5, 3]], mode === "closed" ? pal.keyClosed : pal.keyOpen); b.set(15, 2, "#f0f6fc");
    if (mode === "closed") { b.rect(12, 22, 8, 7, pal.lock); b.rect(12, 27, 8, 2, pal.lock2); b.rect(15, 24, 2, 3, "#010409"); b.rect(13, 17, 6, 1, "#8b949e"); b.rect(13, 18, 1, 4, "#8b949e"); b.rect(18, 18, 1, 4, "#8b949e"); }
    return b.outline("#010409");
  }
  function portalSheet(pal) {
    return sheet([portalPal("closed", 0, pal), portalPal("opening", 0.5, pal), portalPal("open", 0, pal), portalPal("open", 1.6, pal), portalPal("open", 3.2, pal)], 32, 40);
  }
  var PORTAL_ANIMS = { sliceX: 5, anims: { closed: { from: 0, to: 0 }, opening: { from: 1, to: 1 }, open: { from: 2, to: 4, loop: true, speed: 6 } } };

  function terminalPal(pal) { // borne d'accès : même silhouette que GitHubia, autre matière
    var b = new Buf(24, 32);
    b.rect(11, 1, 2, 5, pal.mast); b.rect(10, 0, 4, 2, pal.beacon);
    b.rect(2, 6, 20, 22, pal.body); b.rect(2, 6, 20, 2, pal.hi); b.rect(2, 26, 20, 2, pal.low);
    b.rect(4, 9, 16, 12, pal.screen);
    b.rect(6, 11, 9, 1, pal.text); b.rect(6, 14, 12, 1, pal.text); b.rect(6, 17, 5, 1, pal.text); b.rect(13, 16, 3, 3, pal.cursor);
    [5, 9, 13, 17].forEach(function (x2) { b.rect(x2, 23, 2, 2, pal.button); });
    b.rect(6, 28, 12, 3, pal.foot);
    return b.outline(OUT);
  }

  /** Les petits décors : même dessin que GitHubia, teinte changée. */
  function propsShifted(deg, sat, lit) {
    return {
      bush: shift(BD.bushBuf(), deg, sat, lit), tuft0: shift(BD.tuftBuf(0), deg, sat, lit), tuft1: shift(BD.tuftBuf(1), deg * 0.5, sat, lit),
      mushroom: shift(BD.mushroomBuf(), deg * 0.4, sat, lit), flower0: shift(BD.flowerBuf("#f778ba"), deg * 0.3, sat, lit), flower1: shift(BD.flowerBuf("#f0f4ff"), 0, 1, 1),
      rock: shift(BD.rockBuf(), deg * 0.5, sat * 0.6, lit), sign: shift(BD.signBuf(), deg * 0.15, sat, lit), torch: shift(BD.torchBuf(), deg * 0.3, sat, lit)
    };
  }
  function sheetOf(frames, w, h) { return sheet(frames, w, h); }

  var GLITCH_ANIMS = { sliceX: 4, anims: { idle: { from: 0, to: 1, loop: true, speed: 5 }, attack: { from: 2, to: 2 }, hurt: { from: 3, to: 3 } } };
  function glitchShifted(deg, sat, lit) {
    return sheet([BD.glitchBuf("idle", 7), BD.glitchBuf("idle", 31), BD.glitchBuf("attack", 5), BD.glitchBuf("hurt", 3)].map(function (f) { return shift(f, deg, sat, lit); }), 24, 24);
  }

  /* ====================================================================
   * Monde 2 : La Galaxie JavaScript — l'espace
   * ================================================================== */

  function skySpace() {
    var W = 300, H = 125, b = new Buf(W, H), rnd = seeded(83), i, x, y;
    fillGradient(b, ["#04020d", "#080619", "#0d0a2a", "#150f42", "#1f1660", "#2c1f7a"], 110);
    blob(b, 70, 40, 60, 28, "#4a1f7a", 0.55); blob(b, 230, 80, 70, 24, "#14527a", 0.5); blob(b, 150, 22, 50, 14, "#7a1f6a", 0.4); blob(b, 40, 100, 44, 16, "#1f5a8a", 0.4);
    for (i = 0; i < 170; i++) {
      x = Math.floor(rnd() * W); y = Math.floor(rnd() * H);
      var tone = rnd(); b.set(x, y, tone < 0.6 ? "#ffffff" : tone < 0.8 ? "#9fe8ff" : tone < 0.92 ? "#ffd0f0" : "#fff0a0");
      if (rnd() < 0.07) { b.set(x - 1, y, "#8aa0e0"); b.set(x + 1, y, "#8aa0e0"); b.set(x, y - 1, "#8aa0e0"); b.set(x, y + 1, "#8aa0e0"); }
    }
    // planète à anneaux
    var px = 232, py = 46;
    b.ellipse(px, py, 20, 20, function (nx, ny) { var band = Math.sin(ny * 7 + nx) > 0.2; var sh = nx * 0.6 + ny * 0.5; return sh > 0.35 ? (band ? "#7a3a5a" : "#5a2a4a") : sh > -0.2 ? (band ? "#e0885a" : "#c8643e") : (band ? "#ffc27a" : "#f0a05a"); });
    for (i = 0; i < 360; i += 3) { var an = i * Math.PI / 180, rx = 33 * Math.cos(an), ry = 8 * Math.sin(an) - Math.cos(an) * 0 ; var front = Math.sin(an) > 0; if (!front && Math.abs(rx) < 20 && true) continue; b.set(px + rx, py + ry * 1, i % 6 < 3 ? "#e8d8ff" : "#a58ad8"); b.set(px + rx * 0.93, py + ry * 0.93, "#7a66b0"); }
    // petite lune
    b.ellipse(40, 30, 7, 7, function (nx, ny) { return nx * 0.5 + ny * 0.5 > 0.3 ? "#7a86b8" : "#b8c4f0"; }); b.set(38, 28, "#6a76a8"); b.set(42, 33, "#6a76a8");
    return b;
  }

  function landSpace() {
    var b = new Buf(300, 105), rnd = seeded(97), x, y, i;
    // limbe d'une grande planète
    b.ellipse(60, 175, 130, 112, function (nx, ny) { return ny < -0.93 ? "#7a8aff" : ny < -0.86 ? "#4a56c0" : "#232a6a"; });
    blob(b, 60, 70, 110, 18, "#4a56c0", 0.35);
    // station annulaire
    var sx = 205, sy = 42;
    for (i = 0; i < 360; i += 2) { var a = i * Math.PI / 180, rx = 56 * Math.cos(a), ry = 11 * Math.sin(a); var front = Math.sin(a) > 0; b.rect(Math.round(sx + rx), Math.round(sy + ry), 2, front ? 3 : 2, front ? "#b8c0f0" : "#6a72b0"); if (i % 18 === 0) b.set(Math.round(sx + rx) + 1, Math.round(sy + ry) + 1, front ? "#ffe08a" : "#7ae7ff"); }
    b.ellipse(sx, sy, 11, 11, function (nx, ny) { return nx * 0.5 + ny * 0.7 > 0.3 ? "#6a72b0" : "#c8d0ff"; }); b.rect(sx - 2, sy - 14, 4, 6, "#9aa2d8"); b.set(sx, sy - 15, "#ff5d73");
    for (i = 0; i < 6; i++) b.line(sx, sy, sx + Math.cos(i * 1.05) * 50, sy + Math.sin(i * 1.05) * 10, "#4a5290");
    // tours-antennes et dômes
    [[18, 36], [44, 26], [270, 32], [288, 22]].forEach(function (t) {
      b.rect(t[0], 105 - t[1], 5, t[1], "#3a4280"); b.rect(t[0] + 3, 105 - t[1], 2, t[1], "#28306a"); b.rect(t[0] - 1, 105 - t[1], 7, 2, "#6a72c0");
      b.rect(t[0] + 2, 105 - t[1] - 7, 1, 7, "#8a92d8"); b.set(t[0] + 2, 105 - t[1] - 8, "#ff5d73");
      for (y = 105 - t[1] + 5; y < 100; y += 5) b.set(t[0] + 1, y, "#ffe08a");
    });
    [[96, 14], [250, 16]].forEach(function (d) { b.ellipse(d[0], 98, d[1], d[1] * 0.7, function (nx, ny) { return ny < -0.3 ? "#9aa8f0" : "#5a66b8"; }); b.rect(d[0] - 3, 92, 6, 6, "#3a4290"); b.rect(d[0] - 1, 94, 2, 4, "#ffe08a"); });
    // astéroïdes qui flottent
    for (i = 0; i < 8; i++) { var ax = Math.floor(rnd() * 290), ay = 10 + Math.floor(rnd() * 50), ar = 2 + rnd() * 3; b.ellipse(ax, ay, ar, ar * 0.75, function (nx, ny) { return nx * 0.6 + ny * 0.5 > 0.2 ? "#4a5290" : "#8a92d0"; }); }
    // sol lunaire du premier plan
    for (x = 0; x < 300; x++) { var top = 86 + Math.floor(2 * Math.sin(x * 0.07) + 1.5 * Math.sin(x * 0.19)); for (y = top; y < 105; y++) b.set(x, y, y === top ? "#b0b8f0" : (y < top + 3 ? "#7a82c8" : ((x + y) % 7 === 0 ? "#3a4282" : "#4a5298"))); }
    for (i = 0; i < 9; i++) { var cx = Math.floor(rnd() * 300), cy2 = 92 + Math.floor(rnd() * 11); b.ellipse(cx, cy2, 6 + rnd() * 5, 1.6 + rnd(), "#2a3070"); b.ellipse(cx - 1, cy2 - 1, 4, 0.8, "#6a72c0"); }
    return b;
  }

  function tilesSpace() {
    var out = {}, rnd = seeded(89), v, i, g, d;
    for (v = 0; v < 3; v++) {
      g = new Buf(16, 16); d = new Buf(16, 16);
      g.rect(0, 0, 16, 16, "#2b2f58"); g.rect(0, 0, 16, 2, "#4be3ff"); g.rect(0, 0, 16, 1, "#b8f6ff"); g.rect(0, 2, 16, 2, "#161a3a");
      g.rect(0, 15, 16, 1, "#161a3a"); g.rect(7 + (v - 1) * 2, 4, 1, 12, "#1b1f44");
      [[2, 7], [13, 7], [2, 12], [13, 12]].forEach(function (q) { g.set(q[0], q[1], "#8a94d8"); g.set(q[0] + 1, q[1], "#1b1f44"); });
      g.rect(4 + v * 2, 10, 4, 1, "#39c5cf");
      if (v === 1) { g.rect(9, 6, 4, 2, "#ff6ac1"); }
      d.rect(0, 0, 16, 16, "#1c2044");
      for (i = 0; i < 4; i++) { var x0 = Math.floor(rnd() * 12), y0 = Math.floor(rnd() * 14); d.rect(x0, y0, 4, 1, "#2f3a7a"); d.set(x0 + 4, y0, "#4be3ff"); d.rect(x0 + 4, y0, 1, 3, "#2f3a7a"); }
      d.rect(1 + v * 3, 14, 6, 1, "#10132e"); d.rect(7, 4 + v, 1, 1, "#8a94d8");
      out["grass" + v] = single(g); out["dirt" + v] = single(d);
    }
    return out;
  }

  function crystal(b, cx, baseY, w, h, c) { // prisme de cristal : face claire, face sombre, pointe
    b.poly([[cx - w / 2, baseY], [cx - w / 2, baseY - h * 0.7], [cx, baseY - h], [cx + w / 2, baseY - h * 0.7], [cx + w / 2, baseY]], c[1]);
    b.poly([[cx - w / 2, baseY], [cx - w / 2, baseY - h * 0.7], [cx - 0.5, baseY - h + 1], [cx - 0.5, baseY]], c[0]);
    b.poly([[cx + w / 2 - 1, baseY], [cx + w / 2 - 1, baseY - h * 0.7], [cx + w / 2, baseY - h * 0.7], [cx + w / 2, baseY]], c[2]);
    b.set(cx - 1, baseY - h * 0.75, "#ffffff");
  }
  function treeSpace() { // grappe de cristaux lumineux
    var b = new Buf(36, 44), P = ["#9af0ff", "#39c5cf", "#1b7a96"], M = ["#ffb8f0", "#e054c0", "#8a2a7a"], V = ["#c8b8ff", "#8a6ae8", "#4a3a9a"];
    crystal(b, 10, 43, 7, 22, V); crystal(b, 26, 43, 8, 26, M); crystal(b, 18, 43, 9, 40, P); crystal(b, 5, 43, 5, 12, P); crystal(b, 31, 43, 5, 14, V); crystal(b, 22, 43, 5, 18, M);
    return b.outline("#0a0820");
  }
  function palmSpace() { // antenne parabolique sur son mât
    var b = new Buf(46, 54), i;
    b.rect(21, 20, 4, 34, "#4a5290"); b.rect(21, 20, 1, 34, "#8a92d8"); b.rect(24, 20, 1, 34, "#2a3070");
    for (i = 30; i < 53; i += 6) b.rect(20, i, 6, 2, "#6a72b0");
    b.rect(14, 50, 18, 4, "#3a4280");
    b.ellipse(23, 14, 17, 10, function (nx, ny) { return ny > 0 ? null : (nx * 0.4 + ny * 0.8 < -0.2 ? "#d8e0ff" : "#8a94d8"); });
    b.line(23, 14, 23, 4, "#8a92d8"); b.ellipse(23, 3, 2, 2, "#ff5d73"); b.set(22, 2, "#ffffff");
    b.line(8, 10, 38, 18, "#4a5290");
    return b.outline("#0a0820");
  }

  function leavesCornerSpace() { // gros cristaux sombres et câbles au premier plan
    var b = new Buf(64, 56), D = ["#2a2470", "#150f42", "#4a3ab0"], i;
    [[10, 56, 14, 40], [26, 56, 12, 28], [2, 56, 9, 22], [40, 56, 9, 14]].forEach(function (c) { crystal(b, c[0], c[1], c[2], c[3], D); });
    for (i = 0; i < 3; i++) b.line(0, 52 - i * 5, 40, 56 - i * 3, i === 1 ? "#39c5cf" : "#1b1850");
    return b.outline("#06041a");
  }
  function leavesBandSpace() {
    var b = new Buf(300, 16), rnd = seeded(35), x, D = ["#2a2470", "#150f42", "#4a3ab0"];
    for (x = 0; x < 300; x += 9) crystal(b, x + 4, 16, 4 + Math.floor(rnd() * 5), 5 + Math.floor(rnd() * 9), D);
    b.rect(0, 13, 300, 3, "#0a0828"); b.rect(0, 13, 300, 1, "#39c5cf");
    return b.outline("#06041a");
  }

  function ufoBuf(flap) { // soucoupe : 2 images (les lumières défilent)
    var b = new Buf(18, 14), i;
    b.ellipse(9, 7, 4.4, 3.8, function (nx, ny) { return ny < 0 ? "#9af0ff" : "#39c5cf"; });
    b.ellipse(9, 9, 8.6, 3, function (nx, ny) { return ny < -0.2 ? "#d8e0ff" : ny < 0.5 ? "#8a94d8" : "#4a5290"; });
    for (i = 0; i < 4; i++) b.set(3 + i * 4, 9, (i + (flap ? 1 : 0)) % 2 ? "#ffe08a" : "#ff6ac1");
    b.set(8, 5, "#ffffff"); b.set(7, 12, "#4a5290"); b.set(11, 12, "#4a5290");
    return b.outline(OUT);
  }
  var BAT_ANIM = { sliceX: 2, anims: { fly: { from: 0, to: 1, loop: true, speed: 8 } } };

  /* ====================================================================
   * Enregistrement
   * ================================================================== */

  function registerWorlds(k) {
    function load(name, canvas, opts) { if (opts) k.loadSprite(name, canvas, opts); else k.loadSprite(name, canvas); }
    // sprites communs (une version par monde quand le dessin change)
    load("pad", single(padBuf(0))); load("pad-w1", single(padBuf(1))); load("pad-w2", single(padBuf(2)));
    load("crumb", single(crumbBuf({ base: "#7e5563", top: "#946a74", hi: "#b08088", crack: "#3a2430" })));
    load("crumb-w1", single(crumbBuf({ base: "#6a6f8a", top: "#4fae6a", hi: "#9af0a8", crack: "#22243a" })));
    load("crumb-w2", single(crumbBuf({ base: "#3a2f6a", top: "#ff6ac1", hi: "#ffd0f0", crack: "#120a30" })));
    load("warp", sheet([0, 1.6, 3.2, 4.8].map(warpBuf), 16, 24), { sliceX: 4, anims: { spin: { from: 0, to: 3, loop: true, speed: 8 } } });
    load("moon", single(moonBuf()));
    load("wall0", single(wallBuf(0))); load("wall1", single(wallBuf(1)));
    load("window", single(windowBuf())); load("vine", single(vineBuf())); load("lantern", single(lanternBuf()));

    // ----- monde 1 : jade -----
    load("sky-w1", single(skyJade())); load("land-w1", single(landJade()));
    load("cloud0-w1", single(cloudPal(64, 26, 11, ["#fff4e0", "#ffd9b0", "#f0a8a0", "#e89aa8", "#8a4a7a"])));
    load("cloud1-w1", single(cloudPal(48, 20, 12, ["#fff4e0", "#ffd9b0", "#f0a8a0", "#e89aa8", "#8a4a7a"])));
    var tj = tilesJade(); Object.keys(tj).forEach(function (n) { load(n + "-w1", tj[n]); });
    load("tree-w1", single(treeJade())); load("palm-w1", single(palmJade()));
    load("leavesCorner-w1", single(leavesCornerJade())); load("leavesBand-w1", single(leavesBandJade()));
    var pj = propsShifted(150, 1.05, 1); Object.keys(pj).forEach(function (n) { load(n + "-w1", single(pj[n])); });
    load("portal-w1", portalSheet({
      stone: ["#2a4a3a", "#4a7a5a", "#3a6a4a", "#5a9a6a"], dark: ["#0f2a1e", "#0a1f16", "#06140e"], swirl: ["#7ee787", "#ffd54a", "#39c5cf", "#3fb970"],
      runeOpen: "#ffd54a", runeClosed: "#6a4a1a", keyOpen: "#ffd54a", keyClosed: "#a35a00", lock: "#e3b341", lock2: "#9e6a03"
    }), PORTAL_ANIMS);
    load("terminal-w1", single(terminalPal({ mast: "#6a7a5a", beacon: "#ffd54a", body: "#4a6a52", hi: "#7aa086", low: "#2a4030", screen: "#06140e", text: "#7ee787", cursor: "#ffd54a", button: "#ffd54a", foot: "#3a5a42" })));
    load("glitch-w1", glitchShifted(170, 0.9, 1), GLITCH_ANIMS);
    load("bat-w1", sheetOf([shift(RB.batBuf(true), 130, 0.9, 1.1), shift(RB.batBuf(false), 130, 0.9, 1.1)], 18, 14), BAT_ANIM);
    load("spike-w1", single(shift(RB.spikeBuf(), 40, 1.6, 1))); load("candle-w1", single(shift(RB.candleBuf(), 90, 1, 1)));

    // ----- monde 2 : espace -----
    load("sky-w2", single(skySpace())); load("land-w2", single(landSpace()));
    load("cloud0-w2", single(cloudPal(64, 26, 11, ["#d8c8ff", "#a58ad8", "#6a4ab0", "#8a5ac0", "#2a1a5a"])));
    load("cloud1-w2", single(cloudPal(48, 20, 12, ["#c8e8ff", "#7ac8f0", "#3a8ac0", "#5aa0d8", "#12305a"])));
    var ts = tilesSpace(); Object.keys(ts).forEach(function (n) { load(n + "-w2", ts[n]); });
    load("tree-w2", single(treeSpace())); load("palm-w2", single(palmSpace()));
    load("leavesCorner-w2", single(leavesCornerSpace())); load("leavesBand-w2", single(leavesBandSpace()));
    var ps = propsShifted(-110, 1.2, 1); Object.keys(ps).forEach(function (n) { load(n + "-w2", single(ps[n])); });
    load("portal-w2", portalSheet({
      stone: ["#161a3a", "#4a5290", "#2f3670", "#6a72c0"], dark: ["#0a0c24", "#06081a", "#03040f"], swirl: ["#4be3ff", "#ff6ac1", "#8a6ae8", "#39c5cf"],
      runeOpen: "#4be3ff", runeClosed: "#7d2a4a", keyOpen: "#4be3ff", keyClosed: "#ff5d73", lock: "#ff6ac1", lock2: "#8a2a7a"
    }), PORTAL_ANIMS);
    load("terminal-w2", single(terminalPal({ mast: "#8a92d8", beacon: "#ff6ac1", body: "#2f3670", hi: "#6a72c0", low: "#161a3a", screen: "#04050f", text: "#4be3ff", cursor: "#ff6ac1", button: "#4be3ff", foot: "#1f2450" })));
    load("glitch-w2", glitchShifted(110, 1, 1.05), GLITCH_ANIMS);
    load("bat-w2", sheetOf([ufoBuf(true), ufoBuf(false)], 18, 14), BAT_ANIM);
    load("spike-w2", single(shift(RB.spikeBuf(), 150, 2, 1.1))); load("candle-w2", single(shift(RB.candleBuf(), -120, 1, 1)));
  }

  /** Les sprites que le moteur remplace selon le monde (voir engine.js). */
  var WORLD_SPRITES = ["sky", "land", "cloud0", "cloud1", "tree", "palm", "bush", "tuft0", "tuft1", "mushroom", "flower0", "flower1", "rock", "sign", "torch",
    "grass0", "grass1", "grass2", "dirt0", "dirt1", "dirt2", "leavesCorner", "leavesBand", "portal", "terminal", "glitch", "bat", "spike", "candle", "pad", "crumb"];

  S.registerWorlds = registerWorlds;
  S.worldSprites = WORLD_SPRITES.reduce(function (o, n) { o[n] = true; return o; }, {});
  S.worldTools = { shift: shift, recolor: recolor, mix: mix, fillGradient: fillGradient, blob: blob, crystal: crystal, mirror: mirror, h2r: h2r, r2h: r2h };
})();
