// Tests du moteur : interpréteur sécurisé, validateurs et validation du niveau 1.
// Les scripts du site sont des IIFE de navigateur : on les charge dans un contexte vm avec un faux `window`.
import test from "node:test";
import assert from "node:assert/strict";

import { loadGame as load } from "./loader.mjs";

const { engine } = load();

const run = (code) => engine.interpreter.run(code);

test("interpréteur : affectations simples (pseudo-code, Python, JavaScript)", () => {
  for (const code of ["v_speed = 200", "let v_speed = 200;", "const v_speed=200", "var v_speed = 200 ;", "v_speed = 200 # commentaire", "v_speed = 200 // commentaire"]) {
    const r = run(code);
    assert.equal(r.errors.length, 0, code); // longueur : les tableaux viennent d'un autre contexte vm
    assert.equal(r.vars.v_speed, 200, code);
  }
});

test("interpréteur : expressions arithmétiques, priorités, parenthèses et variables", () => {
  assert.equal(run("a = 100 * 2").vars.a, 200);
  assert.equal(run("a = 2 + 3 * 4").vars.a, 14);
  assert.equal(run("a = (2 + 3) * 4").vars.a, 20);
  assert.equal(run("a = 10 - 4 - 3").vars.a, 3);
  assert.equal(run("a = 7 % 4").vars.a, 3);
  assert.equal(run("a = -5 + 8").vars.a, 3);
  assert.equal(run("a = 50\nb = a * 4").vars.b, 200);
  assert.equal(run("a = 5\na += 3").vars.a, 8);
});

test("interpréteur : chaînes", () => {
  assert.equal(run('s = "octo" + "cat"').vars.s, "octocat");
  assert.equal(run("s = 'a;b'").vars.s, "a;b");
});

test("interpréteur : erreurs lisibles, avec numéro de ligne", () => {
  assert.match(run("v_speed == 200").errors[0].msg, /compare/);
  assert.equal(run("x = 1\ny = z + 1").errors[0].line, 2);
  assert.match(run("y = z + 1").errors[0].msg, /pas défini/);
  assert.match(run("a = 1 / 0").errors[0].msg, /zéro/);
  assert.match(run("a = (1 + 2").errors[0].msg, /parenth/);
  assert.match(run("a = 1 $ 2").errors[0].msg, /inattendu/);
  assert.match(run("42").errors[0].msg, /non reconnue/);
  assert.match(run("a = 'x' * 2").errors[0].msg, /texte/);
});

test("sécurité : le code du joueur n'est jamais exécuté", () => {
  const r = run("globalThis.hack = 1");
  assert.ok(r.errors.length > 0);
  assert.equal(run("a = constructor").errors.length, 1);
  assert.equal(run("a = __proto__").errors.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(run("a = 1").vars, "hack"), false);
});

test("validateurs : keywords et assignment", () => {
  const k = engine.validators.keywords("while x:\n  pass", { required: ["while"], forbidden: ["for"] });
  assert.equal(k.ok, true);
  assert.deepEqual(engine.validators.keywords("# while\nx = 1", { required: ["while"] }).missing, ["while"]);
  assert.equal(engine.validators.assignment("v = 3", "v", 3).ok, true);
  assert.equal(engine.validators.assignment("v = 4", "v", 3).ok, false);
});

test("niveau 1 : messages d'erreur et succès", () => {
  const v = (code) => engine.levels[1].validate(code, engine);
  assert.equal(v("").ok, false);
  assert.match(v("v_speed = ???").messages[0], /\?\?\?/);
  assert.match(v("V_speed = 200").messages[0], /NameError/);
  assert.match(v("speed = 200").messages[0], /jamais été définie/);
  assert.match(v("v_speed = 150").messages[0], /trop lent/);
  assert.match(v("v_speed = 250").messages[0], /trop rapide/);
  assert.match(v('v_speed = "200"').messages[0], /TypeError/);
  assert.match(v("v_speed == 200").messages[0], /SyntaxError/);
  for (const ok of ["v_speed = 200", "let v_speed = 200;", "v_speed = 100 * 2", "a = 100\nv_speed = a + 100"]) {
    const r = v(ok);
    assert.equal(r.ok, true, ok);
    assert.equal(r.data.speed, 200);
  }
});
