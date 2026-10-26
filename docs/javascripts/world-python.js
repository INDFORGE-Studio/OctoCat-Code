/* OctoCat-Code — Monde 1 : LA TOUR DU SERPENT (Python).
 *
 * Python dort tout en haut d'une tour géante, au clair de lune. Pour le réveiller, l'OctoCat monte : à chaque niveau il gravit un morceau de la tour,
 * du pied des racines (niveau 1) jusqu'au sommet, sous les étoiles (niveau 10).
 *   - les trajets « plateformes » sont des tours en zigzag (sim-tower.js) : on grimpe de plateforme en plateforme, le ciel s'éclaircit puis s'étoile ;
 *   - le Double Dragon est remplacé par LE SERPENT D'OCTO (sim-snake.js) : un jeu d'arcade où les tentacules d'OctoCat s'allongent à chaque pièce.
 * Mêmes capacités que dans GitHubia (fouet, shuriken, double saut), mêmes pièces (15 / 5 / 12 / 10 / 6 / 8 / 4 + 28 par salle secrète).
 */
(function () {
  "use strict";

  var W = window.OctoWorlds;
  if (!W) return;

  var TITLES = [
    "Les Racines Lumineuses", "Le Marais des Chaînes", "Les Galeries de Jade", "Le Sentier des Lanternes", "La Canopée des Booléens",
    "Le Marché Suspendu", "Les Cascades du Temps", "Le Temple des Nuages", "Les Jardins Volants", "Le Sommet du Serpent"
  ];

  /** Un ciel de tour : dégradé (bas, milieu, haut), mur de fond, couleur des lanternes. */
  function theme(alt, wall, outer, lamp) { return { sky: alt[0], skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: null, alt: alt, wall: wall, outer: outer, lamp: lamp, deco: [] }; }
  var THEMES = {
    py1: theme(["#0c1f18", "#1b4a3a", "#2d7a5c"], "#2a3d34", "#1a2822", "#9af0b0"),
    py3: theme(["#08181d", "#12404a", "#1f7a78"], "#1f3d42", "#14282c", "#7ae7ff"),
    py4: theme(["#24143a", "#6a3a6a", "#d0684a"], "#3a2a4a", "#241a30", "#ffd27a"),
    py5: theme(["#16345a", "#3a7ab8", "#9ad0f4"], "#2c4a42", "#1c3030", "#fff4c2"),
    py7: theme(["#101c46", "#2a4a9a", "#6a9ae8"], "#26405e", "#182a40", "#9fd8ff"),
    py8: theme(["#32246a", "#8a6ac8", "#f4a4c8"], "#4a3a7a", "#2e2450", "#ffe0a0"),
    py9: theme(["#0a0928", "#2a1a5a", "#7a40a8"], "#2a2050", "#1a1438", "#ffb0f0"),
    // les arènes du serpent (niveaux 2, 6, 10) : un marais, un marché, le sommet
    pysnake2: { sky: "#0f2a2a", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: null, deco: [], floor: "#1a3a3a", grid: "#245050", edge: "#3fb970" },
    pysnake6: { sky: "#3a1f3f", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: null, deco: [], floor: "#4a2a50", grid: "#5e3a66", edge: "#ffb347" },
    pysnake10: { sky: "#0a0928", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: null, deco: [], floor: "#1a1450", grid: "#2e2478", edge: "#bc8cff" }
  };

  var P = function (w, o) { return Object.assign({ w: w }, o || {}); };

  /**
   * Les 7 tours (niveaux 1, 3, 4, 5, 7, 8, 9). Les plateformes vont par paires : la 1re de chaque paire est atteinte par un saut par-dessus `gap` colonnes
   * de vide (1 par défaut, 2 avec le double saut), la 2e est collée à la 1re (une simple marche). Les colonnes se comptent depuis le bord gauche de la plateforme.
   */
  var TOWERS = {
    1: { theme: "py1", abilities: {}, tower: { platforms: [
      P(0), P(5, { bits: [3] }), P(4, { bits: [1, 2] }), P(4, { en: [2], cp: true, gapBit: true }), P(4, { bits: [1] }), P(4, { gapBit: true, secret: true }), P(5, { cp: true, bits: [1, 3] }),
      P(4, { gapBit: true, en: [2] }), P(4, { bits: [1, 2] }), P(5, { gapBit: true, cp: true }), P(4, { bits: [2] }), P(4, { gapBit: true, en: [1] }), P(4, { cp: true }), P(7, { end: 4 })
    ] } },
    3: { theme: "py3", abilities: { whip: true }, tower: { platforms: [
      P(0), P(5, { candles: [1, 3] }), P(4, { fly: [1], bits: [3] }), P(4, { en: [2], cp: true, bits: [3] }), P(4, { candles: [1], gapBit: true }), P(4, { dash: [2] }), P(5, { fly: [2], secret: true }),
      P(4, { cp: true, candles: [2] }), P(4, { en: [1], bits: [3] }), P(5, { fly: [1], candles: [3] }), P(4, { gapBit: true }), P(4, { tough: [2], cp: true }), P(4), P(4, { dash: [1] }), P(7, { end: 4 })
    ] } },
    4: { theme: "py4", abilities: { doubleJump: true, shuriken: true }, tower: { platforms: [
      P(0), P(5, { bits: [2] }), P(4, { fly: [1] }), P(4, { gap: 2, en: [2], cp: true, gapBit: true }), P(4, { dash: [3] }), P(4, { gap: 2, bits: [1], gapBit: true }), P(4, { secret: true, tough: [2] }),
      P(4, { gap: 2, cp: true, fly: [2], bits: [3] }), P(4, { hop: [2] }), P(4, { gap: 2, gapBit: true }), P(5, { en: [1, 3], cp: true }), P(4, { gap: 2, fly: [1], gapBit: true }), P(4, { dash: [2] }),
      P(4, { gap: 2, bits: [1] }), P(4, { cp: true }), P(4, { gap: 2, gapBit: true }), P(7, { end: 4 })
    ] } },
    5: { theme: "py5", abilities: {}, tower: { platforms: [
      P(0), P(5, { bits: [2] }), P(4, { crumble: true, bits: [1] }), P(4, { crumble: true, gapBit: true }), P(4, { cp: true, en: [1] }), P(4, { crumble: true, gapBit: true, secret: true }), P(4, { crumble: true, bits: [1] }),
      P(5, { cp: true, hop: [2] }), P(4, { crumble: true, gapBit: true }), P(4, { crumble: true, bits: [2] }), P(4, { en: [1], cp: true }), P(4, { crumble: true, gapBit: true }), P(4, { crumble: true, bits: [1] }), P(7, { end: 4 })
    ] } },
    7: { theme: "py7", abilities: { whip: true }, tower: { platforms: [
      P(0), P(5, { candles: [2] }), P(4, { candles: [1], bits: [3] }), P(4, { en: [2], cp: true }), P(4, { crumble: true, gapBit: true }), P(4, { dash: [2], candles: [1] }), P(5, { candles: [2], secret: true }),
      P(4, { cp: true, fly: [2] }), P(4, { crumble: true, bits: [1] }), P(4, { tough: [1], candles: [0] }), P(4, { en: [1], gapBit: true, bits: [3] }), P(4, { cp: true, dash: [2], bits: [1] }), P(4, { crumble: true, gapBit: true }), P(4, { fly: [1], candles: [3] }), P(4, { crumble: true, bits: [2] }), P(7, { end: 4 })
    ] } },
    8: { theme: "py8", abilities: { doubleJump: true, shuriken: true }, tower: { platforms: [
      P(0), P(5), P(4, { fly: [1] }), P(4, { gap: 2, tough: [1], cp: true, gapBit: true }), P(4, { crumble: true }), P(4, { gap: 2, dash: [2], bits: [1] }), P(4, { hop: [1], secret: true }),
      P(4, { gap: 2, cp: true, fly: [2], gapBit: true }), P(4, { crumble: true }), P(4, { gap: 2, en: [1, 2], bits: [0] }), P(4, { crumble: true, gapBit: true }), P(4, { gap: 2, cp: true, tough: [2], fly: [1] }),
      P(4, { crumble: true }), P(4, { gap: 2, dash: [1], gapBit: true }), P(4, { fly: [1] }), P(4, { gap: 2, hop: [2], cp: true }), P(4, { crumble: true, bits: [1] }), P(7, { end: 4 })
    ] } },
    9: { theme: "py9", abilities: { whip: true, shuriken: true }, tower: { platforms: [
      P(0), P(5, { candles: [1, 3] }), P(4, { fly: [1], hop: [2] }), P(4, { en: [1, 2], cp: true, bits: [3] }), P(4, { crumble: true, dash: [1] }), P(4, { tough: [1], candles: [3] }), P(5, { fly: [1], secret: true }),
      P(4, { cp: true, dash: [1, 3] }), P(4, { crumble: true, hop: [2] }), P(4, { fly: [1], en: [3] }), P(4, { candles: [1], gapBit: true }), P(4, { cp: true, tough: [1], hop: [3] }), P(4, { crumble: true, fly: [1] }),
      P(4, { dash: [1, 2], candles: [3] }), P(4, { hop: [1], bits: [2] }), P(4, { cp: true, en: [1], fly: [3] }), P(4, { crumble: true }), P(7, { end: 4 })
    ] } }
  };

  var runs = {};
  Object.keys(TOWERS).forEach(function (id) { var t = TOWERS[id]; runs[id] = { mode: "platform", theme: t.theme, abilities: t.abilities, tower: t.tower }; });

  W.register(1, { titles: TITLES, runs: runs, themes: THEMES, towers: TOWERS });
})();
