// La grange de Laita : `node dev/grange-check.mjs` (après `npm run build`). Joue le vrai jeu : clic sur La Grange de l accueil (et bouton GRANGE),
// ouverture des 3 cadeaux (clic, doigt, clavier), mots de tonton, sapin allumé, mémoire des cadeaux, retour à l accueil, console propre. Captures grange-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4198;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = p.startsWith(BASE) ? path.join(SITE, p.slice(BASE.length)) : "";
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!f || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const URL_BASE = `http://127.0.0.1:${PORT}${BASE}`;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [], fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log((ok ? "ok   " : "ECHEC ") + msg); };

const DESKTOP = { width: 1600, height: 900 }, PHONE = { width: 844, height: 390 };
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `grange-${n}.png`) });
const wait = (p, ms) => p.waitForTimeout(ms);
const pts = (p) => p.evaluate(() => window.OctoGrange.points && window.OctoGrange.points());
const stored = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("octocat-code:grange:v1") || "null"));
const inScene = (p) => p.evaluate(() => document.documentElement.getAttribute("data-octo-scene"));

async function run(label, opts) {
  const touch = !!opts.hasTouch;
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(label + ": " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(label + " console: " + m.text()); });
  await page.goto(URL_BASE, { waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
  await wait(page, 2200);
  await shot(page, label + "-1-hub");
  // 1. clic (ou doigt) sur la grange de l'accueil
  const b = await page.evaluate(() => window.OctoGrange.housePoint());
  if (touch) await page.touchscreen.tap(b.x, b.y); else await page.mouse.click(b.x, b.y);
  await wait(page, 1500);
  check((await inScene(page)) === "grange", label + " : un clic sur La Grange ouvre la grange");
  let p = await pts(page);
  check(!!p && p.gifts.length === 3 && !p.card, label + " : 3 cadeaux, aucune carte ouverte");
  await shot(page, label + "-2-inside");
  // 2. ouvrir les 3 cadeaux (tapote / clique, l'OctoCat marche jusqu'à chacun)
  for (let n = 0; n < 3; n++) {
    p = await pts(page);
    const g = p.gifts[n];
    if (touch) await page.touchscreen.tap(g.x, g.y); else await page.mouse.click(g.x, g.y);
    let ok = false;
    for (let t = 0; t < 30 && !ok; t++) { await wait(page, 200); ok = (await pts(page)).card; }
    check(ok, label + " : le cadeau " + g.id + " s'ouvre et montre le mot de tonton");
    if (n === 0 || n === 2) await shot(page, label + "-3-card-" + g.id);
    await wait(page, 450);
    await page.keyboard.press("Space"); // ferme la carte
    await wait(page, 400);
    check(!(await pts(page)).card, label + " : la carte se ferme (" + g.id + ")");
  }
  const s = await stored(page);
  check(!!s && s.opened.liam && s.opened.elias && s.opened.izia, label + " : les 3 cadeaux sont mémorisés");
  // 3. le sapin s'allume, le mot final apparaît
  let fin = false;
  for (let t = 0; t < 60 && !fin; t++) { await wait(page, 200); fin = (await pts(page)).card; }
  check(fin, label + " : le mot final de Noël apparaît quand les 3 cadeaux sont ouverts");
  await shot(page, label + "-4-finale");
  await wait(page, 600);
  await page.keyboard.press("Enter");
  await wait(page, 500);
  p = await pts(page);
  check(p.lit === p.lights, label + " : le sapin est allumé");
  await shot(page, label + "-5-tree");
  // 4. retour à l'accueil par le bouton
  await page.getByRole("button", { name: /retourner/i }).click();
  await wait(page, 1500);
  check((await inScene(page)) === "hub", label + " : le bouton RETOUR ramène à l'accueil");
  // 5. le bouton GRANGE de l'accueil, et la mémoire après rechargement
  await page.getByRole("button", { name: /grange/i }).click();
  await wait(page, 1200);
  check((await inScene(page)) === "grange", label + " : le bouton GRANGE ouvre la grange");
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
  await wait(page, 2000);
  await page.getByRole("button", { name: /grange/i }).click();
  await wait(page, 1200);
  p = await pts(page);
  check(p.gifts.every((g) => g.open) && p.lit === p.lights, label + " : après rechargement, cadeaux ouverts et sapin allumé");
  await shot(page, label + "-6-again");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, label + " : pas de défilement horizontal");
  await ctx.close();
}
// PC, Mac (grand écran), écran ultra-large, Android (paysage), iPhone (paysage), iPad (paysage) : mêmes contrôles partout
await run("desktop", { viewport: DESKTOP });
await run("mac", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await run("ultrawide", { viewport: { width: 2560, height: 1080 } });
await run("phone", { viewport: PHONE, hasTouch: true, isMobile: true });
await run("android", { ...devices["Pixel 7 landscape"] });
await run("iphone", { ...devices["iPhone 14 landscape"] });
await run("ipad", { ...devices["iPad (gen 7) landscape"] });
check(errors.length === 0, "console propre" + (errors.length ? " : " + errors.slice(0, 3).join(" | ") : ""));
await browser.close(); server.close();
if (fails.length) { console.log("\n" + fails.length + " échec(s)"); process.exit(1); }
console.log("\ngrange : tout est bon");
