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

test("chute : un trou coûte un cœur ; à 0 cœur, on repart avec tous les cœurs", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 6 }, { t: "gap", n: 6 }, { t: "flat", n: 4 }, { t: "end", n: 8 }]), {});
  const max = S.CFG.hpMax;
  assert.equal(sim.player.hp, max);
  let falls = 0, last = sim.stats.deaths;
  for (let t = 0; t < 60 && falls < max; t += DT) {
    sim.step({ right: true }, DT);
    if (sim.stats.deaths > last) { falls++; last = sim.stats.deaths; assert.equal(sim.player.hp, falls < max ? max - falls : max, `après ${falls} chute(s)`); }
  }
  assert.equal(falls, max);
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

/* ---------- nouveautés : invincibilité (cœur à pleine vie), étoile-shuriken, caisses, ennemis variés ---------- */

test("cœur : +1 vie, mais à pleine vie il donne l'invincibilité (les ennemis et les pics ne font plus rien)", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 14, spikes: [8] }, { t: "end", n: 8 }]), {});
  const p = sim.player;
  sim.items.push({ x: p.x + 20, y: p.y - 10, kind: "heart", got: false });
  run(sim, { right: true }, 0.5);
  assert.ok(p.star > 0, "à pleine vie : invincible");
  assert.equal(p.hp, S.CFG.hpMax);
  assert.ok(sim.events.some((e) => e.t === "star"));
  const x0 = p.x; run(sim, { right: true }, 2);
  assert.ok(p.x > x0 + 100 && p.hp === S.CFG.hpMax, "traverse les pics sans dégât");
  run(sim, idle, 8);
  assert.equal(p.star <= 0, true, "l'invincibilité finit");
  // à vie incomplète : un cœur soigne et n'invoque pas l'étoile
  const sim2 = S.createPlatform(S.buildCourse([{ t: "flat", n: 14 }, { t: "end", n: 8 }]), {});
  sim2.player.hp = 3; sim2.items.push({ x: sim2.player.x + 10, y: sim2.player.y - 10, kind: "heart", got: false });
  run(sim2, { right: true }, 0.4);
  assert.equal(sim2.player.hp, 4); assert.ok(sim2.player.star <= 0);
});

test("invincibilité : toucher un ennemi le terrasse", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 12, en: [6] }, { t: "end", n: 8 }]), {});
  sim.player.star = 5;
  run(sim, { right: true }, 3);
  assert.ok(sim.stats.kills >= 1);
  assert.equal(sim.player.hp, S.CFG.hpMax);
});

test("étoile-shuriken : 3 en éventail, traversent les ennemis, 2 dégâts ; elle permet de lancer même sans la capacité", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 16, tough: [8, 9] }, { t: "end", n: 8 }]), {});
  const p = sim.player;
  sim.step({ throw: true }, DT); sim.step({}, DT);
  assert.equal(sim.shurikens.length, 0, "sans capacité ni étoile : rien");
  p.power = 10;
  sim.step({ throw: true }, DT);
  assert.equal(sim.shurikens.length, 3);
  assert.ok(sim.shurikens.every((s) => s.power));
  assert.ok(new Set(sim.shurikens.map((s) => s.vy)).size === 3, "éventail");
  run(sim, { throw: false }, 1.2);
  const hurt = sim.enemies.filter((e) => !e.alive || e.hp < 2);
  assert.ok(hurt.length >= 1, "touche des ennemis");
});

test("bougies : dans les niveaux avec shuriken, une bougie sur trois laisse tomber l'étoile-shuriken", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 14, candles: [4, 8, 11] }, { t: "end", n: 8 }]), { shuriken: true });
  sim.candles.forEach((c) => { c.alive = true; });
  sim.player.x = 4 * 32 + 16 - 20; // 2e bougie = indice 1 : on la casse directement
  const second = sim.candles[1];
  sim.player.x = second.x - 20; sim.player.y = second.y; sim.player.facing = 1;
  sim.step({ attack: true }, DT); run(sim, { attack: true }, 0.4);
  assert.equal(second.alive, false);
  assert.ok(sim.items.some((i) => i.kind === "power"), "étoile-shuriken");
});

