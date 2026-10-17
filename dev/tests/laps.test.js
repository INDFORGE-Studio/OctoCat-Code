// Tours : 10 niveaux = 1 tour ; après chaque tour nouvelle apparence + choix du langage ; au 3e tour, c'est la fin du jeu (crédits).
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
    console, Math, JSON, Object, Array, Number, String, RegExp, Date,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    document: { readyState: "complete", querySelector: () => null, getElementById: () => null, addEventListener() {}, dispatchEvent() {} },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(JS, "progress.js"), "utf8"), ctx, { filename: "progress.js" });
  return ctx.OctoProgress;
}

function playAll(P, upTo = 10) { let last = null; for (let id = 1; id <= upTo; id++) last = P.complete(id); return last; }

test("tours : au départ, tour 0, apparence d'origine, Python", () => {
  const P = load();
  assert.equal(P.laps(), 0);
  assert.equal(P.skin(), 0);
  assert.equal(P.lang(), "Python");
  assert.equal(P.pendingLap(), false);
  assert.equal(P.creditsPending(), false);
});

test("tours : finir les 10 niveaux ouvre le tour suivant (apparence 1, niveaux reverrouillés, choix du langage), pièces gardées", () => {
  const P = load();
  P.bank(1, 15);
  const before = P.coins();
  const last = playAll(P);
  assert.equal(last.lap, "lap");
  assert.equal(P.laps(), 1);
  assert.equal(P.skin(), 1);
  assert.equal(P.pendingLap(), true);
  assert.equal(P.creditsPending(), false);
  const s = P.get();
  assert.deepEqual(s.completed, {});
  assert.equal(s.unlocked, 1);
  assert.equal(P.isUnlocked(2), false);
  assert.equal(P.coins(), before, "les pièces non dépensées sont gardées");
  assert.ok(s.achievements.lap1, "succès « Tour 1 »");
  // une pièce déjà gagnée au tour 1 peut être regagnée au tour 2 (nouveau tour = nouveaux trajets)
  assert.equal(P.bank(1, 15), 15);
});

test("tours : choisir le langage démarre le tour (Pseudo-code, JavaScript ; langage inconnu = Python) et donne « Polyglotte »", () => {
  const P = load();
  playAll(P);
  P.startLap("JavaScript");
  assert.equal(P.lang(), "JavaScript");
  assert.equal(P.pendingLap(), false);
  assert.ok(P.get().achievements.polyglot);
  const Q = load();
  playAll(Q);
  Q.startLap("Brainfuck");
  assert.equal(Q.lang(), "Python");
});

test("tours : le 2e tour donne l'apparence 2, le 3e tour la fin du jeu : crédits, apparence 3, rien ne se reverrouille", () => {
  const P = load();
  playAll(P); P.startLap("JavaScript");
  assert.equal(playAll(P).lap, "lap");
  assert.equal(P.skin(), 2);
  P.startLap("Pseudo-code");
  const end = playAll(P);
  assert.equal(end.lap, "end");
  assert.equal(P.laps(), 3);
  assert.equal(P.skin(), 3);
  assert.equal(P.creditsPending(), true);
  assert.equal(P.pendingLap(), false);
  const s = P.get();
  assert.equal(s.finished, true);
  assert.equal(Object.keys(s.completed).length, 10, "le jeu fini reste ouvert : tous les niveaux jouables");
  assert.ok(s.achievements.lap3);
  P.finishCredits();
  assert.equal(P.creditsPending(), false);
  // rejouer le niveau 10 après la fin ne relance ni tour ni crédits
  assert.equal(P.complete(10).lap, null);
  assert.equal(P.laps(), 3);
  assert.equal(P.creditsPending(), false);
});

test("magie des torches : un niveau passé par la magie compte pour le tour et la fin (mais sans pièces ni succès de niveau)", () => {
  const P = load();
  const r = P.complete(1, { magic: true });
  assert.equal(P.isCompleted(1), true);
  assert.equal(P.isUnlocked(2), true);
  assert.equal(P.coins(), 0);
  assert.equal(r.includes("first_compile"), false);
  assert.equal(r.includes("flawless"), false);
  assert.equal(P.get().completed[1].magic, true);
  // une vraie réussite n'est jamais remplacée par la magie
  P.complete(2);
  P.complete(2, { magic: true });
  assert.equal(P.get().completed[2].magic, undefined);
  // la magie sauvegardée reste marquée après import
  const Q = load();
  assert.equal(Q.importSave(P.exportSave()).ok, true);
  assert.equal(Q.get().completed[1].magic, true);
});

test("magie des torches : 10 niveaux passés par la magie = tour fini, puis fin du jeu au 3e tour (crédits)", () => {
  const P = load();
  let last = null;
  for (let id = 1; id <= 10; id++) last = P.complete(id, { magic: true });
  assert.equal(last.lap, "lap");
  assert.equal(P.laps(), 1);
  assert.equal(P.pendingLap(), true);
  P.startLap("JavaScript");
  for (let id = 1; id <= 10; id++) last = P.complete(id, { magic: true });
  assert.equal(last.lap, "lap");
  P.startLap("Pseudo-code");
  for (let id = 1; id <= 10; id++) last = P.complete(id, { magic: true });
  assert.equal(last.lap, "end");
  assert.equal(P.creditsPending(), true);
});

test("tours : ne pas avoir fini les 10 niveaux ne change rien (niveau 10 seul)", () => {
  const P = load();
  const r = P.complete(10);
  assert.equal(r.lap, null);
  assert.equal(P.laps(), 0);
});

test("tours : la sauvegarde garde tours, langage et fin ; un code truqué est assaini", () => {
  const P = load();
  playAll(P); P.startLap("JavaScript"); playAll(P);
  const code = P.exportSave();
  const Q = load();
  assert.equal(Q.importSave(code).ok, true);
  assert.equal(Q.laps(), 2);
  assert.equal(Q.lang(), "JavaScript");
  assert.equal(Q.pendingLap(), true);
  const R = load();
  assert.equal(R.importSave(JSON.stringify({ unlocked: 3, laps: 99, lapLang: "Cobol", pendingLap: "oui" })).ok, true);
  assert.equal(R.laps(), 3, "tours plafonnés");
  assert.equal(R.lang(), "Python", "langage inconnu refusé");
  assert.equal(R.pendingLap(), false, "seul un vrai booléen compte");
});
