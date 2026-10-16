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

const QUALITY = process.env.SHOT_QUALITY ? `?quality=${process.env.SHOT_QUALITY}` : "";
const SCENARIOS = {
  hub: { hash: "", wait: 1200 },
  "level1-brief": { hash: "#level1", wait: 1200 },
  "level1-editor": { hash: "#level1", wait: 800, act: async (p) => { await p.click(".octo-dialog .octo-btn--primary"); } },
  "level1-fail": { hash: "#level1", wait: 650, act: play("v_speed = 150") },
  "level1-win": { hash: "#level1", wait: 3300, act: play("v_speed = 200") },
  "level2-brief": { hash: "#level2", unlock: true, wait: 1200 },
  "level2-editor": { hash: "#level2", unlock: true, wait: 800, act: async (p) => { await p.click(".octo-dialog .octo-btn--primary"); } },
  "level2-fail": { hash: "#level2", unlock: true, wait: 1100, act: play('v_pont = "solide"') },
  "level3-brief": { hash: "#level3", unlock: 3, wait: 1200 },
  "level3-editor": { hash: "#level3", unlock: 3, wait: 800, act: async (p) => { await p.click(".octo-dialog .octo-btn--primary"); } },
  "level3-fail": { hash: "#level3", unlock: 3, wait: 1500, act: play(["v_pv = 5", "while v_pv > 2:", "    v_pv = v_pv - 1"].join("\n")) },
  "level3-win": { hash: "#level3", unlock: 3, wait: 1700, act: play(["v_pv = 5", "while v_pv > 0:", "    v_pv = v_pv - 1"].join("\n")) },
  "level3-end": { hash: "#level3", unlock: 3, wait: 4500, act: play(["v_pv = 5", "for i in range(5):", "    v_pv = v_pv - 1"].join("\n")) },
  "level2-win": { hash: "#level2", unlock: true, wait: 3000, act: play(['v_pont = "fragile"', "if v_energie >= 50:", '    v_pont = "solide"'].join("\n")) }
};

const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const names = (wanted.length ? wanted : Object.keys(SCENARIOS)).filter((n) => n !== "audio" && n !== "pwa" && n !== "audio-ui" && n !== "audio-battle");
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
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
    await page.goto(URL_BASE + QUALITY + sc.hash, { waitUntil: "load" });
    if (sc.hash) await page.evaluate(() => localStorage.clear());
    if (sc.unlock) { await page.evaluate((n) => { for (let i = 1; i < n; i++) window.OctoProgress.complete(i); }, sc.unlock === true ? 2 : sc.unlock); await page.reload({ waitUntil: "load" }); }
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

// Audio : la musique démarre au premier geste, produit du son, et devient plus rapide quand le danger monte.
if (!wanted.length || wanted.includes("audio")) {
  const page = await (await browser.newContext({ viewport: VIEWS.desktop })).newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  await page.goto(URL_BASE, { waitUntil: "load" });
  await ready(page);
  await page.keyboard.press("Shift"); // geste utilisateur (sans entrer dans le portail) : déverrouille l'audio
  await page.waitForTimeout(2500);
  const calm = await page.evaluate(() => ({ s: window.OctoMusic.state(), rms: window.OctoMusic.level() }));
  await page.evaluate(() => window.OctoMusic.setMood(0.9));
  await page.waitForTimeout(5000);
  const alert = await page.evaluate(() => window.OctoMusic.state());
  await page.evaluate(() => window.OctoMusic.setBattle(true));
  await page.waitForTimeout(4000);
  const fightS = await page.evaluate(() => ({ s: window.OctoMusic.state(), rms: window.OctoMusic.level() }));
  const title = await page.title();
  if (title !== "OCTOCAT-CODE") problems.push(`titre d'onglet : ${title}`);
  const ok = calm.s.running && calm.s.ctx === "running" && calm.rms > 0.0005 && alert.bpm > calm.s.bpm + 6 && alert.bpm < calm.s.bpm + 20 && fightS.s.bpm > calm.s.bpm + 35 && fightS.rms > 0.0005;
  console.log(`${ok && !problems.length ? "✓" : "✗"} audio : calme ${calm.s.bpm.toFixed(0)} BPM (rms ${calm.rms.toFixed(4)}) → alerte ${alert.bpm.toFixed(0)} BPM → combat ${fightS.s.bpm.toFixed(0)} BPM (rms ${fightS.rms.toFixed(4)})`);
  problems.forEach((m) => console.log("    " + m));
  failed += ok && !problems.length ? 0 : 1;
}