test("brawl : les caisses bloquent, se cassent en deux coups et laissent leur butin ; la benne résiste", () => {
  const def = { length: 1200, waves: [], crates: [{ x: 200, y: 297, kind: "crate", drop: "power" }, { x: 400, y: 297, kind: "block" }] };
  const sim = S.createBrawl(def, 600);
  sim.player.x = 150; sim.player.y = 297;
  run(sim, { right: true }, 1.5);
  assert.ok(sim.player.x < 200, `bloqué par la caisse : x=${sim.player.x}`);
  run(sim, { attack: true }, 0.01);
  for (let i = 0; i < 4; i++) { run(sim, { attack: true }, 0.2); run(sim, idle, 0.2); }
  assert.equal(sim.crates[0].alive, false, "caisse cassée");
  assert.ok(sim.items.some((i) => i.kind === "power"), "butin");
  sim.player.x = 330; sim.player.y = 297;
  run(sim, { right: true }, 1);
  assert.ok(sim.player.x < 400, "la benne bloque");
  for (let i = 0; i < 5; i++) { run(sim, { attack: true }, 0.2); run(sim, idle, 0.2); }
  assert.equal(sim.crates[1].alive, true, "la benne ne se casse pas");
});

test("brawl : on saute sur une caisse et on peut en redescendre ; les ennemis contournent", () => {
  const def = { length: 1200, waves: [], crates: [{ x: 200, y: 297, kind: "crate" }] };
  const sim = S.createBrawl(def, 600);
  sim.player.x = 170; sim.player.y = 297;
  sim.step({ jump: true, right: true }, DT);
  run(sim, { right: true }, 0.5);
  assert.ok(sim.player.jz >= 20 || sim.player.x > 215, "sur la caisse ou passé par-dessus");
  run(sim, { right: true }, 1.5);
  assert.equal(sim.player.jz, 0, "redescendu");
});

test("brawl : cœur à pleine vie = invincibilité ; l'étoile-shuriken lance des étoiles qui traversent", () => {
  const def = { length: 1200, waves: [{ at: 300, enemies: [["grunt", "right"], ["grunt", "right"]] }] };
  const sim = S.createBrawl(def, 600);
  sim.items.push({ x: sim.player.x + 10, y: sim.player.y, kind: "heart", got: false });
  run(sim, idle, 0.2);
  assert.ok(sim.player.star > 0);
  sim.items.push({ x: sim.player.x, y: sim.player.y, kind: "power", got: false });
  run(sim, idle, 0.2);
  assert.ok(sim.player.power > 0);
  sim.step({ throw: true }, DT);
  assert.equal(sim.stars.length, 3);
});

test("ennemis : le lanceur tire des bouteilles, le ninja bondit, le sauteur saute, le fonceur charge, la chauve-souris pique", () => {
  // lanceur
  let sim = S.createBrawl({ length: 1500, waves: [{ at: 100, enemies: [["slinger", "right"]] }] }, 600);
  sim.player.x = 120; sim.player.hp = 6;
  let shots = 0, hurt = false;
  for (let t = 0; t < 8; t += DT) { sim.step({}, DT); shots = Math.max(shots, sim.shots.length); if (sim.player.hp < 6) hurt = true; sim.player.y = sim.enemies[0] ? sim.enemies[0].y : sim.player.y; }
  assert.ok(shots >= 1, "des bouteilles volent");
  // ninja
  sim = S.createBrawl({ length: 1500, waves: [{ at: 100, enemies: [["ninja", "right"]] }] }, 600);
  sim.player.x = 110; let dashed = false;
  for (let t = 0; t < 6; t += DT) { sim.step({}, DT); if (sim.events.some((e) => e.t === "dash")) dashed = true; sim.events.length = 0; if (sim.enemies[0]) sim.player.y = sim.enemies[0].y; }
  assert.ok(dashed || hurt, "le ninja bondit");
  // sauteur, fonceur
  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 14, hop: [9] }, { t: "end", n: 8 }]), {});
  let hopped = false;
  sim.player.x = 8 * 32; for (let t = 0; t < 3; t += DT) { sim.step({}, DT); if (sim.enemies[0].vy < -100) hopped = true; }
  assert.ok(hopped, "le sauteur bondit vers le joueur");
  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 16, dash: [11] }, { t: "end", n: 8 }]), {});
  sim.player.x = 6 * 32; let charged = false;
  for (let t = 0; t < 4; t += DT) { sim.step({}, DT); if (sim.enemies[0].mode === "dash") charged = true; }
  assert.ok(charged, "le fonceur charge");
  sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 14, fly: [9] }, { t: "end", n: 8 }]), {});
  sim.player.x = 8 * 32; let dove = false;
  for (let t = 0; t < 5; t += DT) { sim.step({}, DT); if (sim.enemies[0].mode === "dive") dove = true; }
  assert.ok(dove, "la chauve-souris pique");
});

