// Plein écran : ni rechargement ni écran noir, le canvas garde son format. `node dev/fullscreen-check.mjs`
// Un bot (celui des tests) pilote l'OctoCat avec les mêmes entrées que le clavier ; on attend l'ouverture de l'énigme.
// Écrit dev/shots/run-<n>-run.png (en pleine action) et run-<n>-brief.png (arrivée à l'énigme). Échoue sur toute erreur de page.
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 620 } })).newPage();
const errs = [], out = [];
page.on("pageerror", (e) => errs.push(e.message));
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
await page.goto(`http://127.0.0.1:${PORT}${BASE}`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__marker = 1; });
await page.locator(".octo-gear").click();
await page.locator(".octo-set__tab", { hasText: "Affichage" }).click();
await page.locator(".octo-set__btn", { hasText: "Activer" }).click();
await page.waitForTimeout(500);
ok("plein écran actif", await page.evaluate(() => !!document.fullscreenElement));
// le plein écran change le format de la fenêtre (barres du navigateur masquées) : on l'émule
const cdp = await page.context().newCDPSession(page);
const metrics = (h) => cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: h, deviceScaleFactor: 1, mobile: false });
await metrics(720);
await page.waitForTimeout(1500);
ok("pas de rechargement", await page.evaluate(() => window.__marker === 1));
ok("toujours en plein écran", await page.evaluate(() => !!document.fullscreenElement));
const r = await page.evaluate(() => { const c = document.querySelector(".octo-canvas").getBoundingClientRect(); return { w: Math.round(c.width), h: Math.round(c.height), a: document.documentElement.className }; });
const wantA = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".octo-hero")).getPropertyValue("--octo-aspect")));
ok("format du canvas conservé", Math.abs(r.w / r.h - wantA) < 0.02, `${r.w}×${r.h} vs ${wantA}`);
const cursorOf = () => page.evaluate(() => getComputedStyle(document.querySelector("canvas")).cursor);
ok("menu ouvert : souris visible", (await cursorOf()) !== "none");
await page.keyboard.press("Escape"); // ferme le menu
await page.waitForTimeout(300);
ok("plein écran : souris cachée", (await cursorOf()) === "none");
await page.mouse.click(640, 300, { button: "middle" });
await page.waitForTimeout(200);
ok("clic molette : souris visible", (await cursorOf()) !== "none");
await page.mouse.click(640, 300, { button: "middle" });
await page.waitForTimeout(200);
ok("clic molette encore : souris cachée", (await cursorOf()) === "none");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
ok("menu rouvert : souris visible", (await cursorOf()) !== "none");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "_fs.png") });
await page.evaluate(() => document.exitFullscreen());
await metrics(620);
await page.waitForTimeout(1800);
ok("retour à la fenêtre sans rechargement", await page.evaluate(() => window.__marker === 1 && !document.fullscreenElement));

// fenêtre d'explication (briefing) en plein écran : souris visible dessus, pas de menu du navigateur au clic droit
await page.evaluate(() => localStorage.setItem("octocat-code:settings:v1", JSON.stringify({ skipAlways: true })));
await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level1`, { waitUntil: "load" });
await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
await page.waitForTimeout(1200);
await page.locator(".octo-gear").click();
await page.locator(".octo-set__tab", { hasText: "Affichage" }).click();
await page.locator(".octo-set__btn", { hasText: "Activer" }).click();
await page.waitForTimeout(500);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.locator(".octo-skip").click();
await page.waitForSelector(".octo-dialog.is-open", { timeout: 20000 });
await page.waitForTimeout(400);
ok("briefing : plein écran actif", await page.evaluate(() => !!document.fullscreenElement));
ok("briefing : souris visible sur la fenêtre", await page.evaluate(() => getComputedStyle(document.querySelector(".octo-dialog__card")).cursor !== "none" && getComputedStyle(document.querySelector(".octo-dialog")).cursor !== "none"));
ok("briefing : bouton cliquable avec souris visible", await page.evaluate(() => getComputedStyle(document.querySelector(".octo-dialog .octo-btn")).cursor !== "none"));
ok("jeu : souris cachée sur le décor", await page.evaluate(() => getComputedStyle(document.querySelector("canvas")).cursor === "none"));
const menuBlocked = await page.evaluate(() => ["octo-dialog__card", "octo-canvas"].map((c) => { const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 }); document.querySelector("." + c).dispatchEvent(e); return e.defaultPrevented; }));
ok("clic droit : menu du navigateur bloqué en plein écran", menuBlocked.every(Boolean), JSON.stringify(menuBlocked));
await page.screenshot({ path: path.join(OUT, "_fs-brief.png") });
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
await browser.close(); server.close();
