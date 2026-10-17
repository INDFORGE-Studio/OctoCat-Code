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

for (const lvl of [1, 2]) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${lvl}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  // on place le joueur près du premier monstre (en arène : on déclenche la première vague)
  await sim(() => {
    const s = window.OctoPlay.current.sim;
    if (s.mode === "brawl") { s.player.x = s.waves[0].at; }
    else { const e = s.enemies.filter((q) => q.type === "walker" || q.type === "tough")[0]; s.player.x = e.x - 150; s.player.y = e.y; s.player.vx = 0; s.player.vy = 0; }
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `dog-${lvl}-idle.png`) });
  ok(`niveau ${lvl} : Laita suit son maître`, await sim(() => { const s = window.OctoPlay.current.sim; return s.dog.state === "follow" && Math.abs(s.dog.x - s.player.x) < 80; }));
  const before = await sim(() => window.OctoPlay.current.sim.player.hp);
  await page.mouse.click(640, 260, { button: "right" });
  await page.waitForTimeout(250);
  ok(`niveau ${lvl} : le clic droit lance Laita`, await sim(() => window.OctoPlay.current.sim.dog.state !== "follow"), await sim(() => window.OctoPlay.current.sim.dog.state));
  await page.screenshot({ path: path.join(OUT, `dog-${lvl}-charge.png`) });
  let scared = false;
  for (let i = 0; i < 20 && !scared; i++) { await page.waitForTimeout(150); scared = await sim(() => window.OctoPlay.current.sim.enemies.some((e) => e.scared > 0)); }
  ok(`niveau ${lvl} : un monstre a peur`, scared);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `dog-${lvl}-scared.png`) });
  ok(`niveau ${lvl} : aucun mort, aucun dégât`, await sim(() => { const s = window.OctoPlay.current.sim; return s.stats.kills === 0; }) && (await sim(() => window.OctoPlay.current.sim.player.hp)) === before);
  await page.waitForTimeout(2500);
  ok(`niveau ${lvl} : Laita est revenue`, await sim(() => window.OctoPlay.current.sim.dog.state === "follow"));
}
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
await browser.close(); server.close();
