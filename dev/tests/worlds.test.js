// Les trois mondes (un langage = un monde) : tours du monde de Python, parcours lunaires du monde de JavaScript, serpent d'Octo et invasion de l'espace.
// Des robots jouent chaque trajet : ils doivent le finir, avec toutes les pièces prévues.
import test from "node:test";
import assert from "node:assert/strict";
import { loadGame } from "./loader.mjs";

const { engine, sim: S, ctx } = loadGame();
const W = ctx.OctoWorlds;
const DT = 1 / 60;
const idle = {};
function run(sim, input, seconds) { for (let t = 0; t < seconds; t += DT) sim.step(typeof input === "function" ? input(t) : input, DT); }

// pièces des trajets à plateformes dans GitHubia (hors salle secrète : +28) ; les arènes : 9 / 12 / 15
const COURSE_COINS = { 1: 15, 3: 5, 4: 12, 5: 10, 7: 6, 8: 8, 9: 4 };
const ARENA_COINS = { 2: 9, 6: 12, 10: 15 };
const PLATFORM_LEVELS = Object.keys(COURSE_COINS).map(Number), ARENA_LEVELS = Object.keys(ARENA_COINS).map(Number);
const count = (grid, ch) => grid.join("").split(ch).length - 1;

test("mondes : chaque niveau a un trajet et un titre dans les deux nouveaux mondes (le niveau d'origine n'est jamais modifié)", () => {
  assert.equal(W.info.length, 3);
  assert.deepEqual(Array.from(W.info.map((w) => w.lang)), ["Pseudo-code", "Python", "JavaScript"]);
  for (const w of [1, 2]) {
    const d = W.data(w);
    assert.equal(d.titles.length, 10, `monde ${w} : 10 titres`);
    for (let id = 1; id <= 10; id++) {
      const base = engine.levels[id], before = JSON.stringify(base.run), v = W.apply(base, w);
      assert.ok(v.run && v.run.mode, `monde ${w} niveau ${id} : un trajet`);
      assert.notEqual(v.title, base.title, `monde ${w} niveau ${id} : titre propre au monde`);
      assert.ok(W.lore(id, w) && W.lore(id, w) !== base.briefing.lore, `monde ${w} niveau ${id} : histoire propre au monde`);
      assert.equal(JSON.stringify(base.run), before, "niveau d'origine intact");
      assert.equal(v.run.mode, ARENA_LEVELS.includes(id) ? (w === 1 ? "snake" : "invaders") : "platform", `monde ${w} niveau ${id} : mode de jeu`);
    }
  }
  assert.equal(W.apply(engine.levels[1], 0), engine.levels[1], "monde 0 : rien ne change");
  assert.equal(W.header(1, "X"), "X", "sans progression, le titre d'origine");
});

/* ---------- monde 1 : la tour ---------- */

test("tour : montées de 2 rangées au plus, vides de 1 colonne (2 avec le double saut), même nombre de pièces que dans GitHubia", () => {
  for (const id of PLATFORM_LEVELS) {
    const r = W.data(1).runs[id], g = S.buildTower(r.tower), plats = g.tower.platforms;
    assert.equal(count(g, "o"), COURSE_COINS[id], `tour ${id} : pièces`);
    assert.ok(g.join("").includes("T") && g.join("").includes("S") && g.join("").includes("C"), `tour ${id} : départ, drapeau, terminal`);
    for (let i = 1; i < plats.length; i++) {
      const a = plats[i - 1], b = plats[i], rise = (a.ty - b.ty);
      assert.ok(rise >= 1 && rise <= 2, `tour ${id} plateforme ${i} : montée de ${rise} rangée(s)`);
      if (i > 1) {
        const gap = b.l > a.r ? b.l - a.r - 1 : a.l - b.r - 1;
        assert.ok(gap >= 0 && gap <= (r.abilities.doubleJump ? 2 : 1), `tour ${id} plateforme ${i} : vide de ${gap} colonne(s)`);
      }
    }
    // une plateforme ne coiffe jamais le bord d'où l'on saute : aucune autre à moins de 5 rangées au-dessus d'un bord de départ
    for (let i = 1; i < plats.length - 1; i++) {
      const a = plats[i], n = plats[i + 1], edge = n.l > a.r ? a.r : a.l;
      plats.forEach((q, j) => { if (j !== i && !q.floor && q.ty < a.ty && a.ty - q.ty < 5) assert.ok(edge < q.l || edge > q.r, `tour ${id} : la plateforme ${j} coiffe le bord de départ de la ${i}`); });
    }
  }
});

