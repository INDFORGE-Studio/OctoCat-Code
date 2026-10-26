// Laita, la chienne : `node dev/dog-check.mjs` — clic droit dans le vrai jeu (plateformes et arène) ; captures dev/shots/dog-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4178;
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
const ok_ = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
const sim = (fn, arg) => page.evaluate(fn, arg);

// Les mondes : `node dev/worlds-check.mjs [monde] [niveaux…]` — joue le vrai jeu avec le robot dans chaque monde (?world=N) et prend des captures dev/shots/world-*.png.
// Sans argument : monde 1 (Python), niveaux 1 3 4 5 7 8 9. Échoue si la console lève une erreur ou si un trajet ne s'ouvre pas sur l'énigme.
const world = Number(process.argv[2] || 1);
const lvls = process.argv.slice(3).map(Number).filter(Boolean);
const levels = lvls.length ? lvls : world === 1 ? [1, 3, 4, 5, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
for (const id of levels) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all&world=${world}#level${id}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `world${world}-${id}-a.png`) });
  await page.evaluate(() => {
    const c = window.OctoPlay.current, S = window.OctoSim;
    const botOf = { platform: S.platformBot, brawl: S.brawlBot, snake: S.snakeBot, invaders: S.invadersBot }[c.sim.mode] || S.platformBot;
    const bot = botOf(c.sim);
    c.input.get = () => bot(1 / 60);
  });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: path.join(OUT, `world${world}-${id}-b.png`) });
  let ok = false;
  try { await page.waitForSelector(".octo-dialog.is-open", { timeout: 120000 }); ok = true; } catch { /* trop long */ }
  const st = await sim(() => { const c = window.OctoPlay.current; return c ? { prog: c.sim.progress(), bits: c.sim.stats.bits, total: c.sim.stats.bitsTotal, deaths: c.sim.stats.deaths } : null; });
  ok_(`monde ${world} niveau ${id} : l'énigme s'ouvre après le trajet`, ok, JSON.stringify(st));
}
ok_("console propre", errs.length === 0, errs.join(" | "));
console.log(out.join("\n"));
await browser.close(); server.close();
