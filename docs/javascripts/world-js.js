/* OctoCat-Code — Monde 2 : LA GALAXIE JAVASCRIPT (JavaScript).
 *
 * L'OctoCat et Laita quittent la Terre : la station Syntaxe, les lunes, les ponts de comètes… Dans l'espace tout est plus léger :
 *   - GRAVITÉ LUNAIRE (0,55) : les sauts montent haut et vont loin, les vides font jusqu'à 4-5 colonnes ;
 *   - des RESSORTS propulseurs enjambent les très grands vides ; des PASSERELLES D'ÉNERGIE s'effritent sous les pieds ;
 *   - les Glitch sont des extraterrestres, les chauves-souris des soucoupes volantes ;
 *   - à la place du Double Dragon : L'INVASION (sim-space.js), un tir à la Space Invaders aux commandes de la fusée d'OctoCat.
 * Mêmes capacités (fouet, shuriken, double saut) et mêmes pièces qu'ailleurs (15 / 5 / 12 / 10 / 6 / 8 / 4 + 28 par salle secrète).
 */
(function () {
  "use strict";

  var W = window.OctoWorlds;
  if (!W) return;

  var TITLES = [
    "La Station Syntaxe", "La Nébuleuse des Chaînes", "La Lune des Opérations", "L'Anneau des Torches", "Le Pont des Comètes",
    "Le Marché Interstellaire", "La Forge des Étoiles", "Le Temple des Trous Noirs", "Le Tri des Astéroïdes", "La Planète du Glitch Gardien"
  ];

  /** Un décor d'espace : couleur de fond, teinte de la lueur qui suit le joueur. */
  function theme(sky, land, wash, light) { return { sky: sky, skyTint: "#ffffff", tile: "#ffffff", land: land || "#ffffff", wash: wash || null, light: light || null, deco: ["tree", "palm", "torch", "bush", "tuft0", "mushroom", "rock"] }; }
  var THEMES = {
    sp1: theme("#05030f", "#ffffff"),
    sp3: theme("#05030f", "#cfd0ff", ["#3a3f8a", 0.08]),
    sp4: theme("#0a0420", "#ffd0f0", ["#8a1f6a", 0.1], "#ff9ad0"),
    sp5: theme("#05030f", "#ffffff", ["#1f5a8a", 0.08]),
    sp7: theme("#150510", "#ffc8a0", ["#a02a1a", 0.14], "#ff8a4a"),
    sp8: theme("#030a18", "#a0d8ff", ["#0a3a7a", 0.14], "#4be3ff"),
    sp9: theme("#08041a", "#e0c8ff", ["#5a2a8a", 0.1]),
    // l'invasion (niveaux 2, 6, 10) : l'espace profond, un champ d'astéroïdes, la planète du gardien
    spinv2: { sky: "#04020d", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: null, deco: [] },
    spinv6: { sky: "#0a0420", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: ["#8a1f6a", 0.08], deco: [] },
    spinv10: { sky: "#150510", skyTint: "#ffffff", tile: "#ffffff", land: "#ffffff", wash: ["#a02a1a", 0.12], deco: [] }
  };

  var LOW = 0.55; // gravité lunaire

  /** Les 7 parcours de plateformes (niveaux 1, 3, 4, 5, 7, 8, 9), dans le langage de segments de playsim.js. `pads` = ressorts, `crumble` = passerelle qui s'effrite. */
  var COURSES = {
    1: { theme: "sp1", abilities: { gravity: LOW }, course: [
      { t: "flat", n: 9, bits: [5, 6, 7] }, { t: "gap", n: 3 },
      { t: "flat", n: 7, en: [4], bits: [1, 2], cp: 1 }, { t: "gap", n: 4 },
      { t: "flat", n: 7, pads: [6], bits: [2, 3] }, { t: "gap", n: 6 },
      { t: "flat", n: 8, en: [3], bits: [1, 5, 6], cp: 0 }, { t: "gap", n: 3 },
      { t: "up", n: 2 }, { t: "flat", n: 6, bits: [1, 2, 3] }, { t: "down", n: 2 },
      { t: "gap", n: 3 }, { t: "flat", n: 5, en: [2], bits: [1, 2, 3] }, { t: "end", n: 9 }
    ] },
    3: { theme: "sp3", abilities: { gravity: LOW, whip: true }, course: [
      { t: "flat", n: 8, candles: [4], bits: [1] }, { t: "flat", n: 7, fly: [3], bits: [2] }, { t: "gap", n: 3 },
      { t: "flat", n: 7, en: [3], candles: [5], cp: 1 }, { t: "gap", n: 4 },
      { t: "flat", n: 7, spikes: [3], bits: [1], pads: [6] }, { t: "gap", n: 6 },
      { t: "up", n: 2 }, { t: "flat", n: 7, tough: [3], candles: [1], bits: [5] }, { t: "down", n: 2 },
      { t: "gap", n: 3 }, { t: "flat", n: 8, fly: [3, 6], dash: [7], cp: 0 },
      { t: "gap", n: 4 }, { t: "flat", n: 6, spikes: [2, 3], bits: [4], candles: [0] }, { t: "end", n: 9 }
    ] },
    4: { theme: "sp4", abilities: { gravity: LOW, doubleJump: true, shuriken: true }, course: [
      { t: "flat", n: 8, bits: [4, 5] }, { t: "gap", n: 4 },
      { t: "flat", n: 6, en: [3], bits: [1, 2] }, { t: "up", n: 3 }, { t: "flat", n: 5, bits: [1, 2, 3] },
      { t: "up", n: 2 }, { t: "flat", n: 5, en: [2], candles: [4], cp: 0, pads: [4] }, { t: "gap", n: 7 },
      { t: "down", n: 4 }, { t: "flat", n: 7, dash: [4], fly: [6], bits: [1] }, { t: "gap", n: 5 },
      { t: "up", n: 3 }, { t: "flat", n: 5, bits: [1, 2, 3] }, { t: "gap", n: 5 },
      { t: "flat", n: 4, bits: [1], cp: 0 }, { t: "end", n: 9 }
    ] },
    5: { theme: "sp5", abilities: { gravity: LOW }, course: [
      { t: "flat", n: 9 }, { t: "flat", n: 5, hop: [2], bits: [3, 4] },
      { t: "float", at: 1, w: 3, h: 2, crumble: true, bits: false }, { t: "gap", n: 4 },
      { t: "flat", n: 4, bits: [1, 2] },
      { t: "float", at: 0, w: 3, h: 2, crumble: true, bits: false }, { t: "gap", n: 4 },
      { t: "flat", n: 4, en: [1] }, { t: "gap", n: 4 },
      { t: "flat", n: 8, cp: 2, bits: [3, 4, 5] }, { t: "up", n: 1 }, { t: "flat", n: 5, en: [2] }, { t: "down", n: 1 },
      { t: "float", at: 1, w: 3, h: 2, crumble: true, bits: false }, { t: "gap", n: 4 },
      { t: "flat", n: 4 }, { t: "gap", n: 4 }, { t: "flat", n: 4, en: [1], bits: [2] }, { t: "gap", n: 4 },
      { t: "flat", n: 6, bits: [2, 3] }, { t: "end", n: 9 }
    ] },
    7: { theme: "sp7", abilities: { gravity: LOW, whip: true }, course: [
      { t: "flat", n: 9, candles: [4] }, { t: "flat", n: 7, spikes: [3], bits: [1, 2] }, { t: "gap", n: 4 },
      { t: "flat", n: 8, tough: [4], candles: [1, 6], cp: 1 }, { t: "up", n: 2 },
      { t: "flat", n: 7, fly: [2, 5], bits: [3, 4], pads: [6] }, { t: "gap", n: 6 }, { t: "down", n: 2 },
      { t: "flat", n: 5, spikes: [2], en: [4] }, { t: "gap", n: 4 },
      { t: "flat", n: 9, tough: [3], dash: [7], candles: [5], cp: 0 }, { t: "up", n: 3 },
      { t: "flat", n: 6, spikes: [2, 3], bits: [4, 5] }, { t: "down", n: 3 }, { t: "flat", n: 4, candles: [1] }, { t: "end", n: 9 }
    ] },
    8: { theme: "sp8", abilities: { gravity: LOW, doubleJump: true, shuriken: true }, course: [
      { t: "flat", n: 8, bits: [3, 4], candles: [6] }, { t: "up", n: 3 }, { t: "flat", n: 4, hop: [2] }, { t: "up", n: 3 },
      { t: "flat", n: 4, bits: [1, 2], candles: [3] }, { t: "gap", n: 5 },
      { t: "flat", n: 5, fly: [2], cp: 0, pads: [4] }, { t: "gap", n: 7 }, { t: "flat", n: 5, en: [2], bits: [3, 4] },
      { t: "gap", n: 5 }, { t: "down", n: 4 }, { t: "flat", n: 7, dash: [2], en: [5], fly: [4] },
      { t: "up", n: 3 }, { t: "flat", n: 4, bits: [1, 2] }, { t: "up", n: 3 }, { t: "flat", n: 4, cp: 0 },
      { t: "down", n: 6 }, { t: "flat", n: 4 }, { t: "gap", n: 5 }, { t: "end", n: 10 }
    ] },
    9: { theme: "sp9", abilities: { gravity: LOW, whip: true, shuriken: true }, course: [
      { t: "flat", n: 8, candles: [4] }, { t: "flat", n: 8, en: [3], hop: [6], bits: [1, 2] }, { t: "gap", n: 4 },
      { t: "flat", n: 7, fly: [2, 5], cp: 1, pads: [6] }, { t: "gap", n: 6 },
      { t: "up", n: 2 }, { t: "flat", n: 8, tough: [3], en: [6], spikes: [1] }, { t: "down", n: 2 }, { t: "gap", n: 4 },
      { t: "flat", n: 7, tough: [2], dash: [5], bits: [3, 4] }, { t: "up", n: 3 },
      { t: "flat", n: 7, fly: [2], en: [5], spikes: [3], candles: [1] }, { t: "down", n: 3 }, { t: "gap", n: 4 },
      { t: "flat", n: 8, tough: [3], fly: [5], cp: 0 }, { t: "end", n: 9 }
    ] }
  };

  /** L'invasion (niveaux 2, 6, 10) : des vagues d'envahisseurs ; `coins` = nombre d'envahisseurs dorés (une pièce chacun). */
  var ARENAS = {
    2: { mode: "invaders", theme: "spinv2", hpMax: 5, shields: 3, ufoEvery: 24, waves: [
      { cols: 5, rows: 2, kinds: ["crab", "drone"], speed: 26, fire: 0.5, coins: 3 },
      { cols: 5, rows: 2, kinds: ["squid", "drone"], speed: 30, fire: 0.6, coins: 3 },
      { cols: 5, rows: 3, kinds: ["squid", "crab", "drone"], speed: 33, fire: 0.7, coins: 3 }
    ] },
    6: { mode: "invaders", theme: "spinv6", hpMax: 5, shields: 3, ufoEvery: 22, waves: [
      { cols: 5, rows: 2, kinds: ["crab", "drone"], speed: 30, fire: 0.7, coins: 4 },
      { cols: 6, rows: 2, kinds: ["squid", "crab"], speed: 34, fire: 0.8, coins: 4 },
      { cols: 6, rows: 3, kinds: ["squid", "crab", "drone"], speed: 37, fire: 0.9, coins: 4 }
    ] },
    10: { mode: "invaders", theme: "spinv10", hpMax: 5, shields: 3, ufoEvery: 20, waves: [
      { cols: 6, rows: 2, kinds: ["crab", "drone"], speed: 34, fire: 0.8, coins: 5 },
      { cols: 6, rows: 3, kinds: ["squid", "crab", "drone"], speed: 38, fire: 0.9, coins: 5 },
      { cols: 6, rows: 2, kinds: ["squid", "crab"], speed: 36, fire: 0.9, coins: 5, boss: { hp: 30 } }
    ] }
  };

  /** L'histoire de chaque énigme dans ce monde (le briefing garde la même leçon, seul le décor de l'histoire change). */
  var LORE = [
    "Bienvenue à bord de la Station Syntaxe ! Ici, les machines parlent en langage d'ordinateur, et la fusée d'OctoCat n'a pas assez de vitesse pour décoller. Un Glitch bloque le premier Portail à Code…",
    "Dans la Nébuleuse des Chaînes, tout le monde parle avec des **mots**. Le gardien Glitch ne laisse passer que ceux qui connaissent le mot secret : `\"octocat\"`.",
    "Sur la Lune des Opérations, un vieil ascenseur lunaire ne démarre que si on lui dit combien pèsent **toutes** les caisses. Les Glitches ont effacé le calcul du chef de la base. Aide-le !",
    "Sur l'Anneau des Torches, une porte spatiale obéit à la **logique**. Deux voyants te montrent ce qu'elle voit : est-ce que l'OctoCat a la **clé** ? Y a-t-il un **garde** devant la porte ?",
    "Tu as passé le portail ! Devant toi, un pont de comètes s'éteint case par case… Seuls les endroits où la condition est **vraie** brillent encore.",
    "Au Marché Interstellaire, le marchand accueille chaque client selon la taille de sa bourse. Mais les Glitches ont brouillé sa règle : il ne reconnaît plus les clients **aisés** !",
    "Dans la Forge des Étoiles, on fabrique des étoiles jour et nuit… mais le forgeron Glitch frappe toujours le même coup au lieu de recommencer. Apprends-lui à **répéter** !",
    "Le gardien du Temple des Trous Noirs compte les offrandes **marche par marche**. Pour ouvrir la porte, il veut la **somme** de toutes les pièces posées sur l'escalier.",
    "Dans le Tri des Astéroïdes, une machine fabrique des Glitches numérotés. Seuls ceux qui ont un numéro **pair** sont instables : il faut les repérer avant qu'ils n'explosent !",
    "Sur sa planète, le Glitch Gardien attend dans son vaisseau-mère ! Pour le battre, il faut tirer encore et encore, **sans t'arrêter** tant qu'il tient debout."
  ];

  var runs = {};
  Object.keys(ARENAS).forEach(function (id) { runs[id] = ARENAS[id]; });
  Object.keys(COURSES).forEach(function (id) { var c = COURSES[id]; runs[id] = { mode: "platform", theme: c.theme, abilities: c.abilities, course: c.course }; });

  W.register(2, { titles: TITLES, lore: LORE, runs: runs, themes: THEMES, courses: COURSES, arenas: ARENAS });
})();
