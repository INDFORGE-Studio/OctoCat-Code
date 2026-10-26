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

// Les costumes : `node dev/skins-check.mjs` — dessine les 5 apparences d'OctoCat (repos, course, victoire, K.O.) et de Laita sur une planche : dev/shots/skins.png
await page.goto(`http://127.0.0.1:${PORT}${BASE}`, { waitUntil: "load" });
await page.waitForFunction(() => window.OctoSprites && window.OctoSprites.builders && window.OctoSprites.laitaBuf, null, { timeout: 15000 });
await page.evaluate(() => {
  const S = window.OctoSprites, SC = 5, cv = document.createElement("canvas");
  cv.id = "skins"; cv.width = 24 * SC * 6 + 40; cv.height = (24 * SC + 16 * SC + 16) * 5 + 20;
  cv.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#1b2236;image-rendering:pixelated";
  const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  for (let skin = 0; skin < 5; skin++) {
    const frames = S.builders.octoFrames(skin), y0 = 10 + skin * (24 * SC + 16 * SC + 16);
    [0, 2, 3, 6, 8, 1].forEach((fi, i) => {
      const buf = frames[fi], c = document.createElement("canvas"); c.width = 24; c.height = 24;
      buf.draw(c.getContext("2d"), 0, 0); ctx.drawImage(c, 10 + i * 24 * SC, y0, 24 * SC, 24 * SC);
    });
    [0, 1, 2, 3, 4, 5].forEach((pose, i) => {
      const buf = S.laitaBuf(pose, skin), c = document.createElement("canvas"); c.width = 24; c.height = 16;
      buf.draw(c.getContext("2d"), 0, 0); ctx.drawImage(c, 10 + i * 24 * SC, y0 + 24 * SC + 6, 24 * SC, 16 * SC);
    });
  }
  document.body.appendChild(cv);
});
await page.locator("#skins").screenshot({ path: path.join(OUT, "skins.png") });
ok("planche des costumes", true, "dev/shots/skins.png");
ok("console propre", errs.length === 0, errs.join(" | "));
console.log(out.join("\n"));
await browser.close(); server.close();
