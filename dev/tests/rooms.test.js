// Les 21 salles secrètes (7 niveaux × 3 mondes) : toutes différentes, 28 pièces chacune, toutes atteignables, départ et sortie sur le sol.
import test from "node:test";
import assert from "node:assert/strict";
import { loadGame } from "./loader.mjs";

const { engine, sim: S, ctx } = loadGame();
const O = ctx.OctoRooms, W = ctx.OctoWorlds;
const T = 32, DT = 1 / 60;
const PLATFORM_LEVELS = [1, 3, 4, 5, 7, 8, 9];
const KEYS = [0, 1, 2].flatMap((w) => PLATFORM_LEVELS.map((id) => O.key(w, id)));

/** Analyse d'une salle : les « places » où l'on peut se tenir debout et ce qu'on peut atteindre d'un saut (portées prudentes ; la Lune, monde 2, saute deux fois plus haut). */
function analyse(rows, lunar) {
  const R = rows.length, Wd = rows[0].length;
  const at = (c, y) => (y >= R ? " " : y < 0 ? "#" : rows[R - 1 - y].charAt(c));
  const solid = (c, y) => at(c, y) === "#" || at(c, y) === "~";
  const free = (c, y) => c >= 0 && c < Wd && !solid(c, y);
  const spots = [];
  for (let c = 0; c < Wd; c++) for (let y = 0; y < R; y++) if (free(c, y) && free(c, y + 1) && (solid(c, y - 1) || at(c, y) === "J")) spots.push({ c, y, pad: at(c, y) === "J" });
  const can = (a, b) => {
    const dx = Math.abs(b.c - a.c), dy = b.y - a.y;
    if (a.pad) return dy <= 7 && dx <= 5;
    if (lunar) return dy <= 4 ? dx <= 6 : dy <= 6 ? dx <= 4 : dy <= 8 && dx <= 2;
    if (dy < 0) return dx <= Math.min(6, 3 - dy);
    return dy <= 2 ? dx <= 3 : dy <= 3 ? dx <= 2 : dy <= 4 && dx <= 1;
  };
  const start = spots.find((s) => s.c === 2 && s.y === 2);
  const seen = new Set([start]), queue = [start];
  while (queue.length) { const a = queue.shift(); for (const b of spots) if (!seen.has(b) && can(a, b)) { seen.add(b); queue.push(b); } }
  const reach = [...seen];
  const takes = (coin) => reach.some((s) => {
    const dx = Math.abs(coin.c - s.c), dy = coin.y - s.y;
    if (s.pad) return dy <= 7 && dx <= 4 && dy >= -3;
    const up = lunar ? 8 : 4;
    return dy >= -3 && ((dx <= 1 && dy <= up) || (dx <= 2 && dy <= up - 1));
  });
  const coins = [];
  for (let c = 0; c < Wd; c++) for (let y = 0; y < R; y++) if (at(c, y) === "o") coins.push({ c, y });
  return { R, Wd, coins, reach, takes, exit: reach.some((s) => s.c === Wd - 2 && s.y === 2) };
}

test("salles secrètes : 21 salles, une par niveau à trous de chaque monde", () => {
  assert.equal(KEYS.length, 21);
  assert.deepEqual(Array.from(O.keys()).sort((a, b) => a - b), [...KEYS].sort((a, b) => a - b));
  for (const k of KEYS) assert.ok(O.has(k), `salle ${k}`);
});

test("salles secrètes : toutes différentes (nom, forme, dessin de pièces, décor)", () => {
  const shapes = new Set(), names = new Set(), decors = new Set();
  for (const k of KEYS) {
    const d = O.build(k, 10);
    shapes.add(d.rows.join("|")); names.add(d.name);
    decors.add([d.theme.bg.join(), d.theme.deco, d.theme.pkind, d.theme.tile].join("/"));
    assert.ok(d.name && d.name === d.name.toUpperCase() && !/[^\x20-\x7e]/.test(d.name), `salle ${k} : nom en capitales sans accent`);
  }
  assert.equal(shapes.size, 21, "21 formes différentes");
  assert.equal(names.size, 21, "21 noms différents");
  assert.equal(decors.size, 21, "21 décors différents");
});

