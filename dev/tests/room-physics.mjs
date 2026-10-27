// Explorateur « vraie physique » des salles secrètes : le vrai simulateur (`createPlatform`) fait sauter un joueur de toutes les façons
// (course, saut tenu ou coupé, double saut à différents moments, chute d'un bord) à partir de chaque endroit où il se pose,
// jusqu'à ce qu'il ne trouve plus de nouvel endroit. Rend les pièces ramassées, si le tuyau de sortie est atteint, et les PIÈGES :
// les endroits d'où l'on ne peut plus jamais rejoindre le tuyau. Pas de raccourci : taille du corps (18×34 px), plafonds,
// ressorts et gravité du monde sont ceux du jeu. Les passerelles qui s'effritent comptent comme du sol (on les traverse en courant).
import { loadGame } from "./loader.mjs";

const { engine, sim: S, ctx } = loadGame();
const W = ctx.OctoWorlds, O = ctx.OctoRooms;
const DT = 1 / 60;

export function gridFor(world, id) {
  const g = world === 0 ? S.buildCourse(engine.levels[id].run.course) : (world === 1 ? S.buildTower(W.data(1).runs[id].tower) : S.buildCourse(W.data(2).runs[id].course));
  const ab = world === 0 ? engine.levels[id].run.abilities : W.data(world).runs[id].abilities;
  g.roomKey = O.key(world, id);
  return { g, ab };
}

/** opt.fine : plus d'essais (lent) ; sans : essais espacés (~1 min par salle) ; opt.single : sans double saut. */
export function explore(world, id, opt) {
  opt = opt || {};
  const { g, ab } = gridFor(world, id);
  const sim = S.createPlatform(g, opt.single ? Object.assign({}, ab, { doubleJump: false }) : ab), sec = sim.secret, p = sim.player;
  sim.enemies.forEach((e) => { e.alive = false; });
  sim.candles.forEach((c) => { c.alive = false; });
  sim.spikes.length = 0;
  sim.crumbles.length = 0;
  const room = sim.bits.filter((b) => b.x > sec.roomL);
  const ex = sec.exit;
  let exitNow = false, exitEver = false;
  const reset = (st) => { p.x = st.x; p.y = st.y; p.vx = 0; p.vy = 0; p.onGround = true; p.jumps = 0; p.coyote = 0.1; p.buffer = 0; p.cut = false; p.hp = 5; p.inv = 9; sec.inRoom = false; exitNow = false; };
  const frame = (inp) => {
    sim.step(inp, DT);
    sec.inRoom = false; sim.events.length = 0; // (sinon le tuyau nous sortirait de la salle : on regarde seulement si on le touche)
    if (p.x + 9 > ex.l && p.x - 9 < ex.r && p.y > ex.t && p.y - 34 < ex.b) { exitNow = true; exitEver = true; }
  };
  reset({ x: sec.spawn.x, y: sec.spawn.y });
  for (let i = 0; i < 30; i++) frame({}); // on se pose
  const key = (st) => Math.round(st.x / 10) + "," + Math.round(st.y);
  const seen = new Set(), queue = [], edges = new Map(); // edges : place -> places atteintes ("EXIT" = le tuyau)
  let src = null;
  const link = (to) => { if (src !== null) edges.get(src).add(to); };
  const add = () => { const k = key({ x: p.x, y: p.y }); link(k); if (!seen.has(k)) { seen.add(k); edges.set(k, new Set()); queue.push({ x: p.x, y: p.y }); } };
  add();
  const PRE = opt.fine ? [0, 5, 10, 15, 20, 30, 40, 55] : [0, 8, 16, 28, 44];
  const DJ = opt.fine ? [0, 7, 14, 21, 30, 42] : [0, 9, 20, 34];
  const HOLD = [999, 14];
  let tried = 0;
  const settle = () => { // retombe jusqu'au sol
    let on = 0;
    for (let i = 0; i < 240 && on < 3; i++) { frame({}); on = p.onGround ? on + 1 : 0; }
    if (on >= 3) add();
  };
  while (queue.length && seen.size < (opt.cap || 900)) {
    const st = queue.shift();
    src = key(st);
    for (const dir of [-1, 1, 0]) {
      for (const pre of dir === 0 ? [0] : PRE) {
        if (dir !== 0) { // on court puis on tombe du bord (sans sauter)
          reset(st);
          for (let i = 0; i < pre; i++) frame({ left: dir < 0, right: dir > 0 });
          for (let i = 0; i < 200 && !(p.onGround && i > 4); i++) frame({ left: dir < 0, right: dir > 0 });
          settle(); tried++;
          if (exitNow) link("EXIT");
        }
        for (const hold of HOLD) for (const dj of DJ) for (const air of dir === 0 ? [-1, 0, 1] : [dir, 0]) { // on court, on saute (tenu ou coupé), double saut éventuel
          reset(st);
          for (let i = 0; i < pre; i++) frame({ left: dir < 0, right: dir > 0 });
          let landed = 0;
          frame({ left: dir < 0, right: dir > 0, jump: true, jumpTap: true });
          for (let f = 1; f < 200; f++) {
            const tap = dj && f === dj;
            frame({ left: air < 0, right: air > 0, jump: f < hold || tap, jumpTap: tap });
            landed = p.onGround ? landed + 1 : 0;
            if (landed >= 3) break;
          }
          if (exitNow) link("EXIT");
          if (landed >= 3) { add(); tried++; }
        }
      }
    }
  }
  // pièges : les places d'où le tuyau n'est plus jamais atteignable (parcours à l'envers depuis « EXIT »)
  const back = new Map();
  edges.forEach((tos, from) => tos.forEach((to) => { if (!back.has(to)) back.set(to, []); back.get(to).push(from); }));
  const ok = new Set(["EXIT"]), todo = ["EXIT"];
  while (todo.length) { for (const f of back.get(todo.pop()) || []) if (!ok.has(f)) { ok.add(f); todo.push(f); } }
  const traps = [...seen].filter((k) => !ok.has(k));
  const cell = (b) => [Math.round((b.x - sec.roomL) / 32 - 0.5), Math.round(((sim.h - b.y) / 32) - 0.5)];
  return { room: sec.name, total: room.length, got: room.filter((b) => b.got).length, lost: room.filter((b) => !b.got).map(cell), exit: exitEver, states: seen.size, tried, traps };
}
