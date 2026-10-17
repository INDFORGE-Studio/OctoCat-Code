// Les 10 réponses : on part du vrai code de départ (avec ses commentaires, comme le joueur) et on remplace seulement les ???.
import test from "node:test";
import assert from "node:assert/strict";
import { loadGame } from "./loader.mjs";

const { engine } = loadGame();

const FILL = {
  1: [["v_speed = ???", "v_speed = 200"]],
  2: [["v_mot = ???", 'v_mot = v_debut + "cat"']],
  3: [["v_charge = ???", "v_charge = v_caisses * v_poids_caisse"]],
  4: [["v_porte_ouverte = ???", "v_porte_ouverte = v_cle and not v_garde"]],
  5: [["if ???:", "if v_energie >= 50:"]],
  6: [["elif ???:", "elif v_or >= 50:"]],
  7: [["range(???)", "range(v_commande)"]],
  8: [["range(1, ???)", "range(1, v_marches + 1)"], ["v_total + ???", "v_total + i"]],
  9: [["if ???:", "if i % 2 == 0:"]],
  10: [["while ???:", "while v_pv > 0:"]]
};

// Remplace seulement dans les lignes de code (pas dans les commentaires), comme le fait un joueur.
function solve(starter, pairs) {
  return starter.split("\n").map((line) => (/^\s*(#|\/\/)/.test(line) ? line : pairs.reduce((l, [a, b]) => l.split(a).join(b), line))).join("\n");
}

for (let n = 1; n <= 10; n++) {
  test(`niveau ${n} : la réponse est acceptée (commentaires du code de départ gardés), le code de départ seul est refusé`, () => {
    const lvl = engine.levels[n];
    assert.ok(/\?\?\?/.test(lvl.starter), "le départ contient des ???");
    const code = solve(lvl.starter, FILL[n]);
    const r = lvl.validate(code, engine);
    assert.equal(r.ok, true, `niveau ${n} : ${(r.messages || []).join(" / ")}\n${code}`);
    assert.equal(lvl.validate(lvl.starter, engine).ok, false, "le départ non rempli est refusé");
    // même réponse sans aucun commentaire
    const bare = code.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
    assert.equal(lvl.validate(bare, engine).ok, true, `niveau ${n} sans commentaires`);
  });
}

test("indices : 3 par niveau, le dernier donne la réponse (c'est lui qui coûte 15 pièces, avec confirmation)", () => {
  for (let n = 1; n <= 10; n++) {
    const h = engine.levels[n].hints;
    assert.equal(h.length, 3, `niveau ${n} : 3 indices`);
    assert.match(h[2], /^La réponse/, `niveau ${n} : le 3e indice donne la réponse`);
    assert.doesNotMatch(h[0] + h[1], /^La réponse/, `niveau ${n} : les deux premiers ne la donnent pas`);
  }
});
