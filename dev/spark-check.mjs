// Étincelles du trou secret : `node dev/spark-check.mjs` — dans chacun des 7 niveaux à trous, on se place près du trou secret :
// des étincelles dorées doivent monter, À L'ÉCRAN (à la hauteur du sol), et s'arrêter quand on est loin. Captures dev/shots/spark-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4185;
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

for (const lvl of [1, 3, 4, 5, 7, 8, 9]) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${lvl}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  // près du trou secret, sur le sol
  const info = await page.evaluate(() => { const s = window.OctoPlay.current.sim, g = s.secret; s.player.x = g.gapL - 70; s.player.y = g.gapTop - 4; s.player.vy = 0; return { gapL: g.gapL, gapR: g.gapR, top: g.gapTop }; });
  await page.waitForTimeout(1600);
  const near = await page.evaluate(() => {
    const k = document.querySelector(".octo-scene").__kaplay, list = k.get("secretspark");
    const onScreen = list.filter((o) => { const p = k.toScreen(o.pos); return p.x >= 0 && p.x <= k.width() && p.y >= 0 && p.y <= k.height(); }).length;
    return { n: list.length, onScreen };
  });
  ok(`niveau ${lvl} : des étincelles montent du trou secret (${info.gapL}-${info.gapR}, sol à ${info.top})`, near.n >= 3, JSON.stringify(near));
  ok(`niveau ${lvl} : et elles sont visibles à l'écran`, near.onScreen >= 3);
  await page.screenshot({ path: path.join(OUT, `spark-${lvl}.png`) });
  // loin du trou : plus d'étincelles
  await page.evaluate(() => { const s = window.OctoPlay.current.sim; s.player.x = 60; s.player.y = 40; });
  await page.waitForTimeout(2600);
  const far = await page.evaluate(() => document.querySelector(".octo-scene").__kaplay.get("secretspark").length);
  ok(`niveau ${lvl} : loin du trou, plus d'étincelles`, far === 0, "restantes : " + far);
}
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
