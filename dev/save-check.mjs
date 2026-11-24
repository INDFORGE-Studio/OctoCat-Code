// La progression survit-elle à la fermeture du navigateur ? `node dev/save-check.mjs` (après `npm run build`)
// Profil Chromium réel : on joue (niveau terminé, pièces gagnées, costume), on FERME tout, on rouvre, on relit tout.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), BASE = "/OctoCat-Code/", PORT = 4176;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
  let f = path.join(SITE, p.slice(BASE.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "octo-save-"));
const opts = { headless: true, viewport: { width: 1280, height: 720 }, args: ["--autoplay-policy=no-user-gesture-required"] };
const url = `http://127.0.0.1:${PORT}${BASE}`;
const out = [];
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
const errs = [];

// session 1 : on joue un peu
let ctx = await chromium.launchPersistentContext(dir, opts);
let page = ctx.pages()[0] || await ctx.newPage();
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(1500);
const s1 = await page.evaluate(() => {
  const P = window.OctoProgress;
  P.bank(1, 12);              // pièces d'un trajet
  P.complete(1);              // niveau 1 réussi
  P.bank(2, 5);
  P.complete(2);              // niveau 2 réussi
  P.payHint(3, 3);            // un achat
  return { unlocked: P.get().unlocked, coins: P.coins(), earned: P.earned(), raw: window.localStorage.getItem("octocat-code:v1") };
});
ok("session 1 : progression écrite dans le navigateur", !!s1.raw && s1.unlocked === 3, JSON.stringify({ unlocked: s1.unlocked, coins: s1.coins, earned: s1.earned }));
await ctx.close(); // fermeture du navigateur

// session 2 : on rouvre
ctx = await chromium.launchPersistentContext(dir, opts);
page = ctx.pages()[0] || await ctx.newPage();
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(1500);
const s2 = await page.evaluate(() => {
  const P = window.OctoProgress, g = P.get();
  return { unlocked: g.unlocked, done: Object.keys(g.completed).join(","), coins: P.coins(), earned: P.earned(), raw: window.localStorage.getItem("octocat-code:v1") };
});
ok("session 2 : niveaux gardés", s2.unlocked === 3 && s2.done === "1,2", JSON.stringify(s2.done));
ok("session 2 : pièces et score gardés", s2.coins === s1.coins && s2.earned === s1.earned, `${s2.coins} / ${s2.earned}`);
// Sauvegarde dans un FICHIER : le menu enregistre, on efface tout (comme un navigateur qui oublie à la fermeture), on recharge le fichier
await page.locator(".octo-gear").click();
await page.locator(".octo-set__tab", { hasText: "Jeu" }).click();
const mem = await page.locator(".octo-set__body").innerText();
ok("le menu ne promet plus « gardés » sans preuve", !/✅/.test(mem) && /rien ne garantit|protège/.test(mem), mem.split("\n").find((l) => /navigateur/.test(l)) || "");
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Enregistrer un fichier/ }).click()]);
const file = path.join(dir, dl.suggestedFilename());
await dl.saveAs(file);
ok("fichier de sauvegarde téléchargé", /octocat-code-sauvegarde\.txt$/.test(file) && fs.statSync(file).size > 50, file);
await page.evaluate(() => { window.OctoProgress.reset(); window.localStorage.clear(); });
const wiped = await page.evaluate(() => window.OctoProgress.get().unlocked);
ok("navigateur « oublieux » simulé : tout est à zéro", wiped === 1);
await page.locator("input[type=file]").setInputFiles(file);
await page.waitForTimeout(400);
const back = await page.evaluate(() => { const P = window.OctoProgress, g = P.get(); return { unlocked: g.unlocked, done: Object.keys(g.completed).join(","), coins: P.coins(), earned: P.earned() }; });
ok("le fichier rétablit niveaux, pièces et score", back.unlocked === 3 && back.done === "1,2" && back.coins === s1.coins && back.earned === s1.earned, JSON.stringify(back));
ok("aucune erreur dans la page", errs.length === 0, errs.join(" | "));
console.log(out.join("\n"));
await page.screenshot({ path: path.join(ROOT, "dev", "shots", "save-check.png") });
await ctx.close(); server.close();
