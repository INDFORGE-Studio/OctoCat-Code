// Charge les scripts du jeu (IIFE de navigateur) dans un contexte vm avec un faux `window`, sans KAPLAY.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts");
const ORDER = ["playsim.js", "puzzle.js", "langs.js", "engine.js", ...Array.from({ length: 10 }, (_, i) => `level${i + 1}.js`)];

export function loadGame() {
  const ctx = {
    document: { readyState: "complete", querySelectorAll: () => [], addEventListener() {} },
    console, Math, JSON, Object, Array, URL, Promise, setTimeout, clearTimeout, Set, Map
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx, { filename: f });
  return { engine: ctx.gameEngine, sim: ctx.OctoSim, puzzle: ctx.OctoPuzzle, ctx };
}
