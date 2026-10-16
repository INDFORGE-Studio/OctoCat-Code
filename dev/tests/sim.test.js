// Tests de la simulation des parcours (playsim.js) : physique, ennemis, capacités, vagues, et « bots » qui terminent chaque niveau.
import test from "node:test";
import assert from "node:assert/strict";
import { loadGame } from "./loader.mjs";

const { engine, sim: S } = loadGame();
const DT = 1 / 60;
const idle = {};

function run(sim, input, seconds) { for (let t = 0; t < seconds; t += DT) { sim.step(typeof input === "function" ? input(t) : input, DT); } }
function flat(extra) { return S.createPlatform(S.buildCourse([{ t: "flat", n: 12, ...extra }, { t: "end", n: 8 }]), extra && extra.abilities); }

test("parcours : le langage de segments produit une grille cohérente", () => {
  const rows = S.buildCourse([{ t: "flat", n: 6, bits: [3], en: [4] }, { t: "gap", n: 2 }, { t: "up", n: 1 }, { t: "flat", n: 4 }, { t: "end", n: 6 }]);
  assert.equal(rows.length, S.ROWS);
  assert.ok(rows.every((r) => r.length === rows[0].length));
  assert.equal(rows[0].length, 6 + 2 + 4 + 6);
  assert.ok(rows.join("").includes("S") && rows.join("").includes("T") && rows.join("").includes("o") && rows.join("").includes("e"));
  assert.equal(rows[S.ROWS - 1].charAt(6), " "); // le vide : pas de sol dans le gouffre
  assert.equal(rows[S.ROWS - 1].charAt(8), "#");
});

test("physique : le joueur retombe sur le sol, avance, saute à ~80 px et le saut est variable", () => {
  const sim = flat();
  run(sim, idle, 0.5);
  const y0 = sim.player.y;
  assert.ok(sim.player.onGround);
  run(sim, { right: true }, 0.5);
  assert.ok(sim.player.x > 60 + 40);
  let minY = y0;
  const hold = (t) => ({ jump: t < 0.6 });
  for (let t = 0; t < 1.2; t += DT) { sim.step(hold(t), DT); minY = Math.min(minY, sim.player.y); }
  const full = y0 - minY;
  assert.ok(full > 70 && full < 95, `saut complet : ${full}`);
  run(sim, idle, 0.5);
  minY = sim.player.y;
  const y1 = sim.player.y;
  for (let t = 0; t < 1.2; t += DT) { sim.step({ jump: t < 0.06 }, DT); minY = Math.min(minY, sim.player.y); }
  assert.ok(y1 - minY < full * 0.6, `saut court : ${y1 - minY}`);
});

test("double saut : seulement avec la capacité", () => {
  const apex = (ab) => {
    const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 12 }, { t: "end", n: 8 }]), ab);
    run(sim, idle, 0.5);
    const y0 = sim.player.y; let min = y0;
    for (let t = 0; t < 1.6; t += DT) {
      // premier appui, relâché, second appui près du sommet
      const jump = t < 0.4 || (t > 0.45 && t < 1.0);
      sim.step({ jump }, DT); min = Math.min(min, sim.player.y);
    }
    return y0 - min;
  };
  assert.ok(apex({ doubleJump: true }) > apex({}) + 40);
});

