// Passe « appareils » : le vrai jeu (site/ construit) dans Chromium émulant téléphones (Android, iPhone), tablettes (iPad) et bureau.
// `npm run build && node dev/devices-check.mjs [appareil…]`. Vérifie pour chaque appareil : aucune erreur de page, aucun défilement horizontal,
// le canvas tient dans la fenêtre, les boutons tactiles apparaissent sur écran tactile, le son se débloque au toucher (geste relâché),
// l'invite « tourne ton appareil » (portrait tactile) et son bouton « Jouer quand même », et que le clavier virtuel (fenêtre qui rétrécit
// pendant la frappe) ne recharge PAS la page (le code tapé serait perdu). Captures dans dev/shots/devices-*.png.
// Limite : c'est le moteur Chromium (pas le vrai Safari ni un vrai téléphone) ; l'encoche et le commutateur silencieux d'un iPhone ne s'émulent pas.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4174;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
if (!fs.existsSync(path.join(SITE, "index.html"))) { console.error("site/ introuvable : lance d'abord `npm run build`."); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = p.startsWith(BASE) ? path.join(SITE, p.slice(BASE.length)) : "";
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!f || !f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404, { "content-type": TYPES[".html"] }); fs.createReadStream(path.join(SITE, "404.html")).pipe(res); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const URL_BASE = `http://127.0.0.1:${PORT}${BASE}`;

const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const UA_IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"; // iPadOS se fait passer pour un Mac
const touch = (w, h, dpr, ua) => ({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: ua });
const DEVICES = {
  "android-paysage": { ...touch(915, 412, 2.6, UA_ANDROID), tactile: true },
  "android-petit": { ...touch(640, 360, 2, UA_ANDROID), tactile: true },
  "iphone-paysage": { ...touch(844, 390, 3, UA_IPHONE), tactile: true },
  "iphone-portrait": { ...touch(390, 844, 3, UA_IPHONE), tactile: true, portrait: true },
  "ipad-paysage": { ...touch(1180, 820, 2, UA_IPAD), tactile: true },
  "ipad-portrait": { ...touch(820, 1180, 2, UA_IPAD), tactile: true, portrait: true },
  "mac-bureau": { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, tactile: false },
  "pc-bureau": { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, tactile: false }
};
const wanted = process.argv.slice(2).filter((a) => DEVICES[a]);
const names = wanted.length ? wanted : Object.keys(DEVICES);
const SKIP = { skipAlways: true };

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const bad = [];
const ok = (dev, what, cond, extra) => { if (!cond) bad.push(`${dev} : ${what}${extra ? " (" + extra + ")" : ""}`); console.log(`${cond ? "✓" : "✗"} ${dev} : ${what}${extra && cond ? " (" + extra + ")" : ""}`); };

