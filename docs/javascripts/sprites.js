/* OctoCat-Code — Asset pipeline (pixel art procédural)
 * Les sprites sont dessinés au chargement sur des <canvas> hors-écran puis passés
 * à KAPLAY sous forme de data-URL. Remplacer par de vrais PNG revient à changer
 * l'argument de loadSprite() dans registerAll().
 * Palette : GitHub Dark.
 */
(function () {
  "use strict";

  var C = {
    K: "#010409", // contour
    P: "#8957e5", // corps OctoCat
    L: "#a371f7",
    W: "#f0f6fc",
    N: "#ff7b9c", // museau
    R: "#da3633", // glitch
    r: "#f85149",
    Y: "#d29922",
    G: "#3fb950",
    C: "#39c5cf",
    B: "#58a6ff"
  };

  /* ---------- utilitaires ---------- */

  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return { c: c, ctx: ctx };
  }

  function norm(row, w) {
    row = row || "";
    while (row.length < w) row += ".";
    return row.slice(0, w);
  }

  function drawGrid(ctx, grid, ox, oy, dy, remap) {
    dy = dy || 0;
    for (var y = 0; y < grid.length; y++) {
      for (var x = 0; x < grid[y].length; x++) {
        var ch = grid[y][x];
        if (ch === ".") continue;
        if (remap && remap[ch]) ch = remap[ch];
        var col = C[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x, oy + y + dy, 1, 1);
      }
    }
  }

  function flip(rows) {
    return rows.map(function (r) { return r.split("").reverse().join(""); });
  }

  function seeded(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function overlay(grid, row, col, text) {
    var r = grid[row].split("");
    for (var i = 0; i < text.length; i++) r[col + i] = text[i];
    grid[row] = r.join("");
  }

  /* ---------- OctoCat (16×16, 10 frames) ---------- */

  var HEAD = [
    "..KK........KK..",
    ".KPPK......KPPK.",
    ".KPPPKKKKKKPPPK.",
    ".KPPPPPPPPPPPPK.",
    "KPPPPPPPPPPPPPPK",
    "KPPPPPPPPPPPPPPK",
    "KPPPPPPPPPPPPPPK",
    "KPPPPPPPNNPPPPPK",
    ".KPPPPPPPPPPPPK.",
    "..KKPPPPPPPPKK..",
    "...KPPPPPPPPK..."
  ];

  var LEGS = {
    stand: [
      ".KPPKPPPPPPKPPK.",
      ".KPK.KPPPPK.KPK.",
      "KPK..KPKKPK..KPK",
      "KPK.KPK..KPK.KPK",
      ".K..K......K..K."
    ],
    runB: [
      ".KPPKPPPPPPKPPK.",
      "KPPK.KPPPPK.KPK.",
      "KPK..KPKKPK..KK.",
      "KK..KPK..KPK....",
      "....K......K...."
    ],
    runC: [
      ".KPPKPPPPPPKPPK.",
      "..KPKKPPPPKKPK..",
      "..KPK.KPPK.KPK..",
      "...KK.KPPK.KK...",
      "......KKKK......"
    ]
  };

  var EYES = {
    open: { l: ["WW", "WK"], r: ["WW", "KW"] },
    blink: { l: ["PP", "KK"], r: ["PP", "KK"] },
    happy: { l: ["PK", "KP"], r: ["KP", "PK"] },
    dead: { l: ["KR", "RK"], r: ["RK", "KR"] }
  };

  function octoFrame(eyes, legs, dy) {
    var g = HEAD.concat(legs).map(function (r) { return norm(r, 16); });
    overlay(g, 4, 4, eyes.l[0]); overlay(g, 5, 4, eyes.l[1]);
    overlay(g, 4, 10, eyes.r[0]); overlay(g, 5, 10, eyes.r[1]);
    return { grid: g, dy: dy || 0 };
  }

  function octoFrames() {
    return [
      octoFrame(EYES.open, LEGS.stand, 0),            // 0 idle
      octoFrame(EYES.blink, LEGS.stand, 1),           // 1 idle (respire)
      octoFrame(EYES.open, LEGS.runB, 0),             // 2-5 run
      octoFrame(EYES.open, LEGS.runC, 1),
      octoFrame(EYES.open, flip(LEGS.runB), 0),
      octoFrame(EYES.open, LEGS.runC, 1),
      octoFrame(EYES.happy, LEGS.stand, 0),           // 6-7 success
      octoFrame(EYES.happy, LEGS.runC, 0),
      octoFrame(EYES.dead, LEGS.stand, 0),            // 8-9 fail
      octoFrame(EYES.dead, LEGS.stand, 1)
    ];
  }

  function octoSheet() {
    var frames = octoFrames();
    var cv = makeCanvas(16 * frames.length, 16);
    frames.forEach(function (f, i) { drawGrid(cv.ctx, f.grid, i * 16, 0, f.dy); });
    return cv.c.toDataURL();
  }

  /* ---------- Glitch (16×16, 4 frames) ---------- */

  var GLITCH = [
    "....KKKKKKKK....",
    "...KRRRRRRRRK...",
    "..KRRRRRRRRRRK..",
    ".KRRRRRRRRRRRRK.",
    ".KRRYYRRRRYYRRK.",
    ".KRRYKRRRRKYRRK.",
    ".KRRRRRRRRRRRRK.",
    ".KRRRRRRRRRRRRK.",
    ".KRRKWKWKWKWKRK.",
    ".KRRKKKKKKKKKRK.",
    ".KRRRRRRRRRRRRK.",
    "..KRRRRRRRRRRK..",
    "..KRRKRRRRKRRK..",
    "..KRK.KRRK.KRK..",
    "...K...KK...K...",
    "................"
  ];

  function glitchFrame(kind, seed) {
    var g = GLITCH.map(function (r) { return norm(r, 16); });
    var rnd = seeded(seed);
    if (kind === "attack") {
      for (var y = 8; y <= 10; y++) overlay(g, y, 4, "KKKKKKKKKK");
      overlay(g, 8, 4, "KWKWKWKWKW"); overlay(g, 10, 4, "WKWKWKWKWK");
      overlay(g, 4, 4, "YY"); overlay(g, 4, 10, "YY"); // yeux plissés
    }
    // tranches horizontales décalées + pixels corrompus
    var out = g.map(function (row, idx) {
      if (kind === "hurt") return row.replace(/[^.]/g, function (ch, i) { return (i + idx) % 2 ? "W" : "r"; });
      if (rnd() < 0.28) {
        var s = rnd() < 0.5 ? -1 : 1;
        row = s > 0 ? "." + row.slice(0, 15) : row.slice(1) + ".";
      }
      return row;
    });
    if (kind !== "hurt") {
      for (var n = 0; n < 6; n++) {
        var yy = 1 + Math.floor(rnd() * 12), xx = 2 + Math.floor(rnd() * 12);
        if (out[yy][xx] !== ".") overlay(out, yy, xx, rnd() < 0.5 ? "G" : "C");
      }
    }
    return out;
  }

  function glitchSheet() {
    var frames = [glitchFrame("idle", 7), glitchFrame("idle", 31), glitchFrame("attack", 5), glitchFrame("hurt", 3)];
    var cv = makeCanvas(16 * frames.length, 16);
    frames.forEach(function (g, i) { drawGrid(cv.ctx, g, i * 16, 0, 0); });
    return cv.c.toDataURL();
  }

  /* ---------- Portail (32×40, 5 frames) ---------- */

  function portalFrame(ctx, ox, mode, phase) {
    var W = 32, H = 40, cx = 16, cy = 16;
    var swirl = [C.B, C.C, C.G, "#bc8cff"];
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var dx = x - cx + 0.5, dy = y - cy + 0.5;
        var d2 = dx * dx + dy * dy;
        var outer = y < cy ? d2 < 14 * 14 : x >= 2 && x < 30;
        var inner = y < cy ? d2 < 10 * 10 : x >= 6 && x < 26;
        if (!outer) continue;
        if (!inner) {
          ctx.fillStyle = ((x + y) % 7 === 0) ? "#484f58" : "#30363d";
          if (y < cy && d2 > 12.5 * 12.5) ctx.fillStyle = "#21262d";
          ctx.fillRect(ox + x, y, 1, 1);
          continue;
        }
        if (mode === "closed") {
          ctx.fillStyle = (y % 4 === 0) ? "#21262d" : "#0d1117";
          if ((x + 2) % 5 === 0) ctx.fillStyle = "#161b22";
        } else {
          var r = Math.sqrt(d2), a = Math.atan2(dy, dx);
          var v = Math.sin(r * 0.75 - phase * 2) + Math.sin(a * 3 + phase);
          var idx = Math.floor(((v + 2) / 4) * swirl.length) % swirl.length;
          ctx.fillStyle = mode === "opening" ? (idx % 2 ? "#161b22" : "#1f6feb") : swirl[idx];
        }
        ctx.fillRect(ox + x, y, 1, 1);
      }
    }
    if (mode === "closed") { // cadenas
      ctx.fillStyle = C.Y; ctx.fillRect(ox + 12, 22, 8, 7);
      ctx.fillStyle = "#9e6a03"; ctx.fillRect(ox + 12, 27, 8, 2);
      ctx.fillStyle = C.K; ctx.fillRect(ox + 15, 24, 2, 3);
      ctx.fillStyle = "#8b949e";
      ctx.fillRect(ox + 13, 17, 6, 1); ctx.fillRect(ox + 13, 18, 1, 4); ctx.fillRect(ox + 18, 18, 1, 4);
    }
  }

  function portalSheet() {
    var cv = makeCanvas(32 * 5, 40);
    portalFrame(cv.ctx, 0, "closed", 0);
    portalFrame(cv.ctx, 32, "opening", 0.5);
    portalFrame(cv.ctx, 64, "open", 0);
    portalFrame(cv.ctx, 96, "open", 1.6);
    portalFrame(cv.ctx, 128, "open", 3.2);
    return cv.c.toDataURL();
  }

  /* ---------- Décor ---------- */

  function treeSprite() {
    var cv = makeCanvas(24, 32), ctx = cv.ctx;
    ctx.fillStyle = "#5c3d1e"; ctx.fillRect(10, 20, 4, 12);
    ctx.fillStyle = "#7a5230"; ctx.fillRect(10, 20, 1, 12);
    function blob(cx, cy, r, col) {
      ctx.fillStyle = col;
      for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, 1, 1);
    }
    blob(12, 11, 9, "#196c2e");
    blob(6, 17, 5, "#196c2e");
    blob(18, 17, 5, "#196c2e");
    blob(10, 9, 6, "#238636");
    blob(8, 7, 3, "#2ea043");
    ctx.fillStyle = "#56d364";
    [[7, 6], [15, 10], [11, 15], [5, 16], [18, 15]].forEach(function (p) { ctx.fillRect(p[0], p[1], 1, 1); });
    return cv.c.toDataURL();
  }

  function groundSprites() {
    var g = makeCanvas(16, 16), d = makeCanvas(16, 16);
    g.ctx.fillStyle = "#21262d"; g.ctx.fillRect(0, 0, 16, 16);
    g.ctx.fillStyle = "#2ea043"; g.ctx.fillRect(0, 0, 16, 3);
    g.ctx.fillStyle = "#3fb950"; g.ctx.fillRect(0, 0, 16, 1);
    g.ctx.fillStyle = "#238636";
    [[2, 3], [7, 4], [12, 3]].forEach(function (p) { g.ctx.fillRect(p[0], p[1], 2, 1); });
    g.ctx.fillStyle = "#30363d";
    [[3, 9], [10, 7], [13, 12], [6, 13]].forEach(function (p) { g.ctx.fillRect(p[0], p[1], 2, 1); });
    d.ctx.fillStyle = "#161b22"; d.ctx.fillRect(0, 0, 16, 16);
    d.ctx.fillStyle = "#21262d";
    [[2, 4], [9, 2], [12, 9], [5, 12]].forEach(function (p) { d.ctx.fillRect(p[0], p[1], 3, 1); });
    return { grass: g.c.toDataURL(), dirt: d.c.toDataURL() };
  }

  /* ---------- Enregistrement dans KAPLAY ---------- */

  function registerAll(k) {
    k.loadSprite("octo", octoSheet(), {
      sliceX: 10,
      anims: {
        idle: { from: 0, to: 1, loop: true, speed: 2 },
        run: { from: 2, to: 5, loop: true, speed: 12 },
        success: { from: 6, to: 7, loop: true, speed: 6 },
        fail: { from: 8, to: 9, loop: true, speed: 6 }
      }
    });
    k.loadSprite("glitch", glitchSheet(), {
      sliceX: 4,
      anims: {
        idle: { from: 0, to: 1, loop: true, speed: 5 },
        attack: { from: 2, to: 2 },
        hurt: { from: 3, to: 3 }
      }
    });
    k.loadSprite("portal", portalSheet(), {
      sliceX: 5,
      anims: {
        closed: { from: 0, to: 0 },
        opening: { from: 1, to: 1 },
        open: { from: 2, to: 4, loop: true, speed: 6 }
      }
    });
    k.loadSprite("tree", treeSprite());
    var gr = groundSprites();
    k.loadSprite("grass", gr.grass);
    k.loadSprite("dirt", gr.dirt);
  }

  window.OctoSprites = { registerAll: registerAll, palette: C };
})();
