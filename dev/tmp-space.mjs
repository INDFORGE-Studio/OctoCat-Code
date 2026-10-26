import { loadGame } from "./tests/loader.mjs";
const { sim: S, ctx } = loadGame();
const want = { 1: 15, 3: 5, 4: 12, 5: 10, 7: 6, 8: 8, 9: 4 };
const d = ctx.OctoWorlds.data(2);
for (const id of Object.keys(d.runs)) {
  const run = d.runs[id];
  const g = S.buildCourse(run.course);
  const coins = g.join("").split("o").length - 1;
  const sim = S.createPlatform(g, run.abilities);
  const r = S.simulate(sim, S.platformBot, 120);
  console.log(id, "coins", coins, "/", want[id], "cols", g[0].length, "bot:", r.finished, r.time.toFixed(0) + "s", "deaths", r.deaths, "bits", r.bits, "/", sim.stats.bitsTotal, "x", r.x.toFixed(0));
}
