/* OctoCat-Code — Effets visuels : post-traitement WebGL (un seul passage plein écran, ~3 Ko, aucun fichier d'image).
 *   - étalonnage : contraste en S, hautes lumières chaudes / ombres froides, saturation ;
 *   - halo lumineux (bloom) : torches, portail, yeux du Glitch, lucioles et glyphes rayonnent ;
 *   - vignettage doux et grain de dithering (supprime les bandes dans les dégradés).
 * Deux niveaux, choisis automatiquement :
 *   « high » (PC, portables, tablettes récentes) : bloom à 16 échantillons ;
 *   « lite » (Android/iOS, ≤ 4 cœurs ou ≤ 4 Go) : étalonnage + vignette seuls, 1 échantillon par pixel, batterie préservée.
 * Forçage pour tests : ?quality=high | lite | off dans l'adresse.
 */
(function () {
  "use strict";

  var FRAG = [
    "uniform float u_time;",
    "uniform vec2 u_size;",   // taille logique du canevas
    "uniform float u_bloom;", // 0 = pas de halo (lite)
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
    "vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {",
    "  vec3 c = texture2D(tex, uv).rgb;",
    "  if (u_bloom > 0.5) {",
    "    vec3 glow = vec3(0.0);",
    "    for (int i = 0; i < 8; i++) {",
    "      float a = float(i) * 0.785398;",
    "      vec2 d = vec2(cos(a), sin(a)) / u_size;",
    "      vec3 s1 = texture2D(tex, uv + d * 1.6).rgb;",
    "      vec3 s2 = texture2D(tex, uv + d * 4.2).rgb;",
    "      glow += s1 * smoothstep(0.85, 1.0, max(max(s1.r, s1.g), s1.b));",
    "      glow += s2 * smoothstep(0.85, 1.0, max(max(s2.r, s2.g), s2.b)) * 0.8;",
    "    }",
    "    c += glow * 0.05;",
    "  }",
    "  float l = dot(c, vec3(0.299, 0.587, 0.114));",
    "  c = mix(vec3(l), c, 1.06);",                                      // saturation
    "  c = c * c * (3.0 - 2.0 * c) * 0.2 + c * 0.8;",                // courbe en S douce
    "  c += vec3(0.020, 0.008, -0.012) * smoothstep(0.45, 1.0, l);",   // hautes lumières chaudes
    "  vec2 q = uv - 0.5;",
    "  c *= 1.0 - dot(q, q) * 0.55;",                                   // vignettage
    "  c += (hash(uv * u_size + fract(u_time)) - 0.5) / 255.0;",       // dithering
    "  return vec4(clamp(c, 0.0, 1.0), 1.0);",
    "}"
  ].join("\n");

  /** Niveau de qualité : paramètre d'adresse, sinon détection du matériel. */
  function quality() {
    try {
      var q = new URLSearchParams(window.location.search).get("quality");
      if (q === "high" || q === "lite" || q === "off") return q;
    } catch { /* ignoré */ }
    var nav = window.navigator || {};
    var modest = /Android|Mobi|iPhone|iPad/i.test(nav.userAgent || "") || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
    return modest ? "lite" : "high";
  }

  var OctoFX = {
    quality: quality,
    _frag: FRAG,
    /** Charge le shader (une fois par instance KAPLAY) ; renvoie `apply(k)` à appeler au début de chaque scène. */
    install: function (k) {
      var level = quality();
      if (level === "off") return function () {};
      try { k.loadShader("octo-post", null, FRAG); } catch { return function () {}; }
      return function apply(scene) {
        (scene || k).onUpdate(function () {
          k.usePostEffect("octo-post", { u_time: k.time() % 10, u_size: k.vec2(k.width(), k.height()), u_bloom: level === "high" ? 1 : 0 });
        });
      };
    }
  };

  window.OctoFX = OctoFX;
})();