test("salles secrètes : exactement 28 pièces, départ et sortie sur le sol, aucune pièce dans la roche", () => {
  for (const k of KEYS) {
    const d = O.build(k, 10), a = analyse(d.rows, k >= 200);
    assert.equal(d.rows.length, 10);
    assert.ok(d.rows.every((r) => r.length === d.W), `salle ${k} : rectangulaire`);
    assert.equal(a.coins.length, 28, `salle ${k} : 28 pièces (a ${a.coins.length})`);
    assert.equal(d.rows[7].charAt(2), " ", `salle ${k} : place libre au départ`);
    assert.equal(d.rows[8].charAt(2), "#", `salle ${k} : sol au départ`);
    assert.equal(d.rows[8].charAt(d.W - 2), "#", `salle ${k} : sol sous le tuyau de sortie`);
    assert.ok(d.W >= 26 && d.W <= 40, `salle ${k} : largeur raisonnable`);
    assert.ok(!d.rows[0].includes("o"), `salle ${k} : aucune pièce sous le bandeau du haut (rangée la plus haute)`);
  }
});

test("salles secrètes : toutes les pièces et la sortie sont atteignables à pied et en sautant", () => {
  const bad = [];
  for (const k of KEYS) {
    const d = O.build(k, 10), a = analyse(d.rows, k >= 200);
    if (!a.exit) bad.push(`salle ${k} : sortie hors de portée`);
    const lost = a.coins.filter((c) => !a.takes(c));
    if (lost.length) bad.push(`salle ${k} ${d.name} : pièces hors de portée en (colonne,hauteur) ${lost.map((c) => c.c + "," + c.y).join(" ")}`);
  }
  assert.deepEqual(bad, []);
});

function gridFor(world, id) {
  const g = world === 0 ? S.buildCourse(engine.levels[id].run.course) : (world === 1 ? S.buildTower(W.data(1).runs[id].tower) : S.buildCourse(W.data(2).runs[id].course));
  const ab = world === 0 ? engine.levels[id].run.abilities : W.data(world).runs[id].abilities;
  g.roomKey = O.key(world, id);
  return { g, ab };
}

test("salles secrètes : dans le jeu, chaque niveau entre dans SA salle (nom, 28 pièces, sortie sur le tuyau)", () => {
  for (const w of [0, 1, 2]) for (const id of PLATFORM_LEVELS) {
    const { g, ab } = gridFor(w, id), before = g.join("").split("o").length - 1, sim = S.createPlatform(g, ab), sec = sim.secret, k = O.key(w, id);
    assert.ok(sec, `monde ${w} niveau ${id} : une salle`);
    assert.equal(sec.name, O.build(k, g.length).name, `monde ${w} niveau ${id} : nom de la salle`);
    assert.ok(sec.theme && sec.theme.bg.length === 2, "un thème de décor");
    assert.equal(sim.stats.bitsTotal - before, 28, `monde ${w} niveau ${id} : 28 pièces dans la salle`);
    const p = sim.player;
    p.x = sec.spawn.x; p.y = sec.spawn.y; sec.inRoom = true;
    assert.ok(sec.exit.x > sec.roomL && sec.exit.x < sim.w, "le tuyau est dans la salle");
    p.x = sec.exit.x; p.y = sec.exit.y - 2; sim.step({}, DT); sim.step({}, DT);
    assert.equal(sec.inRoom, false, `monde ${w} niveau ${id} : le tuyau ramène`);
  }
});

test("salles secrètes : toutes les pièces ramassées = « salle complète » (une seule fois)", () => {
  const { g, ab } = gridFor(0, 1), sim = S.createPlatform(g, ab), sec = sim.secret, p = sim.player;
  const room = sim.bits.filter((b) => b.x > sec.roomL);
  assert.equal(room.length, 28);
  p.x = sec.spawn.x; p.y = sec.spawn.y; sec.inRoom = true;
  let full = 0;
  room.forEach((b, i) => {
    p.x = b.x; p.y = b.y + 14; p.vy = 0; sim.step({}, DT);
    full += sim.events.filter((e) => e.t === "secret-full").length; sim.events.length = 0;
    if (i < room.length - 1) assert.equal(sec.full, false, "pas encore complète");
  });
  assert.equal(sec.full, true);
  assert.equal(full, 1, "un seul bravo");
});

test("salles secrètes : sans clé de salle, l'ancienne grotte reste (26 colonnes)", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 6 }, { t: "gap", n: 2 }, { t: "flat", n: 6 }, { t: "gap", n: 2 }, { t: "flat", n: 4 }, { t: "end", n: 8 }]), {});
  assert.equal(sim.secret.name, null);
  assert.equal(sim.w, (6 + 2 + 6 + 2 + 4 + 8 + 3 + 26) * T);
});
