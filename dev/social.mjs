// Image de partage (réseaux sociaux, messageries, moteurs de recherche) : `node dev/social.mjs` (après `npm run build`).
// Photographie l'accueil du vrai jeu en 1200×630 (`?card=1` cache l'invite et les compteurs), y pose trois pastilles et enregistre
// docs/assets/social-card.png (référencée par og:image / twitter:image). À relancer si l'accueil ou le logo changent.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), BASE = "/OctoCat-Code/", PORT = 4192, OUT = path.join(ROOT, "docs/assets/social-card.png");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
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
const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}${BASE}?card=1`, { waitUntil: "load" });
await page.waitForSelector("canvas.octo-canvas");
await page.waitForTimeout(4500); // le logo tombe lettre par lettre, puis se pose
await page.evaluate(() => {
  const css = document.createElement("style");
  css.textContent = `.octo-ui, .octo-audio, .octo-picker, .octo-toast, .octo-rotate { display: none !important; }
    .card-badges { position: fixed; left: 0; right: 0; bottom: 22px; z-index: 99; display: flex; justify-content: center; gap: 14px; font: 15px/1 "Press Start 2P", monospace; }
    .card-badges span { padding: 11px 15px 10px; background: rgba(21, 12, 51, 0.9); color: #f0f6fc; border: 2px solid #e3b341; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.45); }
    .card-badges span:nth-child(2) { color: #7ee787; border-color: #3fb950; }
    .card-badges span:nth-child(3) { color: #a5d6ff; border-color: #58a6ff; }`;
  document.head.appendChild(css);
  const bar = document.createElement("div");
  bar.className = "card-badges";
  ["100 % GRATUIT", "10 MONDES", "DES 8 ANS"].forEach((t) => { const s = document.createElement("span"); s.textContent = t; bar.appendChild(s); });
  document.body.appendChild(bar);
});
await page.waitForTimeout(600);
await page.screenshot({ path: OUT, type: "png" });
console.log("image de partage :", OUT, `${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko`, "; erreurs :", errs.length ? errs : "aucune");
await browser.close(); server.close();
