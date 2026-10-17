// Tours, langages, apparences, générique : `node dev/laps-check.mjs` — captures dev/shots/laps-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4182;
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
const URL0 = `http://127.0.0.1:${PORT}${BASE}`;
const shot = (n) => page.screenshot({ path: path.join(OUT, `laps-${n}.png`) });
const scene = () => page.evaluate(() => document.documentElement.getAttribute("data-octo-scene"));
const sceneIs = (name) => page.waitForFunction((n) => document.documentElement.getAttribute("data-octo-scene") === n, name, { timeout: 30000 });

/** Charge le jeu avec une progression donnée (fusionnée avec les valeurs par défaut). */
async function boot(state, hash = "", settings = { skipAlways: true }, expect = hash ? hash.slice(1) : "hub") {
  await page.goto("about:blank");
  await page.goto(URL0 + "?x=1", { waitUntil: "load" });
  await page.evaluate(([s, st]) => {
    localStorage.clear();
    localStorage.setItem("octocat-code:v1", JSON.stringify(Object.assign({ version: 1, unlocked: 1, completed: {}, language: null, achievements: {}, fails: {}, coins: 40, banked: {}, paid: {} }, s)));
    localStorage.setItem("octocat-code:settings:v1", JSON.stringify(st));
  }, [state, settings]);
  await page.goto("about:blank"); // (le jeu efface ?x=1 de l adresse : sans cela, ce serait une simple navigation de #ancre)
  await page.goto(URL0 + hash, { waitUntil: "load" });
  await sceneIs(expect);
  await page.waitForTimeout(900);
}
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { at: 1, flawless: true }]));

// 1. les 4 apparences (?skin=N) sur l'accueil
for (const n of [0, 1, 2, 3]) {
  await page.goto("about:blank");
  await page.goto(`${URL0}?skin=${n}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-octo-scene"), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot("skin" + n);
}
ok("4 apparences sans erreur", errs.length === 0, errs.join(" | "));

// 2. fin d'un tour : fenêtre de choix du langage, puis énigmes dans ce langage
await boot({ laps: 1, pendingLap: true, lapLang: "Python", completed: {}, unlocked: 1 });
ok("tour 1 fini : la fenêtre de choix du langage s'ouvre", (await page.locator(".octo-lapup.is-open .octo-lang").count()) === 3);
await shot("lapup");
await page.locator(".octo-lang", { hasText: "JavaScript" }).click();
await page.waitForTimeout(500);
ok("choix du langage : fenêtre fermée, langage mémorisé", (await page.locator(".octo-lapup").count()) === 0 && (await page.evaluate(() => window.OctoProgress.lang() === "JavaScript" && !window.OctoProgress.pendingLap())));
await page.reload({ waitUntil: "load" });
await sceneIs("hub");
ok("après rechargement : pas de nouvelle fenêtre", (await page.locator(".octo-lapup").count()) === 0);
await page.goto("about:blank");
await page.goto(URL0 + "#level1", { waitUntil: "load" });
await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
await page.locator(".octo-skip").click();
await page.waitForSelector(".octo-dialog.is-open");
ok("briefing : l'exemple JavaScript est le premier onglet", (await page.locator(".octo-tab.is-on").innerText()) === "JavaScript");
await page.locator(".octo-dialog .octo-btn--primary").click();
const starter = await page.locator(".octo-editor").inputValue();
ok("le code de départ est en JavaScript", /let v_speed = \?\?\?;/.test(starter), starter.split("\n").pop());
await page.locator(".octo-editor").fill(await page.evaluate(() => window.OctoLangs.solve(window.gameEngine.levels[1], "JavaScript")));
await page.locator(".octo-btn--primary", { hasText: "Compiler" }).click();
await page.waitForTimeout(500);
ok("la réponse JavaScript est acceptée", await page.evaluate(() => window.OctoProgress.isCompleted(1)));
await shot("js-level1");

// 3. dernier niveau du 1er tour -> retour à l'accueil avec la fenêtre (tour terminé, nouvelle apparence)
async function solveLevel10(lang) {
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.locator(".octo-skip").click();
  await page.waitForSelector(".octo-dialog.is-open");
  await page.locator(".octo-dialog .octo-btn--primary").click();
  const code = await page.evaluate((l) => window.OctoLangs.solve(window.gameEngine.levels[10], l), lang);
  await page.locator(".octo-editor").fill(code);
  await page.locator(".octo-btn--primary", { hasText: "Compiler" }).click();
}
await boot({ laps: 0, unlocked: 10, completed: done(9) }, "#level10");
await solveLevel10("Python");
await page.waitForFunction(() => window.OctoProgress.laps() === 1, null, { timeout: 15000 });
await sceneIs("hub");
await page.waitForTimeout(800);
ok("niveau 10 fini : tour 1 compté, niveaux reverrouillés, fenêtre du nouveau tour", await page.evaluate(() => { const s = window.OctoProgress.get(); return s.laps === 1 && s.pendingLap && Object.keys(s.completed).length === 0 && s.unlocked === 1; }) && (await page.locator(".octo-lapup.is-open").count()) === 1);
await shot("lapup-after-level10");

// 4. 3e tour fini -> générique
await boot({ laps: 2, lapLang: "Pseudo-code", unlocked: 10, completed: done(9) }, "#level10");
await solveLevel10("Pseudo-code");
await sceneIs("credits");
ok("3e tour fini : le générique se lance", (await scene()) === "credits" && (await page.evaluate(() => window.OctoProgress.get().creditsPending && window.OctoProgress.laps() === 3)));
await page.waitForTimeout(4000); await shot("credits-1");
await page.waitForTimeout(9000); await shot("credits-2");
await page.keyboard.press("Enter");
await page.waitForTimeout(2500); await shot("credits-fin");
await sceneIs("hub");
await page.waitForTimeout(1200);
ok("après « FIN » : retour à l'accueil, générique terminé (une seule fois)", await page.evaluate(() => !window.OctoProgress.creditsPending() && window.OctoProgress.get().finished));
await shot("hub-final");

// 5. page fermée pendant le générique : il reprend au rechargement
await boot({ laps: 3, finished: true, creditsPending: true, unlocked: 10, completed: done(10) }, "", { skipAlways: true }, "credits");
ok("générique non vu : il reprend au rechargement", (await scene()) === "credits");

console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
