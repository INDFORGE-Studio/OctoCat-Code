import js from "@eslint/js";
import globals from "globals";

// Le code du joueur n'est JAMAIS exécuté : toute forme d'eval est une erreur.
const noEval = { "no-eval": "error", "no-implied-eval": "error", "no-new-func": "error" };

export default [
  { ignores: ["docs/javascripts/vendor/**", "site/**", "node_modules/**", "dev/shots/**"] },
  js.configs.recommended,
  {
    files: ["docs/javascripts/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, kaplay: "readonly", OctoProgress: "writable", OctoSprites: "writable", OctoScenery: "writable", gameEngine: "writable" }
    },
    rules: { ...noEval, "no-unused-vars": ["warn", { args: "none" }] }
  },
  {
    files: ["dev/**/*.mjs", "dev/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "module", globals: { ...globals.node, ...globals.browser } },
    rules: noEval
  }
];
