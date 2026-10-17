// Laita, la chienne : `node dev/restart-check.mjs` — K.O. dans le vrai jeu : tout recommence au début, les pièces prises ne reviennent pas ; capture dev/shots/restart-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4179;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
  let f = path.join(SITE, p.slice(BASE.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [], out = [];
page.on("pageerror", (e) => errs.push(e.message));
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
const sim = (fn, arg) => page.evaluate(fn, arg);

for (const lvl of [1, 2]) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${lvl}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.waitForTimeout(1000);
  // il avance, prend une pièce (plateformes) ou vainc un monstre (arène), puis un monstre l'achève
  const s0 = await sim(() => {
    const s = window.OctoPlay.current.sim;
    if (s.mode === "brawl") { s.player.x = s.waves[0].at; return { x: s.player.x, mode: s.mode }; }
    s.bits[0].got = true; s.stats.bits = 1; if (s.checkpoints[0]) s.player.x = s.checkpoints[0].x + 30;
    return { x: s.player.x, mode: s.mode };
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `restart-${lvl}-before.png`) });
  await sim(() => {
    const s = window.OctoPlay.current.sim, p = s.player;
    if (s.mode === "brawl") { const e = s.enemies[0]; e.hp = 1; s.coinsGot["0:0"] = true; s.stats.bits = 1; }
    p.hp = 1; p.inv = 0;
    const e = s.enemies.filter((q) => q.alive !== false)[0]; e.x = p.x; e.y = p.y; e.scared = 0; if (s.mode === "brawl") { e.wind = 0.3; e.cd = 0; }
  });
  await page.waitForFunction(() => window.OctoPlay.current.sim.stats.deaths >= 1, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `restart-${lvl}-after.png`) });
  const r = await sim(() => { const s = window.OctoPlay.current.sim; return { deaths: s.stats.deaths, hp: s.player.hp, px: s.player.x, bits: s.stats.bits, flags: s.checkpoints ? s.checkpoints.filter((c) => c.on).length : 0, bit0: s.bits ? s.bits[0].got : null }; });
  ok(`niveau ${lvl} : K.O. compté`, r.deaths >= 1, JSON.stringify(r));
  ok(`niveau ${lvl} : retour au début, cœurs pleins`, r.px < 200 && r.hp >= 3);
  ok(`niveau ${lvl} : pièces gardées, drapeaux à zéro`, r.bits >= 1 && r.flags === 0 && (r.bit0 === null || r.bit0 === true));
}
console.log(out.join("\n")); console.log("erreurs :", errs.length ? errs.join(" | ") : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
