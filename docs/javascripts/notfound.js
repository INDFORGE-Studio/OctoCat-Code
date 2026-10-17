/* OctoCat-Code — Page 404 : « GAME NOT FOUND ».
 * Un écran plein écran, sans rien d'autre : « ERROR 404 » qui bugue (décalage cyan / magenta, tranches qui glissent), des nuages
 * en contour, et Laita qui court comme le dinosaure de la page d'erreur d'un grand navigateur… mais poursuivie par un monstre Glitch.
 * Le joueur MAINTIENT la touche « aller à droite » (celle de ses réglages) ou l'écran : Laita court, le Glitch reste à distance.
 * Au bout de quelques secondes elle rejoint OctoCat, lui saute dans les bras, une magie chasse le Glitch, puis retour au jeu.
 * Les textes sont dessinés avec des pixels (police 5x7 maison) : aucune image, aucun fichier.
 */
(function () {
  "use strict";

  var CYAN = "#18d8ff", MAGENTA = "#ff2d8a", WHITE = "#ffffff", NIGHT = "#0a0820";
  var RAINBOW = ["#ff5d73", "#ffb347", "#ffe066", "#7ee787", "#58d6ff", "#bc8cff", "#ff7eb6"];

  // police 5x7 : seulement les lettres dont on a besoin
  var FONT = {
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"]
  };

  /** Texte en cellules : pour chaque ligne de 7, la liste des segments pleins [début, longueur]. */
  function compile(text) {
    var rows = ["", "", "", "", "", "", ""], out = { w: 0, runs: [], off: [0, 0, 0, 0, 0, 0, 0] }, r;
    text.split("").forEach(function (ch, i) {
      var g = FONT[ch];
      for (r = 0; r < 7; r++) rows[r] += (i ? "0" : "") + (g ? g[r] : "000");
    });
    out.w = rows[0].length;
    rows.forEach(function (line) {
      var list = [], re = /1+/g, m;
      while ((m = re.exec(line))) list.push([m.index, m[0].length]);
      out.runs.push(list);
    });
    return out;
  }

  /** Contour d'un nuage : un ensemble de cercles, plat en bas ; on ne garde que les cellules du bord. */
  function cloudOutline(wc, hc, circles) {
    var fill = [], edge = [], x, y;
    for (y = 0; y < hc; y++) {
      fill.push([]);
      for (x = 0; x < wc; x++) fill[y].push(y <= hc - 2 && circles.some(function (c) { return (x - c[0]) * (x - c[0]) + (y - c[1]) * (y - c[1]) <= c[2] * c[2]; }));
    }
    function on(xx, yy) { return xx >= 0 && yy >= 0 && xx < wc && yy < hc && fill[yy][xx]; }
    for (y = 0; y < hc; y++) for (x = 0; x < wc; x++) if (fill[y][x] && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))) edge.push([x, y]);
    return { w: wc, h: hc, edge: edge };
  }
  var CLOUD_A = cloudOutline(22, 10, [[6, 6, 4], [11, 4, 5], [16, 6, 4], [11, 7, 4]]);
  var CLOUD_B = cloudOutline(16, 8, [[5, 5, 3], [9, 3, 4], [12, 5, 3], [8, 5, 3]]);

  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  window.gameEngine.registerScene("notfound", {
    alt: "Page 404, jeu introuvable : Laita court, poursuivie par un monstre Glitch, jusqu'aux bras d'OctoCat.",

    scene: function (k, h, ctx) {
      var M = window.OctoMusic, SET = window.OctoSettings, VW = k.width(), VH = k.height();
      var home = ctx.host.getAttribute("data-home") || "./";
      function rgb(hex) { return k.Color.fromHex(hex); }
      function sfx(n) { if (M && M.sfx) M.sfx(n); }

      // ----- mise en page : tout est calculé sur la taille logique de l'écran -----
      var S = VH >= 270 ? 3 : 2, GS = S + 1; // échelle d'OctoCat / Laita et du Glitch (entiers : pixels nets)
      var GY = Math.round(VH - Math.max(48, VH * 0.2)), BASE = GY + 4;
      var budget = BASE - 24 * GS + 8; // le texte peut frôler les piques du Glitch, mais jamais OctoCat
      var P4 = Math.max(4, Math.min(Math.floor((budget - 14) / 12.1), Math.floor(VW * 0.7 / 17)));
      var PE = Math.max(2, Math.round(P4 / 3)), PG = Math.max(2, Math.round(P4 * 0.4));
      var tError = compile("ERROR"), t404 = compile("404"), tGame = compile("GAME NOT FOUND");
      var stackH = 7 * (PE + P4 + PG) + Math.round(P4 * 0.9);
      var yError = Math.max(6, Math.round((budget - stackH) / 2 + 4)), y404 = yError + 7 * PE + Math.round(P4 * 0.45), yGame = y404 + 7 * P4 + Math.round(P4 * 0.45);

      var VMAX = 170, LX = Math.round(VW * 0.3), APPROACH = Math.min(240, Math.round(VW * 0.5)), D_TOTAL = Math.max(560, VW);
      var REACH = 26 * S;

      // ----- état -----
      var t = 0, d = 0, v = 0, phase = "chase", amp = 0.15, burst = 0, burstIn = 1.2, jitterIn = 0, gap = 90, hintOn = 1, idleFor = 0, tearY = -50, tearIn = 2, sawOcto = false;
      var holdKeys = {}, holdPtr = false, step = 0;
      var done = false;

      // ----- fond, texte qui bugue, nuages, signes, sol : un seul objet dessiné derrière les personnages -----
      var stars = [], floaters = [], clouds = [], i;
      for (i = 0; i < 34; i++) stars.push({ x: hash(i) * VW, y: hash(i + 50) * (GY - 20), p: hash(i + 9) * 6.28, s: 1 + Math.floor(hash(i + 3) * 1.99) });
      [["x", 0.07, 0.4, 7], ["dia", 0.14, 0.09, 8], ["o", 0.92, 0.5, 5], ["x", 0.64, 0.12, 6], ["dia", 0.9, 0.36, 8], ["dot", 0.1, 0.62, 3], ["dot", 0.8, 0.12, 3], ["o", 0.05, 0.14, 4], ["x", 0.95, 0.12, 5], ["dot", 0.5, 0.64, 3]].forEach(function (f, n) {
        floaters.push({ kind: f[0], x: f[1] * VW, y: f[2] * (GY - 10), s: Math.max(3, Math.round(f[3] * VH / 300)), p: n * 1.3 });
      });
      var CS = Math.max(2, Math.round(VH / 100));
      clouds.push({ c: CLOUD_A, x: VW * 0.12, y: VH * 0.1, sp: 5 }, { c: CLOUD_B, x: VW * 0.8, y: VH * 0.26, sp: 7 });

      function row(x, y, w, ht, hex, op) { k.drawRect({ pos: k.vec2(Math.round(x), Math.round(y)), width: w, height: ht, color: rgb(hex), opacity: op == null ? 1 : op }); }
      function drawGlitchText(T, cx, top, P, a) {
        var x0 = cx - T.w * P / 2;
        [[MAGENTA, 1], [CYAN, -1], [WHITE, 0]].forEach(function (L) {
          for (var r = 0; r < 7; r++) {
            var shift = Math.round(T.off[r] * P + L[1] * P * (0.45 + a * 0.9));
            T.runs[r].forEach(function (run) { row(x0 + shift + run[0] * P, top + r * P, run[1] * P, P, L[0]); });
          }
        });
      }
      function shuffle(T, a) { // chaque ligne de pixels peut glisser sur le côté : c'est ça, l'effet « écran qui bugue »
        for (var r = 0; r < 7; r++) T.off[r] = Math.random() < 0.08 + a * 0.5 ? (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * (0.8 + a * 2.5)) : 0;
      }
      function drawShape(kind, x, y, s, dx, hex) {
        var o = { color: rgb(hex), width: 2 };
        if (kind === "x") { k.drawLine({ p1: k.vec2(x - s + dx, y - s), p2: k.vec2(x + s + dx, y + s), width: o.width, color: o.color }); k.drawLine({ p1: k.vec2(x + s + dx, y - s), p2: k.vec2(x - s + dx, y + s), width: o.width, color: o.color }); }
        else if (kind === "dia") { var p = [[0, -s], [s, 0], [0, s], [-s, 0], [0, -s]]; for (var q = 0; q < 4; q++) k.drawLine({ p1: k.vec2(x + p[q][0] + dx, y + p[q][1]), p2: k.vec2(x + p[q + 1][0] + dx, y + p[q + 1][1]), width: o.width, color: o.color }); }
        else if (kind === "o") k.drawCircle({ pos: k.vec2(x + dx, y), radius: s, fill: false, outline: { width: o.width, color: o.color } });
        else k.drawCircle({ pos: k.vec2(x + dx, y), radius: s * 0.6, color: o.color });
      }

      k.add([{
        draw: function () {
          var tt = t;
          row(-2, -2, VW + 4, VH + 4, NIGHT);
          stars.forEach(function (s) { row(s.x, s.y, s.s, s.s, "#ffffff", 0.25 + 0.5 * Math.abs(Math.sin(tt * 1.6 + s.p))); });
          clouds.forEach(function (cl) { // nuages en contour (avec le même décalage cyan / magenta que le texte)
            var span = VW + cl.c.w * CS + 40, cx = ((cl.x - tt * cl.sp - d * 0.08) % span + span) % span - cl.c.w * CS;
            [[MAGENTA, 1], [CYAN, -1], [WHITE, 0]].forEach(function (L) {
              cl.c.edge.forEach(function (e) { row(cx + e[0] * CS + L[1] * 1.5, cl.y + e[1] * CS, CS, CS, L[0], 0.55); });
            });
          });
          floaters.forEach(function (f) {
            var y = f.y + Math.sin(tt * 0.9 + f.p) * 3;
            [[MAGENTA, 1.5], [CYAN, -1.5], [WHITE, 0]].forEach(function (L) { drawShape(f.kind, f.x, y, f.s, L[1], L[0]); });
          });
          var vis = phase === "magic" || phase === "leave" ? Math.max(0, 1 - (tt - fadeFrom) / 1.2) : 1;
          if (vis > 0.01) {
            var a = Math.min(1, amp + burst);
            // le texte entier remonte un peu pendant une rafale de bug
            drawGlitchText(tError, VW / 2, yError, PE, a * 0.7);
            drawGlitchText(t404, VW / 2, y404, P4, a);
            drawGlitchText(tGame, VW / 2, yGame, PG, a * 0.7);
          }
          // sol : une ligne claire, des petits cailloux qui défilent comme dans le jeu du dinosaure
          row(0, GY + 1, VW, VH - GY, "#120e34");
          row(0, GY, VW, 2, CYAN, 0.8); row(0, GY + 1, VW, 2, WHITE);
          for (var xx = 0; xx < VW; xx += 6) {
            var wx = Math.floor((xx + scrollD) / 6), hv = hash(wx);
            if (hv < 0.2) row(xx, GY + 8 + Math.floor(hash(wx + 7) * (VH - GY - 14)), 2 + Math.floor(hash(wx + 3) * 8), 2, hv < 0.07 ? CYAN : "#5a5a8a", 0.9);
          }
          if (tearY > -40) { row(0, tearY, VW, Math.max(2, Math.round(VH / 60)), CYAN, 0.14); row(0, tearY + 3, VW, 2, MAGENTA, 0.12); } // une bande qui traverse l'écran
        }
      }, k.pos(0, 0), k.z(-6)]);
      var scrollD = 0, fadeFrom = 1e9;

      // ----- personnages -----
      function shadow(w) { return k.add([k.sprite("glow"), k.pos(0, BASE), k.anchor("center"), k.scale(w, w * 0.22), k.color(rgb("#000000")), k.opacity(0.45), k.z(4.9)]); }
      var dogShadow = shadow(0.55), octoShadow = shadow(0.8), glitchShadow = shadow(1.1);
      var dog = k.add([k.sprite("laita", { anim: "run" }), k.pos(LX, BASE), k.anchor("bot"), k.scale(S), k.z(6)]);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(VW * 2, BASE), k.anchor("bot"), k.scale(S), k.z(6)]);
      octo.flipX = true;
      var mon = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(0, BASE), k.anchor("bot"), k.scale(GS), k.opacity(1), k.z(5.5)]);
      mon.flipX = true;
      var dogAnim = "run", monAnim = "idle";
      function setDog(a) { if (dogAnim !== a) { dogAnim = a; dog.play(a); } }
      function setMon(a) { if (monAnim !== a) { monAnim = a; mon.play(a); } }

      // ----- petites particules (poussière, étincelles) -----
      function dust(x, y, vx, vy, life, grav, hex, size, z) {
        var o = k.add([k.rect(size, size), k.pos(x, y), k.color(rgb(hex)), k.opacity(1), k.z(z || 8)]), age = 0;
        o.onUpdate(function () {
          age += k.dt(); vy += grav * k.dt(); o.pos.x += vx * k.dt(); o.pos.y += vy * k.dt();
          o.opacity = Math.max(0, 1 - age / life);
          if (age >= life) o.destroy();
        });
      }

      // ----- consigne (disparaît quand on court) -----
      var keyName = SET && SET.hintFor ? SET.hintFor("right", 2) : "DROITE";
      var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      var hintStr = coarse ? "MAINTIENS L'ECRAN : LAITA COURT !" : "MAINTIENS [" + keyName + "] : LAITA COURT !", hintSize = Math.max(9, Math.round(VH / 28));
      var hintW = k.formatText({ text: hintStr, size: hintSize, font: "monospace" }).width + 18, hintY = GY + (VH - GY) / 2 + 2;
      var hintBox = k.add([k.rect(hintW, hintSize + 12), k.pos(VW / 2, hintY), k.anchor("center"), k.color(rgb("#120e34")), k.opacity(0.85), k.z(19.9)]);
      var hintTxt = k.add([k.text(hintStr, { size: hintSize, font: "monospace" }), k.pos(VW / 2, hintY), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(1), k.z(20)]);

      // ----- commandes : la touche « droite » des réglages (et le doigt / la souris sur l'écran) -----
      function isRight(e) {
        if (SET && SET.lookup) return SET.lookup(e.code) === "right";
        return e.code === "ArrowRight" || e.code === "KeyD";
      }
      function kd(e) { if (isRight(e)) { holdKeys[e.code] = true; e.preventDefault(); } }
      function ku(e) { if (holdKeys[e.code]) delete holdKeys[e.code]; }
      function pd() { holdPtr = true; }
      function pu() { holdPtr = false; }
      function blur() { holdKeys = {}; holdPtr = false; }
      window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", blur);
      k.canvas.addEventListener("pointerdown", pd); window.addEventListener("pointerup", pu); window.addEventListener("pointercancel", pu);

      // ----- la fin : bond dans les bras, magie, retour au jeu -----
      function magic(cx, cy) {
        sfx("magic"); sfx("heart");
        var flash = k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb("#ffffff")), k.opacity(0.8), k.z(25)]);
        h.tween(0.5, function (e) { flash.opacity = 0.8 * (1 - e); }, function (p) { return p; }).then(function () { flash.destroy(); });
        RAINBOW.forEach(function (c, r) { // anneaux qui s'élargissent depuis les retrouvailles
          h.wait(r * 0.12).then(function () {
            var ring = k.add([k.sprite("glow"), k.pos(cx, cy), k.anchor("center"), k.scale(0.6), k.color(rgb(c)), k.opacity(0.7), k.z(20)]);
            h.tween(1.0, function (e) { ring.scale = k.vec2(0.6 + e * 9, 0.6 + e * 9); ring.opacity = 0.7 * (1 - e); }, function (p) { return p; }).then(function () { ring.destroy(); });
          });
        });
        var j;
        for (j = 0; j < 46; j++) dust(cx + k.rand(-14, 14), cy + k.rand(-14, 14), k.rand(-130, 130), k.rand(-190, -20), k.rand(0.7, 1.3), 220, RAINBOW[j % RAINBOW.length], j % 5 === 0 ? 4 : 3, 21);
        for (j = 0; j < 60; j++) { // pluie d'étoiles
          (function (jj) {
            var delay = k.rand(0, 1.1), age = 0, vy = k.rand(70, 140), st = k.add([k.rect(jj % 6 === 0 ? 3 : 2, jj % 6 === 0 ? 3 : 2), k.pos(k.rand(0, VW), -6), k.color(rgb(RAINBOW[jj % RAINBOW.length])), k.opacity(0), k.z(22)]);
            st.onUpdate(function () {
              age += k.dt();
              if (age < delay) return;
              st.pos.y += vy * k.dt(); st.pos.x += Math.sin(age * 5 + jj) * 12 * k.dt();
              st.opacity = 0.6 + 0.4 * Math.abs(Math.sin(age * 14 + jj));
              if (st.pos.y > GY) { dust(st.pos.x, GY, k.rand(-20, 20), k.rand(-50, -10), 0.4, 140, RAINBOW[jj % RAINBOW.length], 2, 22); st.destroy(); }
            });
          })(j);
        }
        for (j = 0; j < 5; j++) { // petits cœurs
          (function (jj) {
            h.wait(0.15 * jj).then(function () {
              var hx = cx + k.rand(-30, 30), hy = cy - 30, ht = k.add([k.sprite("heart"), k.pos(hx, hy), k.anchor("center"), k.scale(2), k.opacity(1), k.z(23)]);
              h.tween(1.3, function (e) { ht.pos.y = hy - 50 * e; ht.pos.x = hx + Math.sin(e * 6 + jj) * 8; ht.opacity = 1 - e * e; }, function (p) { return p; }).then(function () { ht.destroy(); });
            });
          })(j);
        }
      }

      function ending() {
        phase = "leap";
        octo.play("success"); sfx("bark");
        var x1 = dog.pos.x, x2 = octo.pos.x - 11 * S, y2 = BASE - 9 * S, mx0 = mon.pos.x;
        dog.flipX = false; setDog("run"); setMon("attack");
        k.shake(3);
        h.tween(0.45, function (e) { mon.pos.x = mx0 + 28 * e; }, function (p) { return p; });
        return h.tween(0.7, function (e) { dog.pos.x = x1 + (x2 - x1) * e; dog.pos.y = BASE - Math.sin(e * Math.PI) * 14 * S - (BASE - y2) * e; }, function (p) { return p; })
          .then(function () {
            sfx("jump");
            phase = "magic"; fadeFrom = t;
            dog.z = 6.2; dog.pos.y = y2; dog.pos.x = x2; setDog("idle"); dog.scale = k.vec2(S, S);
            sfx("bit");
            magic(octo.pos.x - 2 * S, BASE - 12 * S);
            // le Glitch est chassé par la magie : il se disperse en petits morceaux
            setMon("hurt"); k.shake(6);
            return h.wait(0.5);
          })
          .then(function () {
            for (var j = 0; j < 40; j++) dust(mon.pos.x + k.rand(-30, 30), BASE - k.rand(0, 22 * GS), k.rand(-160, 40), k.rand(-120, 20), k.rand(0.6, 1.2), 160, j % 2 ? "#3fb950" : "#39c5cf", 3, 9);
            mon.destroy(); glitchShadow.opacity = 0; sfx("kill");
            return h.wait(1.6);
          })
          .then(function () {
            var veil = k.add([k.rect(VW + 100, VH + 100), k.pos(-50, -50), k.color(rgb("#ffffff")), k.opacity(0), k.z(40)]);
            return h.tween(0.7, function (e) { veil.opacity = e; }, function (p) { return p; });
          })
          .then(function () { phase = "leave"; if (!done) { done = true; window.location.assign(home); } });
      }

      // ----- la boucle -----
      k.add([{
        update: function () {
          var dt = k.dt(); t += dt;
          // le bug du texte : des petites secousses tout le temps, de grosses rafales de temps en temps
          burstIn -= dt; if (burstIn <= 0) { burst = 1; burstIn = 1.1 + Math.random() * 1.8; }
          burst = Math.max(0, burst - dt * 5.5);
          jitterIn -= dt;
          if (jitterIn <= 0) { jitterIn = burst > 0.2 ? 0.04 : 0.11; var a = Math.min(1, amp + burst); shuffle(tError, a * 0.6); shuffle(t404, a); shuffle(tGame, a * 0.6); }
          tearIn -= dt; if (tearIn <= 0) { tearY = k.rand(0, GY - 10); tearIn = 0.09 + Math.random() * 0.6; if (Math.random() < 0.55) tearIn += 1.6; if (Math.random() < 0.3) tearY = -50; }
          if (phase === "chase") {
            var hold = holdPtr || Object.keys(holdKeys).length > 0;
            v += (hold ? 320 : -210) * dt; v = Math.max(0, Math.min(VMAX, v));
            d += v * dt;
            scrollD = Math.min(d, D_TOTAL - APPROACH);
            var lxs = LX + (d - scrollD), octoX = LX + D_TOTAL - scrollD;
            if (!sawOcto && octoX < VW - 30) { sawOcto = true; sfx("bark"); }
            octo.pos.x = octoX; octoShadow.pos.x = octoX; octoShadow.opacity = octoX < VW + 80 ? 0.45 : 0;
            dog.pos.x = lxs; dog.pos.y = BASE; dogShadow.pos.x = lxs; dogShadow.pos.y = BASE;
            dog.flipX = false;
            setDog(v > 8 ? "run" : "idle");
            dog.opacity = 1;
            // le Glitch : loin quand on court vite, collé à Laita quand on s'arrête
            gap += ((2 + 58 * v / VMAX) - gap) * Math.min(1, dt * 2.4);
            mon.pos.x = lxs - 12 * S - 12 * GS - gap + (gap < 8 ? Math.sin(t * 40) * 1.5 : 0);
            mon.pos.y = BASE - (v > 8 ? Math.abs(Math.sin(t * 9)) * 4 : Math.abs(Math.sin(t * 5)) * 2);
            glitchShadow.pos.x = mon.pos.x; glitchShadow.pos.y = BASE;
            setMon(gap < 14 ? "attack" : "idle");
            amp = 0.15 + (gap < 14 ? 0.35 : 0);
            step -= dt;
            if (v > 60 && step <= 0) { step = 0.09; dust(lxs - 8 * S, BASE - 1, k.rand(-50, -15), k.rand(-30, -8), 0.4, 80, "#9aa4c8", 2, 5); }
            // consigne : visible au début, et à nouveau si on s'arrête
            idleFor = hold ? 0 : idleFor + dt;
            var wantHint = d < 4 || idleFor > 1.5 ? 1 : 0;
            hintOn += (wantHint - hintOn) * Math.min(1, dt * 5);
            hintTxt.opacity = hintOn * (0.65 + 0.35 * Math.sin(t * 5)); hintBox.opacity = 0.85 * hintOn;
            if (d >= D_TOTAL - REACH * 1.15) { hintTxt.opacity = 0; hintBox.opacity = 0; ending(); }
          } else {
            hintTxt.opacity = 0; hintBox.opacity = 0;
            if (phase === "magic" || phase === "leave") { amp += (0 - amp) * Math.min(1, dt * 2); }
            octoShadow.pos.x = octo.pos.x; dogShadow.opacity = 0;
          }
        }
      }]);

      return {
        reset: function () {},
        destroy: function () {
          window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", blur);
          k.canvas.removeEventListener("pointerdown", pd); window.removeEventListener("pointerup", pu); window.removeEventListener("pointercancel", pu);
        }
      };
    }
  });
})();
