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
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
const sim = (fn, arg) => page.evaluate(fn, arg);

// Écrasement : `node dev/stomp-check.mjs` — on retombe sur un ennemi dans le vrai jeu : il meurt, on rebondit ; captures dev/shots/stomp-*.png.
await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level1`, { waitUntil: "load" });
await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
await page.waitForTimeout(1500);
for (const type of ["walker", "tough"]) {
  const found = await sim((t) => {
    const s = window.OctoPlay.current.sim;
    const e = s.enemies.find((q) => q.alive && q.type === t);
    if (!e) return null;
    s.player.x = e.x; s.player.y = e.y - e.h - 6; s.player.vy = 220; s.player.vx = 0; s.player.onGround = false;
    window.__e = e; return e.type;
  }, type);
  if (!found) { out.push(`- pas de ${type} au niveau 1 (ignoré)`); continue; }
  await page.waitForTimeout(90);
  await page.screenshot({ path: path.join(OUT, `stomp-${type}.png`) });
  const after = await sim(() => { const s = window.OctoPlay.current.sim; return { alive: window.__e.alive, vy: Math.round(s.player.vy), hp: s.player.hp }; });
  ok(`${type} écrasé d'un saut`, !after.alive, JSON.stringify(after));
}
ok("console propre", errs.length === 0, errs.join(" | "));
console.log(out.join("\n"));
await browser.close(); server.close();
