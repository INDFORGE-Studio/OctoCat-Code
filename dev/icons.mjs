// Génère les icônes PWA (PNG) à partir de docs/assets/favicon.svg : `node dev/icons.mjs`. À relancer si le favicon change.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(ROOT, "docs/assets/favicon.svg"), "utf8").replace(/<rect width="24" height="24" rx="4" fill="#0d1117"\/>/, "");
const browser = await chromium.launch();
const page = await browser.newPage();
// `pad` : marge de sécurité (zone « maskable » = 80 % centraux) ; `round` : coins arrondis des icônes normales.
async function icon(name, size, pad, round) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;background:#0d1117;border-radius:${round}px;display:grid;place-items:center">
    <div style="width:${size - 2 * pad}px;height:${size - 2 * pad}px;image-rendering:pixelated">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div></div></body>`);
  await page.screenshot({ path: path.join(ROOT, "docs/assets", name), omitBackground: true });
}
await icon("icon-192.png", 192, 12, 28);
await icon("icon-512.png", 512, 32, 76);
await icon("icon-maskable-512.png", 512, 100, 0);
await browser.close();
console.log("icônes générées dans docs/assets/");
