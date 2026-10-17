/* OctoCat-Code — Logo animé de l'accueil (pixel art procédural, 0 octet de fichier).
 *
 *   OctoLogo.register(k)                     dessine les lettres (une image par lettre) et les charge dans KAPLAY
 *   OctoLogo.add(k, { cx, top, maxW, maxH, rgb, z }) pose le logo ; renvoie { width, height, update(t) } à appeler à chaque image
 *
 * « OCTOCAT » en dégradé chaud (or → corail → magenta) avec des oreilles de chat sur le premier O, un tiret cyan,
 * « CODE » en dégradé « terminal » (blanc → vert → sarcelle). Chaque lettre a un biseau (reflet en haut, ombre en bas),
 * un double contour et une ombre portée. Animation : chute en cascade à l'arrivée, léger flottement, vague de lumière
 * qui parcourt les lettres, étincelles. Tout est dessiné avec les mêmes tampons de pixels que les sprites du jeu.
 */
(function () {
  "use strict";

  // Police 5×7 (1 = pixel plein). Le tiret est plus étroit (3 colonnes).
  var GLYPHS = {
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "-": ["000", "000", "000", "111", "000", "000", "000"]
  };

  var TEXT = "OCTOCAT-CODE";
  var PALETTES = {
    warm: ["#fff4c2", "#ffe08a", "#ffc04d", "#ff9a4a", "#ff6f6f", "#e8478f", "#b23fb0"],
    code: ["#f2fff2", "#c9ffd9", "#7ef0a8", "#3fd97a", "#2bbf6b", "#1f9e7a", "#1b7f8c"],
    dash: ["#e8fbff", "#b8f1ff", "#7ae7ff", "#7ae7ff", "#4fc3e8", "#4fc3e8", "#3a98c8"]
  };
  var PX = 2;          // taille d'un pixel de police dans l'image
  var RING = 2;        // deux anneaux de contour
  var EARS = 6;        // marge au-dessus des lettres pour les oreilles
  var GAP = 2;         // espace entre deux lettres
  var INK = "#150c33", RIM = "#5b47c8";

  function paletteFor(i) { return i < 7 ? "warm" : i === 7 ? "dash" : "code"; }

  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return "#" + [0, 1, 2].map(function (j) { var v = Math.round(x[j] + (y[j] - x[j]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }

  /** Dimensions de l'image d'une lettre : { w, h }. */
  function size(ch) { return { w: GLYPHS[ch][0].length * PX + RING * 2, h: 7 * PX + RING * 2 + EARS }; }

  /** Dessine une lettre : { fill (avec contours), shine (intérieur en blanc, pour la vague de lumière) }. */
  function glyph(ch, pal, ears) {
    var Buf = window.OctoSprites.Buf, rows = GLYPHS[ch], d = size(ch), colors = PALETTES[pal];
    var fill = new Buf(d.w, d.h), shine = new Buf(d.w, d.h), ox = RING, oy = RING + EARS, x, y;
    var mask = new Buf(d.w, d.h);
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        if (rows[r].charAt(c) !== "1") continue;
        for (var j = 0; j < PX; j++) for (var i = 0; i < PX; i++) mask.set(ox + c * PX + i, oy + r * PX + j, colors[r]);
      }
    }
    if (ears) { // oreilles de chat : triangles collés au sommet du O, avec l'intérieur rose
      var w = d.w, top = colors[0];
      [[[ox, oy + 2], [ox + 5, oy + 2], [ox + 1, oy - 4]], [[w - ox, oy + 2], [w - ox - 5, oy + 2], [w - ox - 1, oy - 4]]].forEach(function (pts) {
        mask.poly(pts, top);
        mask.poly([[(pts[0][0] * 3 + pts[1][0]) / 4, pts[0][1] - 0.5], [(pts[0][0] + pts[1][0] * 3) / 4, pts[0][1] - 0.5], [pts[2][0] * 0.35 + (pts[0][0] + pts[1][0]) * 0.325, pts[2][1] + 2.5]], "#ff8fb1");
      });
    }
    // biseau : reflet sur le bord haut, ombre sur le bord bas ; l'intérieur part aussi dans l'image « shine »
    for (y = 0; y < d.h; y++) {
      for (x = 0; x < d.w; x++) {
        var c0 = mask.get(x, y);
        if (!c0) continue;
        var col = c0;
        if (!mask.get(x, y - 1)) col = mix(c0, "#ffffff", 0.55);
        else if (!mask.get(x, y + 1)) col = mix(c0, "#000000", 0.35);
        else if (!mask.get(x - 1, y)) col = mix(c0, "#ffffff", 0.18);
        else if (!mask.get(x + 1, y)) col = mix(c0, "#000000", 0.18);
        fill.set(x, y, col); shine.set(x, y, "#ffffff");
      }
    }
    fill.outline(INK).outline(RIM);
    return { fill: fill, shine: shine };
  }

  function spriteName(kind, i) { return "logo-" + kind + "-" + i; }

  function register(k) {
    var S = window.OctoSprites;
    for (var i = 0; i < TEXT.length; i++) {
      var g = glyph(TEXT.charAt(i), paletteFor(i), i === 0);
      k.loadSprite(spriteName("f", i), S.single(g.fill));
      k.loadSprite(spriteName("s", i), S.single(g.shine));
    }
  }

  function easeBack(p) { var c1 = 1.70158, q = p - 1; return 1 + (c1 + 1) * q * q * q + c1 * q * q; }

  function add(k, o) {
    var rgb = o.rgb, z = o.z || 32, i, x = 0, layout = [], total;
    for (i = 0; i < TEXT.length; i++) {
      var d = size(TEXT.charAt(i));
      layout.push({ x: x, w: d.w, h: d.h });
      x += d.w - RING * 2 + GAP; // les anneaux de deux lettres voisines se recouvrent
    }
    total = x - GAP + RING * 2;
    var S = Math.max(1, Math.min(4, Math.floor(o.maxW / total), Math.floor((o.maxH || 999) / layout[0].h))); // entre dans la largeur ET dans la hauteur autorisées
    var left = Math.round(o.cx - (total * S) / 2), H = layout[0].h * S;

    // halo doux derrière le titre (il reste derrière : les lettres, elles, restent nettes)
    var halo = k.add([k.sprite("glow"), k.pos(o.cx, o.top + H * 0.55), k.anchor("center"), k.scale((total * S) / 64 * 1.15, H / 64 * 1.5), k.color(rgb("#8957e5")), k.opacity(0.4), k.fixed(), k.z(z - 3)]);

    var letters = layout.map(function (l, idx) {
      var px = left + l.x * S;
      var shadow = k.add([k.sprite(spriteName("f", idx)), k.pos(px + S * 2, o.top + S * 2), k.scale(S), k.color(rgb("#0a0620")), k.opacity(0), k.fixed(), k.z(z - 2)]);
      var body = k.add([k.sprite(spriteName("f", idx)), k.pos(px, o.top), k.scale(S), k.opacity(0), k.fixed(), k.z(z)]);
      var shine = k.add([k.sprite(spriteName("s", idx)), k.pos(px, o.top), k.scale(S), k.opacity(0), k.fixed(), k.z(z + 0.1)]);
      return { px: px, shadow: shadow, body: body, shine: shine };
    });

    // étincelles : petites croix qui scintillent à des endroits variés du titre
    var sparks = [];
    for (i = 0; i < 6; i++) {
      var sp = { x: left + Math.round(k.rand(0.03, 0.97) * total * S), y: o.top + Math.round(k.rand(0.1, 0.8) * H), ph: k.rand(0, 6.28), sp: k.rand(1.2, 2.4), a: [], big: i % 2 === 0 ? 2 : 1 };
      sp.a.push(k.add([k.rect(2 * S, 1 * S * sp.big), k.pos(sp.x, sp.y), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(z + 0.2)]));
      sp.a.push(k.add([k.rect(1 * S * sp.big, 2 * S), k.pos(sp.x, sp.y), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(z + 0.2)]));
      sparks.push(sp);
    }

    return {
      width: total * S, height: H, scale: S,
      update: function (t) {
        var ready = true;
        letters.forEach(function (L, idx) {
          var p = Math.max(0, Math.min(1, (t - 0.15 - idx * 0.07) / 0.55));
          if (p < 1) ready = false;
          var drop = (1 - easeBack(p)) * -70, bob = p < 1 ? 0 : Math.round(Math.sin(t * 2.2 + idx * 0.55) * 1.2 * S) / S * 1;
          var y = Math.round(o.top + drop + bob * S);
          var vis = p > 0 ? 1 : 0;
          L.body.pos.y = y; L.shine.pos.y = y; L.shadow.pos.y = y + S * 2;
          L.body.opacity = vis; L.shadow.opacity = vis * 0.5;
          var wave = Math.sin(t * 1.7 - idx * 0.55);
          L.shine.opacity = p < 1 ? 0 : Math.max(0, wave - 0.62) * 1.25;
        });
        sparks.forEach(function (s) {
          var v = ready ? Math.max(0, Math.sin(t * s.sp + s.ph)) : 0;
          v = v * v * v;
          s.a[0].opacity = v; s.a[1].opacity = v;
          var sc = 0.6 + 0.8 * v; s.a[0].scale = k.vec2(sc, sc); s.a[1].scale = k.vec2(sc, sc);
        });
        halo.opacity = 0.34 + 0.06 * Math.sin(t * 1.3);
      }
    };
  }

  window.OctoLogo = { register: register, add: add, _glyphs: GLYPHS, _text: TEXT, _size: size };
})();
