import { loadGame } from "./tests/loader.mjs";
const { sim: S, ctx } = loadGame();
const want = { 1: 15, 3: 5, 4: 12, 5: 10, 7: 6, 8: 8, 9: 4 };
const d = ctx.OctoWorlds.data(1);
for (const id of Object.keys(d.runs)) {
  const run = d.runs[id];
  let g;
  try { g = S.buildTower(run.tower); } catch (e) {
    console.log(id, "ECHEC", e.message);
    const spec = JSON.parse(JSON.stringify(run.tower)); spec.platforms.forEach((p) => { delete p.secret; });
    const g2 = S.buildTower(spec); console.log(JSON.stringify(g2.tower.platforms.map((q) => [q.l, q.r, q.ty])), "rows", g2.tower.rows); continue;
  }
  const coins = g.join("").split("o").length - 1;
  const sim = S.createPlatform(g, run.abilities);
  const r = S.simulate(sim, S.platformBot, 240);
  console.log(id, "coins", coins, "/", want[id], "plats", g.tower.platforms.length, "bot:", r.finished, r.time.toFixed(0) + "s", "deaths", r.deaths, "bits", r.bits, "/", sim.stats.bitsTotal, "secret", !!g.warp);
}