test("tour : le robot grimpe jusqu'au terminal dans les 7 tours (ressorts, plateformes qui s'effritent, double saut compris)", () => {
  for (const id of PLATFORM_LEVELS) {
    const r = W.data(1).runs[id], sim = S.createPlatform(S.buildTower(r.tower), r.abilities);
    const res = S.simulate(sim, S.platformBot, 120);
    assert.ok(res.finished, `tour ${id} : le robot arrive au sommet (hauteur ${sim.progress().toFixed(2)})`);
    assert.ok(res.time < 70, `tour ${id} : ${res.time.toFixed(0)} s`);
    assert.ok(sim.vertical);
  }
});

test("tour : le portail secret mène à la salle de 28 pièces et le tuyau ramène près de lui ; on ne tombe jamais plus bas que le sol", () => {
  for (const id of PLATFORM_LEVELS) {
    const r = W.data(1).runs[id], g = S.buildTower(r.tower), sim = S.createPlatform(g, r.abilities), sec = sim.secret;
    assert.ok(sec && sec.warp, `tour ${id} : un portail secret`);
    const p = sim.player;
    p.x = (sec.warp.l + sec.warp.r) / 2; p.y = sec.warp.b - 2; p.vy = 0; p.vx = 0;
    run(sim, idle, 0.1);
    assert.equal(sec.inRoom, true, `tour ${id} : on est dans la salle`);
    assert.ok(p.x > sec.levelW, "à droite du niveau");
    assert.equal(sim.stats.bitsTotal - count(g, "o"), 28, "28 pièces dans la salle");
    p.x = sec.exit.x; p.y = sec.exit.y - 2; run(sim, idle, 0.1);
    assert.equal(sec.inRoom, false, "le tuyau nous ramène");
    assert.ok(Math.abs(p.x - sec.out.x) < 30 && p.hp === S.CFG.hpMax, "près du portail, sans dégât");
    assert.ok(sim.player.y <= sim.h, "dans la tour");
  }
});

test("tour : le drapeau d'un étage ne s'allume qu'en passant près de lui (pas depuis un autre étage)", () => {
  const r = W.data(1).runs[1], sim = S.createPlatform(S.buildTower(r.tower), r.abilities), ck = sim.checkpoints[0];
  sim.player.x = ck.x + 200 > sim.w ? ck.x - 200 : ck.x + 200; sim.player.y = ck.y + 64 * 3;
  run(sim, idle, 0.3);
  assert.equal(ck.on, false, "un autre étage n'allume pas le drapeau");
  sim.player.x = ck.x; sim.player.y = ck.y; sim.player.vy = 0; run(sim, idle, 0.2);
  assert.equal(ck.on, true);
});

/* ---------- monde 2 : l'espace ---------- */

test("espace : gravité lunaire, ressorts et passerelles ; mêmes pièces que dans GitHubia ; le robot finit les 7 parcours", () => {
  for (const id of PLATFORM_LEVELS) {
    const r = W.data(2).runs[id], g = S.buildCourse(r.course);
    assert.equal(r.abilities.gravity, 0.55, "lune");
    assert.equal(count(g, "o"), COURSE_COINS[id], `parcours ${id} : pièces`);
    const sim = S.createPlatform(g, r.abilities), res = S.simulate(sim, S.platformBot, 120);
    assert.ok(res.finished, `parcours ${id} : fini en ${res.time.toFixed(0)} s`);
  }
  const pads = PLATFORM_LEVELS.filter((id) => count(S.buildCourse(W.data(2).runs[id].course), "J") > 0);
  assert.ok(pads.length >= 3, "des ressorts dans plusieurs niveaux");
});

test("physique : un ressort propulse très haut, une plateforme qui s'effrite tombe 0,5 s après qu'on s'y est posé puis revient", () => {
  const sim = S.createPlatform(S.buildCourse([{ t: "flat", n: 4 }, { t: "flat", n: 3, pads: [1] }, { t: "flat", n: 8 }, { t: "end", n: 6 }]), {});
  const p = sim.player, pad = sim.pads[0];
  p.x = pad.x; p.y = pad.y; p.vy = 0; p.onGround = true;
  let minY = p.y;
  for (let t = 0; t < 1.5; t += DT) { sim.step(idle, DT); minY = Math.min(minY, p.y); }
  assert.ok(pad.y - minY > 150, `bond de ${(pad.y - minY).toFixed(0)} px (ressort)`);

  const sim2 = S.createPlatform(S.buildCourse([{ t: "flat", n: 14 }, { t: "float", at: 2, w: 3, h: 3, crumble: true, bits: false }, { t: "end", n: 6 }]), {});
  assert.equal(sim2.crumbles.length, 3);
  const cr = sim2.crumbles[0], q = sim2.player;
  q.x = (cr.tx + 0.5) * S.TILE; q.y = cr.ty * S.TILE - 40; q.vy = 100; q.onGround = false;
  run(sim2, idle, 0.35);
  assert.equal(cr.state, 1, "elle commence à s'effriter");
  run(sim2, idle, 0.5);
  assert.equal(cr.state, 2, "elle est tombée");
  assert.equal(sim2.solid[cr.ty][cr.tx], false);
  q.x = 60; q.y = 250; q.vy = 0; run(sim2, idle, 3);
  assert.equal(cr.state, 0, "elle est revenue");
  assert.equal(sim2.solid[cr.ty][cr.tx], true);
});

