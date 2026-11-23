// Fin du générique : `node dev/credits-end-check.mjs` (après `npm run build`).
// Passe le texte avec Entrée, puis photographie l'envol (le sol s'arrête, la fusée se pose, OctoCat et Laïta décollent), console propre,
// retour à l'accueil. Écrit dev/shots/credits-end-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4197;
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
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [], fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log((ok ? "ok   " : "ECHEC ") + msg); };
const SAVE = { unlocked: 10, laps: 3, finished: true, creditsPending: true, earned: 612, coins: 40 };

for (const [name, view] of [["desktop", { width: 1600, height: 900 }], ["phone", { width: 844, height: 390 }]]) {
  const ctx = await browser.newContext({ viewport: view });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript((s) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("octocat-code:v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, SAVE);
  await page.goto(`http://127.0.0.1:${PORT}${BASE}`, { waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.keyboard.press("Enter"); // passe le texte : « FIN » et l'envol commencent
  const t0 = Date.now();
  for (const s of [1.5, 3.5, 5.5, 6.8, 8.2, 9.3]) {
    await page.waitForTimeout(Math.max(0, s * 1000 - (Date.now() - t0)));
    await page.screenshot({ path: path.join(OUT, `credits-end-${name}-${String(s).replace(".", "_")}.png`) });
  }
  await page.waitForTimeout(6000);
  check(await page.evaluate(() => !!document.querySelector(".octo-credits-btn")), `${name} : retour à l'accueil après l'envol (bouton CREDITS)`);
  await ctx.close();
}
check(errors.length === 0, "console propre" + (errors.length ? " : " + errors.slice(0, 3).join(" | ") : ""));
await browser.close(); server.close();
if (fails.length) { console.log("\n" + fails.length + " échec(s)"); process.exit(1); }
console.log("\ntout est bon");
