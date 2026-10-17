// Indices payants : `node dev/hints-check.mjs` (pièces, prix 5 pièces, mission cachée, indices qui restent, repaiement après réussite).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), OUT = path.join(ROOT, "dev", "shots"), BASE = "/OctoCat-Code/", PORT = 4177;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
fs.mkdirSync(OUT, { recursive: true });
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
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [], out = [];
page.on("pageerror", (e) => errs.push(e.message));
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
const url = `http://127.0.0.1:${PORT}${BASE}?unlock=all#level1`;
async function openPuzzle() {
  await page.goto("about:blank");
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem("octocat-code:settings:v1", JSON.stringify({ skipAlways: true })));
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 15000 });
  await page.locator(".octo-skip").click();
  await page.waitForSelector(".octo-dialog.is-open");
  await page.locator(".octo-dialog .octo-btn--primary").click();
}
const hintBtn = () => page.locator(".octo-actions .octo-btn", { hasText: "💡" });
const goalTxt = () => page.locator(".octo-panel__goal").innerText();

await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await openPuzzle();
ok("sans pièce : mission cachée", /🔒/.test(await goalTxt()), await goalTxt());
ok("aucun indice affiché", (await page.locator(".octo-hint").count()) === 0);
ok("prix d'un indice : 5 pièces", /5 🪙/.test(await hintBtn().innerText()), await hintBtn().innerText());
await hintBtn().click();
ok("0 pièce : indice doux refusé gentiment, rien n'est payé", (await page.locator(".octo-hint").count()) === 0 && /poche est trop légère/.test(await page.locator(".octo-confirm").innerText()), await page.locator(".octo-confirm").innerText());
await page.screenshot({ path: path.join(OUT, "hints-poor.png") });

await page.evaluate(() => window.OctoProgress.bank(1, 24)); // 5 + 5 (indices doux) + 14 : presque assez pour la réponse (15)
ok("pièces visibles", /24/.test(await page.locator(".octo-wallet").innerText()), await page.locator(".octo-wallet").innerText());
await hintBtn().click();
ok("indice 1 payé : visible, mission visible, 10 pièces", (await page.locator(".octo-hint").count()) === 1 && !/🔒/.test(await goalTxt()) && /19/.test(await page.locator(".octo-wallet").innerText()));
ok("prix suivant : 5 pièces", /5 🪙/.test(await hintBtn().innerText()), await hintBtn().innerText());
await page.locator(".octo-btn--primary", { hasText: "Compiler" }).click();
await page.waitForTimeout(1500);
ok("l'indice payé reste après un Compiler", (await page.locator(".octo-hint").count()) === 1);
await hintBtn().click();
ok("2 indices doux payés (5 chacun), il reste 14 pièces", (await page.locator(".octo-hint").count()) === 2 && /14/.test(await page.locator(".octo-wallet").innerText()));
ok("le 3e indice (la réponse) coûte 15 pièces", /15 🪙/.test(await hintBtn().innerText()) && /réponse/i.test(await hintBtn().innerText()), await hintBtn().innerText());
await hintBtn().click();
ok("14 pièces : la réponse est refusée avec un message fun (il manque 1), rien payé", /Ouaf, refusé/.test(await page.locator(".octo-confirm").innerText()) && /manque 1/.test(await page.locator(".octo-confirm").innerText()) && !/Oui, je paie/.test(await page.locator(".octo-confirm").innerText()) && (await page.locator(".octo-hint").count()) === 2, await page.locator(".octo-confirm").innerText());
await page.screenshot({ path: path.join(OUT, "hints-refused.png") });
await page.locator(".octo-confirm button", { hasText: "OK" }).click();
ok("« OK » ferme le message", (await page.locator(".octo-confirm button").count()) === 0);
// on lui donne une pièce de plus (15 = juste assez pour la réponse) puis on rouvre l'énigme
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("octocat-code:v1")); s.coins = 15; localStorage.setItem("octocat-code:v1", JSON.stringify(s)); });
await openPuzzle();
await hintBtn().click();
ok("avec 15 pièces : une demande de confirmation s'affiche", (await page.locator(".octo-confirm button").count()) === 2 && /réponse toute faite/.test(await page.locator(".octo-confirm").innerText()), await page.locator(".octo-confirm").innerText());
await page.screenshot({ path: path.join(OUT, "hints-confirm.png") });
await page.locator(".octo-confirm button", { hasText: "Non" }).click();
ok("« Non » : rien n'est payé, la question disparaît", (await page.locator(".octo-confirm button").count()) === 0 && (await page.locator(".octo-hint").count()) === 2 && /15/.test(await page.locator(".octo-wallet").innerText()));
await hintBtn().click();
await page.locator(".octo-confirm button", { hasText: "Oui" }).click();
ok("« Oui » : 3 indices payés, 0 pièce", (await page.locator(".octo-hint").count()) === 3 && (await page.locator(".octo-wallet").innerText()).trim() === "🪙 0");
ok("plus d'indice à acheter", await hintBtn().isDisabled(), await hintBtn().innerText());
await page.screenshot({ path: path.join(OUT, "hints-paid.png") });

await openPuzzle(); // rechargement : ce qui est payé reste affiché
ok("après rechargement : 3 indices toujours là", (await page.locator(".octo-hint").count()) === 3);

const v = await page.locator(".octo-editor").inputValue();
await page.locator(".octo-editor").fill(v.replace("v_speed = ???", "v_speed = 200"));
await page.locator(".octo-btn--primary", { hasText: "Compiler" }).click();
await page.waitForTimeout(500);
ok("réussite : les indices sont à repayer", await page.evaluate(() => window.OctoProgress.paidHints(1) === 0));

// arène : une pièce par ennemi vaincu (le bot de la page joue le niveau 2)
console.log(out.join("\n"), "\nerreurs :", errs.length ? errs : "aucune");
await browser.close(); server.close();
