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

  function slashBuf() { // croissant de lumière (tourné vers la droite)
    var b = new Buf(30, 22);
    for (var y = 0; y < 22; y++) {
      for (var x = 0; x < 30; x++) {
        var ox = (x - 4) / 24, oy = (y - 11) / 11, ix = (x - 10) / 22, iy = (y - 11) / 10;
        if (ox * ox + oy * oy <= 1 && ix * ix + iy * iy > 1 && x > 4) b.set(x, y, x > 18 ? "#ffffff" : "#bfe9ff");
      }
    }
    return b;
  }

  function registerRun(k) {
    k.loadSprite("bit", single(bitBuf()));
    k.loadSprite("heart", single(heartBuf()));
    k.loadSprite("spike", single(spikeBuf()));
    k.loadSprite("terminal", single(terminalBuf()));
    k.loadSprite("candle", single(candleBuf()));
    k.loadSprite("bat", sheet([batBuf(true), batBuf(false)], 18, 14), { sliceX: 2, anims: { fly: { from: 0, to: 1, loop: true, speed: 8 } } });
    k.loadSprite("shuriken", single(shurikenBuf()));
    k.loadSprite("slash", single(slashBuf()));
  }

  window.OctoSprites.registerRun = registerRun;
})();