for (const name of names) {
  const dev = DEVICES[name];
  const { tactile, portrait, ...opts } = dev;
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  // 1. accueil : pas d'erreur, pas de défilement horizontal, le canvas tient dans la fenêtre
  await page.goto(URL_BASE, { waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
  await page.waitForTimeout(1800);
  const geo = await page.evaluate(() => {
    const c = document.querySelector("canvas.octo-canvas").getBoundingClientRect(), d = document.documentElement;
    return { cw: Math.round(c.width), ch: Math.round(c.height), cl: Math.round(c.left), ct: Math.round(c.top), iw: innerWidth, ih: innerHeight, sw: d.scrollWidth, sh: d.scrollHeight };
  });
  ok(name, "aucun défilement horizontal", geo.sw <= geo.iw + 1, `${geo.sw} / ${geo.iw}`);
  ok(name, "le canvas tient dans la fenêtre", geo.cl >= -1 && geo.ct >= -1 && geo.cl + geo.cw <= geo.iw + 1 && geo.ct + geo.ch <= geo.ih + 1, `${geo.cw}x${geo.ch} dans ${geo.iw}x${geo.ih}`);
  const rot = await page.evaluate(() => { const r = document.querySelector(".octo-rotate"); return !!r && getComputedStyle(r).display !== "none"; });
  ok(name, portrait ? "invite « tourne ton appareil » affichée" : "pas d'invite de rotation", rot === !!portrait);
  await page.screenshot({ path: path.join(OUT, `devices-${name}-hub.png`) });
  if (portrait) {
    await page.click(".octo-rotate__stay");
    const gone = await page.evaluate(() => getComputedStyle(document.querySelector(".octo-rotate")).display === "none");
    ok(name, "« Jouer quand même » ferme l'invite", gone);
    await ctx.close();
    ok(name, "console propre", errors.length === 0, errors.slice(0, 2).join(" | "));
    continue;
  }

  // 2. le son se débloque au premier toucher / clic (geste relâché)
  if (tactile) await page.touchscreen.tap(Math.round(geo.iw / 2), Math.round(geo.ih / 2)); else await page.mouse.click(Math.round(geo.iw / 2), Math.round(geo.ih / 2));
  await page.waitForTimeout(900);
  const audio = await page.evaluate(() => window.OctoMusic && window.OctoMusic.state().ctx);
  ok(name, "le son démarre au premier geste", audio === "running", String(audio));

  // 3. trajet : les boutons tactiles sont là sur écran tactile, absents au bureau
  await page.goto(URL_BASE + "?unlock=all#level1", { waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
  await page.waitForTimeout(3000);
  const pad = await page.evaluate(() => { const p = document.querySelector(".octo-pad"); return !!p && p.classList.contains("is-on") && getComputedStyle(p).display !== "none"; });
  ok(name, tactile ? "boutons tactiles visibles pendant le trajet" : "pas de boutons tactiles au bureau", pad === tactile);
  if (tactile) {
    const btn = await page.evaluate(() => [...document.querySelectorAll(".octo-pad__btn")].map((b) => { const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
    ok(name, "boutons assez grands (≥ 44 px) et dans la fenêtre", btn.length > 0 && btn.every((b) => b.w >= 44 && b.h >= 44 && b.l >= 0 && b.r <= geo.iw && b.t >= 0 && b.b <= geo.ih), `${btn.length} boutons`);
  }
  await page.screenshot({ path: path.join(OUT, `devices-${name}-run.png`) });

  // 3 bis. arène à part (le serpent, monde 1) : mêmes boutons, jauge de Laita au-dessus d'eux
  if (tactile) {
    await page.goto(URL_BASE + "?world=1&unlock=all#level2", { waitUntil: "load" });
    await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, `devices-${name}-arcade.png`) });
  }

  // 4. éditeur : le clavier virtuel (fenêtre plus basse) ne doit pas recharger la page
  await page.evaluate((s) => localStorage.setItem("octocat-code:settings:v1", JSON.stringify(s)), SKIP);
  await page.goto(URL_BASE + "?unlock=all#level2", { waitUntil: "load" });
  await page.reload({ waitUntil: "load" }); // (changement de # seul : la page ne se recharge pas, or les réglages ne sont lus qu'au chargement)
  await page.waitForSelector(".octo-skip", { timeout: 20000 });
  await page.click(".octo-skip");
  await page.waitForSelector(".octo-dialog.is-open");
  await page.click(".octo-dialog .octo-btn--primary");
  await page.waitForSelector("textarea.octo-editor", { state: "visible" });
  await page.evaluate(() => { window.__noReload = 1; });
  await page.focus("textarea.octo-editor");
  await page.keyboard.type("x");
  if (tactile) {
    await page.setViewportSize({ width: geo.iw, height: Math.round(geo.ih * 0.55) }); // le clavier mange près de la moitié de l'écran
    await page.waitForTimeout(1600);
    ok(name, "le clavier virtuel ne recharge pas la page", await page.evaluate(() => window.__noReload === 1));
    await page.setViewportSize({ width: geo.iw, height: geo.ih });
    await page.waitForTimeout(1600);
    ok(name, "la page reste intacte quand le clavier se ferme", await page.evaluate(() => window.__noReload === 1));
  }
  await page.screenshot({ path: path.join(OUT, `devices-${name}-editor.png`) });
  ok(name, "console propre", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close(); server.close();
if (bad.length) { console.error("\nÀ corriger :\n" + bad.join("\n")); process.exit(1); }
console.log("\nTous les appareils sont OK.");
