// Laita, la chienne : `node dev/secret-check.mjs` — salle secrète dans le vrai jeu (trou secret, pièces, tuyau de sortie) ; captures dev/shots/secret-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4180;
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


for (const lvl of [1, 7]) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${lvl}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.waitForTimeout(1000);
  const g = await sim(() => { const s = window.OctoPlay.current.sim, c = s.secret; s.enemies.forEach((e) => { e.alive = false; }); s.player.x = c.gapL - 60; s.player.y = s.h - 64; s.player.vx = 0; s.player.vy = 0; return { gapL: c.gapL, hp: s.player.hp, bits: s.stats.bits }; });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `secret-${lvl}-gap.png`) });
  await sim(() => { const s = window.OctoPlay.current.sim, c = s.secret; s.player.x = (c.gapL + c.gapR) / 2; s.player.y = s.h + 130; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `secret-${lvl}-room.png`) });
  ok(`niveau ${lvl} : on tombe dans la salle secrète, sans perdre de cœur`, await sim((hp) => { const s = window.OctoPlay.current.sim; return s.secret.inRoom && s.stats.deaths === 0 && s.player.hp === hp; }, g.hp));
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("Space"); await page.waitForTimeout(2600); await page.keyboard.up("Space"); await page.keyboard.up("ArrowRight"); // (saut tenu : il saute de nouveau à chaque atterrissage ; chaque salle a son relief)
  await page.screenshot({ path: path.join(OUT, `secret-${lvl}-coins.png`) });
  ok(`niveau ${lvl} : pièces ramassées dans la salle`, await sim((b) => window.OctoPlay.current.sim.stats.bits > b, g.bits));
  await sim(() => { const s = window.OctoPlay.current.sim, e = s.secret.exit; s.player.x = e.x; s.player.y = e.y; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `secret-${lvl}-out.png`) });
  ok(`niveau ${lvl} : ressort devant le dernier trou`, await sim(() => { const s = window.OctoPlay.current.sim; return !s.secret.inRoom && Math.abs(s.player.x - s.secret.out.x) < 40; }));
}
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