test("ennemis : les pics et les marcheurs blessent, l'écrasement et l'épée tuent, la chute ramène au point de contrôle", () => {
  let sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 10, spikes: [4] }, { t: "end", n: 8 }]), {});
  run(sim, { right: true }, 2);
  assert.ok(sim.player.hp < S.CFG.hpMax, "pics");

  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 10, en: [5] }, { t: "end", n: 8 }]), {});
  run(sim, { right: true }, 2.2);
  assert.ok(sim.player.hp < S.CFG.hpMax || sim.stats.kills > 0, "contact avec un marcheur");

  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 10, en: [5] }, { t: "end", n: 8 }]), {});
  const e = sim.enemies[0]; e.dir = 0;
  sim.player.x = e.x - 40; sim.player.y = e.y - 60; sim.player.vy = 200;
  run(sim, { right: false }, 0.05);
  sim.player.x = e.x; sim.player.vy = 200; sim.player.y = e.y - e.h - 6;
  run(sim, idle, 0.15);
  assert.equal(e.alive, false, "écrasement");
  assert.ok(sim.player.vy < 0, "rebond");

  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 10, en: [5] }, { t: "end", n: 8 }]), { whip: true });
  const e2 = sim.enemies[0]; e2.dir = 0;
  sim.player.x = e2.x - 40; run(sim, idle, 0.3);
  run(sim, (t) => ({ attack: t < 0.05 }), 0.5);
  assert.equal(e2.alive, false, "coup de fouet");

  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 6 }, { t: "gap", n: 6 }, { t: "flat", n: 4 }, { t: "end", n: 8 }]), {});
  run(sim, { right: true }, 6);
  assert.ok(sim.stats.deaths >= 1, "chute dans le vide");
  assert.ok(sim.player.x < 6 * 32, "retour au départ");
});

test("shuriken : tue à distance, seulement avec la capacité", () => {
  const trial = (ab) => {
    const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 14, en: [9] }, { t: "end", n: 8 }]), ab);
    sim.enemies[0].dir = 0;
    run(sim, idle, 0.3);
    run(sim, (t) => ({ throw: t < 0.05 }), 1.2);
    return sim.enemies[0].alive;
  };
  assert.equal(trial({ shuriken: true }), false);
  assert.equal(trial({}), true);
});

test("terminal : l'atteindre termine le parcours", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 6 }, { t: "end", n: 6 }]), {});
  run(sim, { right: true }, 6);
  assert.equal(sim.finished, true);
});

test("brawl : les vagues verrouillent l'écran, les ennemis blessent, les coups tuent", () => {
  const def = { length: 1200, waves: [{ at: 300, enemies: [["grunt", "right"], ["fast", "left"]] }] };
  let sim = S.createBrawl(def, 600);
  run(sim, { right: true }, 3);
  assert.ok(sim.lock, "la vague verrouille");
  assert.equal(sim.enemies.length, 2);
  run(sim, idle, 8);
  assert.ok(sim.player.hp < sim.player.hpMax || sim.stats.deaths > 0, "un joueur immobile se fait frapper");

  sim = S.createBrawl(def, 600);
  const r = S.simulate(sim, S.brawlBot, 120);
  assert.equal(r.finished, true);
  assert.ok(sim.stats.kills >= 2);
  assert.equal(sim.lock, null);
});

test("niveaux : chacun des 10 parcours est faisable (un bot le termine)", () => {
  for (let id = 1; id <= 10; id++) {
    const run_ = engine.levels[id].run;
    assert.ok(run_, `niveau ${id} : parcours manquant`);
    let sim, bot;
    if (run_.mode === "brawl") { sim = S.createBrawl(run_, 600); bot = S.brawlBot; }
    else { sim = S.createPlatform(S.buildCourse(run_.course), run_.abilities); bot = S.platformBot; }
    const r = S.simulate(sim, bot, 150);
    assert.equal(r.finished, true, `niveau ${id} (${run_.mode}) non terminé : x=${r.x.toFixed(0)} t=${r.time.toFixed(0)}s`);
    assert.ok(r.time > 8, `niveau ${id} : trop court (${r.time.toFixed(1)} s)`);
  }
});

test("niveaux : le double saut est indispensable là où il est annoncé", () => {
  for (const id of [4, 8]) {
    const run_ = engine.levels[id].run;
    const sim = S.createPlatform(S.buildCourse(run_.course), { shuriken: true }); // sans double saut
    const r = S.simulate(sim, S.platformBot, 90);
    assert.equal(r.finished, false, `niveau ${id} : faisable sans double saut, la capacité ne sert à rien`);
  }
});
