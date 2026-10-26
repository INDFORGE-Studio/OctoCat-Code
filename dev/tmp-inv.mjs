import { loadGame } from "./tests/loader.mjs";
const { sim: S, ctx } = loadGame();
const d = ctx.OctoWorlds.data(2);
for (const id of [2, 6, 10]) {
  const run = d.arenas[id];
  const sim = S.createInvaders(run, 600, 337);
  const r = S.simulate(sim, S.invadersBot, 300);
  console.log(id, "finished", r.finished, r.time.toFixed(0) + "s", "deaths", r.deaths, "bits", r.bits, "/", sim.stats.bitsTotal, "kills", sim.stats.kills, "hp", sim.player.hp, "breach", sim.breach);
}
