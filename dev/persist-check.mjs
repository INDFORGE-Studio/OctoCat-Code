// Persistance réelle : réglages et son après fermeture / réouverture du navigateur. `node dev/persist-check.mjs`
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
import os from "node:os";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "octo-profile-"));
const opts = { headless: true, viewport: { width: 1280, height: 720 }, args: ["--autoplay-policy=no-user-gesture-required"] };
const url = `http://127.0.0.1:${PORT}${BASE}`;
const out = [];
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
// session 1 : on règle tout puis on ferme le navigateur
let ctx = await chromium.launchPersistentContext(dir, opts);
let page = ctx.pages()[0] || await ctx.newPage();
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.mouse.click(640, 300);
await page.evaluate(() => { window.OctoMusic.setVolume(0.35); if (!window.OctoMusic.isMuted()) window.OctoMusic.toggle(); window.OctoSettings.set("sfx", false); window.OctoSettings.set("shake", false); window.OctoSettings.bind("attack", "KeyF"); });
await page.waitForTimeout(300);
await ctx.close();
// session 2 : on rouvre
ctx = await chromium.launchPersistentContext(dir, opts);
page = ctx.pages()[0] || await ctx.newPage();
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(1500);
const st = await page.evaluate(() => ({ vol: window.OctoMusic.getVolume(), muted: window.OctoMusic.isMuted(), sfx: window.OctoSettings.get("sfx"), shake: window.OctoSettings.get("shake"), f: window.OctoSettings.lookup("KeyF"), slider: document.querySelector(".octo-vol").value, btn: document.querySelector(".octo-mute").textContent }));
ok("volume conservé", Math.abs(st.vol - 0.35) < 0.001, JSON.stringify(st));
ok("musique coupée conservée", st.muted === true && /OFF/.test(st.btn));
ok("curseur de volume conservé", st.slider === "35");
ok("effets sonores désactivés conservés", st.sfx === false);
ok("secousses conservées", st.shake === false);
ok("touche liée conservée", st.f === "attack");
// code de sauvegarde complet : on change tout puis on recharge le code
const code = await page.evaluate(() => window.OctoSettings.exportAll());
await page.evaluate(() => { window.OctoMusic.setVolume(0.9); window.OctoSettings.resetAll(); });
const r = await page.evaluate((c) => window.OctoSettings.importAll(c), code);
const st2 = await page.evaluate(() => ({ vol: window.OctoMusic.getVolume(), muted: window.OctoMusic.isMuted(), f: window.OctoSettings.lookup("KeyF") }));
ok("le code de sauvegarde rétablit son, musique et touches", r.ok && Math.abs(st2.vol - 0.35) < 0.001 && st2.muted && st2.f === "attack", JSON.stringify(st2));
// menu : bloc « Ma mémoire » visible
await page.locator(".octo-gear").click();
await page.locator(".octo-set__tab", { hasText: "Jeu" }).click();
const body = await page.locator(".octo-set__body").innerText();
ok("bloc « Ma mémoire » affiché", /Ma mémoire/.test(body) && /gardés dans ce navigateur/.test(body));
await page.screenshot({ path: path.join(OUT, "_persist-menu.png") });
console.log(out.join("\n"));
await ctx.close(); server.close();
