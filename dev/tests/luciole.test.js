// Tests de LUCIOLE (luciole.js), l'aide guidée du bouton « ? » : rubriques reliées entre elles, textes pour enfants, jamais de solution, liens sûrs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts");
const SRC = fs.readFileSync(path.join(JS, "luciole.js"), "utf8");

function load() {
  const ctx = { console, Math, JSON, Object, Array, String };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "luciole.js" });
  return ctx.OctoLuciole;
}

function allText(t) {
  return [t.ask || "", t.title, ...t.lines, ...(t.actions || []).map((a) => a.label), ...(t.links || []).map((l) => l.label)];
}

test("luciole : phrase d'accueil et rubriques demandées", () => {
  const L = load();
  assert.equal(L.welcome, "Je suis LUCIOLE, comment puis-je t'aider dans ta recherche ?");
  assert.equal(L.topics.home.title, L.welcome);
  for (const id of ["play", "keys", "touch", "stuck", "save", "settings", "learn"]) assert.ok(L.topics[id], `rubrique ${id}`);
  assert.deepEqual(Array.from(L.topics.home.next), ["play", "keys", "stuck", "save", "settings", "learn"]);
});

test("luciole : chaque question de suivi existe, chaque rubrique est atteignable depuis l'accueil", () => {
  const T = load().topics, seen = new Set(["home"]), todo = ["home"];
  while (todo.length) {
    const id = todo.pop();
    for (const n of T[id].next || []) {
      assert.ok(T[n], `${id} → ${n} inconnue`);
      assert.ok(T[n].ask, `${n} n'a pas de texte de bouton`);
      if (!seen.has(n)) { seen.add(n); todo.push(n); }
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(T).sort());
  for (const [id, t] of Object.entries(T)) if (id !== "home") assert.ok((t.next || []).length > 0, `${id} propose des questions de suivi`);
});

test("luciole : les boutons mènent à des endroits du jeu qui existent", () => {
  const T = load().topics, tabs = ["keys", "sound", "screen", "game"];
  for (const t of Object.values(T)) {
    for (const a of t.actions || []) {
      const m = /^settings:(\w+)$/.exec(a.go);
      assert.ok(m ? tabs.includes(m[1]) : ["hint", "brief"].includes(a.go), `action ${a.go}`);
      if (a.go === "hint" || a.go === "brief") assert.equal(a.when, "puzzle", "indice et briefing : seulement pendant une énigme");
    }
  }
  const settings = fs.readFileSync(path.join(JS, "settings.js"), "utf8");
  for (const tab of tabs) assert.ok(settings.includes(`["${tab}",`), `onglet ${tab} des réglages`);
  const engine = fs.readFileSync(path.join(JS, "engine.js"), "utf8");
  assert.match(engine, /data-octo-btn", "hint"/);
  assert.match(engine, /data-octo-btn", "brief"/);
});

test("luciole : textes courts, sans nom de navigateur, Laïta avec tréma, jamais « Playmobil »", () => {
  const T = load().topics;
  for (const [id, t] of Object.entries(T)) {
    for (const s of allText(t)) {
      assert.ok(s.length <= 170, `${id} : phrase trop longue (${s.length}) : ${s}`);
      assert.doesNotMatch(s, /firefox|chrome|chromium|safari|edge|opera|brave/i, `${id} : nom de navigateur`);
      assert.doesNotMatch(s, /playmobil/i);
      assert.doesNotMatch(s.replace(/\*\*LAITA\*\*/g, ""), /Laita/, `${id} : « Laïta » prend un tréma (sauf LAITA, écrit dans le canvas)`);
      assert.doesNotMatch(s, /<[a-z]/i, `${id} : pas de balise HTML`);
    }
  }
});

test("luciole : jamais de solution d'énigme (ni code des réponses, ni noms de variables des niveaux)", () => {
  const T = load().topics;
  const text = Object.values(T).flatMap(allText).join("\n");
  assert.doesNotMatch(text, /v_[a-z]/i, "aucun nom de variable des énigmes");
  assert.doesNotMatch(text, /\b(range\(|while |for i|elif |if i|tant que|pour i)/i, "aucun morceau de réponse");
  assert.match(T.stuck.lines.join(" "), /Indice/, "renvoie vers les indices du jeu");
});

test("luciole : seuls deux liens sortants, en https, vers la documentation officielle en français", () => {
  const T = load().topics;
  const links = Object.values(T).flatMap((t) => t.links || []);
  assert.deepEqual(links.map((l) => l.href), ["https://docs.python.org/fr/3/tutorial/", "https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide"]);
  assert.match(SRC, /rel = "noopener noreferrer"/);
  assert.match(SRC, /target = "_blank"/);
});

test("luciole : aucun eval, aucun innerHTML, aucune ressource chargée", () => {
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); // sans les commentaires (qui disent « jamais innerHTML »)
  assert.doesNotMatch(code, /\beval\s*\(|new Function|innerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|import\(|\.src\s*=/);
});
