// Musique coupée : les effets sonores doivent rester audibles. `node dev/audio-check.mjs`
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4175;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
  let f = path.join(SITE, p.slice(BASE.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => { try { localStorage.setItem("octocat-code:music:v2", "off"); } catch { /* ignoré */ } });
const page = await ctx.newPage();
const out = [];
const probe = (name) => page.evaluate((n) => new Promise((res) => { let peak = 0; const t0 = performance.now(); window.OctoMusic.sfx(n); (function tick() { peak = Math.max(peak, window.OctoMusic.level()); if (performance.now() - t0 < 500) requestAnimationFrame(tick); else res(peak); })(); }), name);

const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
await page.goto(`http://127.0.0.1:${PORT}${BASE}`, { waitUntil: "load" });
await page.waitForTimeout(1200);
await page.mouse.click(640, 300); // geste utilisateur (comme un joueur)
ok("musique coupée au départ", await page.evaluate(() => window.OctoMusic.isMuted()));
// silence avant tout effet
await page.waitForTimeout(500);
const quiet = await page.evaluate(() => window.OctoMusic.level());
// un effet sonore : le niveau sonore doit monter alors que la musique est coupée
let peak = await probe("kill");
if (peak < 0.01) peak = Math.max(peak, await probe("kill"));
ok("effet audible musique coupée", peak > 0.01 && peak > quiet * 3, `silence ${quiet.toFixed(4)} → pic ${peak.toFixed(3)}`);
ok("la musique reste coupée", await page.evaluate(() => window.OctoMusic.isMuted() && !window.OctoMusic.isRunning()));
// effets désactivés dans les réglages : silence
await page.evaluate(() => window.OctoSettings.set("sfx", false));
await page.waitForTimeout(700);
const peak2 = await probe("hurt");
ok("effets désactivés : silence", peak2 < 0.01, `pic ${peak2.toFixed(4)}`);
console.log(out.join("\n"));
await browser.close(); server.close();
