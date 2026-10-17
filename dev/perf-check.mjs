// Performance : `node dev/perf-check.mjs [niveau]` — temps de démarrage (dessin des sprites, 1re scène), profil CPU JavaScript pendant quelques
// secondes de jeu (les fonctions qui coûtent le plus), mémoire. Le CPU est ralenti (x4) pour imiter un petit appareil.
// NB : le rendu WebGL est logiciel ici (SwiftShader) : seuls les temps JavaScript sont représentatifs.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), BASE = "/OctoCat-Code/", PORT = 4187;
const LEVEL = parseInt(process.argv[2] || "1", 10), SLOW = 4;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW });

// chronomètres posés avant le chargement des scripts du jeu
await page.addInitScript(() => {
  window.__perf = { t0: performance.now(), marks: {} };
  let sprites;
  Object.defineProperty(window, "OctoSprites", {
    configurable: true,
    get() { return sprites; },
    set(v) {
      sprites = v;
      ["registerAll", "registerRun"].forEach((n) => {
        const f = v[n]; if (typeof f !== "function") return;
        v[n] = function () { const a = performance.now(); const r = f.apply(this, arguments); window.__perf.marks[n] = Math.round(performance.now() - a); return r; };
      });
    }
  });
});
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${LEVEL}`, { waitUntil: "load" });
await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 60000 });
const ready = Date.now() - t0;
const marks = await page.evaluate(() => window.__perf.marks);
console.log(`démarrage (CPU x${SLOW}) : page prête en ${ready} ms ; dessin des sprites :`, JSON.stringify(marks));

// profil CPU pendant 6 s de jeu (on court vers la droite)
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
await cdp.send("Profiler.start");
await page.keyboard.down("ArrowRight");
await page.waitForTimeout(3000);
await page.keyboard.press("Space");
await page.waitForTimeout(3000);
await page.keyboard.up("ArrowRight");
const { profile } = await cdp.send("Profiler.stop");
const self = new Map(), byId = new Map();
profile.nodes.forEach((n) => byId.set(n.id, n));
const dt = profile.timeDeltas; let total = 0;
profile.samples.forEach((id, i) => {
  const n = byId.get(id), cf = n.callFrame, d = dt[i] || 0; total += d;
  const key = `${cf.functionName || "(anonyme)"}  ${cf.url.split("/").pop()}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + d);
});
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
console.log(`profil : ${(total / 1000).toFixed(0)} ms échantillonnés sur 6 s de jeu (le reste = attente)`);
top.forEach(([k, v]) => console.log(`${(v / 1000).toFixed(1).padStart(8)} ms  ${k}`));
const mem = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
console.log("mémoire JS :", mem, "Mo ; erreurs :", errs.length ? errs : "aucune");
await browser.close(); server.close();