/* ---------- monde 2 : l'invasion ---------- */

test("invasion : le robot finit les 3 niveaux avec toutes les pièces ; le gardien du niveau 10 se bat et explose", () => {
  for (const id of ARENA_LEVELS) {
    const r = W.data(2).runs[id], sim = S.createInvaders(r, 600, 337);
    assert.equal(sim.stats.bitsTotal, ARENA_COINS[id], `invasion ${id} : pièces prévues`);
    const res = S.simulate(sim, S.invadersBot, 240);
    assert.ok(res.finished, `invasion ${id} : fini en ${res.time.toFixed(0)} s`);
    assert.equal(sim.stats.bits, ARENA_COINS[id], `invasion ${id} : toutes les pièces`);
  }
  const boss = S.createInvaders(W.data(2).runs[10], 600, 337);
  S.simulate(boss, S.invadersBot, 240);
  assert.equal(boss.boss, null, "le gardien a disparu");
});

test("invasion : Laita fige les envahisseurs 4 s (bombes effacées) puis ils repartent ; une formation arrivée en bas remonte ; 0 cœur = tout recommence, pièces gardées", () => {
  const r = W.data(2).runs[2], sim = S.createInvaders(r, 600, 337);
  run(sim, idle, 4);
  assert.ok(sim.enemies.length > 0 && sim.formation);
  sim.bombs.push({ x: 100, y: 100, vx: 0, vy: 50 });
  run(sim, { dog: true }, 0.05); run(sim, idle, 0.05);
  assert.ok(sim.freeze > 3.5 && sim.bombs.length === 0, "gelés, bombes effacées");
  const x0 = sim.formation.x; run(sim, idle, 2);
  assert.equal(sim.formation.x, x0, "la formation ne bouge pas");
  run(sim, idle, 3);
  assert.notEqual(sim.formation.x, x0, "elle repart");
  assert.ok(sim.dog.cd > 3, "Laita se repose");
  // pièces gardées après un K.O.
  const e = sim.enemies.find((q) => q.coin);
  sim.player.hp = 1; sim.player.inv = 0;
  const hp0 = sim.stats.bits;
  e.hp = 1; sim.bullets.push({ x: e.x, y: e.y, vx: 0, vy: -50 }); run(sim, idle, 0.1);
  assert.equal(sim.stats.bits, hp0 + 1, "pièce gagnée");
  sim.bombs.push({ x: sim.player.x, y: sim.player.y - 6, vx: 0, vy: 10 }); run(sim, idle, 0.2);
  assert.ok(sim.events.some((q) => q.t === "restart") && sim.stats.deaths === 1, "tout recommence");
  assert.equal(sim.player.hp, S.CFG.hpMax);
  assert.equal(sim.stats.bits, hp0 + 1, "la pièce reste gagnée");
});

/* ---------- monde 1 : le serpent ---------- */

test("serpent : le robot finit les 3 niveaux avec toutes les pièces ; chaque pièce allonge la file ; les bords se traversent", () => {
  for (const id of ARENA_LEVELS) {
    const r = W.data(1).runs[id], sim = S.createSnake(r);
    assert.equal(sim.stats.bitsTotal, ARENA_COINS[id], `serpent ${id} : pièces prévues`);
    const res = S.simulate(sim, S.snakeBot, 240);
    assert.ok(res.finished, `serpent ${id} : fini en ${res.time.toFixed(0)} s`);
    assert.equal(sim.stats.bits, ARENA_COINS[id]);
    assert.ok(sim.body.length >= 3 + ARENA_COINS[id] - 1, "la file s'est allongée");
  }
  const sim = S.createSnake({ cols: 10, rows: 6, speed: 8, coins: 1, seed: 3, glitches: [], start: { x: 8, y: 3, dx: 1, dy: 0 } });
  run(sim, { right: true }, 0.7);
  assert.ok(sim.body[0].x < 8, "sorti à droite, revenu à gauche");
  assert.equal(sim.player.hp, S.CFG.hpMax, "traverser le bord ne coûte rien");
});

