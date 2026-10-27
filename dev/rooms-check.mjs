// Salles secrètes : `node dev/rooms-check.mjs [monde…]` — entre dans chacune des 21 salles du vrai jeu (monde 0, 1, 2 × niveaux 1 3 4 5 7 8 9),
// vérifie le nom, les 28 pièces, le thème, la console, et enregistre dev/shots/room-<monde>-<niveau>.png (+ une planche rooms-<monde>.png).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4181;
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
const worlds = process.argv.slice(2).map(Number).filter((n) => n >= 0 && n <= 2), WORLDS = worlds.length ? worlds : [0, 1, 2];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
const errs = [], out = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };

for (const w of WORLDS) for (const lvl of [1, 3, 4, 5, 7, 8, 9]) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?world=${w}&unlock=all#level${lvl}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current && window.OctoPlay.current.sim.secret, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const s = window.OctoPlay.current.sim, c = s.secret;
    s.enemies.forEach((e) => { e.alive = false; });
    s.player.x = c.spawn.x; s.player.y = c.spawn.y; s.player.vx = 0; s.player.vy = 0; c.inRoom = true;
    return { name: c.name, coins: s.bits.filter((b) => b.x > c.roomL).length, deco: c.theme && c.theme.deco, roomW: Math.round((s.w - c.roomL) / 32) };
  });
  await page.waitForTimeout(1300);
  await page.evaluate(() => { const s = window.OctoPlay.current.sim, c = s.secret; s.player.x = c.roomL + (s.w - c.roomL) * 0.5; s.player.y = s.h - 64 - 2; s.player.vx = 0; s.player.vy = 0; });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(OUT, `room-${w}-${lvl}.png`) });
  ok(`monde ${w} niveau ${lvl} : « ${info.name} » (${info.deco}, ${info.roomW} colonnes)`, !!info.name && info.coins === 28, `${info.coins} pièces`);
}
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
