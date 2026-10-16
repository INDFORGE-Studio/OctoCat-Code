// Tests des booléens, des conditions (if / sinon) et du niveau 2.
import test from "node:test";
import assert from "node:assert/strict";

import { loadGame as load } from "./loader.mjs";

const { engine } = load();

const run = (code, env) => engine.interpreter.run(code, env);
const NL = "\n";
const lines = (...l) => l.join(NL);

test("booléens et comparaisons", () => {
  assert.equal(run("a = 5 >= 5").vars.a, true);
  assert.equal(run("a = 4 > 5").vars.a, false);
  assert.equal(run("a = 3 != 4").vars.a, true);
  assert.equal(run('a = "x" == "x"').vars.a, true);
  assert.equal(run("a = true").vars.a, true);
  assert.equal(run("a = False").vars.a, false);
  assert.equal(run("a = vrai").vars.a, true);
  assert.equal(run("a = 1 < 2 and 2 < 3").vars.a, true);
  assert.equal(run("a = 1 > 2 or 5 == 5").vars.a, true);
  assert.equal(run("a = not (1 > 2)").vars.a, true);
  assert.equal(run("a = !(1 < 2)").vars.a, false);
  assert.equal(run("a = 1 < 2 && 3 > 4").vars.a, false);
  assert.equal(run("a = 1 < 2 < 3").vars.a, true);
  assert.equal(run("a = 3 < 2 < 3").vars.a, false);
  assert.equal(run("a = 5 == 5 et 2 < 3").vars.a, true);
});

test("erreurs lisibles sur les conditions", () => {
  assert.match(run("a = 1 = 2").errors[0].msg, /==/);
  assert.match(run('a = 1 < "x"').errors[0].msg, /comparaison impossible/);
  assert.match(run("a = true + 1").errors[0].msg, /booléen/);
  assert.match(run("true = 3").errors[0].msg, /réservé/);
  assert.match(run(lines("if x:", "    y = 1")).errors[0].msg, /pas défini/);
  assert.match(run(lines("if 1 > 0", "    y = 1")).errors[0].msg, /mal écrite/);
  assert.match(run(lines("if 1 > 0:", "y = 1")).errors[0].msg, /vide/);
  assert.match(run(lines("else:", "    y = 1")).errors[0].msg, /sans « if/);
  assert.match(run(lines("if (1 > 0) {", "  y = 1")).errors[0].msg, /accolade/);
  assert.match(run(lines("si 1 > 0 alors", "  y = 1")).errors[0].msg, /fin si/);
  assert.match(run("}").errors[0].msg, /jamais été ouvert/);
});

test("if / sinon en Python, JavaScript et pseudo-code", () => {
  const py = (v) => run(lines("if v >= 50:", '    r = "oui"', "elif v >= 20:", '    r = "bof"', "else:", '    r = "non"'), { v }).vars.r;
  assert.deepEqual([py(80), py(50), py(30), py(5)], ["oui", "oui", "bof", "non"]);
  const js = (v) => run(lines("if (v >= 50) {", '  r = "oui";', "} else if (v >= 20) {", '  r = "bof";', "} else {", '  r = "non";', "}"), { v }).vars.r;
  assert.deepEqual([js(80), js(30), js(5)], ["oui", "bof", "non"]);
  const fr = (v) => run(lines("si v >= 50 alors", '  r = "oui"', "sinon si v >= 20 alors", '  r = "bof"', "sinon", '  r = "non"', "fin si"), { v }).vars.r;
  assert.deepEqual([fr(80), fr(30), fr(5)], ["oui", "bof", "non"]);
  assert.equal(run('if v > 1: r = "x"', { v: 2 }).vars.r, "x"); // une seule ligne
  assert.equal(run(lines("r = 0", 'if v > 1: r = "x"'), { v: 0 }).vars.r, 0);
  const nested = run(lines("a = 0", "if v > 0:", "    if v > 10:", "        a = 2", "    else:", "        a = 1", "b = a + 10"), { v: 5 });
  assert.equal(nested.errors.length, 0);
  assert.equal(nested.vars.a, 1);
  assert.equal(nested.vars.b, 11); // l'instruction après le bloc est bien exécutée
});

test("niveau 5 : la condition doit être juste pour toutes les énergies", () => {
  const v = (code) => engine.levels[5].validate(code, engine);
  assert.equal(v("").ok, false);
  assert.match(v(lines("if ???:", "    v_pont = 1")).messages[0], /\?\?\?/);
  assert.match(v('v_pont = "solide"').messages[0], /trop faible/);
  assert.match(v('v_pont = "fragile"').messages[0], /devrait être solide/);
  assert.match(v(lines('v_pont = "fragile"', "if v_energie > 50:", '    v_pont = "solide"')).messages[0], /v_energie = 50/);
  assert.match(v(lines('v_pont = "fragile"', "if v_energie >= 49:", '    v_pont = "solide"')).messages[0], /v_energie = 49/);
  assert.match(v(lines("if v_energie >= 50:", '    v_pont = "Solide"')).messages[0], /casse/);
  assert.match(v(lines("if v_energie >= 50", "    v_pont = 1")).messages[0], /SyntaxError/);
  assert.equal(v(lines("if v_energie < 50:", '    v_pont = "solide"')).data.collapse, true);
  for (const ok of [
    lines('v_pont = "fragile"', "if v_energie >= 50:", '    v_pont = "solide"'),
    lines("if (v_energie >= 50) {", '  v_pont = "solide";', "}"),
    lines("si v_energie >= 50 alors", '  v_pont = "solide"', "fin si"),
    lines("if v_energie > 49:", '    v_pont = "solide"', "else:", '    v_pont = "fragile"'),
    lines("if not (v_energie < 50):", '    v_pont = "solide"')
  ]) assert.equal(v(ok).ok, true, ok);
});

