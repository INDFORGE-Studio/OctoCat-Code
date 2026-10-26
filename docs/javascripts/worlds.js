/* OctoCat-Code — Les trois mondes : un langage = un monde.
 *
 *   monde 0  GitHubia            pseudo-code   la forêt, le village, la mine… (les niveaux level1.js à level10.js, inchangés)
 *   monde 1  La Tour du Serpent  Python        on GRIMPE : tours en zigzag jusqu'à la lune, et le serpent d'Octo à la place du Double Dragon
 *   monde 2  La Galaxie JS       JavaScript    l'ESPACE : gravité lunaire, ressorts, et l'invasion à la place du Double Dragon
 *
 * Les énigmes de code sont les mêmes dans les trois mondes (langs.js les écrit dans chaque langage). Ce qui change : le décor (sprites-worlds.js),
 * le trajet de chaque niveau (world-python.js, world-js.js) et son titre. `OctoWorlds.apply(def, monde)` renvoie une COPIE du niveau avec le trajet et
 * le titre du monde ; le moteur s'en sert au moment de lancer le trajet (engine.js).
 *
 *   OctoWorlds.register(monde, { titles: [10 titres], runs: { niveau: run }, themes: { nom: thème } })
 */
(function () {
  "use strict";

  var INFO = [
    { id: 0, lang: "Pseudo-code", name: "GitHubia", icon: "📝", blurb: "La forêt des syntaxes", accent: "#58a6ff", short: "GITHUBIA" },
    { id: 1, lang: "Python", name: "La Tour du Serpent", icon: "🐍", blurb: "Grimpe jusqu'à la lune", accent: "#7ee787", short: "TOUR DU SERPENT" },
    { id: 2, lang: "JavaScript", name: "La Galaxie JavaScript", icon: "🚀", blurb: "Des étoiles et des envahisseurs", accent: "#4be3ff", short: "GALAXIE JS" }
  ];
  var data = [null, null, null], themes = {};

  var Worlds = {
    info: INFO,
    themes: themes,
    register: function (w, d) {
      data[w] = d;
      Object.keys(d.themes || {}).forEach(function (n) { themes[n] = d.themes[n]; });
    },
    /** Le monde d'un langage (-1 si inconnu). */
    ofLang: function (lang) { for (var i = 0; i < INFO.length; i++) if (INFO[i].lang === lang) return i; return -1; },
    /** Titre d'un niveau dans un monde (null pour le monde 0 : on garde le titre d'origine). */
    title: function (id, w) { var d = data[w]; return d && d.titles ? d.titles[id - 1] || null : null; },
    /** Copie du niveau avec le trajet et le titre du monde `w` (le niveau d'origine n'est jamais modifié). */
    apply: function (def, w) {
      var d = data[w];
      if (!w || !d) return def;
      var copy = Object.assign({}, def), run = d.runs && d.runs[def.id];
      if (run) copy.run = run;
      if (d.titles && d.titles[def.id - 1]) copy.title = d.titles[def.id - 1];
      return copy;
    },
    data: function (w) { return data[w]; }
  };

  window.OctoWorlds = Worlds;
})();
