// Coup d'œil rapide sur La Grange (une seule vue, quelques secondes) : `node dev/grange-quick.mjs [largeur hauteur]` après `npm run build`.
// Écrit dev/shots/grange-quick.png (+ une 2e image après un clic sur l'enseigne).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4198;
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
const [w, h] = [Number(process.argv[2]) || 1600, Number(process.argv[3]) || 900];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${PORT}${BASE}`, { waitUntil: "load" });
await page.waitForSelector("canvas.octo-canvas", { timeout: 20000 });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /grange/i }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, "grange-quick.png") });
const pts = await page.evaluate(() => window.OctoGrange.points());
await page.mouse.click(pts.dad.x, pts.dad.y);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, "grange-quick-dad.png") });
console.log("frames après le clic sur Papa :", JSON.stringify(await page.evaluate(() => window.OctoGrange.points().frames)));
console.log(errors.length ? "ERREURS : " + errors.join(" | ") : "console propre");
await browser.close(); server.close();
