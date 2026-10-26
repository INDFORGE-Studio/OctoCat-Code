/* OctoCat-Code — Sprites de l'invasion de l'espace (monde de JavaScript) : fusée, bulle de Laita, envahisseurs, soucoupe, bombes, lasers.
 * Pixel art procédural comme le reste (0 octet de fichier) ; dessins originaux : des extraterrestres rigolos, pas des copies d'un jeu existant.
 * Le serpent d'Octo (monde de Python) se dessine avec des formes simples dans play-arcade.js.
 */
(function () {
  "use strict";

  var S = window.OctoSprites, Buf = S.Buf, single = S.single, sheet = S.sheet;
  var OUT = "#0a0820";

  /** La fusée d'OctoCat (28×26) : cockpit vide, OctoCat (son sprite, avec son costume) s'y assoit au moment de l'affichage. */
  function shipBuf() {
    var b = new Buf(28, 26);
    b.poly([[14, 0.5], [20.5, 11], [7.5, 11]], "#f0f4ff"); b.poly([[14, 0.5], [17, 6], [11, 6]], "#ff5d73");
    b.rect(7, 10, 14, 11, "#d8e0ff"); b.rect(7, 10, 3, 11, "#f8faff"); b.rect(18, 10, 3, 11, "#9aa4d8");
    b.poly([[7, 14], [1, 24], [7, 21]], "#4be3ff"); b.poly([[21, 14], [27, 24], [21, 21]], "#4be3ff");
    b.poly([[7, 14], [3, 21], [7, 21]], "#2a9fc0"); b.poly([[21, 14], [25, 21], [21, 21]], "#2a9fc0");
    b.ellipse(14, 14.5, 5.2, 5.2, function (nx, ny) { return nx * 0.5 + ny * 0.6 > 0.45 ? "#1a2a5a" : "#0e1a40"; });
    b.set(11, 12, "#cfe8ff"); b.set(12, 11, "#cfe8ff");
    b.rect(9, 21, 10, 3, "#5a6298"); b.rect(10, 24, 8, 1, "#3a4278");
    b.rect(13, 3, 2, 3, "#ffffff");
    return b.outline(OUT);
  }
  /** La bulle de verre de Laita (18×16, translucide). */
  function bubbleBuf() {
    var b = new Buf(18, 16);
    b.ellipse(9, 8, 8.4, 7.4, "#9af0ff40");
    for (var a = 0; a < 360; a += 12) { var x = 9 + Math.cos(a * Math.PI / 180) * 8.3, y = 8 + Math.sin(a * Math.PI / 180) * 7.3; b.set(x, y, a > 180 && a < 300 ? "#ffffffc0" : "#9af0ffa0"); }
    b.set(4, 3, "#ffffff"); b.set(5, 3, "#ffffff"); b.set(4, 4, "#ffffff");
    return b;
  }

  function droneBuf(f) { // une ampoule verte à un gros œil et deux antennes
    var b = new Buf(22, 16);
    b.line(7, 3, 4, 0 + f, "#9af0b0"); b.line(15, 3, 18, 0 + f, "#9af0b0"); b.ellipse(4, 0 + f, 1.3, 1.3, "#ffe08a"); b.ellipse(18, 0 + f, 1.3, 1.3, "#ffe08a");
    b.ellipse(11, 8, 8.6, 6.6, function (nx, ny) { return nx * 0.4 + ny * 0.8 < -0.25 ? "#9af0b0" : nx * 0.4 + ny * 0.8 < 0.35 ? "#3fb970" : "#1f7a48"; });
    b.ellipse(11, 8, 3.8, 4, "#ffffff"); b.ellipse(11 + (f ? 1 : -1), 8.5, 1.8, 2.2, "#0a1a10"); b.set(10 + (f ? 1 : -1), 7, "#ffffff");
    b.rect(5, 13, 3, 2 + f, "#1f7a48"); b.rect(14, 13, 3, 3 - f, "#1f7a48");
    return b.outline(OUT);
  }
  function crabBuf(f) { // un crabe-robot orange : pinces qui se lèvent et se baissent
    var b = new Buf(24, 16);
    b.rect(2, 2 + f * 2, 4, 5, "#ff9a5a"); b.rect(18, 2 + (1 - f) * 2, 4, 5, "#ff9a5a"); b.rect(2, 6 + f * 2, 6, 2, "#ff9a5a"); b.rect(16, 6 + (1 - f) * 2, 6, 2, "#ff9a5a");
    b.set(3, 2 + f * 2, "#fff0d0"); b.set(20, 2 + (1 - f) * 2, "#fff0d0");
    b.poly([[6, 6], [18, 6], [20, 11], [17, 14], [7, 14], [4, 11]], function (x, y) { return y < 9 ? "#ffb87a" : "#e0703a"; });
    b.rect(7, 8, 3, 3, "#ffffff"); b.rect(14, 8, 3, 3, "#ffffff"); b.rect(8 + (f ? 1 : 0), 9, 2, 2, "#2a1408"); b.rect(14 + (f ? 1 : 0), 9, 2, 2, "#2a1408");
    b.rect(8, 12, 8, 1, "#7a3a14");
    b.rect(5, 14, 3, 2, "#e0703a"); b.rect(16, 14, 3, 2, "#e0703a");
    return b.outline(OUT);
  }
  function squidBuf(f) { // une méduse violette à trois yeux, tentacules qui ondulent
    var b = new Buf(22, 18), i;
    b.ellipse(11, 7, 8.6, 6.6, function (nx, ny) { return nx * 0.4 + ny * 0.8 < -0.25 ? "#ffb8f0" : nx * 0.4 + ny * 0.8 < 0.35 ? "#e054c0" : "#9a2a8a"; });
    b.rect(2, 9, 18, 2, "#9a2a8a");
    for (i = 0; i < 5; i++) { var tx = 3 + i * 4, off = (i + f) % 2; b.rect(tx, 11, 2, 4 + off, "#e054c0"); b.set(tx + off, 15 + off, "#ffb8f0"); }
    [[6, 6], [11, 5], [16, 6]].forEach(function (q) { b.rect(q[0] - 1, q[1] - 1, 3, 3, "#ffffff"); b.set(q[0] + (f ? 1 : 0), q[1], "#2a0a24"); });
    return b.outline(OUT);
  }
  function motherBuf(f) { // le vaisseau-mère du Glitch Gardien : coque sombre, lumières, œil rouge
    var b = new Buf(84, 34), i;
    b.ellipse(42, 18, 40, 12, function (nx, ny) { return ny < -0.35 ? "#8a7ad8" : ny < 0.2 ? "#5a4aa8" : "#2f2670"; });
    b.ellipse(42, 12, 17, 11, function (nx, ny) { return nx * 0.5 + ny * 0.6 < -0.2 ? "#ff8a9a" : "#c42b3a"; });
    b.ellipse(42, 13, 8, 7, "#14060c"); b.ellipse(42, 13, 5, 5, f ? "#ffe08a" : "#ff5d73"); b.rect(41, 11, 2, 5, "#14060c");
    for (i = 0; i < 9; i++) b.set(8 + i * 8, 20 + (i % 2), (i + f) % 2 ? "#ffe08a" : "#4be3ff");
    b.poly([[6, 22], [0, 30], [10, 26]], "#3a2f90"); b.poly([[78, 22], [84, 30], [74, 26]], "#3a2f90");
    b.rect(30, 27, 6, 6, "#4a3a9a"); b.rect(48, 27, 6, 6, "#4a3a9a"); b.rect(31, 30, 4, 2, f ? "#ff5d73" : "#7a1a2a"); b.rect(49, 30, 4, 2, f ? "#7a1a2a" : "#ff5d73");
    return b.outline("#14060c");
  }
  function ufoBigBuf(f) { // la soucoupe-mystère (28×14), rose et dorée
    var b = new Buf(28, 14), i;
    b.ellipse(14, 6, 6, 5, function (nx, ny) { return ny < 0 ? "#ffd0f0" : "#e054c0"; });
    b.ellipse(14, 9, 13, 4, function (nx, ny) { return ny < -0.2 ? "#fff0b0" : ny < 0.5 ? "#e3b341" : "#9a6a10"; });
    for (i = 0; i < 5; i++) b.set(4 + i * 5, 9, (i + f) % 2 ? "#ffffff" : "#ff6ac1");
    b.set(12, 4, "#ffffff"); b.rect(8, 12, 2, 2, "#9a6a10"); b.rect(18, 12, 2, 2, "#9a6a10");
    return b.outline(OUT);
  }
  function bombBuf() { // plasma en zigzag
    var b = new Buf(5, 9);
    b.set(2, 0, "#ff5d73"); b.set(3, 1, "#ff5d73"); b.set(2, 2, "#ff8a9a"); b.set(1, 3, "#ff5d73"); b.set(2, 4, "#ff8a9a"); b.set(3, 5, "#ff5d73"); b.set(2, 6, "#ffe0e4"); b.set(2, 7, "#ffffff");
    b.set(1, 1, "#ff5d73"); b.set(3, 4, "#ff5d73"); b.set(1, 6, "#ff8a9a");
    return b.outline("#3a0a14");
  }
  function laserBuf(p) { // rayon d'OctoCat ; doré avec l'étoile-shuriken
    var b = new Buf(5, 12);
    var main = p ? "#ffd54a" : "#4be3ff", core = p ? "#fff4c2" : "#ffffff";
    b.rect(1, 1, 3, 10, main); b.rect(2, 0, 1, 12, core); b.set(2, 0, "#ffffff");
    return b.outline(p ? "#6a4a00" : "#0a3a5a");
  }

  function registerSpace(k) {
    k.loadSprite("ship", single(shipBuf()));
    k.loadSprite("bubble", single(bubbleBuf()));
    k.loadSprite("inv-drone", sheet([droneBuf(0), droneBuf(1)], 22, 16), { sliceX: 2, anims: { idle: { from: 0, to: 1, loop: true, speed: 3 } } });
    k.loadSprite("inv-crab", sheet([crabBuf(0), crabBuf(1)], 24, 16), { sliceX: 2, anims: { idle: { from: 0, to: 1, loop: true, speed: 3 } } });
    k.loadSprite("inv-squid", sheet([squidBuf(0), squidBuf(1)], 22, 18), { sliceX: 2, anims: { idle: { from: 0, to: 1, loop: true, speed: 3 } } });
    k.loadSprite("inv-mother", sheet([motherBuf(0), motherBuf(1)], 84, 34), { sliceX: 2, anims: { idle: { from: 0, to: 1, loop: true, speed: 4 } } });
    k.loadSprite("inv-ufo", sheet([ufoBigBuf(0), ufoBigBuf(1)], 28, 14), { sliceX: 2, anims: { idle: { from: 0, to: 1, loop: true, speed: 6 } } });
    k.loadSprite("bomb", single(bombBuf()));
    k.loadSprite("laser", single(laserBuf(false)));
    k.loadSprite("laser-p", single(laserBuf(true)));
  }

  S.registerSpace = registerSpace;
})();
