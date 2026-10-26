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
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test("fréquences : le la 440 et l'octave", () => {
  assert.equal(T.midiToHz(69), 440);
  assert.ok(Math.abs(T.midiToHz(81) - 880) < 1e-9);
});

test("tempo : 100 BPM au calme, légère hausse en alerte, 140 BPM en combat (monde 0)", () => {
  assert.equal(T.bpmFor(0, 0), 100);
  assert.equal(T.bpmFor(1, 0), 112);
  assert.equal(T.bpmFor(0, 1), 140);
  assert.ok(T.bpmFor(0.6, 0) > T.bpmFor(0.2, 0));
  assert.equal(T.bpmFor(-3, -1), 100);
  assert.equal(T.bpmFor(9, 9), 152);
});

test("ornements : calme = pentatonique claire seulement ; l'alerte ajoute la couleur mineure", () => {
  const pc = (n) => (n - T.ROOT) % 12;
  const rnd = seeded(7), calm = new Set(), alert = new Set();
  for (let i = 0; i < 600; i++) { calm.add(pc(T.pickNote(0, rnd))); alert.add(pc(T.pickNote(1, rnd))); }
  assert.equal([...calm].sort((a, b) => a - b).join(","), "0,2,4,7,9");
  assert.equal([...alert].sort((a, b) => a - b).join(","), "0,2,3,4,5,7,8,9");
});

test("accords : majeurs au calme, Sol mineur emprunté en alerte (3e mesure), mineurs au combat ; boucle sur 4", () => {
  assert.equal(T.chordFor(false, 0, 0)[1], 4); // ré majeur : tierce majeure
  assert.equal(T.chordFor(false, 0, 2)[1], -3); // sol majeur : si
  assert.equal(T.chordFor(false, 0.8, 2)[1], -4); // sol mineur : si bémol
  assert.equal(T.chordFor(false, 0.8, 0)[1], 4); // les autres mesures ne changent pas
  assert.equal(T.chordFor(true, 0, 0)[1], 3); // ré mineur
  assert.equal(T.chordFor(false, 0, 4)[0], T.chordFor(false, 0, 0)[0]);
  assert.equal(T.chordFor(true, 0, -1)[0], T.chordFor(true, 0, 3)[0]);
});

test("thèmes : 4 mesures, notes dans la mesure, sans chevauchement ; le calme reste dans la gamme de ré majeur", () => {
  for (const melody of [T.MELODY_CALM, T.MELODY_BATTLE]) {
    assert.equal(melody.length, 4);
    for (const bar of melody) {
      let end = 0;
      for (const [start, , len] of bar) { assert.ok(start >= end, "chevauchement"); end = start + len; assert.ok(end <= 16, "dépasse la mesure"); }
    }
  }
  const major = new Set([0, 2, 4, 5, 7, 9, 11]);
  for (const bar of T.MELODY_CALM) for (const [, n] of bar) assert.ok(major.has(((n % 12) + 12) % 12), `note hors gamme : ${n}`);
  assert.deepEqual(Array.from(T.melodyAt(false, 0, 0)), [0, 4, 2]);
  assert.equal(T.melodyAt(false, 0, 1), null);
});

test("volume : borné entre 0 et 1, valeur par défaut audible", () => {
  const M = ctx.OctoMusic;
  assert.equal(M.getVolume(), 0.8);
  M.setVolume(2); assert.equal(M.getVolume(), 1);
  M.setVolume(-1); assert.equal(M.getVolume(), 0);
  M.setVolume("abc"); assert.equal(M.getVolume(), 0);
  M.setVolume(0.5); assert.equal(M.getVolume(), 0.5);
});

test("API : sans AudioContext, rien ne plante", () => {
  const M = ctx.OctoMusic;
  M.unlock(); M.setMood(0.9); M.setBattle(true); M.hit(); M.victory();
  assert.equal(M.state().running, false);
  assert.equal(M.state().battle, false); // la victoire ramène au calme
  assert.equal(M.level(), 0);
});
