// Génère les icônes (PNG + .ico) à partir de docs/assets/favicon.svg : `node dev/icons.mjs`. À relancer si le favicon change.
//   icônes de l'application installée (192, 512, maskable), icône d'écran d'accueil Apple (180), favicons 16 / 32 et favicon.ico (16, 32, 48).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/assets");
const svg = fs.readFileSync(path.join(OUT, "favicon.svg"), "utf8").replace(/<rect width="24" height="24" rx="4" fill="#0d1117"\/>/, "");
const browser = await chromium.launch();
const page = await browser.newPage();
// `pad` : marge de sécurité (zone « maskable » = 80 % centraux) ; `round` : coins arrondis des icônes normales.
async function icon(size, pad, round) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;background:#0d1117;border-radius:${round}px;display:grid;place-items:center">
    <div style="width:${size - 2 * pad}px;height:${size - 2 * pad}px;image-rendering:pixelated">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div></div></body>`);
  return page.screenshot({ omitBackground: true });
}
const write = (name, buf) => fs.writeFileSync(path.join(OUT, name), buf);
write("icon-192.png", await icon(192, 12, 28));
write("icon-512.png", await icon(512, 32, 76));
write("icon-maskable-512.png", await icon(512, 100, 0));
write("apple-touch-icon.png", await icon(180, 14, 0)); // iOS arrondit lui-même : fond plein, pas de transparence
const f16 = await icon(16, 0, 3), f32 = await icon(32, 0, 5), f48 = await icon(48, 0, 8);
write("favicon-16.png", f16);
write("favicon-32.png", f32);
// .ico : trois images PNG (16, 32, 48) dans un seul fichier
const imgs = [[16, f16], [32, f32], [48, f48]], head = Buffer.alloc(6 + 16 * imgs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let off = head.length;
imgs.forEach(([size, buf], i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(size, e); head.writeUInt8(size, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
  off += buf.length;
});
write("favicon.ico", Buffer.concat([head, ...imgs.map((i) => i[1])]));
await browser.close();
console.log("icônes générées dans docs/assets/");
