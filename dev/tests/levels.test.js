// Tests des 10 niveaux : contrat, solutions de référence (3 écritures), erreurs lisibles.
import test from "node:test";
import assert from "node:assert/strict";
import { loadGame } from "./loader.mjs";

const { engine } = loadGame();
const L = (...l) => l.join("\n");
const v = (id, code) => engine.levels[id].validate(code, engine);

test("registre : 10 niveaux complets, dans l'ordre, avec trajet et énigme", () => {
  const ids = Object.keys(engine.levels).map(Number).sort((a, b) => a - b);
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const id of ids) {
    const d = engine.levels[id];
    assert.equal(d.id, id);
    assert.ok(d.title && d.starter && d.alt, `niveau ${id} : titre / code de départ / description`);
    assert.ok(d.briefing && d.briefing.lore && d.briefing.lesson && d.briefing.goal, `niveau ${id} : briefing`);
    assert.ok(d.briefing.examples && Object.keys(d.briefing.examples).join() === "Pseudo-code,Python,JavaScript", `niveau ${id} : 3 exemples`);
    assert.equal(d.hints.length, 3, `niveau ${id} : 3 indices`);
    assert.equal(typeof d.validate, "function");
    assert.equal(typeof d.scene, "function");
    assert.ok(d.run && (d.run.mode === "platform" || d.run.mode === "brawl"), `niveau ${id} : trajet`);
    assert.ok(/\?\?\?/.test(d.starter), `niveau ${id} : le code de départ contient des ???`);
  }
  assert.equal(engine.levels[10].combat, true);
});

test("le trajet mélange les styles : plateformes, beat'em up, fouet, shuriken, double saut", () => {
  const modes = new Set(), abil = new Set();
  for (let id = 1; id <= 10; id++) { const r = engine.levels[id].run; modes.add(r.mode); Object.keys(r.abilities || {}).forEach((a) => abil.add(a)); }
  assert.deepEqual([...modes].sort(), ["brawl", "platform"]);
  assert.deepEqual([...abil].sort(), ["doubleJump", "shuriken", "whip"]);
});

test("les énigmes du code de départ ne sont jamais déjà résolues", () => {
  for (let id = 1; id <= 10; id++) assert.equal(v(id, engine.levels[id].starter).ok, false, `niveau ${id}`);
});

test("niveau 2 : chaînes et concaténation", () => {
  for (const ok of ['v_debut = "octo"\nv_mot = v_debut + "cat"', 'v_mot = "octocat"', "v_mot = 'octo' + 'cat'", 'let v_mot = "octo" + "cat";']) assert.equal(v(2, ok).ok, true, ok);
  assert.match(v(2, 'v_mot = "Octocat"').messages[0], /majuscules/);
  assert.match(v(2, "v_mot = 5").messages[0], /TypeError/);
  assert.match(v(2, 'v_mot = "octo" + 5').messages[0], /octo5/);
  assert.match(v(2, "v_mot = octocat").messages[0], /pas défini|SyntaxError/);
});

