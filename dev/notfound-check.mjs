// Page 404 « GAME NOT FOUND » : `node dev/notfound-check.mjs` — adresse inconnue → scène plein écran ; on maintient la touche « droite » (flèche)
// jusqu'aux bras d'OctoCat, puis la page demande bien le retour au jeu. Captures : dev/shots/notfound-*.png.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4184;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = p.startsWith(BASE) ? path.join(SITE, p.slice(BASE.length)) : "";
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!f || !fs.existsSync(f)) { // comme GitHub Pages : une adresse inconnue reçoit 404.html avec le code 404
    res.writeHead(404, { "content-type": TYPES[".html"] });
    fs.createReadStream(path.join(SITE, "404.html")).pipe(res);
    return;
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const out = [], errs = [];
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };

for (const [label, vp] of [["bureau", { width: 1280, height: 720 }], ["mobile", { width: 844, height: 390 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  let home = null;
  await page.route("https://indforge-studio.github.io/**", (r) => { home = r.request().url(); r.abort(); }); // le retour au vrai jeu (adresse du site) : on l'intercepte
  await page.goto(`http://127.0.0.1:${PORT}${BASE}une/adresse/inconnue/`, { waitUntil: "load" });
  await page.waitForSelector("canvas.octo-canvas", { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `notfound-${label}-0-start.png`) });
  const dom = await page.evaluate(() => {
    // rien d'autre que la scène : tout point de l'écran appartient à la scène plein écran (le reste de la page est recouvert)
    const seen = [];
    for (let x = 4; x < innerWidth; x += Math.floor(innerWidth / 24)) for (let y = 4; y < innerHeight; y += Math.floor(innerHeight / 14)) {
      const e = document.elementFromPoint(x, y);
      if (!e || !e.closest(".octo-fs")) seen.push(`${x},${y}:${e && e.tagName}.${e && e.className}`);
    }
    return { seen, scroll: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1, scene: document.documentElement.getAttribute("data-octo-scene"), status: document.title };
  });
  ok(`${label} : la scène 404 démarre`, dom.scene === "notfound", dom.status);
  ok(`${label} : rien d'autre que la scène (pas d'en-tête, de menu ni de pied de page)`, dom.seen.length === 0, dom.seen.join(" | "));
  ok(`${label} : pas de défilement`, !dom.scroll);
  // sans rien faire, Laita ne bouge pas et le Glitch est collé à elle
  await page.waitForTimeout(2500);
  ok(`${label} : sans appui, pas de retour au jeu`, home === null);
  await page.screenshot({ path: path.join(OUT, `notfound-${label}-1-caught.png`) });
  // on maintient « droite »
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `notfound-${label}-2-run.png`) });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(OUT, `notfound-${label}-3-near.png`) });
  const t0 = Date.now();
  let shots = 4;
  while (home === null && Date.now() - t0 < 14000) {
    await page.waitForTimeout(700);
    if (shots < 9) await page.screenshot({ path: path.join(OUT, `notfound-${label}-${shots++}-end.png`) });
  }
  ok(`${label} : Laita rejoint OctoCat, la magie finit et la page renvoie vers le jeu`, home !== null, home || "pas de retour");
  await page.close();
}
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
if (errs.length) process.exitCode = 1;
await browser.close(); server.close();
