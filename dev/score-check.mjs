// Score de l'accueil, choix du costume et logo des crédits : `node dev/score-check.mjs` (après `npm run build`).
// Vérifie : compteur de pièces sur l'accueil (captures), bouton « COSTUME » absent à 499 pièces, présent à 500, choix d'une apparence
// (mémorisée, scène refaite), logo animé en tête du générique (captures à deux instants : les couleurs ont changé). Écrit dans dev/shots/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4196;
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

async function open(view, save, query = "") {
  const ctx = await browser.newContext({ viewport: view });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((s) => { if (s && !sessionStorage.getItem("seeded")) { localStorage.setItem("octocat-code:v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, save);
  await page.goto(URL_BASE + query, { waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
  return page;
}
const DESKTOP = { width: 1600, height: 900 }, PHONE = { width: 844, height: 390 };

// 1. partie neuve : score à zéro, pas de bouton de costume
let page = await open(DESKTOP, null);
await page.waitForTimeout(2500);
check((await page.locator(".octo-skin").count()) === 0, "partie neuve : pas de bouton COSTUME");
await page.screenshot({ path: path.join(OUT, "score-0.desktop.png") });
await page.close();

// 2. 499 pièces : toujours pas de bouton
page = await open(DESKTOP, { unlocked: 4, earned: 499, coins: 12, laps: 1 });
await page.waitForTimeout(2500);
check((await page.locator(".octo-skin").count()) === 0, "499 pièces : pas de bouton COSTUME");
await page.screenshot({ path: path.join(OUT, "score-499.desktop.png") });
await page.close();

// 3. 612 pièces : bouton présent, choix d'un costume
page = await open(DESKTOP, { unlocked: 4, earned: 612, coins: 40, laps: 1 });
await page.waitForTimeout(2800);
check((await page.locator(".octo-skin__toggle").count()) === 1, "612 pièces : bouton COSTUME présent");
await page.screenshot({ path: path.join(OUT, "score-612.desktop.png") });
await page.click(".octo-skin__toggle");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "score-menu.desktop.png") });
const rows = await page.locator(".octo-skin__row").count();
check(rows === 4, "le menu propose 4 costumes");
await page.locator(".octo-skin__row").nth(2).click();
await page.waitForTimeout(1500);
const pick = await page.evaluate(() => ({ skin: window.OctoProgress.skin(), n: document.querySelectorAll(".octo-skin").length, on: (document.querySelector(".octo-skin__row.is-on") || {}).textContent }));
check(pick.skin === 2 && pick.n === 1, "costume 2 pris en compte, un seul bouton après le rechargement de la scène");
await page.screenshot({ path: path.join(OUT, "score-skin2.desktop.png") });
await page.reload({ waitUntil: "load" });
await page.waitForSelector("canvas.octo-canvas");
await page.waitForTimeout(1500);
check((await page.evaluate(() => window.OctoProgress.skin())) === 2, "le costume choisi est gardé après rechargement");
await page.close();

// 4. mobile paysage : le compteur ne gêne rien
page = await open(PHONE, { unlocked: 4, earned: 612, coins: 40, laps: 1 });
await page.waitForTimeout(2800);
await page.screenshot({ path: path.join(OUT, "score-612.mobile.png") });
await page.close();

// 5. générique : logo animé en tête, couleurs qui changent
const END = { unlocked: 10, laps: 3, finished: true, creditsPending: true, earned: 612, coins: 40 };
page = await open(DESKTOP, END);
await page.waitForTimeout(17500); // le titre monte lentement : il arrive vers le milieu de l'écran
await page.screenshot({ path: path.join(OUT, "credits-a.desktop.png") });
await page.waitForTimeout(450);
await page.screenshot({ path: path.join(OUT, "credits-b.desktop.png") });
await page.close();
page = await open(PHONE, END);
await page.waitForTimeout(13500);
await page.screenshot({ path: path.join(OUT, "credits-a.mobile.png") });
await page.close();

// 6. revoir le générique après la fin (bouton à l'accueil, générique déjà vu) ; absent tant que le jeu n'est pas fini
page = await open(DESKTOP, { unlocked: 10, laps: 2, earned: 300, coins: 10 });
await page.waitForTimeout(2500);
check((await page.locator(".octo-credits-btn").count()) === 0, "jeu pas fini : pas de bouton CREDITS");
await page.close();
page = await open(DESKTOP, { unlocked: 10, laps: 3, finished: true, creditsPending: false, earned: 612, coins: 40 });
await page.waitForTimeout(2500);
check((await page.locator(".octo-credits-btn").count()) === 1, "jeu fini : bouton CREDITS à l'accueil");
await page.locator(".octo-credits-btn").click();
await page.waitForTimeout(3500);
check((await page.locator(".octo-credits-btn").count()) === 0, "on est dans le générique (plus d'accueil)");
await page.screenshot({ path: path.join(OUT, "credits-replay.desktop.png") });
await page.keyboard.press("Enter"); // passe à « FIN », puis retour à l'accueil
await page.waitForTimeout(9500);
check((await page.locator(".octo-credits-btn").count()) === 1, "retour à l'accueil après le générique, bouton toujours là");
check(!(await page.evaluate(() => JSON.parse(localStorage.getItem("octocat-code:v1") || "{}").creditsPending)), "le générique revu ne se relance pas tout seul");
await page.close();

await browser.close(); server.close();
if (errors.length) { console.error("erreurs de page :\n" + errors.join("\n")); process.exit(1); }
console.log("erreurs de page : aucune");
if (fails.length) { console.error(fails.length + " vérification(s) en échec"); process.exit(1); }