test("niveau 3 : multiplication, juste pour tous les nombres de caisses", () => {
  for (const ok of ["v_charge = v_caisses * v_poids_caisse", "v_charge = v_poids_caisse * v_caisses", "let v_charge = v_caisses * v_poids_caisse;"]) assert.equal(v(3, ok).ok, true, ok);
  assert.match(v(3, "v_charge = 150").messages[0], /v_caisses = 3/);
  assert.match(v(3, "v_charge = v_caisses + v_poids_caisse").messages[0], /alors qu'il devrait/);
  assert.match(v(3, "v_charge = v_caisses * 25").messages[0], /v_poids_caisse = 40/);
  assert.match(v(3, 'v_charge = "150"').messages[0], /TypeError/);
});

test("niveau 4 : logique et / non, pour les 4 combinaisons", () => {
  for (const ok of ["v_porte_ouverte = v_cle and not v_garde", "v_porte_ouverte = v_cle && !v_garde", "v_porte_ouverte = v_cle et non v_garde", "v_porte_ouverte = not v_garde and v_cle", "v_porte_ouverte = v_cle == true and v_garde == false"]) assert.equal(v(4, ok).ok, true, ok);
  assert.match(v(4, "v_porte_ouverte = v_cle").messages[0], /v_garde = true/);
  assert.match(v(4, "v_porte_ouverte = v_cle or not v_garde").messages[0], /devrait valoir/);
  assert.match(v(4, "v_porte_ouverte = 1").messages[0], /TypeError/);
});

test("niveau 6 : if / elif / else, pour 7 bourses", () => {
  const python = L('v_titre = "pauvre"', "if v_or >= 100:", '    v_titre = "riche"', "elif v_or >= 50:", '    v_titre = "aise"');
  const js = L("if (v_or >= 100) {", '  v_titre = "riche";', "} else if (v_or >= 50) {", '  v_titre = "aise";', "} else {", '  v_titre = "pauvre";', "}");
  const fr = L("si v_or >= 100 alors", '  v_titre = "riche"', "sinon si v_or >= 50 alors", '  v_titre = "aise"', "sinon", '  v_titre = "pauvre"', "fin si");
  for (const ok of [python, js, fr]) assert.equal(v(6, ok).ok, true, ok);
  assert.match(v(6, L('v_titre = "pauvre"', "if v_or >= 100:", '    v_titre = "riche"', "elif v_or > 50:", '    v_titre = "aise"')).messages[0], /v_or = 50/);
  assert.match(v(6, L('v_titre = "pauvre"', "if v_or >= 100:", '    v_titre = "riche"', "elif v_or >= 0:", '    v_titre = "aise"')).messages[0], /v_or = 0/);
});

test("niveau 7 : boucle for, autant de tours que de commandes", () => {
  for (const ok of [L("v_epees = 0", "for i in range(v_commande):", "    v_epees = v_epees + 1"), L("v_epees = 0", "for (let i = 0; i < v_commande; i++) {", "  v_epees = v_epees + 1;", "}"), L("v_epees = 0", "pour i de 1 a v_commande faire", "  v_epees = v_epees + 1", "fin pour"), L("v_epees = 0", "while v_epees < v_commande:", "    v_epees += 1")]) assert.equal(v(7, ok).ok, true, ok);
  assert.match(v(7, L("v_epees = 0", "for i in range(5):", "    v_epees = v_epees + 1")).messages[0], /v_commande = 0/);
  assert.match(v(7, L("v_epees = 0", "for i in range(v_commande + 1):", "    v_epees = v_epees + 1")).messages[0], /devrait valoir/);
});

test("niveau 8 : accumulateur 1 + 2 + … + n", () => {
  for (const ok of [L("v_total = 0", "for i in range(1, v_marches + 1):", "    v_total = v_total + i"), L("v_total = 0", "for (let i = 1; i <= v_marches; i++) {", "  v_total += i;", "}"), L("v_total = 0", "pour i de 1 a v_marches faire", "  v_total = v_total + i", "fin pour")]) assert.equal(v(8, ok).ok, true, ok);
  assert.match(v(8, L("v_total = 0", "for i in range(1, v_marches):", "    v_total = v_total + i")).messages[0], /devrait valoir/); // oubli du +1
  assert.match(v(8, L("v_total = 0", "for i in range(1, v_marches + 1):", "    v_total = v_total + 1")).messages[0], /devrait valoir/);
});

test("niveau 9 : boucle + condition + modulo", () => {
  for (const ok of [L("v_pairs = 0", "for i in range(1, v_n + 1):", "    if i % 2 == 0:", "        v_pairs = v_pairs + 1"), L("v_pairs = 0", "for (let i = 1; i <= v_n; i++) {", "  if (i % 2 === 0) {", "    v_pairs = v_pairs + 1;", "  }", "}"), L("v_pairs = 0", "pour i de 1 a v_n faire", "  si i % 2 == 0 alors", "    v_pairs = v_pairs + 1", "  fin si", "fin pour")]) assert.equal(v(9, ok).ok, true, ok);
  assert.match(v(9, L("v_pairs = 0", "for i in range(1, v_n + 1):", "    if i % 2 == 1:", "        v_pairs = v_pairs + 1")).messages[0], /devrait valoir/);
  assert.match(v(9, L("v_pairs = 0", "for i in range(1, v_n + 1):", "    if i % 2 = 0:", "        v_pairs = v_pairs + 1")).messages[0], /==/);
});

test("langue : les consignes sont en français et sans balise HTML", () => {
  for (let id = 1; id <= 10; id++) {
    const d = engine.levels[id], text = JSON.stringify([d.title, d.briefing, d.hints]);
    assert.ok(!/<[a-z]/i.test(text), `niveau ${id} : balise HTML dans le texte`);
  }
});
