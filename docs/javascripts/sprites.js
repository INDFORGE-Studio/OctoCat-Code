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
  Buf.prototype.draw = function (ctx, ox, oy) {
    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        var c = this.d[y * this.w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
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
    return cv.c.toDataURL();
  }

  function single(buf) {
    var cv = makeCanvas(buf.w, buf.h);
    buf.draw(cv.ctx, 0, 0);
    return cv.c.toDataURL();
  }

  /* ====================================================================
   * OctoCat (24×24, 10 frames) : chat-pieuvre violet
   * ================================================================== */

  var O = {
    P: "#8957e5", L: "#b392f0", D: "#6e40c9", DD: "#5a32a3", K: "#1a0f3a",
    pink: "#ff8fb1", W: "#f0f6fc", E: "#0d1117"
  };

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

    // museau + bouche
    b.rect(11, cy + 2, 2, 1, O.pink);
    if (o.mouth === "open") { b.rect(11, cy + 3, 2, 2, O.E); b.set(11, cy + 4, O.pink); }
    else if (o.mouth === "frown") { b.set(10, cy + 4, O.E); b.set(11, cy + 3, O.E); b.set(12, cy + 3, O.E); b.set(13, cy + 4, O.E); }
    else { b.set(10, cy + 3, O.E); b.set(11, cy + 4, O.E); b.set(12, cy + 4, O.E); b.set(13, cy + 3, O.E); }

    return b.outline(O.K);
  }

  function octoFrames() {
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

  var G = { R: "#da3633", L: "#f85149", D: "#8e1519", K: "#2a0a0c", Y: "#e3b341", W: "#f0f6fc", g: "#3fb950", c: "#39c5cf", m: "#f778ba" };

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
   * Décor
   * ================================================================== */

  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  /** Ciel nocturne 300×106 (affiché ×2) : dégradé tramé, étoiles, lune, collines, lisière. */
  function backgroundSprite() {
    var W = 300, H = 106, b = new Buf(W, H), x, y, i, rnd = seeded(11);
    var stops = ["#03050a", "#060b16", "#0a1426", "#0f2038", "#16303f", "#1e4547", "#265a50"];
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var f = (y / (H - 1)) * (stops.length - 1), lo = Math.min(stops.length - 2, Math.floor(f)), fr = f - lo;
        b.set(x, y, stops[lo + ((BAYER[y & 3][x & 3] + 0.5) / 16 < fr ? 1 : 0)]);
      }
    }
    // étoiles
    for (i = 0; i < 60; i++) {
      var sx = Math.floor(rnd() * W), sy = Math.floor(rnd() * 62), br = rnd();
      b.set(sx, sy, br > 0.8 ? "#f0f6fc" : br > 0.45 ? "#9ecbff" : "#4d6a8f");
      if (br > 0.93) { b.set(sx - 1, sy, "#4d6a8f"); b.set(sx + 1, sy, "#4d6a8f"); b.set(sx, sy - 1, "#4d6a8f"); b.set(sx, sy + 1, "#4d6a8f"); }
    }
    // lune + halo tramé
    var mx = 232, my = 27;
    for (y = my - 26; y <= my + 26; y++) for (x = mx - 26; x <= mx + 26; x++) {
      var d = Math.sqrt((x - mx) * (x - mx) + (y - my) * (y - my));
      if (d > 12 && d < 26 && (BAYER[y & 3][x & 3] + 0.5) / 16 < (26 - d) / 14 * 0.45) b.set(x, y, "#1a3c5c");
    }
    b.ellipse(mx, my, 11, 11, function (nx, ny) { return nx * 0.6 + ny * 0.4 > 0.45 ? "#b8c4d0" : "#e6edf3"; });
    [[-4, -3, 2], [3, 3, 2.4], [2, -5, 1.4], [-5, 4, 1.5]].forEach(function (c) { b.ellipse(mx + c[0], my + c[1], c[2], c[2], "#c3ccd6"); });
    // collines lointaines
    for (x = 0; x < W; x++) {
      var h1 = 74 + 7 * Math.sin(x * 0.022 + 0.6) + 4 * Math.sin(x * 0.061 + 2);
      for (y = Math.floor(h1); y < H; y++) b.set(x, y, "#0c2030");
      var h2 = 86 + 5 * Math.sin(x * 0.03 + 3) + 3 * Math.sin(x * 0.09);
      for (y = Math.floor(h2); y < H; y++) b.set(x, y, "#0a1a28");
    }
    // lisière de sapins lointains
    function pineSil(px, base, hgt, col) {
      var w = hgt * 0.32;
      for (var tier = 0; tier < 3; tier++) {
        var ty = base - hgt + tier * hgt * 0.26, tw = w * (0.5 + tier * 0.28);
        b.poly([[px, ty], [px - tw, ty + hgt * 0.4], [px + tw, ty + hgt * 0.4]], col);
      }
      b.rect(Math.round(px) - 1, base - 2, 2, 3, col);
    }
    for (x = -4; x < W + 8; x += 9 + Math.floor(rnd() * 8)) pineSil(x, 98, 16 + Math.floor(rnd() * 12), "#081420");
    for (x = 2; x < W + 8; x += 12 + Math.floor(rnd() * 10)) pineSil(x, 104, 20 + Math.floor(rnd() * 12), "#050c14");
    for (y = 100; y < H; y++) for (x = 0; x < W; x++) b.set(x, y, "#050c14");
    return b;
  }

  function oakBuf() {
    var b = new Buf(36, 44), rnd = seeded(5), x, y;
    // tronc + racines
    b.rect(15, 26, 6, 17, "#6b4423"); b.rect(15, 26, 2, 17, "#8a5a2e"); b.rect(19, 26, 2, 17, "#4f321a");
    b.poly([[15, 40], [11, 43.5], [15, 43.5]], "#6b4423");
    b.poly([[21, 40], [25, 43.5], [21, 43.5]], "#4f321a");
    // feuillage en blobs ombrés
    function blob(cx, cy, rx, ry) {
      b.ellipse(cx, cy, rx, ry, function (nx, ny) {
        var s = nx * 0.5 + ny * 0.85;
        return s < -0.45 ? "#2ea043" : s < 0.15 ? "#238636" : "#196c2e";
      });
    }
    blob(9, 21, 8, 7); blob(27, 21, 8, 7); blob(18, 22, 13, 8); blob(18, 13, 12, 10); blob(11, 14, 7, 6);
    for (var n = 0; n < 46; n++) {
      x = 3 + Math.floor(rnd() * 30); y = 3 + Math.floor(rnd() * 26);
      var c = b.get(x, y);
      if (c === "#238636" || c === "#2ea043") b.set(x, y, rnd() < 0.6 ? "#3fb950" : "#56d364");
      else if (c === "#196c2e") b.set(x, y, "#145a26");
    }
    return b.outline("#0b2a14");
  }

  function pineBuf() {
    var b = new Buf(26, 44), x, y;
    b.rect(11, 36, 4, 7, "#6b4423"); b.rect(11, 36, 1, 7, "#8a5a2e");
    var tiers = [[[13, 1], [5, 15], [21, 15]], [[13, 9], [3, 26], [23, 26]], [[13, 18], [1, 37], [25, 37]]];
    tiers.forEach(function (t) {
      b.poly(t, function (px, py) {
        var lit = px < 12 ? 1 : 0;
        return lit ? ((px + py) % 4 === 0 ? "#3fb950" : "#2ea043") : ((px + py) % 3 === 0 ? "#145a26" : "#196c2e");
      });
    });
    for (y = 0; y < 44; y++) for (x = 0; x < 26; x++) if (b.get(x, y) === "#2ea043" && (x + y * 2) % 9 === 0) b.set(x, y, "#56d364");
    return b.outline("#0b2a14");
  }

  function bushBuf() {
    var b = new Buf(24, 14);
    function blob(cx, cy, rx, ry) {
      b.ellipse(cx, cy, rx, ry, function (nx, ny) {
        var s = nx * 0.5 + ny * 0.85;
        return s < -0.4 ? "#2ea043" : s < 0.2 ? "#238636" : "#196c2e";
      });
    }
    blob(7, 9, 7, 4.6); blob(17, 9, 7, 4.6); blob(12, 6.5, 8, 5.2);
    [[6, 6], [11, 3], [16, 6], [9, 8], [14, 9]].forEach(function (p) { b.set(p[0], p[1], "#56d364"); });
    [[8, 10, "#f778ba"], [18, 8, "#d29922"], [13, 11, "#f778ba"]].forEach(function (p) { b.set(p[0], p[1], p[2]); });
    return b.outline("#0b2a14");
  }

  function tuftBuf(v) {
    var b = new Buf(8, 6);
    var blades = v ? [[1, 4], [3, 5], [5, 3], [6, 4]] : [[2, 3], [3, 5], [5, 4], [6, 2]];
    blades.forEach(function (bl) {
      for (var y = 0; y < bl[1]; y++) b.set(bl[0], 5 - y, y === bl[1] - 1 ? "#56d364" : "#2ea043");
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
    b.rect(3, 4, 1, 5, "#2ea043"); b.set(2, 6, "#2ea043"); b.set(4, 7, "#2ea043");
    b.set(3, 1, petal); b.set(2, 2, petal); b.set(4, 2, petal); b.set(3, 3, petal); b.set(3, 2, "#e3b341");
    return b;
  }

  function rockBuf() {
    var b = new Buf(14, 9);
    b.ellipse(7, 5.4, 6.4, 3.8, function (nx, ny) {
      var s = nx * 0.5 + ny * 0.9; return s < -0.35 ? "#6e7681" : s < 0.35 ? "#484f58" : "#30363d";
    });
    b.set(4, 3, "#8b949e"); b.set(5, 3, "#8b949e"); b.set(10, 6, "#21262d");
    return b.outline("#010409");
  }

  function signBuf() {
    var b = new Buf(18, 28);
    b.rect(8, 11, 3, 17, "#6b4423"); b.rect(8, 11, 1, 17, "#8a5a2e");
    b.rect(0, 1, 18, 11, "#a1713b");
    b.rect(0, 1, 18, 1, "#c28f52"); b.rect(0, 11, 18, 1, "#7a5230");
    b.rect(1, 3, 16, 7, "#161b22");
    [[1, 2], [16, 2], [1, 10], [16, 10]].forEach(function (p) { b.set(p[0], p[1], "#d29922"); });
    return b.outline("#010409");
  }

  function torchBuf() {
    var b = new Buf(8, 20);
    b.rect(3, 6, 2, 14, "#6b4423"); b.rect(3, 6, 1, 14, "#8a5a2e");
    b.poly([[0.5, 2.5], [7.5, 2.5], [6, 7], [2, 7]], "#484f58");
    b.rect(0, 2, 8, 1, "#6e7681");
    return b.outline("#010409");
  }

  function groundSprites() {
    var out = {}, rnd = seeded(23);
    for (var v = 0; v < 3; v++) {
      var g = makeCanvas(16, 16), d = makeCanvas(16, 16), i;
      g.ctx.fillStyle = "#21262d"; g.ctx.fillRect(0, 0, 16, 16);
      g.ctx.fillStyle = "#238636"; g.ctx.fillRect(0, 0, 16, 4);
      g.ctx.fillStyle = "#2ea043"; g.ctx.fillRect(0, 0, 16, 2);
      g.ctx.fillStyle = "#3fb950"; g.ctx.fillRect(0, 0, 16, 1);
      g.ctx.fillStyle = "#196c2e"; g.ctx.fillRect(0, 4, 16, 1);
      for (i = 0; i < 4; i++) {
        var gx = Math.floor(rnd() * 15);
        g.ctx.fillStyle = "#56d364"; g.ctx.fillRect(gx, 0, 1, 1);
        g.ctx.fillStyle = "#145a26"; g.ctx.fillRect(gx + 1, 3, 1, 1);
      }
      g.ctx.fillStyle = "#30363d";
      for (i = 0; i < 3; i++) g.ctx.fillRect(Math.floor(rnd() * 12), 7 + Math.floor(rnd() * 8), 2 + v % 2, 1);
      g.ctx.fillStyle = "#161b22";
      g.ctx.fillRect(Math.floor(rnd() * 12), 12, 3, 1);
      d.ctx.fillStyle = "#161b22"; d.ctx.fillRect(0, 0, 16, 16);
      d.ctx.fillStyle = "#21262d";
      for (i = 0; i < 4; i++) d.ctx.fillRect(Math.floor(rnd() * 13), Math.floor(rnd() * 14), 3, 1);
      d.ctx.fillStyle = "#30363d";
      d.ctx.fillRect(Math.floor(rnd() * 12), Math.floor(rnd() * 12), 2, 2);
      d.ctx.fillStyle = "#6b4423";
      if (v === 1) { d.ctx.fillRect(2, 3, 5, 1); d.ctx.fillRect(6, 4, 1, 3); }
      out["grass" + v] = g.c.toDataURL();
      out["dirt" + v] = d.c.toDataURL();
    }
    return out;
  }

  function radialSprite(size, inner, outer, stop) {
    var cv = makeCanvas(size, size), ctx = cv.ctx;
    ctx.imageSmoothingEnabled = true;
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner); g.addColorStop(stop == null ? 1 : stop, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return cv.c.toDataURL();
  }

  function vignetteSprite() {
    var cv = makeCanvas(600, 250), ctx = cv.ctx;
    ctx.imageSmoothingEnabled = true;
    var g = ctx.createRadialGradient(300, 125, 90, 300, 125, 360);
    g.addColorStop(0, "rgba(1,4,9,0)"); g.addColorStop(1, "rgba(1,4,9,0.7)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 250);
    return cv.c.toDataURL();
  }

  /* ====================================================================
   * Enregistrement dans KAPLAY
   * ================================================================== */

  function registerAll(k) {
    k.loadSprite("octo", sheet(octoFrames(), 24, 24), {
      sliceX: 10,
      anims: {
        idle: { from: 0, to: 1, loop: true, speed: 2 },
        run: { from: 2, to: 5, loop: true, speed: 12 },
        success: { from: 6, to: 7, loop: true, speed: 6 },
        fail: { from: 8, to: 9, loop: true, speed: 6 }
      }
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
    k.loadSprite("bg", single(backgroundSprite()));
    k.loadSprite("oak", single(oakBuf()));
    k.loadSprite("pine", single(pineBuf()));
    k.loadSprite("bush", single(bushBuf()));
    k.loadSprite("tuft0", single(tuftBuf(0)));
    k.loadSprite("tuft1", single(tuftBuf(1)));
    k.loadSprite("mushroom", single(mushroomBuf()));
    k.loadSprite("flower0", single(flowerBuf("#f778ba")));
    k.loadSprite("flower1", single(flowerBuf("#f0f6fc")));
    k.loadSprite("rock", single(rockBuf()));
    k.loadSprite("sign", single(signBuf()));
    k.loadSprite("torch", single(torchBuf()));
    var gr = groundSprites();
    Object.keys(gr).forEach(function (name) { k.loadSprite(name, gr[name]); });
    k.loadSprite("glow", radialSprite(64, "rgba(255,255,255,1)", "rgba(255,255,255,0)", 1));
    k.loadSprite("vignette", vignetteSprite());
  }

  window.OctoSprites = { registerAll: registerAll, palette: C };
})();
