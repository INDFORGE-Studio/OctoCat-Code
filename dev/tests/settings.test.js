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
  assert.equal(S.lookup("Mouse2"), "dog");
  assert.equal(S.lookup("KeyV"), "dog");
  assert.equal(S.lookup("KeyF"), "throw", "le shuriken est sur F par défaut");
  assert.equal(S.lookup("KeyC"), "throw");
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
  assert.equal(S.hintFor("dog", 2), "CLIC DROIT/V");
  assert.equal(S.hintFor("throw", 2), "F/C");
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

test("sauvegarde complète : progression + touches + options passent par un seul code, ancien code accepté", () => {
  const { S, P } = load();
  P.complete(1); P.complete(2);
  S.bind("attack", "KeyG"); S.set("shake", false); S.set("relax", true);
  const code = S.exportAll();
  S.resetAll(); P.reset();
  assert.equal(S.lookup("KeyG"), null); assert.equal(P.get().unlocked, 1);
  assert.equal(S.importAll(code).ok, true);
  assert.equal(S.lookup("KeyG"), "attack");
  assert.equal(S.get("shake"), false); assert.equal(S.get("relax"), true);
  assert.equal(P.get().unlocked, 3);
  // ancien code : progression seule
  const old = P.exportSave(); P.reset();
  assert.equal(S.importAll(old).ok, true);
  assert.equal(P.get().unlocked, 3);
  // codes invalides : refusés, rien ne change
  assert.equal(S.importAll("pas du json").ok, false);
  assert.equal(S.importAll('{"v":2,"progress":{"unlocked":"x"}}').ok, false);
  assert.equal(S.importAll("[]").ok, false);
  assert.equal(P.get().unlocked, 3);
});

test("stockage : état lisible (ok / persistant) même sans navigateur", () => {
  const { S } = load();
  const st = S.storage();
  assert.equal(st.ok, true);
  assert.equal(typeof st.canPersist, "boolean");
});

test("pièces : encaissées une seule fois par niveau, dépensées pour les indices, indices rendus payants à chaque passage", () => {
  const { P } = load();
  assert.equal(P.coins(), 0);
  assert.equal(P.bank(1, 5), 5);
  assert.equal(P.bank(1, 5), 0, "rejouer le même trajet ne rapporte rien");
  assert.equal(P.bank(1, 7), 2, "seules les pièces en plus comptent");
  assert.equal(P.coins(), 7);
  assert.equal(P.payHint(1, 3), true);
  assert.equal(P.coins(), 4);
  assert.equal(P.paidHints(1), 1);
  assert.equal(P.payHint(1, 9), false, "pas assez : rien ne change");
  assert.equal(P.coins(), 4);
  assert.equal(P.paidHints(1), 1);
  P.complete(1);
  assert.equal(P.paidHints(1), 0, "réussir le niveau : les indices sont à repayer au prochain passage");
  assert.equal(P.coins(), 4, "les pièces restantes sont gardées");
});

test("pièces : elles passent dans le code de sauvegarde, valeurs hors limites ramenées à la raison", () => {
  const { P } = load();
  P.bank(2, 4); P.payHint(2, 1);
  const code = P.exportSave();
  const other = load().P;
  assert.equal(other.importSave(code).ok, true);
  assert.equal(other.coins(), 3);
  assert.equal(other.paidHints(2), 1);
  const bad = load().P;
  assert.equal(bad.importSave(JSON.stringify({ unlocked: 2, coins: -5, banked: { 99: 4 }, paid: { 1: "x" } })).ok, true);
  assert.equal(bad.coins(), 0);
  assert.equal(bad.paidHints(1), 0);
});

test("score : toutes les pièces gagnées (les indices payés ne le font pas baisser) ; au-delà de 499, on choisit son apparence", () => {
  const { P } = load();
  assert.equal(P.earned(), 0);
  assert.equal(P.canPickSkin(), false);
  P.bank(1, 15); P.payHint(1, 5);
  assert.equal(P.coins(), 10);
  assert.equal(P.earned(), 15, "dépenser des pièces ne baisse pas le score");
  assert.equal(P.pickSkin(2), false, "refusé sous 500");
  assert.equal(P.skin(), 0);
  const rich = load().P;
  assert.equal(rich.importSave(JSON.stringify({ unlocked: 1, earned: 499 })).ok, true);
  assert.equal(rich.canPickSkin(), false, "499 ne suffit pas");
  assert.equal(rich.importSave(JSON.stringify({ unlocked: 1, earned: 500, skinPick: 3 })).ok, true);
  assert.equal(rich.canPickSkin(), true);
  assert.equal(rich.skin(), 3, "l'apparence choisie est reprise de la sauvegarde");
  assert.equal(rich.pickSkin(1), true);
  assert.equal(rich.skin(), 1);
  assert.equal(rich.pickSkin(4), false, "il n'y a que 4 apparences");
  assert.equal(rich.earned(), 500);
  rich.reset();
  assert.equal(rich.earned(), 0, "recommencer à zéro remet le score à zéro");
  assert.equal(rich.skin(), 0);
});

test("réglages : d'anciens réglages (clic droit = shuriken) passent à Laita sans perdre les autres touches", () => {
  const { S } = load({ "octocat-code:settings:v1": JSON.stringify({ keys: { throw: ["KeyC", "Mouse2"], attack: ["KeyX"] }, sfx: false }) });
  assert.equal(S.lookup("Mouse2"), "dog", "le clic droit appelle Laita");
  assert.equal(S.lookup("KeyC"), "throw", "le shuriken garde sa touche du clavier");
  assert.equal(S.get("sfx"), false, "les autres réglages sont gardés");
});

test("réglages : les anciennes touches par défaut du shuriken (C / K) reçoivent F en premier, des touches personnalisées ne bougent pas", () => {
  const old = load({ "octocat-code:settings:v1": JSON.stringify({ keys: { throw: ["KeyC", "KeyK"] } }) }).S;
  assert.equal(old.lookup("KeyF"), "throw");
  assert.equal(old.hintFor("throw", 2), "F/C");
  const custom = load({ "octocat-code:settings:v1": JSON.stringify({ keys: { throw: ["KeyB"] } }) }).S;
  assert.equal(custom.lookup("KeyB"), "throw");
  assert.equal(custom.lookup("KeyF"), null, "un choix personnalisé est respecté");
});