// Commandes du son : le premier clic sur ♪ lance la musique (reste « ON »), le curseur règle le volume, le clic suivant coupe.
if (!wanted.length || wanted.includes("audio-ui")) {
  const page = await (await browser.newContext({ viewport: VIEWS.desktop })).newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  await page.goto(URL_BASE, { waitUntil: "load" });
  await ready(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await ready(page);
  const label = () => page.textContent(".octo-mute");
  const first = await label();
  await page.click(".octo-mute");
  await page.waitForTimeout(600);
  const afterFirst = { text: await label(), running: await page.evaluate(() => window.OctoMusic.state().running) };
  await page.fill(".octo-vol", "30");
  const vol = await page.evaluate(() => window.OctoMusic.getVolume());
  await page.screenshot({ path: path.join(OUT, "audio-ui.png"), clip: { x: 1100, y: 0, width: 500, height: 70 } });
  await page.click(".octo-mute");
  const afterSecond = { text: await label(), running: await page.evaluate(() => window.OctoMusic.state().running) };
  const ok = first.includes("ON") && afterFirst.text.includes("ON") && afterFirst.running && Math.abs(vol - 0.3) < 0.01 && afterSecond.text.includes("OFF") && !afterSecond.running && !problems.length;
  console.log(`${ok ? "✓" : "✗"} audio-ui : ${first} → clic → ${afterFirst.text} (musique ${afterFirst.running ? "lancée" : "arrêtée"}), volume ${vol} → clic → ${afterSecond.text}`);
  problems.forEach((m) => console.log("    " + m));
  failed += ok ? 0 : 1;
}

// Musique de combat : seul le niveau 3 (combat: true) passe en mode épique ; le menu et le niveau 1 restent joyeux.
if (!wanted.length || wanted.includes("audio-battle")) {
  const page = await (await browser.newContext({ viewport: VIEWS.desktop })).newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  await page.goto(URL_BASE, { waitUntil: "load" });
  await ready(page);
  await page.evaluate(() => { localStorage.clear(); for (let i = 1; i < 3; i++) window.OctoProgress.complete(i); });
  await page.reload({ waitUntil: "load" });
  await ready(page);
  await page.keyboard.press("Shift");
  await page.waitForTimeout(600);
  const hub = await page.evaluate(() => window.OctoMusic.state().battle);
  await page.goto(URL_BASE + "#level3", { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await ready(page);
  await page.keyboard.press("Shift");
  await page.waitForTimeout(1500);
  const boss = await page.evaluate(() => ({ battle: window.OctoMusic.state().battle, bpm: window.OctoMusic.state().bpm }));
  const ok = hub === false && boss.battle === true && boss.bpm > 120 && !problems.length;
  console.log(`${ok ? "✓" : "✗"} audio-battle : menu ${hub ? "combat" : "calme"} → niveau 3 ${boss.battle ? "combat" : "calme"} (${boss.bpm.toFixed(0)} BPM)`);
  problems.forEach((m) => console.log("    " + m));
  failed += ok ? 0 : 1;
}

// PWA : après une première visite, le jeu se recharge entièrement hors ligne (cache du service worker).
if (!wanted.length || wanted.includes("pwa")) {
  const context = await browser.newContext({ viewport: VIEWS.desktop });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  await page.goto(URL_BASE + "?pwa=on", { waitUntil: "load" });
  await ready(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForTimeout(1500); // le temps que le précache se termine
  const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).length);
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await ready(page);
  const ok = cached > 10 && !problems.length;
  console.log(`${ok ? "✓" : "✗"} pwa : ${cached} fichiers en cache, rechargement hors ligne réussi`);
  problems.forEach((m) => console.log("    " + m));
  failed += ok ? 0 : 1;
  await context.close();
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
