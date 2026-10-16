// Captures du jeu pour vérification visuelle : `npm run build && npm run shot [-- scénario…]`
// Sert le dossier `site/` sous /OctoCat-Code/ (comme GitHub Pages), joue des scénarios dans Chromium
// (Playwright, WebGL logiciel) et écrit des PNG dans dev/shots/. Sort en erreur si la page lève une exception.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const OUT = path.join(ROOT, "dev", "shots");
const BASE = "/OctoCat-Code/";
const PORT = 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

if (!fs.existsSync(path.join(SITE, "index.html"))) {
  console.error("site/ introuvable : lance d'abord `npm run build`.");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
  p = p.slice(BASE.length);
  let f = path.join(SITE, p);
  if (!f.startsWith(SITE)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const URL_BASE = `http://127.0.0.1:${PORT}${BASE}`;
const VIEWS = { desktop: { width: 1600, height: 900 }, wide: { width: 2560, height: 1080 }, mobile: { width: 844, height: 390 } };

/** Attend que KAPLAY ait construit la scène. */
const ready = (page) => page.waitForFunction(() => {
  const h = document.querySelector(".octo-hero");
  return h && h.__kaplay && h.__kaplay.getTreeRoot().children.length > 50;
}, null, { timeout: 15000 });

const play = (code) => async (page) => {
  await page.click(".octo-dialog .octo-btn--primary");
  await page.fill(".octo-editor", code);
  await page.click(".octo-panel .octo-btn--primary");
};

const SCENARIOS = {
  hub: { hash: "", wait: 1200 },
  "level1-brief": { hash: "#level1", wait: 1200 },
  "level1-editor": { hash: "#level1", wait: 800, act: async (p) => { await p.click(".octo-dialog .octo-btn--primary"); } },
  "level1-fail": { hash: "#level1", wait: 650, act: play("v_speed = 150") },
  "level1-win": { hash: "#level1", wait: 3300, act: play("v_speed = 200") }
};

const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const names = wanted.length ? wanted : Object.keys(SCENARIOS);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = 0;

for (const [view, size] of Object.entries(VIEWS)) {
  if (view !== "desktop" && wanted.length === 0 && view === "wide") { /* toutes les vues par défaut */ }
  for (const name of names) {
    const sc = SCENARIOS[name];
    if (!sc) { console.error(`scénario inconnu : ${name}`); failed++; continue; }
    if (view !== "desktop" && !["hub", "level1-editor"].includes(name)) continue; // vues annexes : accueil + éditeur
    const page = await (await browser.newContext({ viewport: size, deviceScaleFactor: 1 })).newPage();
    const problems = [];
    page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
    page.on("requestfailed", (r) => problems.push("requête échouée: " + r.url()));
    await page.goto(URL_BASE + sc.hash, { waitUntil: "load" });
    if (sc.hash) await page.evaluate(() => localStorage.clear());
    await ready(page);
    if (sc.act) await sc.act(page);
    await page.waitForTimeout(sc.wait);
    const file = path.join(OUT, `${name}.${view}.png`);
    await page.screenshot({ path: file });
    console.log(`${problems.length ? "✗" : "✓"} ${name} @ ${view} → ${path.relative(ROOT, file)}`);
    problems.forEach((p) => console.log("    " + p));
    failed += problems.length;
    await page.context().close();
  }
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