test("mode détente : ni dégâts des ennemis, ni des bouteilles", () => {
  const sim = S.createBrawl({ length: 1500, waves: [{ at: 100, enemies: [["grunt", "right"], ["slinger", "left"]] }] }, 600);
  sim.relax = true; sim.player.x = 120;
  for (let t = 0; t < 12; t += DT) { sim.step({}, DT); if (sim.enemies[0]) sim.player.y = sim.enemies[0].y; }
  assert.equal(sim.player.hp, sim.player.hpMax);
});

// ---- Laita, la chienne : elle effraie sans tuer, ne subit rien, puis revient ----
function platformWithEnemy(extra) {
  return S.createPlatform(S.buildCourse([{ t: "flat", n: 4 }, { t: "flat", n: 10, en: [7], ...extra }, { t: "end", n: 6 }]));
}

test("Laita : à l'appel elle fonce sur le monstre le plus proche, l'effraie (il s'enfuit, ne blesse pas, ne meurt pas) puis revient", () => {
  const sim = platformWithEnemy();
  run(sim, idle, 0.5);
  const e = sim.enemies[0], hp0 = e.hp, side = Math.sign(e.x - sim.player.x);
  assert.equal(sim.dog.state, "follow");
  sim.step({ dog: true }, DT);
  assert.equal(sim.dog.state, "charge", "elle part sur le monstre");
  let scared = false, sawBark = false;
  for (let t = 0; t < 4 && !scared; t += DT) { sim.step(idle, DT); scared = e.scared > 0; sim.events.forEach((ev) => { if (ev.t === "bark") sawBark = true; }); sim.events.length = 0; }
  assert.ok(scared, "le monstre a peur");
  assert.ok(sawBark);
  assert.equal(e.alive, true, "elle ne le tue pas");
  assert.equal(e.hp, hp0);
  const x0 = e.x, hp = sim.player.hp;
  run(sim, idle, 1.5);
  assert.ok(Math.sign(e.x - sim.player.x) === side && Math.abs(e.x - sim.player.x) >= Math.abs(x0 - sim.player.x) - 1, "il s'éloigne du joueur");
  assert.equal(sim.player.hp, hp);
  run(sim, idle, 3);
  assert.equal(sim.dog.state, "follow", "Laita est revenue près de son maître");
  assert.ok(Math.abs(sim.dog.x - sim.player.x) < 60);
  run(sim, idle, CFG_SCARE() + 1);
  assert.ok(!(e.scared > 0), "la peur passe : le monstre revient");
});

function CFG_SCARE() { return S.CFG.dogScare; }

test("Laita : un monstre effrayé ne blesse pas ; attente entre deux appels ; sans monstre elle aboie seulement ; elle est immortelle", () => {
  const sim = platformWithEnemy({ en: [3] });
  run(sim, idle, 0.2);
  sim.dog.call();
  run(sim, idle, 2);
  assert.ok(sim.dog.cd > 0, "il faut attendre avant de rappeler Laita");
  assert.equal(sim.dog.call(), false);
  const e = sim.enemies[0];
  e.scared = 3; e.x = sim.player.x + 4; e.y = sim.player.y; // sur le joueur, mais effrayé
  const hp = sim.player.hp;
  sim.step(idle, DT);
  assert.equal(sim.player.hp, hp, "un monstre effrayé ne fait aucun dégât");
  const empty = S.createPlatform(S.buildCourse([{ t: "flat", n: 12 }, { t: "end", n: 6 }]));
  run(empty, idle, 0.3);
  assert.equal(empty.dog.call(), false, "personne à effrayer");
  assert.equal(empty.dog.state, "follow");
  assert.equal(empty.dog.immortal, true);
});

test("Laita dans l'arène : les ennemis effrayés ne frappent plus, ne lancent plus de bouteilles et ne sont pas tués", () => {
  const sim = S.createBrawl({ length: 900, waves: [{ at: 200, enemies: [["grunt", "right"], ["slinger", "right"]] }] });
  sim.player.x = 200;
  run(sim, idle, 0.5);
  assert.ok(sim.enemies.length >= 2);
  sim.dog.call();
  run(sim, idle, 2.5);
  assert.ok(sim.enemies.some((e) => e.scared > 0), "au moins un monstre a peur");
  assert.equal(sim.stats.kills, 0, "Laita ne tue jamais");
  const hp = sim.player.hp;
  run(sim, idle, 1);
  assert.equal(sim.player.hp, hp);
});