test("boucles while / for en Python, JavaScript et pseudo-code", () => {
  assert.equal(run(lines("n = 0", "while n < 5:", "    n = n + 1")).vars.n, 5);
  assert.equal(run(lines("n = 0", "while n < 5:", "    n = n + 1")).loops, 5);
  assert.equal(run(lines("n = 0", "while (n < 3) {", "  n += 1;", "}")).vars.n, 3);
  assert.equal(run(lines("n = 0", "tant que n < 4 faire", "  n = n + 1", "fin tant que")).vars.n, 4);
  assert.equal(run(lines("s = 0", "for i in range(4):", "    s = s + i")).vars.s, 6); // 0+1+2+3
  assert.equal(run(lines("s = 0", "for i in range(1, 4):", "    s = s + i")).vars.s, 6); // 1+2+3
  assert.equal(run(lines("s = 0", "for (let i = 0; i < 4; i++) {", "  s = s + i;", "}")).vars.s, 6);
  assert.equal(run(lines("s = 0", "for (let i = 1; i <= 3; i++) {", "  s = s + i;", "}")).vars.s, 6);
  assert.equal(run(lines("s = 0", "pour i de 1 a 3 faire", "  s = s + i", "fin pour")).vars.s, 6);
  assert.equal(run("n = 0\nwhile n < 3: n = n + 1").vars.n, 3); // une seule ligne
  const nested = run(lines("t = 0", "for i in range(3):", "    for j in range(2):", "        t = t + 1", "    if i == 1:", "        t = t + 10"));
  assert.equal(nested.errors.length, 0);
  assert.equal(nested.vars.t, 16);
  assert.equal(run(lines("n = 0", "while n < 3:", "    n = n + 1", "m = n * 2")).vars.m, 6); // instruction après la boucle
});

test("boucles : garde-fou et erreurs lisibles", () => {
  const inf = run(lines("n = 0", "while true:", "    n = n + 1"));
  assert.match(inf.errors[0].msg, /tours de boucle/);
  assert.equal(inf.errors[0].line, 2);
  assert.match(run(lines("n = 0", "while n >= 0:", "    n = n + 1")).errors[0].msg, /tours de boucle/);
  assert.match(run("for i in range(1, 2, 3):\n    a = 1").errors[0].msg, /range/);
  assert.match(run("for i in range('x'):\n    a = 1").errors[0].msg, /nombres/);
  assert.match(run("while n < 3:\n    n = 1").errors[0].msg, /pas défini/);
  assert.match(run("while 1 < 2\n    a = 1").errors[0].msg, /mal écrite/);
  assert.match(run("while (1 < 2) {\n  a = 1").errors[0].msg, /accolade/);
  assert.match(run("tant que 1 < 2 faire\n  a = 1").errors[0].msg, /fin tant que/);
});

test("niveau 10 : la boucle doit frapper exactement 5 fois", () => {
  const v = (code) => engine.levels[10].validate(code, engine);
  const body = "    v_pv = v_pv - 1";
  assert.equal(v("").ok, false);
  assert.match(v(lines("v_pv = 5", "while ???:", body)).messages[0], /\?\?\?/);
  assert.match(v(lines("v_pv = 5", "while true:", body)).messages[0], /boucle infinie/);
  assert.match(v(lines("v_pv = 5", "while v_pv < 0:", body)).messages[0], /Aucun coup/);
  assert.match(v(lines("v_pv = 5", "while v_pv > 2:", body)).messages[0], /encore 2 PV/);
  assert.match(v(lines("v_pv = 5", "while v_pv >= 0:", body)).messages[0], /coup de trop/);
  assert.match(v(lines("v_pv = 5", "v_pv = 0")).messages[0], /Aucun coup/);
  assert.match(v(lines("v_pv = 5", "while v_pv > 0", body)).messages[0], /SyntaxError/);
  assert.equal(v(lines("v_pv = 5", "while v_pv >= 0:", body)).data.hits, 5);
  for (const ok of [
    lines("v_pv = 5", "while v_pv > 0:", body),
    lines("v_pv = 5", "while v_pv != 0:", body),
    lines("v_pv = 5", "for i in range(5):", body),
    lines("v_pv = 5", "for (let i = 0; i < 5; i++) {", "  v_pv = v_pv - 1;", "}"),
    lines("v_pv = 5", "tant que v_pv > 0 faire", "  v_pv = v_pv - 1", "fin tant que")
  ]) {
    const r = v(ok);
    assert.equal(r.ok, true, ok);
    assert.equal(r.data.hits, 5);
  }
});
