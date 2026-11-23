// Tests de la grange de Laita (grange.js) : textes lisibles par le canvas, mémoire des cadeaux robuste, la chienne n'est pas une héroïne.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts");

function load(stored) {
  const store = new Map(Object.entries(stored || {}));
  const scenes = {};
  const ctx = {
    console, Math, JSON, Object, Array, String,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    gameEngine: { registerScene: (name, def) => { scenes[name] = def; } }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(JS, "grange.js"), "utf8"), ctx, { filename: "grange.js" });
  return { G: ctx.OctoGrange, scenes, store };
}

test("grange : trois héros (Liam, Elias, Izia), la scène est enregistrée", () => {
  const { G, scenes } = load();
  assert.deepEqual(Array.from(G.HEROES.map((h) => h.id)), ["liam", "elias", "izia"]);
  assert.deepEqual(Array.from(G.HEROES.map((h) => h.name)), ["LIAM", "ELIAS", "IZIA"]);
  assert.equal(typeof scenes.grange.scene, "function");
  assert.ok(scenes.grange.alt.length > 20);
});

test("grange : tous les textes sont en capitales sans accents (la police du canvas n'en a pas) et de longueur raisonnable", () => {
  const { G } = load();
  const OK = /^[A-Z0-9 ,.'!?:()\-+]+$/;
  const texts = [];
  G.HEROES.forEach((h) => texts.push(h.name, h.power, h.text));
  texts.push(G.FINALE.title, G.FINALE.text, G.FINALE.sign);
  texts.forEach((t) => { assert.match(t, OK, "caractère non affichable dans : " + t); assert.ok(t.length < 220, "texte trop long : " + t); });
  G.HEROES.forEach((h) => assert.match(h.text, new RegExp(h.name), "le mot de " + h.name + " doit l'appeler par son prénom"));
});

test("grange : Laita est leur chienne, pas une héroïne (pas de « 4 héros »)", () => {
  const { G } = load();
  const all = JSON.stringify(G.HEROES) + JSON.stringify(G.FINALE);
  assert.ok(!/\b4 HEROS\b/.test(all));
  assert.match(G.FINALE.text, /3 HEROS/);
  assert.ok(!G.HEROES.some((h) => /LAITA/.test(h.id + h.name)));
});

test("grange : les cadeaux ouverts sont mémorisés, le reste est ignoré sans planter", () => {
  const a = load();
  let s = a.G.load();
  assert.equal(a.G.count(s), 0);
  s.opened.liam = true; a.G.save(s);
  s = a.G.load();
  assert.equal(a.G.count(s), 1);
  assert.equal(a.G.allOpened(s), false);
  s.opened.elias = true; s.opened.izia = true; a.G.save(s);
  assert.equal(a.G.allOpened(a.G.load()), true);
  for (const bad of ["pas du json", "null", "42", '{"opened":5}', '{"opened":{"liam":"oui","elias":1,"inconnu":true}}', '{"opened":null}']) {
    const g = load({ [load().G.KEY]: bad }).G;
    assert.equal(g.count(g.load()), 0, "valeur ignorée : " + bad);
  }
});

test("grange : sans stockage (navigation privée), la visite reste possible", () => {
  const { G } = load();
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, String, localStorage: { getItem() { throw new Error("bloqué"); }, setItem() { throw new Error("bloqué"); } } });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(JS, "grange.js"), "utf8"), ctx);
  assert.equal(ctx.OctoGrange.count(ctx.OctoGrange.load()), 0);
  assert.doesNotThrow(() => ctx.OctoGrange.save({ opened: { liam: true } }));
  assert.ok(G);
});
