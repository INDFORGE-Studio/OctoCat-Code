import { loadGame } from "./tests/loader.mjs";
const { sim: S, ctx } = loadGame();
const d = ctx.OctoWorlds.data(1);
for (const id of [2, 6, 10]) {
  const run = d.arenas[id];
  const sim = S.createSnake(run);
  const r = S.simulate(sim, S.snakeBot, 300);
  console.log(id, "finished", r.finished, r.time.toFixed(0) + "s", "deaths", r.deaths, "bits", r.bits, "/", sim.stats.bitsTotal, "hp", sim.player.hp, "len", sim.body.length, "coins left", sim.coins.length);
}
