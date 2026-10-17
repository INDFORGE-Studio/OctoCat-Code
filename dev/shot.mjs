// Captures du jeu pour vérification visuelle : `npm run build && npm run shot [-- scénario…]`
// Sert le dossier `site/` sous /OctoCat-Code/ (comme GitHub Pages ; une adresse inconnue reçoit 404.html), joue des scénarios dans Chromium
// (Playwright, WebGL logiciel) en bureau, ultra-large et mobile paysage, et écrit des PNG dans dev/shots/.
// Sort en erreur si la page lève une exception. Scénarios : hub, settings, run1, run6, brief, editor, notfound.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };

if (!fs.existsSync(path.join(SITE, "index.html"))) {
  console.error("site/ introuvable : lance d'abord `npm run build`.");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = p.startsWith(BASE) ? path.join(SITE, p.slice(BASE.length)) : "";
  if (f && !f.startsWith(SITE)) { res.writeHead(403).end(); return; }
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!f || !fs.existsSync(f)) { res.writeHead(404, { "content-type": TYPES[".html"] }); fs.createReadStream(path.join(SITE, "404.html")).pipe(res); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const URL_BASE = `http://127.0.0.1:${PORT}${BASE}`;
const VIEWS = { desktop: { width: 1600, height: 900 }, wide: { width: 2560, height: 1080 }, mobile: { width: 844, height: 390 } };
const SKIP = { skipAlways: true }; // le bouton « Passer le trajet » est toujours là : on arrive tout de suite à l'énigme

const SCENARIOS = {
  hub: { path: "", wait: 2500 },
  settings: { path: "", wait: 1500, act: async (p) => { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } },
  run1: { path: "?unlock=all#level1", wait: 3500 },
  run6: { path: "?unlock=all#level6", wait: 3500 },
  brief: { path: "?unlock=all#level2", settings: SKIP, wait: 600, act: async (p) => { await p.click(".octo-skip"); await p.waitForSelector(".octo-dialog.is-open"); await p.waitForTimeout(500); } },
  editor: { path: "?unlock=all#level2", settings: SKIP, wait: 600, act: async (p) => { await p.click(".octo-skip"); await p.waitForSelector(".octo-dialog.is-open"); await p.click(".octo-dialog .octo-btn--primary"); await p.waitForTimeout(900); } },
  notfound: { path: "une/adresse/inconnue/", wait: 2000 }
};

const wanted = process.argv.slice(2).filter((a) => SCENARIOS[a]);
const names = wanted.length ? wanted : Object.keys(SCENARIOS);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [];
for (const [view, size] of Object.entries(VIEWS)) {
  for (const name of names) {
    const sc = SCENARIOS[name];
    const page = await (await browser.newContext({ viewport: size })).newPage();
    page.on("pageerror", (e) => errors.push(`${name}.${view}: ${e.message}`));
    if (sc.settings) { await page.goto(URL_BASE, { waitUntil: "load" }); await page.evaluate((s) => localStorage.setItem("octocat-code:settings:v1", JSON.stringify(s)), sc.settings); }
    await page.goto(URL_BASE + sc.path, { waitUntil: "load" });
    if (sc.settings) await page.reload({ waitUntil: "load" });
    await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
    await page.waitForTimeout(sc.wait);
    try { if (sc.act) await sc.act(page); } catch (e) { errors.push(`${name}.${view}: scénario interrompu (${e.message.split("\n")[0]})`); }
    await page.screenshot({ path: path.join(OUT, `${name}.${view}.png`) });
    await page.close();
  }
}
await browser.close(); server.close();
console.log(`${names.length * Object.keys(VIEWS).length} captures dans dev/shots/ (${names.join(", ")})`);
if (errors.length) { console.error("erreurs :\n" + errors.join("\n")); process.exit(1); }
console.log("aucune erreur de page");
