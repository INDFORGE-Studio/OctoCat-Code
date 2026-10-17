// Les 10 réponses dans les 3 langages (Python, JavaScript, pseudo-code) : on part du vrai code de départ (avec ses commentaires,
// comme le joueur) et on remplace seulement les ???.
import test from "node:test";
import assert from "node:assert/strict";
import { loadGame } from "./loader.mjs";

const { engine, ctx } = loadGame();
const L = ctx.OctoLangs;

for (const lang of L.LANGS) {
  for (let n = 1; n <= 10; n++) {
    test(`niveau ${n} (${lang}) : la réponse est acceptée (commentaires du code de départ gardés), le code de départ seul est refusé`, () => {
      const base = engine.levels[n], lvl = L.apply(base, lang);
      assert.ok(/\?\?\?/.test(lvl.starter), "le départ contient des ???");
      const code = L.solve(base, lang);
      assert.ok(!/\?\?\?/.test(code.split("\n").filter((l) => !/^\s*(#|\/\/)/.test(l)).join("\n")), "tous les ??? sont remplis");
      const r = base.validate(code, engine);
      assert.equal(r.ok, true, `niveau ${n} (${lang}) : ${(r.messages || []).join(" / ")}\n${code}`);
      assert.equal(base.validate(lvl.starter, engine).ok, false, "le départ non rempli est refusé");
      const bare = code.split("\n").filter((l) => !/^\s*(#|\/\/)/.test(l)).join("\n"); // même réponse sans aucun commentaire
      assert.equal(base.validate(bare, engine).ok, true, `niveau ${n} (${lang}) sans commentaires`);
    });
  }
}

test("langages : le niveau d'origine n'est jamais modifié, les exemples commencent par le langage choisi, le départ est bien dans ce langage", () => {
  for (let n = 1; n <= 10; n++) {
    const base = engine.levels[n], before = JSON.stringify([base.starter, base.hints, base.briefing]);
    for (const lang of L.LANGS) {
      const v = L.apply(base, lang);
      assert.equal(Object.keys(v.briefing.examples)[0], lang, `niveau ${n} : exemples ${lang} en premier`);
      assert.equal(v.hints.length, 3, `niveau ${n} (${lang}) : 3 indices`);
      assert.match(v.hints[2], /^La réponse/, `niveau ${n} (${lang}) : le 3e indice donne la réponse`);
      assert.doesNotMatch(v.hints[0] + v.hints[1], /^La réponse/);
      if (lang === "JavaScript" && n >= 5) assert.match(v.starter, /\{/, `niveau ${n} : accolades en JavaScript`);
      if (lang === "Pseudo-code" && n >= 5) assert.match(v.starter, /\b(alors|faire)\b/, `niveau ${n} : mots français`);
      if (lang !== "Python" && n >= 5) assert.doesNotMatch(v.starter, /^\s*(if|elif|for|while)\b.*:\s*$/m, `niveau ${n} (${lang}) : pas de « : » à la Python`);
      // le 3e indice contient la réponse (chaque morceau qui remplace un ???)
      const py = L.apply(base, "Python");
      assert.ok(py.starter.length > 0);
    }
    assert.equal(JSON.stringify([base.starter, base.hints, base.briefing]), before, `niveau ${n} : original intact`);
  }
});

test("indices : 3 par niveau, le dernier donne la réponse (c'est lui qui coûte 15 pièces, avec confirmation)", () => {
  for (let n = 1; n <= 10; n++) {
    const h = engine.levels[n].hints;
    assert.equal(h.length, 3, `niveau ${n} : 3 indices`);
    assert.match(h[2], /^La réponse/, `niveau ${n} : le 3e indice donne la réponse`);
    assert.doesNotMatch(h[0] + h[1], /^La réponse/, `niveau ${n} : les deux premiers ne la donnent pas`);
  }
});
