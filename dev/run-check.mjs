// Vérifie la phase « trajet » de bout en bout dans le vrai jeu : `node dev/run-check.mjs [niveaux…]`
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

// Solutions de référence (une par niveau) : le test résout l'énigme après le trajet, après un premier essai raté.
const J = (...l) => l.join("\n");
const SOLUTIONS = {
  1: "v_speed = 200",
  2: J('v_debut = "octo"', 'v_mot = v_debut + "cat"'),
  3: "v_charge = v_caisses * v_poids_caisse",
  4: "v_porte_ouverte = v_cle and not v_garde",
  5: J('v_pont = "fragile"', "if v_energie >= 50:", '    v_pont = "solide"'),
  6: J('v_titre = "pauvre"', "if v_or >= 100:", '    v_titre = "riche"', "elif v_or >= 50:", '    v_titre = "aise"'),
  7: J("v_epees = 0", "for i in range(v_commande):", "    v_epees = v_epees + 1"),
  8: J("v_total = 0", "for i in range(1, v_marches + 1):", "    v_total = v_total + i"),
  9: J("v_pairs = 0", "for i in range(1, v_n + 1):", "    if i % 2 == 0:", "        v_pairs = v_pairs + 1"),
  10: J("v_pv = 5", "while v_pv > 0:", "    v_pv = v_pv - 1")
};
const WRONG = "v_oups = 0";

const ids = process.argv.slice(2).map(Number).filter(Boolean);
const levels = ids.length ? ids : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MOBILE = process.env.VIEW === "mobile"; // VIEW=mobile : téléphone en paysage, tactile
const size = MOBILE ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const ctxOpts = MOBILE ? { viewport: size, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: size };
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = 0;

for (const id of levels) {
  const page = await (await browser.newContext(ctxOpts)).newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}${BASE}?unlock=all#level${id}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `run-${id}${MOBILE ? "-m" : ""}-intro.png`) });
  await page.evaluate(() => {
    const c = window.OctoPlay.current, S = window.OctoSim;
    const bot = (c.sim.mode === "brawl" ? S.brawlBot : S.platformBot)(c.sim);
    c.input.get = () => bot(1 / 60);
  });
  if (MOBILE) {
    const pad = await page.evaluate(() => { const p = document.querySelector(".octo-pad"); return !!p && getComputedStyle(p).display !== "none" && p.querySelectorAll("button").length >= 4; });
    if (!pad) problems.push("boutons tactiles absents");
  }
  const t0 = Date.now();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(OUT, `run-${id}${MOBILE ? "-m" : ""}-run.png`) });
  let ok = false;
  try { await page.waitForSelector(".octo-dialog.is-open", { timeout: 150000 }); ok = true; } catch { /* trop long */ }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (ok) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUT, `run-${id}${MOBILE ? "-m" : ""}-brief.png`) }); }
  let solved = false, next = "";
  if (ok) {
    // énigme : un essai raté (le Glitch riposte), puis la solution (le portail s'ouvre, le niveau suivant démarre)
    await page.click(".octo-dialog .octo-btn--primary");
    await page.fill(".octo-editor", WRONG);
    await page.click(".octo-panel .octo-btn--primary");
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `run-${id}${MOBILE ? "-m" : ""}-fail.png`) });
    await page.waitForFunction(() => !document.querySelector(".octo-panel .octo-btn--primary").disabled, null, { timeout: 15000 });
    await page.fill(".octo-editor", SOLUTIONS[id]);
    await page.click(".octo-panel .octo-btn--primary");
    await page.waitForTimeout(id === 8 ? 1500 : 1900);
    await page.screenshot({ path: path.join(OUT, `run-${id}${MOBILE ? "-m" : ""}-win.png`) });
    const want = id < 10 ? `#level${id + 1}` : "";
    try { await page.waitForFunction((w) => location.hash === w, want, { timeout: 20000 }); solved = true; } catch { /* bloqué */ }
    next = await page.evaluate(() => location.hash || "(menu)");
    if (solved && id < 10) { await page.waitForTimeout(800); const run = await page.evaluate(() => !!(window.OctoPlay && window.OctoPlay.current)); solved = run; }
  }
  const info = { hash: next };
  console.log(`${ok && solved && !problems.length ? "✓" : "✗"} niveau ${id} : ${ok ? "énigme atteinte" : "TROP LONG / bloqué"} en ${secs}s, ${solved ? "résolue → " + info.hash : "NON résolue (" + info.hash + ")"}`);
  problems.forEach((m) => console.log("    " + m));
  failed += ok && solved && !problems.length ? 0 : 1;
  await page.context().close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
