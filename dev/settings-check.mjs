// Vérifie le menu réglages ⚙ dans le vrai jeu : `node dev/settings-check.mjs` (touches, pause, aide, reset, sauvegarde).
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [], out = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
const ok = (name, cond, extra) => { out.push(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`); if (!cond) process.exitCode = 1; };
const shot = (n) => page.screenshot({ path: path.join(OUT, `settings-${n}.png`) });
const input = () => page.evaluate(() => window.OctoPlay.current.input.get());
const x = () => page.evaluate(() => Math.round(window.OctoPlay.current.sim.player.x));

await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level4`, { waitUntil: "load" });
await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
await page.waitForTimeout(1500);
ok("bouton ⚙ présent", (await page.locator(".octo-gear").count()) === 1);

// aide des touches (bas de l'écran) : suit les réglages
await page.screenshot({ path: path.join(OUT, "settings-hint-before.png") });

// ouverture par Échap, pause
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
ok("Échap ouvre le menu", await page.locator(".octo-set.is-open").count() === 1);
const x0 = await x();
await page.keyboard.down("ArrowRight"); await page.waitForTimeout(500); await page.keyboard.up("ArrowRight");
ok("la partie est en pause", (await x()) === x0, `x ${x0} → ${await x()}`);
await shot("keys");

// lier la touche F à « Frapper » (retirée de rien) puis la reprendre pour « Sauter »
const row = (label) => page.locator(".octo-set__row--keys", { hasText: label }).first();
await row("Frapper").locator(".octo-set__add").click();
await page.keyboard.press("KeyF");
await page.waitForTimeout(200);
ok("F liée à Frapper", (await page.evaluate(() => window.OctoSettings.lookup("KeyF"))) === "attack");
await row("Sauter").first().locator(".octo-set__add").click();
await page.keyboard.press("KeyF");
await page.waitForTimeout(200);
ok("F reprise par Sauter", (await page.evaluate(() => window.OctoSettings.lookup("KeyF"))) === "jump");
ok("message de reprise", /retirée de/.test(await page.locator(".octo-set__msg").innerText()), await page.locator(".octo-set__msg").innerText());
// bouton de souris : clic droit lié à « Sauter » (retiré du shuriken)
await row("Sauter").locator(".octo-set__add").click();
await page.mouse.click(640, 130, { button: "right" });
await page.waitForTimeout(200);
ok("clic droit lié à Sauter", (await page.evaluate(() => window.OctoSettings.lookup("Mouse2"))) === "jump");
await shot("keys-after");
for (const t of ["Son", "Affichage", "Jeu"]) { await page.locator(".octo-set__tab", { hasText: t }).click(); await page.waitForTimeout(200); await shot(t.toLowerCase()); }

// fermeture, puis les nouvelles touches pilotent le jeu
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
ok("Échap ferme le menu", await page.locator(".octo-set.is-open").count() === 0);
await page.keyboard.down("KeyF");
ok("F = saut", (await input()).jump === true);
await page.keyboard.up("KeyF");
await page.mouse.move(640, 300); await page.mouse.down({ button: "right" });
ok("clic droit = saut", (await input()).jump === true);
await page.mouse.up({ button: "right" });
ok("clic gauche = frapper (inchangé)", await (async () => { await page.mouse.down({ button: "left" }); const a = (await input()).attack; await page.mouse.up({ button: "left" }); return a; })());
await page.keyboard.down("KeyX");
ok("X = frapper (inchangé)", (await input()).attack === true);
await page.keyboard.up("KeyX");
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(OUT, "settings-hint-after.png") });

// reset de la progression : confirmation en deux temps, rechargement au niveau 1
await page.evaluate(() => { localStorage.setItem("octocat-code:v1", JSON.stringify({ version: 1, unlocked: 7, completed: { 6: { at: 1, flawless: true } }, language: null, achievements: {}, fails: {} })); });
await page.locator(".octo-gear").click();
await page.locator(".octo-set__tab", { hasText: "Jeu" }).click();
await page.locator(".octo-set__btn--danger", { hasText: "Recommencer" }).click();
await shot("confirm");
await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.locator(".octo-set__btn--danger", { hasText: "Oui" }).click()]);
await page.waitForTimeout(800);
const prog = await page.evaluate(() => JSON.parse(localStorage.getItem("octocat-code:v1") || "{}"));
ok("progression remise à zéro", prog.unlocked === 1 && Object.keys(prog.completed || {}).length === 0, JSON.stringify(prog).slice(0, 80));
const set = await page.evaluate(() => JSON.parse(localStorage.getItem("octocat-code:settings:v1") || "{}"));
ok("réglages conservés après reset du jeu", set.keys && set.keys.jump.includes("KeyF"));
ok("retour à l'accueil", !/level\d/.test(await page.evaluate(() => location.hash)));
await shot("hub");

console.log(out.join("\n"));
console.log("erreurs page :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
