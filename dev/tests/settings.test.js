// Tests des réglages (settings.js : touches personnalisables, options) et de la sauvegarde (progress.js : export / import).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts");

function load(stored) {
  const store = new Map(Object.entries(stored || {}));
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, RegExp,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    document: { readyState: "complete", querySelector: () => null, getElementById: () => null, addEventListener() {}, dispatchEvent() {} },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ["progress.js", "settings.js"]) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx, { filename: f });
  return { S: ctx.OctoSettings, P: ctx.OctoProgress, store };
}

test("réglages : touches par défaut (clavier AZERTY/QWERTY et souris)", () => {
  const { S } = load();
  assert.equal(S.lookup("Space"), "jump");
  assert.equal(S.lookup("KeyW"), "up");
  assert.equal(S.lookup("KeyX"), "attack");
  assert.equal(S.lookup("Mouse0"), "attack");
  assert.equal(S.lookup("Mouse2"), "throw");
  assert.equal(S.lookup("KeyP"), null);
});

test("réglages : lier une touche la retire de l'ancienne action et se mémorise", () => {
  const { S, store } = load();
  const r = S.bind("attack", "KeyF");
  assert.equal(r.ok, true);
  assert.equal(S.lookup("KeyF"), "attack");
  const r2 = S.bind("throw", "KeyF"); // reprise à « Frapper »
  assert.equal(r2.ok, true);
  assert.equal(r2.moved, "Frapper");
  assert.equal(S.lookup("KeyF"), "throw");
  assert.ok(!S.keys("attack").includes("KeyF"));
  const again = load({ "octocat-code:settings:v1": store.get("octocat-code:settings:v1") }).S; // rechargement
  assert.equal(again.lookup("KeyF"), "throw");
});

test("réglages : touches réservées ou invalides refusées, 4 touches maximum, retrait, valeurs par défaut", () => {
  const { S } = load();
  assert.equal(S.bind("jump", "Escape").ok, false);
  assert.equal(S.bind("jump", "F5").ok, false);
  assert.equal(S.bind("jump", "pas une touche").ok, false);
  assert.equal(S.bind("nimporte", "KeyQ").ok, false);
  S.bind("jump", "KeyQ"); S.bind("jump", "KeyE"); S.bind("jump", "KeyR");
  assert.equal(S.keys("jump").length, 4);
  assert.equal(S.bind("jump", "KeyT").ok, false);
  S.unbind("jump", "KeyQ");
  assert.equal(S.lookup("KeyQ"), null);
  S.resetKeys();
  assert.deepEqual(Array.from(S.keys("jump")), ["Space"]);
});

test("réglages : un stockage abîmé retombe sur les valeurs par défaut", () => {
  const { S } = load({ "octocat-code:settings:v1": '{"keys":{"jump":["Escape","  x","KeyZ","KeyZ"],"left":5},"pad":"bizarre","sfx":"oui","relax":true}' });
  assert.deepEqual(Array.from(S.keys("jump")), ["KeyZ"]);
  assert.deepEqual(Array.from(S.keys("left")), ["ArrowLeft", "KeyA"]);
  assert.equal(S.get("pad"), "auto");
  assert.equal(S.get("sfx"), true);
  assert.equal(S.get("relax"), true);
  const { S: broken } = load({ "octocat-code:settings:v1": "{pas du json" });
  assert.equal(broken.lookup("Space"), "jump");
});

test("réglages : options typées (set refuse les mauvais types) et texte d'aide sans accents", () => {
  const { S } = load();
  assert.equal(S.set("shake", false), true);
  assert.equal(S.get("shake"), false);
  assert.equal(S.set("shake", "non"), false);
  assert.equal(S.set("pad", "toujours"), false);
  assert.equal(S.set("pad", "on"), true);
  assert.equal(S.hintFor("jump", 1), "ESPACE");
  assert.equal(S.hintFor("attack", 2), "CLIC GAUCHE/X");
  assert.equal(S.hintFor("throw", 2), "CLIC DROIT/C");
  assert.equal(S.hintFor("attack", 1), "CLIC GAUCHE");
  S.unbind("attack", "Mouse0");
  assert.equal(S.hintFor("attack", 2), "X/J");
  assert.match(S.label("Mouse2"), /droit/);
});

test("sauvegarde : export puis import redonne la progression ; un code invalide est refusé sans rien changer", () => {
  const { P } = load();
  P.complete(1); P.complete(2); P.setLanguage("Python");
  const code = P.exportSave();
  P.reset();
  assert.equal(P.get().unlocked, 1);
  const r = P.importSave(code);
  assert.equal(r.ok, true);
  assert.equal(P.get().unlocked, 3);
  assert.ok(P.isCompleted(2));
  assert.equal(P.get().language, "Python");
  assert.equal(P.importSave("n'importe quoi").ok, false);
  assert.equal(P.importSave("[1,2]").ok, false);
  assert.equal(P.importSave('{"unlocked":"x"}').ok, false);
  assert.equal(P.get().unlocked, 3);
});

test("sauvegarde : valeurs hors limites ramenées dans la plage, clés inconnues ignorées", () => {
  const { P } = load();
  const r = P.importSave('{"unlocked":999,"completed":{"3":{"at":5},"99":{"at":1},"x":{}},"achievements":{"inconnu":1,"curious":2},"fails":{"4":2,"5":-1},"language":"Rust"}');
  assert.equal(r.ok, true);
  const s = P.get();
  assert.equal(s.unlocked, 10);
  assert.deepEqual(Array.from(Object.keys(s.completed)), ["3"]);
  assert.deepEqual(Array.from(Object.keys(s.achievements)), ["curious"]);
  assert.deepEqual(Array.from(Object.keys(s.fails)), ["4"]);
  assert.equal(s.language, null);
});

test("sauvegarde : la réinitialisation remet le niveau 1 seul d'ouvert", () => {
  const { P } = load();
  P.complete(1); P.complete(2); P.complete(3);
  P.reset();
  assert.equal(P.get().unlocked, 1);
  assert.equal(Object.keys(P.get().completed).length, 0);
});
