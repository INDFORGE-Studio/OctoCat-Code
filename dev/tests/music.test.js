// Tests de la théorie musicale (partie pure de music.js) ; le rendu audio est vérifié par `npm run shot`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts/music.js");
const ctx = { document: { addEventListener() {}, hidden: false }, Math, Uint8Array };
ctx.window = ctx; // pas de localStorage ni d'AudioContext : le module doit le tolérer
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, "utf8"), ctx, { filename: "music.js" });
const T = ctx.OctoMusic._theory;

test("fréquences : le la 440 et l'octave", () => {
  assert.equal(T.midiToHz(69), 440);
  assert.ok(Math.abs(T.midiToHz(81) - 880) < 1e-9);
});

test("tempo : monte avec le danger, borné entre 76 et 132 BPM", () => {
  assert.equal(Math.round(T.bpmFor(0)), 76);
  assert.equal(Math.round(T.bpmFor(1)), 132);
  assert.ok(T.bpmFor(0.5) > T.bpmFor(0.2));
  assert.equal(T.bpmFor(-3), T.bpmFor(0));
  assert.equal(T.bpmFor(9), T.bpmFor(1));
});

test("notes : calme = pentatonique claire seulement, hostile = gamme sombre", () => {
  const pc = (n) => (n - T.ROOT) % 12;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const calm = new Set(), dark = new Set();
  for (let i = 0; i < 400; i++) { calm.add(pc(T.pickNote(0, rnd))); dark.add(pc(T.pickNote(1, rnd))); }
  assert.equal([...calm].sort((a, b) => a - b).join(","), "0,2,4,7,9");
  assert.equal([...dark].sort((a, b) => a - b).join(","), "0,1,3,6,7,10");
});

test("accords : lumineux en dessous de 0,5 de danger, sombres au-dessus ; l'index boucle sur 4", () => {
  assert.equal(T.chordFor(0.2, 0)[1], 4); // ré majeur 7 : tierce majeure
  assert.equal(T.chordFor(0.8, 0)[1], 3); // ré mineur : tierce mineure
  assert.equal(T.chordFor(0.2, 4)[0], T.chordFor(0.2, 0)[0]);
  assert.equal(T.chordFor(0.2, -1)[0], T.chordFor(0.2, 3)[0]);
});

test("API : sans AudioContext, rien ne plante", () => {
  const M = ctx.OctoMusic;
  M.unlock(); M.setMood(0.9); M.hit(); M.victory();
  assert.equal(M.state().running, false);
  assert.equal(M.level(), 0);
});
