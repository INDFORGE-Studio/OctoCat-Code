// Charge les scripts du jeu (IIFE de navigateur) dans un contexte vm avec un faux `window`, sans KAPLAY.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts");
const ORDER = ["progress.js", "secret-rooms.js", "playsim.js", "sim-tower.js", "sim-space.js", "sim-snake.js", "puzzle.js", "langs.js", "engine.js", ...Array.from({ length: 10 }, (_, i) => `level${i + 1}.js`), "worlds.js", "world-python.js", "world-js.js"];

export function loadGame() {
  const ctx = {
    document: { readyState: "complete", querySelectorAll: () => [], addEventListener() {}, dispatchEvent() {} },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    localStorage: (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })(),
    console, Math, JSON, Object, Array, URL, Promise, setTimeout, clearTimeout, Set, Map
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx, { filename: f });
  return { engine: ctx.gameEngine, sim: ctx.OctoSim, puzzle: ctx.OctoPuzzle, ctx };
}
