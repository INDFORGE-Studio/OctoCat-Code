// Easter egg des torches du portail : `node dev/magic-check.mjs` — vrais clics sur les deux torches (niveaux 1 et 4), captures dev/shots/magic-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4183;
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

for (const lvl of [1, 4]) {
  await page.goto("about:blank");
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${lvl}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.evaluate(() => { localStorage.setItem("octocat-code:settings:v1", JSON.stringify({ skipAlways: true })); });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("octocat-code:v1") || "{}"); s.achievements = {}; localStorage.setItem("octocat-code:v1", JSON.stringify(s)); });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.locator(".octo-skip").click();
  await page.waitForSelector(".octo-dialog.is-open");
  await page.locator(".octo-dialog .octo-btn--primary").click();
  await page.waitForTimeout(800);
  const pts = await page.evaluate(() => window.OctoScenery.torchPoints());
  ok(`niveau ${lvl} : deux torches repérées`, pts.length === 2 && pts.every((p) => p.x > 0 && p.y > 0), JSON.stringify(pts.map((p) => [Math.round(p.x), Math.round(p.y)])));
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-0.png`) });
  await page.mouse.click(pts[0].x, pts[0].y);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-1-snuff.png`) });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-2-wisp.png`) });
  ok(`niveau ${lvl} : une seule torche éteinte, pas de finale`, !(await page.evaluate(() => !!window.OctoProgress.get().achievements.magic)));
  await page.waitForTimeout(1000);
  await page.mouse.click(pts[1].x, pts[1].y);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-3-wisp2.png`) });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-4-finale.png`) });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-5-rain.png`) });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `magic-${lvl}-6-after.png`) });
  ok(`niveau ${lvl} : les deux torches éteintes → succès « Magicien »`, await page.evaluate(() => !!window.OctoProgress.get().achievements.magic));
  // l'énigme reste jouable après la magie : le bouton Compiler répond
  ok(`niveau ${lvl} : l'éditeur reste utilisable`, await page.locator(".octo-btn--primary", { hasText: "Compiler" }).isEnabled());
}

console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