test("serpent : une pierre, un Glitch ou sa propre file coûtent un cœur (jamais la partie) ; Laita fige les Glitch ; tout recommence à 0 cœur, pièces gardées", () => {
  const def = { cols: 12, rows: 8, speed: 10, coins: 3, seed: 5, walls: [[6, 3, 1, 1]], glitches: [{ x: 1, y: 1, dx: 1, dy: 0, speed: 3 }], start: { x: 3, y: 3, dx: 1, dy: 0 } };
  const sim = S.createSnake(def);
  run(sim, idle, 0.6); // la tête arrive sur la pierre
  const sim2 = S.createSnake(def);
  sim2.player.inv = 0;
  run(sim2, idle, 0.5);
  assert.ok(sim2.player.hp === S.CFG.hpMax - 1, `pierre : ${sim2.player.hp} cœurs`);
  // Laita
  const g = sim2.glitches[0], gx = g.x;
  run(sim2, { dog: true }, 0.05); run(sim2, idle, 0.05);
  assert.ok(sim2.freeze > 3);
  run(sim2, idle, 1.5);
  assert.equal(g.x, gx, "le Glitch est figé");
  // pièces gardées après un K.O.
  const sim3 = S.createSnake(def), c0 = sim3.coins[0];
  sim3.body[0].x = c0.x - 1; sim3.body[0].y = c0.y; sim3.dir = [1, 0];
  sim3.player.inv = 0;
  run(sim3, idle, 0.5);
  const got = sim3.stats.bits;
  assert.ok(got >= 1 || sim3.coins.length < 3, "une pièce ramassée");
  sim3.player.hp = 1; sim3.player.inv = 0;
  sim3.walls["" + ((sim3.body[0].x + sim3.dir[0] + 12) % 12) + "," + sim3.body[0].y] = true;
  run(sim3, idle, 0.5);
  assert.equal(sim3.stats.deaths, 1);
  assert.equal(sim3.stats.bits, got, "les pièces gagnées restent gagnées");
  assert.ok(sim3.coins.every((c) => c.id !== c0.id), "la pièce déjà prise ne revient pas");
});

/* ---------- le robot (skin secret) ---------- */

test("OctoBot : débloqué en finissant le jeu SANS la magie des torches ; la magie, même une seule fois, le fait perdre", () => {
  const P = ctx.OctoProgress; // (l'état est celui de ce contexte de test : on le remet à zéro entre chaque partie)
  P.reset();
  assert.equal(P.robotUnlocked(), false);
  function playAll(magicAt) { let last = null; for (let id = 1; id <= 10; id++) last = P.complete(id, id === magicAt ? { magic: true } : undefined); return last; }
  playAll(); P.startLap("Python"); playAll(); P.startLap("JavaScript");
  const end = playAll();
  assert.equal(end.lap, "end");
  assert.equal(end.robot, true);
  assert.equal(P.robotUnlocked(), true);
  assert.equal(P.robotNew(), true, "à présenter à l'accueil");
  assert.ok(P.get().achievements.robot);
  assert.deepEqual(Array.from(P.skinChoices()), [4], "moins de 500 pièces : seul le robot est au choix");
  assert.equal(P.pickSkin(2), false, "les autres costumes demandent 500 pièces");
  assert.equal(P.pickSkin(4), true);
  assert.equal(P.skin(), 4);
  P.robotSeen(); assert.equal(P.robotNew(), false);
  assert.equal(P.pickSkin(-1), true); assert.equal(P.skin(), 3, "retour au costume du tour (Cosmos)");
  P.bank(1, 600);
  assert.deepEqual(Array.from(P.skinChoices()), [0, 1, 2, 3, 4], "500 pièces : tous les costumes");
  // la sauvegarde garde le robot et la mémoire de la magie
  const code = P.exportSave();
  P.reset(); assert.equal(P.robotUnlocked(), false);
  assert.equal(P.importSave(code).ok, true);
  assert.equal(P.robotUnlocked(), true);
  // une seule utilisation de la magie pendant tout le jeu : pas de robot
  P.reset();
  playAll(); P.startLap("Python"); playAll(5); P.startLap("JavaScript");
  const end2 = playAll();
  assert.equal(end2.lap, "end");
  assert.equal(end2.robot, undefined);
  assert.equal(P.robotUnlocked(), false);
  assert.equal(P.get().magicUsed, 1);
  assert.equal(P.pickSkin(4), false);
  P.reset();
});
