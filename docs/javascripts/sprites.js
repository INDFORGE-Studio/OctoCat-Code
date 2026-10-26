/* OctoCat-Code — Asset pipeline (pixel art procédural)
 * Les sprites sont dessinés au chargement dans des tampons de pixels (Buf), outlinés,
 * puis passés à KAPLAY sous forme de data-URL. Remplacer par de vrais PNG revient à
 * changer l'argument de loadSprite() dans registerAll().
 * Palette : GitHub Dark.
 */
(function () {
  "use strict";

  var C = {
    K: "#010409", P: "#8957e5", L: "#a371f7", W: "#f0f6fc", N: "#ff7b9c",
    R: "#da3633", r: "#f85149", Y: "#d29922", G: "#3fb950", C: "#39c5cf", B: "#58a6ff"
  };

  /* ====================================================================
   * Boîte à outils : tampon de pixels
   * ================================================================== */

  function Buf(w, h) {
    this.w = w; this.h = h;
    this.d = [];
    for (var i = 0; i < w * h; i++) this.d.push(null);
  }
  Buf.prototype.inside = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; };
  Buf.prototype.set = function (x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (this.inside(x, y)) this.d[y * this.w + x] = c;
  };
  Buf.prototype.get = function (x, y) {
    x = Math.floor(x); y = Math.floor(y);
    return this.inside(x, y) ? this.d[y * this.w + x] : null;
  };
  Buf.prototype.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c);
  };
  /** Ellipse ; `col` est une couleur ou une fonction (nx, ny, x, y) -> couleur. */
  Buf.prototype.ellipse = function (cx, cy, rx, ry, col) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, typeof col === "function" ? col(nx, ny, x, y) : col);
      }
    }
  };
  Buf.prototype.poly = function (pts, col) {
    var minY = Infinity, maxY = -Infinity, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var yy = y + 0.5, xs = [];
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) {
        for (var x = Math.ceil(xs[i] - 0.5); x + 0.5 < xs[i + 1]; x++) {
          this.set(x, y, typeof col === "function" ? col(x, y) : col);
        }
      }
    }
  };
  Buf.prototype.outline = function (c) {
    var out = this.d.slice(), x, y;
    for (y = 0; y < this.h; y++) {
      for (x = 0; x < this.w; x++) {
        if (this.d[y * this.w + x] !== null) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) out[y * this.w + x] = c;
      }
    }
    this.d = out;
    return this;
  };
  var COLOR_CACHE = {};
  /** « #rrggbb » / « #rgb » / « #rrggbbaa » -> [r, g, b, a] (mémorisé) ; null si le format est inconnu. */
  function rgba(c) {
    var v = COLOR_CACHE[c];
    if (v !== undefined) return v;
    var m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c), h;
    if (!m) return (COLOR_CACHE[c] = null);
    h = m[1];
    if (h.length <= 4) h = h.replace(/./g, "$&$&");
    return (COLOR_CACHE[c] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255]);
  }
  /** Écrit les pixels d'un seul coup dans un ImageData (bien plus rapide qu'un fillRect par pixel). */
  Buf.prototype.draw = function (ctx, ox, oy) {
    var img = ctx.createImageData(this.w, this.h), px = img.data, odd = null, n = this.w * this.h, i, c, v;
    for (i = 0; i < n; i++) {
      c = this.d[i];
      if (!c) continue;
      v = rgba(c);
      if (v) { px[i * 4] = v[0]; px[i * 4 + 1] = v[1]; px[i * 4 + 2] = v[2]; px[i * 4 + 3] = v[3]; }
      else (odd = odd || []).push(i); // format de couleur inhabituel : repli sur fillRect
    }
    ctx.putImageData(img, ox, oy);
    if (odd) odd.forEach(function (j) { ctx.fillStyle = this.d[j]; ctx.fillRect(ox + (j % this.w), oy + Math.floor(j / this.w), 1, 1); }, this);
  };

  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return { c: c, ctx: ctx };
  }

  function seeded(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function sheet(frames, w, h) {
    var cv = makeCanvas(w * frames.length, h);
    frames.forEach(function (b, i) { b.draw(cv.ctx, i * w, 0); });
    return cv.c; // KAPLAY accepte directement un canevas : pas d'encodage PNG puis de décodage au démarrage
  }

  function single(buf) {
    var cv = makeCanvas(buf.w, buf.h);
    buf.draw(cv.ctx, 0, 0);
    return cv.c;
  }

  /* ====================================================================
   * OctoCat (24×24, 10 frames) : chat-pieuvre violet
   * ================================================================== */

  var O_BASE = {
    P: "#8957e5", L: "#b392f0", D: "#6e40c9", DD: "#5a32a3", K: "#1a0f3a",
    pink: "#ff8fb1", W: "#f0f6fc", E: "#0d1117"
  };
  var O = Object.assign({}, O_BASE);
  /* Apparences : 0 = d'origine ; après chaque tour de 10 niveaux : 1 Ninja (bleu, bandeau rouge), 2 Princesse (ex-Roi : or, couronne, cape rouge),
   * 3 Cosmos (indigo étoilé, auréole, cape magenta). Seules les couleurs et les accessoires changent ; les animations sont les mêmes. */
  var O_SKINS = [
    {},
    { P: "#2f6fdb", L: "#86b6ff", D: "#2250ad", DD: "#183c86", K: "#0a1030", pink: "#ffd166" },
    { P: "#e3a008", L: "#ffd966", D: "#b8790a", DD: "#8a5806", K: "#3a2203", pink: "#ff9f80" },
    { P: "#2b2f86", L: "#6a72e0", D: "#1c1f5c", DD: "#12143f", K: "#070824", pink: "#39c5cf" }
  ];
  var skinNow = 0;

  function eye(b, ex, ey, kind, look) {
    var i;
    if (kind === "open") {
      b.ellipse(ex, ey, 2.4, 3.1, O.W);
      b.rect(Math.round(ex - 1 + look), Math.round(ey - 1.5), 2, 3, O.E);
      b.set(Math.round(ex - 1 + look), Math.round(ey - 1.5), O.W);
    } else if (kind === "blink") {
      b.rect(Math.round(ex - 2), Math.round(ey), 4, 1, O.E);
    } else if (kind === "happy") {
      b.set(ex - 2, ey + 1, O.E); b.set(ex - 1, ey, O.E); b.set(ex, ey - 0.5, O.E);
      b.set(ex + 1, ey, O.E); b.set(ex + 2, ey + 1, O.E);
    } else if (kind === "dead") {
      for (i = -1; i <= 1; i++) { b.set(ex + i, ey + i, "#f85149"); b.set(ex + i, ey - i, "#f85149"); }
      b.set(ex - 2, ey, O.E); b.set(ex + 1.5, ey, O.E);
    }
  }

  function octoBuf(o) {
    var b = new Buf(24, 24), dy = o.dy || 0, cx = 12, cy = 10 + dy, i, s, t;
    var top = cy + 5, bottom = 23.6;

    // cape (derrière tout) : rouge pour le Roi, magenta étoilé pour le Cosmos
    if (skinNow >= 2) {
      var cape = skinNow === 2 ? "#c62a35" : "#8e2de2", capeD = skinNow === 2 ? "#8f1d28" : "#5a189a";
      b.poly([[7, top - 1], [0.5, bottom - 1], [7.5, bottom - 3]], cape); b.poly([[17, top - 1], [23.5, bottom - 1], [16.5, bottom - 3]], cape);
      b.line(7, top, 1.5, bottom - 2, capeD); b.line(17, top, 22.5, bottom - 2, capeD);
      if (skinNow === 3) { b.set(3, bottom - 4, "#ffffff"); b.set(21, bottom - 4, "#ffffff"); b.set(5, bottom - 7, "#ffe066"); b.set(19, bottom - 7, "#ffe066"); }
    }

    // tentacules (derrière la tête)
    for (i = 0; i < 4; i++) {
      var bx = 6 + i * 4, ph = (o.phase || 0) + i * 1.4;
      var reach = o.reach ? o.reach[i % o.reach.length] : 1;
      var yEnd = top + (bottom - top) * reach;
      for (s = 0; s <= 26; s++) {
        t = s / 26;
        var x = bx + (o.lean || 0) * t + (o.spread || 0) * (i - 1.5) * t + (o.sway || 1) * Math.sin(ph + t * 3.2) * t;
        var y = top + (yEnd - top) * t;
        b.ellipse(x, y, 1.75 - 1.0 * t, 1.75 - 1.0 * t, i % 2 ? O.D : O.P);
        if (s === 14 && i % 2 === 0) b.set(x, y, O.pink); // ventouse
        if (s === 20 && i % 2 === 1) b.set(x, y, O.pink);
      }
    }

    // oreilles
    b.poly([[3.6, 7 + dy], [3, 1 + dy], [9.6, 3.6 + dy]], O.P);
    b.poly([[20.4, 7 + dy], [21, 1 + dy], [14.4, 3.6 + dy]], O.P);
    b.poly([[4.8, 5.6 + dy], [4.6, 2.8 + dy], [7.4, 4.2 + dy]], O.pink);
    b.poly([[19.2, 5.6 + dy], [19.4, 2.8 + dy], [16.6, 4.2 + dy]], O.pink);

    // tête ombrée (lumière en haut à gauche)
    b.ellipse(cx, cy, 9.2, 7.4, function (nx, ny) {
      var sh = nx * 0.45 + ny * 0.9;
      return sh < -0.55 ? O.L : sh > 0.62 ? O.D : O.P;
    });
    // joues
    b.ellipse(5.8, cy + 2.8, 1.6, 1, O.pink);
    b.ellipse(18.2, cy + 2.8, 1.6, 1, O.pink);

    // yeux
    var look = o.look == null ? 0.5 : o.look;
    eye(b, 8.5, cy - 0.5, o.eyes, look);
    eye(b, 15.5, cy - 0.5, o.eyes, look);

    // accessoires selon l'apparence
    if (skinNow === 1) { // ninja : bandeau rouge noué à gauche, plaque d'argent
      for (i = 3; i <= 21; i++) for (s = cy - 6; s <= cy - 5; s++) if (b.get(i, s)) b.set(i, s, "#e5383b");
      b.line(4, cy - 5, 0.5, cy - 2, "#e5383b"); b.line(4, cy - 6, 1, cy - 8.5, "#c1121f");
      b.rect(11, cy - 6, 2, 2, "#e9ecef"); b.set(11, cy - 5, "#6c757d");
    } else if (skinNow === 2) { // roi : couronne dorée à pierres
      b.rect(8, cy - 8, 8, 2, "#fff0a0");
      [8, 10, 14, 15].forEach(function (x) { b.set(x, cy - 9, "#fff0a0"); }); b.set(12, cy - 10, "#fff0a0"); b.set(12, cy - 9, "#fff0a0");
      b.set(12, cy - 7, "#e5383b"); b.set(9, cy - 7, "#4dabf7"); b.set(15, cy - 7, "#4dabf7");
    } else if (skinNow === 3) { // cosmos : étoiles sur la tête, auréole dorée
      for (t = 0; t < 6.3; t += 0.2) b.set(12 + 5.4 * Math.cos(t), cy - 9.2 + 1.5 * Math.sin(t), "#ffe066");
      [[7, cy - 3], [16, cy - 4], [12, cy - 5], [5, cy + 1], [19, cy + 2], [9, cy + 4]].forEach(function (q) { if (b.get(q[0], q[1])) b.set(q[0], q[1], "#ffffff"); });
      if (b.get(18, cy - 2) && b.get(17, cy - 2) && b.get(19, cy - 2)) { b.set(18, cy - 2, "#fff4b8"); b.set(17, cy - 2, "#ffffff"); b.set(19, cy - 2, "#ffffff"); b.set(18, cy - 3, "#ffffff"); b.set(18, cy - 1, "#ffffff"); }
    }

    // museau + bouche
    b.rect(11, cy + 2, 2, 1, O.pink);
    if (o.mouth === "open") { b.rect(11, cy + 3, 2, 2, O.E); b.set(11, cy + 4, O.pink); }
    else if (o.mouth === "frown") { b.set(10, cy + 4, O.E); b.set(11, cy + 3, O.E); b.set(12, cy + 3, O.E); b.set(13, cy + 4, O.E); }
    else { b.set(10, cy + 3, O.E); b.set(11, cy + 4, O.E); b.set(12, cy + 4, O.E); b.set(13, cy + 3, O.E); }

    return b.outline(O.K);
  }

  function octoFrames(skin) {
    skinNow = skin || 0;
    Object.assign(O, O_BASE, O_SKINS[skinNow]);
    var f = octoFrameList();
    Object.assign(O, O_BASE); skinNow = 0;
    return f;
  }

  function octoFrameList() {
    return [
      octoBuf({ eyes: "open", phase: 0.0, sway: 0.9, dy: 0 }),                                   // 0 idle
      octoBuf({ eyes: "open", phase: 1.4, sway: 0.9, dy: 1 }),                                   // 1 idle (respire)
      octoBuf({ eyes: "open", phase: 0.0, sway: 1.6, lean: -3, dy: 0, reach: [1, 0.8] }),        // 2-5 run
      octoBuf({ eyes: "open", phase: 1.6, sway: 1.6, lean: -3.5, dy: -1, reach: [0.75, 0.95] }),
      octoBuf({ eyes: "open", phase: 3.1, sway: 1.6, lean: -3, dy: 0, reach: [0.8, 1] }),
      octoBuf({ eyes: "open", phase: 4.7, sway: 1.6, lean: -3.5, dy: -1, reach: [0.95, 0.75] }),
      octoBuf({ eyes: "happy", mouth: "open", phase: 0.5, sway: 1.2, spread: 1.4, dy: -1, reach: [0.78] }), // 6-7 victoire
      octoBuf({ eyes: "happy", mouth: "open", phase: 2.4, sway: 1.2, spread: 1.0, dy: 0, reach: [0.95] }),
      octoBuf({ eyes: "dead", mouth: "frown", phase: 0.2, sway: 0.4, spread: 2.6, dy: 1, reach: [1] }), // 8-9 K.O.
      octoBuf({ eyes: "dead", mouth: "frown", phase: 0.9, sway: 0.4, spread: 3.0, dy: 2, reach: [1] })
    ];
  }

  /* ====================================================================
   * Glitch (24×24, 4 frames) : fragment de code corrompu
   * ================================================================== */

  var G = { R: "#c42b3a", L: "#e0485a", D: "#7a1524", K: "#14060c", Y: "#e3b341", W: "#f0f6fc", g: "#3fb950", c: "#39c5cf", m: "#f778ba" };

  function glitchBuf(kind, seed) {
    var b = new Buf(24, 24), rnd = seeded(seed), x, y;

    // pieds
    b.rect(6, 20, 4, 3, G.D); b.rect(14, 20, 4, 3, G.D);
    b.rect(5, 22, 5, 1, G.D); b.rect(14, 22, 5, 1, G.D);
    // pointes corrompues sur le crâne
    b.poly([[5, 9], [6, 2.5], [9.5, 6.5]], G.R);
    b.poly([[9.5, 7], [12, 0.5], [14.5, 7]], G.R);
    b.poly([[14.5, 6.5], [18, 2.5], [19, 9]], G.R);
    // corps
    b.ellipse(12, 13.5, 9.6, 8.2, function (nx, ny) {
      var sh = nx * 0.5 + ny * 0.9;
      return sh < -0.5 ? G.L : sh > 0.55 ? G.D : G.R;
    });

    var hurt = kind === "hurt", attack = kind === "attack";
    if (hurt) {
      // yeux en croix
      for (var i = -1; i <= 1; i++) {
        b.set(8 + i, 11 + i, G.W); b.set(8 + i, 11 - i, G.W);
        b.set(16 + i, 11 + i, G.W); b.set(16 + i, 11 - i, G.W);
      }
      b.rect(8, 16, 8, 1, G.K);
    } else {
      // yeux jaunes en colère
      b.rect(6, 9, 5, 4, G.Y); b.rect(13, 9, 5, 4, G.Y);
      b.rect(attack ? 8 : 9, 10, 2, 3, G.K); b.rect(attack ? 14 : 13, 10, 2, 3, G.K);
      // sourcils
      b.poly([[5, 7], [11, 9.2], [11, 10], [5, 8.4]], G.K);
      b.poly([[19, 7], [13, 9.2], [13, 10], [19, 8.4]], G.K);
      // bouche dentée
      var my = attack ? 14 : 16, mh = attack ? 6 : 3;
      b.rect(6, my, 12, mh, G.K);
      for (x = 6; x < 18; x += 2) b.rect(x, my, 1, 1, G.W);
      for (x = 7; x < 18; x += 2) b.rect(x, my + mh - 1, 1, 1, G.W);
      if (attack) b.rect(9, my + 3, 6, 2, G.m);
    }

    // glitch : lignes décalées + franges chromatiques
    for (y = 1; y < 22; y++) {
      if (rnd() < (hurt ? 0.5 : 0.22)) {
        var sh = (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2)), row = [], xi;
        for (xi = 0; xi < b.w; xi++) row.push(b.get(xi, y));
        for (xi = 0; xi < b.w; xi++) b.set(xi, y, null);
        var first = -1, last = -1;
        for (xi = 0; xi < b.w; xi++) {
          var nx = xi + sh;
          if (row[xi] && nx >= 0 && nx < b.w) { b.set(nx, y, row[xi]); if (first < 0) first = nx; last = nx; }
        }
        if (first >= 0) { b.set(sh > 0 ? first - 1 : first, y, sh > 0 ? G.c : G.g); b.set(sh > 0 ? last : last + 1, y, sh > 0 ? G.m : G.c); }
      }
    }
    // débris
    for (var n = 0; n < 7; n++) {
      var px = Math.floor(rnd() * 24), py = Math.floor(rnd() * 22);
      if (!b.get(px, py) && (b.get(px - 1, py) || b.get(px + 1, py) || b.get(px, py + 1) || b.get(px, py - 1))) {
        b.set(px, py, rnd() < 0.5 ? G.g : G.c);
      }
    }
    if (hurt) b.d = b.d.map(function (c, idx) { return c ? ((idx + Math.floor(idx / 24)) % 2 ? "#f0f6fc" : "#ffa198") : c; });
    return b.outline(G.K);
  }

  /* ====================================================================
   * Portail (32×40, 5 frames)
   * ================================================================== */

  function portalBuf(mode, phase) {
    var W = 32, H = 40, cx = 16, cy = 16, b = new Buf(W, H), x, y;
    var swirl = [C.B, C.C, C.G, "#bc8cff"];
    var runeOn = mode === "closed" ? "#7d2a2a" : "#7ee0ff";

    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var dx = x - cx + 0.5, dy = y - cy + 0.5, d2 = dx * dx + dy * dy;
        var outer = y < cy ? d2 < 14.5 * 14.5 : x >= 1 && x < 31;
        var inner = y < cy ? d2 < 10 * 10 : x >= 6 && x < 26;
        if (!outer) continue;
        if (!inner) {
          // pierre appareillée
          var row = y >> 2, mortar = ((x + row * 3) % 8 === 0) || (y % 4 === 0);
          var col = mortar ? "#21262d" : ((x + y) % 5 === 0 ? "#484f58" : "#30363d");
          if (x < 9 && !mortar) col = "#3d444d"; // lumière à gauche
          b.set(x, y, col);
          continue;
        }
        if (mode === "closed") {
          b.set(x, y, (x + 2) % 5 === 0 ? "#1c2128" : (y % 4 === 0 ? "#161b22" : "#0d1117"));
        } else {
          var r = Math.sqrt(d2), a = Math.atan2(dy, dx);
          var v = Math.sin(r * 0.75 - phase * 2) + Math.sin(a * 3 + phase);
          var idx = Math.floor(((v + 2) / 4) * swirl.length) % swirl.length;
          b.set(x, y, mode === "opening" ? (idx % 2 ? "#161b22" : "#1f6feb") : swirl[idx]);
        }
      }
    }
    // marches
    b.rect(0, 37, 32, 3, "#30363d"); b.rect(0, 37, 32, 1, "#484f58");
    b.rect(2, 34, 28, 3, "#3d444d"); b.rect(2, 34, 28, 1, "#586069");
    // runes sur l'arche
    [[-60, 12.2], [-35, 12.2], [-12, 12.2], [12, 12.2], [35, 12.2], [60, 12.2]].forEach(function (p) {
      var ang = (p[0] - 90) * Math.PI / 180;
      b.set(cx + Math.cos(ang) * p[1], cy + Math.sin(ang) * p[1], runeOn);
    });
    b.rect(3, 22, 1, 2, runeOn); b.rect(28, 22, 1, 2, runeOn);
    b.rect(3, 28, 1, 2, runeOn); b.rect(28, 28, 1, 2, runeOn);
    // clé de voûte
    b.poly([[16, 0.5], [18.5, 3], [16, 5.5], [13.5, 3]], mode === "closed" ? "#da3633" : "#58a6ff");
    b.set(15, 2, "#f0f6fc");

    if (mode === "closed") { // cadenas
      b.rect(12, 22, 8, 7, C.Y); b.rect(12, 27, 8, 2, "#9e6a03");
      b.rect(15, 24, 2, 3, C.K);
      b.rect(13, 17, 6, 1, "#8b949e"); b.rect(13, 18, 1, 4, "#8b949e"); b.rect(18, 18, 1, 4, "#8b949e");
    }
    return b.outline("#010409");
  }

  /* ====================================================================
   * Décor : GitHubia de jour — canyon rouge, mesas bleutées, forêt corail,
   * cité pâle aux deux grandes tours, nuages cernés, feuilles violettes.
   * (Direction artistique d'après les illustrations de référence du PO.)
   * ================================================================== */

  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  Buf.prototype.line = function (x0, y0, x1, y1, c) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (var i = 0; i <= n; i++) this.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
  };
  /** Colle les pixels non vides de `src` en (ox, oy). */
  Buf.prototype.paste = function (src, ox, oy) {
    for (var y = 0; y < src.h; y++) for (var x = 0; x < src.w; x++) {
      var c = src.d[y * src.w + x];
      if (c) this.set(x + ox, y + oy, c);
    }
  };

  function mirrorX(b) {
    var m = new Buf(b.w, b.h);
    for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) m.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x];
    return m;
  }

  /** Ciel 300×125 (affiché ×2) : dégradé indigo → bleu → horizon pâle, tramé, + bancs de nuages. */
  function skySprite() {
    var W = 300, H = 125, b = new Buf(W, H), x, y;
    var stops = ["#3a47b4", "#3f54be", "#4a63cb", "#5a7fd9", "#6f98e4", "#8db3ec", "#aecbf2", "#cfe0f6"];
    var last = stops.length - 1;
    for (y = 0; y < H; y++) {
      var f = Math.min(1, y / 76) * last, lo = Math.min(last - 1, Math.floor(f)), fr = f - lo;
      for (x = 0; x < W; x++) b.set(x, y, stops[lo + ((BAYER[y & 3][x & 3] + 0.5) / 16 < fr ? 1 : 0)]);
    }
    b.paste(cloudBuf(120, 46, 4), -16, 14);   // banc de gauche
    b.paste(cloudBuf(92, 40, 9), 222, 9);     // banc de droite
    b.paste(cloudBuf(76, 22, 2), 108, 40);    // nuages bas du centre
    b.paste(cloudBuf(54, 18, 6), 186, 44);
    return b;
  }

  /** Cumulus cerné : union de bulles à fond plat, ombres lavande/rose. */
  function cloudBuf(w, h, seed) {
    var b = new Buf(w, h), rnd = seeded(seed * 97 + 13), baseY = h - 4, n = Math.max(4, Math.floor(w / 9)), i;
    for (i = 0; i < n; i++) {
      var t = (i + 0.5) / n, cx = 6 + t * (w - 12);
      var tall = Math.sin(Math.PI * t) * 0.8 + 0.25 + rnd() * 0.25;
      var ry = (h - 8) * 0.5 * tall, rx = w / n * (0.85 + rnd() * 0.5);
      b.ellipse(cx, baseY - ry, rx, ry, function (nx, ny, x, y) {
        if (ny > 0.35 && x > w * 0.55) return "#f0d3e4";
        return ny > 0.5 ? "#cdd8f4" : ny > 0.05 ? "#e9eefc" : "#ffffff";
      });
    }
    b.rect(0, baseY, w, 4, null);
    for (var yy = baseY; yy < h; yy++) for (var xx = 0; xx < w; xx++) b.set(xx, yy, null);
    return b.outline("#8da3dc");
  }

  /** Rangées de mesas lointaines : sommets plats, strates lavande/bleu. */
  function mesaRow(b, topY, baseY, seed, c) {
    var rnd = seeded(seed), x = 0, y, xx;
    while (x < b.w) {
      var w = 16 + Math.floor(rnd() * 30), h = topY + Math.floor(rnd() * 7) - 3;
      for (xx = x; xx < Math.min(b.w, x + w); xx++) {
        for (y = h; y < baseY; y++) b.set(xx, y, y === h ? c.top : (Math.floor((y - h) / 3) % 2 ? c.a : c.b));
      }
      x += w - 2;
    }
  }

  function coralFill(nx, ny) {
    var s = nx * 0.45 + ny * 0.85;
    return s < -0.45 ? "#ff8f98" : s < 0.1 ? "#f06a78" : s < 0.55 ? "#e85060" : "#c8405a";
  }

  function cliffBuf() {
    var b = new Buf(130, 76);
    var sil = [[0, 0], [38, 5], [70, 17], [90, 30], [110, 36], [120, 44], [106, 49], [118, 55], [128, 64], [122, 76], [0, 76]];
    var STRATA = ["#e5583c", "#f08a54", "#d4503c", "#c6453f", "#f4a06a"];
    b.poly(sil, function (x, y) {
      var t = x * 0.55 + y * 1.0, k = Math.floor(t / 3.4), fr = t / 3.4 - k;
      var col = STRATA[(k % STRATA.length + STRATA.length) % STRATA.length];
      if (fr < 0.16) col = "#9e3a48";            // arête entre deux strates
      if (y > 52) col = fr < 0.16 ? "#8a3a50" : "#d9566a"; // éboulis rosés
      return col;
    });
    for (var x = 0; x < 130; x++) { // lèvre éclairée au sommet
      for (var y = 0; y < 76; y++) {
        if (b.get(x, y) && !b.get(x, y - 1)) { b.set(x, y, "#f7b27a"); b.set(x, y + 1, "#f4a06a"); break; }
      }
    }
    // surplomb : ombre sous la lèvre
    b.poly([[58, 49], [118, 46], [108, 56], [66, 62]], "#8a3a50");
    b.poly([[70, 52], [112, 50], [104, 57], [74, 60]], "#6e2f4a");
    return b.outline("#6a2236");
  }

  function cityBuf() {
    var b = new Buf(165, 84), rnd = seeded(77), x, w, h;
    function tower(bx, baseY, bw, bh, face, side, top) {
      b.rect(bx, baseY - bh, bw, bh, face);
      b.rect(bx + bw - Math.max(2, Math.floor(bw / 4)), baseY - bh, Math.max(2, Math.floor(bw / 4)), bh, side);
      b.rect(bx, baseY - bh, bw, 1, top);
      for (var wy = baseY - bh + 3; wy < baseY - 1; wy += 3) b.rect(bx + 1, wy, bw - 3, 1, "#b4c4ea");
    }
    // plateforme
    b.rect(0, 74, 165, 10, "#d6e1f7");
    // immeubles du fond
    for (x = 36; x < 160; x += 6 + Math.floor(rnd() * 5)) {
      w = 6 + Math.floor(rnd() * 5); h = 14 + Math.floor(rnd() * 22);
      tower(x, 76, w, h, "#e3ebfc", "#c3d1f0", "#f4f7ff");
    }
    // « Pyramide des commits » : ziggourat de baies serveurs à gradins
    [[18, 76, 84, 18], [30, 58, 60, 14], [42, 44, 36, 12], [52, 32, 16, 12]].forEach(function (t, ti) {
      b.rect(t[0], t[1], t[2], t[3], ti % 2 ? "#dde6fb" : "#e9f0ff");
      b.rect(t[0] + t[2] - 5, t[1], 5, t[3], "#b7c4ec");           // face à l'ombre
      b.rect(t[0], t[1], t[2], 1, "#ffffff");                       // arête éclairée
      for (var gx = t[0] + 3; gx < t[0] + t[2] - 6; gx += 4) b.rect(gx, t[1] + 3, 2, t[3] - 5, "#c5d2f2"); // baies
    });
    b.rect(59, 24, 2, 8, "#9aaadb"); b.set(59, 23, "#ff8f98");      // antenne + balise
    // « Flèche annulaire » : tour fine traversée d'un anneau
    b.rect(106, 20, 8, 56, "#dde6fa"); b.rect(111, 20, 3, 56, "#b7c4ec"); b.rect(106, 20, 8, 1, "#ffffff");
    b.ellipse(110, 40, 11, 4, function (nx, ny) { return Math.abs(ny) > 0.55 ? "#aabbe8" : null; });
    b.rect(109, 12, 2, 9, "#9aaadb");
    // immeubles du premier plan
    for (x = 0; x < 160; x += 9 + Math.floor(rnd() * 7)) {
      w = 8 + Math.floor(rnd() * 8); h = 6 + Math.floor(rnd() * 12);
      tower(x, 84, w, h, "#eef3ff", "#cfdaf6", "#ffffff");
    }
    return b.outline("#9fb0dc");
  }

  /** Terre + canyon + cité (300×105, transparent au-dessus du sol de jeu). */
  function landSprite() {
    var b = new Buf(300, 105), rnd = seeded(31), x, y, i;
    mesaRow(b, 54, 66, 5, { top: "#d4c9e6", a: "#b9b4d8", b: "#a9c6dc" });
    mesaRow(b, 61, 74, 8, { top: "#c3dcea", a: "#8fb6d0", b: "#9aa7d0" });
    // bande de forêt corail
    for (x = 92; x < 306; x += 3) {
      var bandTop = 71 + Math.floor(2.5 * Math.sin(x * 0.11) + rnd() * 3);
      b.ellipse(x, bandTop + 6, 5 + rnd() * 3, 5 + rnd() * 2, coralFill);
    }
    for (y = 76; y < 92; y++) for (x = 92; x < 300; x++) if (!b.get(x, y)) b.set(x, y, (x + y) % 5 === 0 ? "#c8405a" : "#e85060");
    // taches de feuillage en pied de falaise
    for (i = 0; i < 26; i++) b.ellipse(62 + rnd() * 70, 86 + rnd() * 9, 6 + rnd() * 4, 4 + rnd() * 2, coralFill);
    // falaise rouge à gauche
    b.paste(cliffBuf(), 0, 22);
    // enseigne « { } » (accolades en pixels)
    b.rect(136, 76, 1, 5, "#9fb0dc"); b.rect(153, 76, 1, 5, "#9fb0dc");
    b.rect(131, 68, 26, 9, "#e3ebfc"); b.rect(131, 68, 26, 1, "#ffffff");
    [[139, 70], [140, 71], [139, 72], [138, 73], [139, 74], [149, 70], [148, 71], [149, 72], [150, 73], [149, 74]]
      .forEach(function (p) { b.set(p[0], p[1], "#5d6fa8"); });
    b.set(141, 72, "#5d6fa8"); b.set(147, 72, "#5d6fa8");
    // cité
    b.paste(cityBuf(), 135, 21);
    // petits robots
    [[258, 98], [281, 97], [290, 99]].forEach(function (p) { b.rect(p[0], p[1], 3, 3, "#f0f4ff"); b.set(p[0] + 1, p[1] + 1, "#58a6ff"); });
    return mirrorX(b);
  }

  /** Lame de feuille de bananier : fuseau courbe, base sombre, pointe violette. */
  function blade(b, bx, by, tx, ty, W, bend, hi) {
    var N = 18, dx = tx - bx, dy = ty - by, len = Math.sqrt(dx * dx + dy * dy), px = -dy / len, py = dx / len, i;
    var L = [], R = [];
    for (i = 0; i <= N; i++) {
      var t = i / N, sx = bx + dx * t + px * bend * Math.sin(Math.PI * t), sy = by + dy * t + py * bend * Math.sin(Math.PI * t);
      var wd = W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)), 0.75) * (1 - 0.25 * t);
      L.push([sx + px * wd, sy + py * wd]); R.push([sx - px * wd, sy - py * wd]);
    }
    b.poly(L.concat(R.reverse()), function (x, y) {
      var t = ((x - bx) * dx + (y - by) * dy) / (len * len);
      return t > 0.62 ? hi : (t > 0.5 ? "#2f2150" : "#211733");
    });
  }

  /** Grappe de feuilles sombres qui s'élève dans le coin gauche. */
  function leavesCornerBuf() {
    var b = new Buf(64, 56);
    [[10, 56, 34, 3, 6, -5], [3, 56, 7, 14, 5, 5], [16, 56, 46, 22, 6, -7], [1, 56, 2, 30, 4, 3],
      [20, 56, 60, 40, 5, -6], [26, 56, 54, 52, 4, -4], [8, 56, 22, 18, 5, 4]].forEach(function (p) {
      blade(b, p[0], p[1], p[2], p[3], p[4], p[5], "#4a2f7a");
    });
    return b.outline("#0d0816");
  }

  /** Bande de lames basses le long du bord inférieur (cadre du premier plan). */
  function leavesBandBuf() {
    var b = new Buf(300, 14), rnd = seeded(19);
    for (var x = -6; x < 306; x += 17) {
      blade(b, x, 16, x + 9 + rnd() * 12, 3 + rnd() * 4, 6, (rnd() < 0.5 ? -1 : 1) * 3, "#3d2766");
    }
    b.rect(0, 12, 300, 2, "#150e24");
    return b.outline("#0d0816");
  }

  /** Palmier en plume (feuillage violet, folioles claires/sombres alternées). */
  function palmBuf() {
    var b = new Buf(46, 54), s;
    var cx = 23, cy = 17;
    b.line(22, 53, 22, cy, "#4a3358"); b.line(23, 53, 23, cy, "#6a4e7a"); b.line(24, 53, 24, cy, "#4a3358");
    for (s = 30; s < 53; s += 5) b.line(21, s, 25, s, "#3a2848"); // anneaux du tronc
    [-178, -154, -128, -100, -72, -46, -22, 2].forEach(function (deg, idx) {
      var a = deg * Math.PI / 180, L = 19 + (idx % 3) * 2, droop = 6 + (idx % 2) * 5, prev = null;
      for (s = 0; s <= 16; s++) {
        var t = s / 16, x = cx + Math.cos(a) * L * t, y = cy + Math.sin(a) * L * t + droop * t * t;
        b.set(x, y, "#6a4aa0");
        if (prev && s > 1) {
          var nx = -(y - prev[1]), ny = x - prev[0], m = Math.sqrt(nx * nx + ny * ny) || 1, ll = 5.4 * (1 - t * 0.5);
          b.line(x, y, x + nx / m * ll, y + ny / m * ll + 1.5, s % 2 ? "#5a3a94" : "#7a5ab4");
          b.line(x, y, x - nx / m * ll, y - ny / m * ll + 1.5, s % 2 ? "#3d2766" : "#4a2f7a");
        }
        prev = [x, y];
      }
    });
    return b.outline("#1a1040");
  }

  function coralTreeBuf() {
    var b = new Buf(36, 44), rnd = seeded(5), x, y, n;
    b.rect(15, 26, 6, 17, "#5a3a4a"); b.rect(15, 26, 2, 17, "#7a5062"); b.rect(19, 26, 2, 17, "#3f2a38");
    b.poly([[15, 40], [11, 43.5], [15, 43.5]], "#5a3a4a"); b.poly([[21, 40], [25, 43.5], [21, 43.5]], "#3f2a38");
    [[9, 21, 8, 7], [27, 21, 8, 7], [18, 22, 13, 8], [18, 13, 12, 10], [11, 14, 7, 6]].forEach(function (p) {
      b.ellipse(p[0], p[1], p[2], p[3], coralFill);
    });
    for (n = 0; n < 40; n++) {
      x = 3 + Math.floor(rnd() * 30); y = 3 + Math.floor(rnd() * 26);
      var c = b.get(x, y);
      if (c === "#f06a78" || c === "#ff8f98") b.set(x, y, rnd() < 0.6 ? "#ffb3b8" : "#ffd0d3");
      else if (c === "#c8405a") b.set(x, y, "#a8334b");
    }
    return b.outline("#6a2236");
  }

  function bushBuf() {
    var b = new Buf(24, 14);
    [[7, 9, 7, 4.6], [17, 9, 7, 4.6], [12, 6.5, 8, 5.2]].forEach(function (p) { b.ellipse(p[0], p[1], p[2], p[3], coralFill); });
    [[6, 6], [11, 3], [16, 6], [9, 8], [14, 9]].forEach(function (p) { b.set(p[0], p[1], "#ffb3b8"); });
    [[8, 10, "#f0f4ff"], [18, 8, "#9ecbff"], [13, 11, "#f0f4ff"]].forEach(function (p) { b.set(p[0], p[1], p[2]); });
    return b.outline("#6a2236");
  }

  function tuftBuf(v) {
    var b = new Buf(8, 6);
    var blades = v ? [[1, 4], [3, 5], [5, 3], [6, 4]] : [[2, 3], [3, 5], [5, 4], [6, 2]];
    blades.forEach(function (bl) {
      for (var y = 0; y < bl[1]; y++) b.set(bl[0], 5 - y, y === bl[1] - 1 ? (v ? "#e0d890" : "#ff9aa2") : (v ? "#a89c5a" : "#e8505a"));
    });
    return b;
  }

  function mushroomBuf() {
    var b = new Buf(10, 10);
    b.rect(4, 6, 2, 4, "#c9d1d9"); b.rect(4, 6, 1, 4, "#f0f6fc");
    b.ellipse(5, 5, 4.4, 3.6, function (nx, ny) { return nx * 0.4 + ny * 0.8 < -0.2 ? "#7ee0ff" : "#39c5cf"; });
    b.rect(0, 6, 10, 1, null);
    [[3, 3], [6, 4], [5, 2]].forEach(function (p) { b.set(p[0], p[1], "#f0f6fc"); });
    return b.outline("#0a2a33");
  }

  function flowerBuf(petal) {
    var b = new Buf(6, 9);
    b.rect(3, 4, 1, 5, "#7a8a5a"); b.set(2, 6, "#7a8a5a"); b.set(4, 7, "#7a8a5a");
    b.set(3, 1, petal); b.set(2, 2, petal); b.set(4, 2, petal); b.set(3, 3, petal); b.set(3, 2, "#e3b341");
    return b;
  }

  /** Dalle de pierre beige posée sur le plateau (clin d'œil à l'illustration). */
  function rockBuf() {
    var b = new Buf(14, 9);
    b.ellipse(7, 5.4, 6.4, 3.8, function (nx, ny) {
      var s = nx * 0.5 + ny * 0.9; return s < -0.35 ? "#d4b896" : s < 0.35 ? "#b99a7a" : "#8a6f58";
    });
    b.set(4, 3, "#ecd8bc"); b.set(5, 3, "#ecd8bc"); b.set(10, 6, "#6e5848");
    return b.outline("#3a2a30");
  }

  function signBuf() {
    var b = new Buf(18, 28);
    b.rect(8, 11, 3, 17, "#5a3a4a"); b.rect(8, 11, 1, 17, "#7a5062");
    b.rect(0, 1, 18, 11, "#a1713b");
    b.rect(0, 1, 18, 1, "#c28f52"); b.rect(0, 11, 18, 1, "#7a5230");
    b.rect(1, 3, 16, 7, "#1d1530");
    [[1, 2], [16, 2], [1, 10], [16, 10]].forEach(function (p) { b.set(p[0], p[1], "#d29922"); });
    return b.outline("#120a20");
  }

  function torchBuf() {
    var b = new Buf(8, 20);
    b.rect(3, 6, 2, 14, "#5a3a4a"); b.rect(3, 6, 1, 14, "#7a5062");
    b.poly([[0.5, 2.5], [7.5, 2.5], [6, 7], [2, 7]], "#6a5878");
    b.rect(0, 2, 8, 1, "#8a78a0");
    return b.outline("#120a20");
  }

  /** Plateau de roche mauve (tuiles 16×16 affichées ×2). */
  function groundSprites() {
    var out = {}, rnd = seeded(23);
    for (var v = 0; v < 3; v++) {
      var g = makeCanvas(16, 16), d = makeCanvas(16, 16), i;
      g.ctx.fillStyle = "#7e5563"; g.ctx.fillRect(0, 0, 16, 16);
      g.ctx.fillStyle = "#946a74"; g.ctx.fillRect(0, 0, 16, 3);
      g.ctx.fillStyle = "#b08088"; g.ctx.fillRect(0, 0, 16, 1);
      g.ctx.fillStyle = "#6a4757"; g.ctx.fillRect(0, 3, 16, 1);
      for (i = 0; i < 4; i++) {
        g.ctx.fillStyle = "#a8747c"; g.ctx.fillRect(Math.floor(rnd() * 14), 1 + Math.floor(rnd() * 2), 2, 1);
      }
      g.ctx.fillStyle = "#6a4757";
      for (i = 0; i < 3; i++) g.ctx.fillRect(Math.floor(rnd() * 12), 6 + Math.floor(rnd() * 9), 2 + v % 2, 1);
      g.ctx.fillStyle = "#58394a"; g.ctx.fillRect(Math.floor(rnd() * 12), 12, 3, 1);
      d.ctx.fillStyle = "#5a3b4b"; d.ctx.fillRect(0, 0, 16, 16);
      d.ctx.fillStyle = "#6a4757";
      for (i = 0; i < 4; i++) d.ctx.fillRect(Math.floor(rnd() * 13), Math.floor(rnd() * 14), 3, 1);
      d.ctx.fillStyle = "#4a2f3f"; d.ctx.fillRect(Math.floor(rnd() * 12), Math.floor(rnd() * 12), 2, 2);
      out["grass" + v] = g.c;
      out["dirt" + v] = d.c;
    }
    return out;
  }

  function radialSprite(size, inner, outer, stop) {
    var cv = makeCanvas(size, size), ctx = cv.ctx;
    ctx.imageSmoothingEnabled = true;
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner); g.addColorStop(stop == null ? 1 : stop, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return cv.c;
  }

  function vignetteSprite() {
    var cv = makeCanvas(600, 250), ctx = cv.ctx;
    ctx.imageSmoothingEnabled = true;
    var g = ctx.createRadialGradient(300, 125, 120, 300, 125, 380);
    g.addColorStop(0, "rgba(26,16,64,0)"); g.addColorStop(1, "rgba(26,16,64,0.42)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 250);
    return cv.c;
  }

  /* ====================================================================
   * Enregistrement dans KAPLAY
   * ================================================================== */

  function registerAll(k) {
    [0, 1, 2, 3].forEach(function (skin) { // une planche par apparence ; le moteur choisit selon le tour (voir « octo-sN »)
      k.loadSprite(skin ? "octo-s" + skin : "octo", sheet(octoFrames(skin), 24, 24), {
        sliceX: 10,
        anims: {
          idle: { from: 0, to: 1, loop: true, speed: 2 },
          run: { from: 2, to: 5, loop: true, speed: 12 },
          success: { from: 6, to: 7, loop: true, speed: 6 },
          fail: { from: 8, to: 9, loop: true, speed: 6 },
          jump: { from: 4, to: 4 },
          atk: { from: 5, to: 5 },
          hurt: { from: 8, to: 8 }
        }
      });
    });
    k.loadSprite("glitch", sheet([glitchBuf("idle", 7), glitchBuf("idle", 31), glitchBuf("attack", 5), glitchBuf("hurt", 3)], 24, 24), {
      sliceX: 4,
      anims: {
        idle: { from: 0, to: 1, loop: true, speed: 5 },
        attack: { from: 2, to: 2 },
        hurt: { from: 3, to: 3 }
      }
    });
    k.loadSprite("portal", sheet([
      portalBuf("closed", 0), portalBuf("opening", 0.5),
      portalBuf("open", 0), portalBuf("open", 1.6), portalBuf("open", 3.2)
    ], 32, 40), {
      sliceX: 5,
      anims: {
        closed: { from: 0, to: 0 },
        opening: { from: 1, to: 1 },
        open: { from: 2, to: 4, loop: true, speed: 6 }
      }
    });
    k.loadSprite("sky", single(skySprite()));
    k.loadSprite("land", single(landSprite()));
    k.loadSprite("cloud0", single(cloudBuf(64, 26, 11)));
    k.loadSprite("cloud1", single(cloudBuf(48, 20, 12)));
    k.loadSprite("leavesCorner", single(leavesCornerBuf()));
    k.loadSprite("leavesBand", single(leavesBandBuf()));
    k.loadSprite("tree", single(coralTreeBuf()));
    k.loadSprite("palm", single(palmBuf()));
    k.loadSprite("bush", single(bushBuf()));
    k.loadSprite("tuft0", single(tuftBuf(0)));
    k.loadSprite("tuft1", single(tuftBuf(1)));
    k.loadSprite("mushroom", single(mushroomBuf()));
    k.loadSprite("flower0", single(flowerBuf("#f778ba")));
    k.loadSprite("flower1", single(flowerBuf("#f0f4ff")));
    k.loadSprite("rock", single(rockBuf()));
    k.loadSprite("sign", single(signBuf()));
    k.loadSprite("torch", single(torchBuf()));
    var gr = groundSprites();
    Object.keys(gr).forEach(function (name) { k.loadSprite(name, gr[name]); });
    k.loadSprite("glow", radialSprite(64, "rgba(255,255,255,1)", "rgba(255,255,255,0)", 1));
    k.loadSprite("vignette", vignetteSprite());
  }

  window.OctoSprites = {
    registerAll: registerAll, palette: C, Buf: Buf, single: single, sheet: sheet, seeded: seeded,
    // constructeurs réutilisés par les autres mondes (sprites-worlds.js) : même dessin, autres couleurs
    builders: { bushBuf: bushBuf, tuftBuf: tuftBuf, mushroomBuf: mushroomBuf, flowerBuf: flowerBuf, rockBuf: rockBuf, signBuf: signBuf, torchBuf: torchBuf, glitchBuf: glitchBuf, portalBuf: portalBuf, cloudBuf: cloudBuf, BAYER: BAYER }
  };
})();
