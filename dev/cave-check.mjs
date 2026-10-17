// Grotte d'arrivée (niveau 8) : `node dev/cave-check.mjs` — vrai saut clavier dans le dernier trou, entrée dans la grotte, terminal ; captures dev/shots/cave-*.png.
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
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [], out = [];
page.on("pageerror", (e) => errs.push(e.message));
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto("about:blank");
await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level8`, { waitUntil: "load" });
await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
await page.waitForTimeout(1000);

const g = await ev(() => {
  const s = window.OctoPlay.current.sim, c = s.cave, T = 32;
  s.enemies.forEach((e) => { e.alive = false; });
  let pc = Math.floor(c.l / T) - 1; // dernière colonne de sol avant le trou
  while (pc > 0 && !s.solid.some((row) => row[pc])) pc--;
  let pr = 0; while (!s.solid[pr][pc]) pr++;
  const x = pc * T - 70;
  s.player.x = x; s.player.y = pr * T; s.player.vx = 0; s.player.vy = 0; s.sim = null;
  return { edge: (pc + 1) * T, cave: c, term: s.terminal, hp: s.player.hp };
});
ok("le niveau 8 a une grotte avec le terminal dedans", !!g.cave && g.term.x > g.cave.l && g.term.x < g.cave.r && g.term.y <= g.cave.b, JSON.stringify(g.cave));
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, "cave-1-sign.png") });

// vrai saut : on court vers le bord, on saute au dernier moment, on garde la flèche droite
await page.keyboard.down("ArrowRight");
await page.waitForFunction((edge) => window.OctoPlay.current.sim.player.x > edge - 14, g.edge, { timeout: 8000 });
await page.keyboard.down("Space");
await page.waitForTimeout(430);
await page.keyboard.up("Space");
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "cave-2-jump.png") });
let seen = false;
for (let i = 0; i < 40 && !seen; i++) {
  await page.waitForTimeout(150);
  seen = await ev(() => { const s = window.OctoPlay.current.sim; return s.player.x > s.cave.l + 20 && s.player.y <= s.cave.b + 1 && s.player.y >= s.cave.t; });
}
await page.screenshot({ path: path.join(OUT, "cave-3-inside.png") });
ok("on entre dans la grotte en sautant dans le trou", seen);
// on laisse courir vers le terminal (la partie se ferme quand l énigme s ouvre) en notant les chutes
let deaths = 0, opened = false;
for (let i = 0; i < 40 && !opened; i++) {
  await page.waitForTimeout(150);
  const r = await ev(() => { const c = window.OctoPlay.current; return c ? { d: c.sim.stats.deaths } : null; });
  if (r) deaths = r.d; else opened = true;
}
await page.keyboard.up("ArrowRight");
ok("sans perdre de cœur ni tomber", deaths === 0, "chutes : " + deaths);
ok("le terminal de la grotte ouvre l énigme", opened);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, "cave-4-terminal.png") });

console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
