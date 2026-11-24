// LUCIOLE, l'aide « ? » : `node dev/luciole-check.mjs` (après `npm run build`).
// Bouton à côté de ♪ / ⚙, phrase d'accueil, chaque rubrique (+ Retour, Fermer), clavier (Tab piégé, Entrée, Échap, focus rendu),
// le chat ne bouge pas pendant l'aide, boutons qui mènent au jeu (réglages, 💡 Indice, 📜 Briefing), tailles 320 / 375 / 768 / 1440 px
// et tactile, console propre. Captures numérotées dans SHOTS_DIR (par défaut dev/shots/luciole).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site"), BASE = "/OctoCat-Code/";
const OUT = process.env.SHOTS_DIR || path.join(ROOT, "dev", "shots", "luciole");
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
await new Promise((r) => server.listen(0, "127.0.0.1", r)); // port libre, boucle locale seulement
const URL_BASE = `http://127.0.0.1:${server.address().port}${BASE}`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const out = [], errs = [];
const ok = (n, c, x) => { out.push(`${c ? "✓" : "✗"} ${n}${x ? " — " + x : ""}`); if (!c) process.exitCode = 1; };
let shotN = 0;
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${String(++shotN).padStart(2, "0")}-${name}.png`) });
const WELCOME = "Je suis LUCIOLE, comment puis-je t'aider dans ta recherche ?";

async function newPage(opts, label) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${label} : ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`${label} : console ${m.text()}`); });
  return { ctx, page };
}
async function hub(page, portrait) {
  await page.goto(URL_BASE, { waitUntil: "load" });
  await page.waitForSelector(".octo-luciole-btn", { timeout: 20000 });
  if (portrait) await page.click(".octo-rotate__stay");
  await page.waitForTimeout(1200);
}
const isOpen = (page) => page.evaluate(() => window.OctoLuciole.isOpen() && !!document.querySelector(".octo-luciole.is-open"));
const title = (page) => page.locator(".octo-luciole__title").innerText();
const active = (page) => page.evaluate(() => { const a = document.activeElement; return { inCard: !!(a && a.closest(".octo-luciole__card")), isBtn: !!(a && a.classList.contains("octo-luciole-btn")), topic: a && a.getAttribute("data-topic"), tag: a && a.tagName, text: a && a.textContent.slice(0, 40) }; });
const geo = (page) => page.evaluate(() => {
  const r = (s) => { const n = document.querySelector(s); if (!n) return null; const b = n.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const btns = Array.from(document.querySelectorAll(".octo-luciole.is-open .octo-luciole__btn")).filter((n) => n.offsetParent).map((n) => n.getBoundingClientRect().height);
  return { iw: innerWidth, ih: innerHeight, sw: document.documentElement.scrollWidth, help: r(".octo-luciole-btn"), gear: r(".octo-gear"), mute: r(".octo-audio > .octo-mute"), card: r(".octo-luciole.is-open .octo-luciole__card"), minBtn: btns.length ? Math.min(...btns) : null };
});
const inside = (b, g) => b && b.l >= -0.5 && b.t >= -0.5 && b.r <= g.iw + 0.5 && b.b <= g.ih + 0.5;

/* ---------- 1. bureau 1440 : bouton, accueil, chaque rubrique, Retour / Fermer ---------- */
{
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } }, "bureau");
  await hub(page);
  const g = await geo(page);
  ok("bouton « ? » présent, libellé « Aide de LUCIOLE »", (await page.locator('.octo-audio button[aria-label="Aide de LUCIOLE"]').count()) === 1);
  ok("« ? » rangé avec ♪ et ⚙ (même ligne, juste après ⚙)", g.help && g.gear && Math.abs(g.help.t - g.gear.t) < 1 && g.help.l >= g.gear.r - 0.5 && g.help.l - g.gear.r < 20, JSON.stringify({ help: g.help, gear: g.gear }));
  ok("même taille que ⚙ (hauteur égale, largeur ±4 px, ≥ 44 px)", Math.abs(g.help.h - g.gear.h) < 1 && Math.abs(g.help.w - g.gear.w) <= 4 && g.help.h >= 44 && g.help.w >= 44, `${g.help.w}x${g.help.h} / ${g.gear.w}x${g.gear.h}`);
  await shot(page, "bouton-bureau");

  await page.click(".octo-luciole-btn");
  ok("clic : le panneau s'ouvre", await isOpen(page));
  ok("phrase d'accueil", (await title(page)) === WELCOME, await title(page));
  ok("dialogue accessible (role, aria-modal, nom LUCIOLE)", await page.evaluate(() => { const c = document.querySelector(".octo-luciole__card"); return c.getAttribute("role") === "dialog" && c.getAttribute("aria-modal") === "true" && document.getElementById(c.getAttribute("aria-labelledby")).textContent === "LUCIOLE"; }));
  const g2 = await geo(page);
  ok("panneau dans la fenêtre, boutons ≥ 44 px", inside(g2.card, g2) && g2.minBtn >= 44, `${JSON.stringify(g2.card)} min ${g2.minBtn}`);
  await shot(page, "accueil-bureau");

  // chaque rubrique, par les vrais boutons : chemin le plus court depuis l'accueil
  const T = await page.evaluate(() => JSON.parse(JSON.stringify(window.OctoLuciole.topics)));
  const pathTo = {}, queue = ["home"]; pathTo.home = [];
  while (queue.length) { const id = queue.shift(); for (const n of T[id].next || []) if (!pathTo[n]) { pathTo[n] = [...pathTo[id], n]; queue.push(n); } }
  for (const id of Object.keys(T).filter((x) => x !== "home")) {
    await page.evaluate(() => { window.OctoLuciole.close(); window.OctoLuciole.open(); });
    for (const step of pathTo[id]) await page.locator(`.octo-luciole__btn[data-topic="${step}"]`).click();
    const ttl = await title(page);
    const follow = await page.locator(".octo-luciole__btn[data-topic]").evaluateAll((ns) => ns.map((n) => n.getAttribute("data-topic")));
    const backOk = await page.locator(".octo-luciole__foot button", { hasText: "Retour" }).isVisible();
    const closeOk = await page.locator(".octo-luciole__foot button", { hasText: "Fermer" }).isVisible();
    ok(`rubrique « ${id} » : titre, ${follow.length} questions de suivi, Retour et Fermer`, ttl === T[id].title && follow.join() === (T[id].next || []).join() && backOk && closeOk, `${ttl} · ${follow.join()}`);
    if (id === "keys") {
      const rows = await page.locator(".octo-luciole__keys li").count();
      const kbd = await page.locator(".octo-luciole__kbd").allInnerTexts();
      ok("touches : la liste suit les réglages (8 actions, touches par défaut)", rows === 8 && kbd.includes("Espace") && kbd.includes("Clic droit"), kbd.join(" "));
      await shot(page, "touches-bureau");
    }
    if (id === "learn") {
      const links = await page.locator("a.octo-luciole__link").evaluateAll((ns) => ns.map((a) => [a.href, a.target, a.rel]));
      ok("apprendre plus : 2 liens, nouvel onglet, noopener noreferrer", links.length === 2 && links.every((l) => /^https:\/\/(docs\.python\.org\/fr\/|developer\.mozilla\.org\/fr\/)/.test(l[0]) && l[1] === "_blank" && l[2] === "noopener noreferrer"), JSON.stringify(links));
      await shot(page, "apprendre-bureau");
    }
    if (id === "stuck") ok("hors énigme : pas de bouton vers l'indice", (await page.locator(".octo-luciole__acts").count()) === 0);
    const parent = pathTo[id].length > 1 ? pathTo[id][pathTo[id].length - 2] : "home";
    await page.locator(".octo-luciole__foot button", { hasText: "Retour" }).click();
    ok(`rubrique « ${id} » : Retour revient à « ${parent} »`, (await title(page)) === T[parent].title);
  }
  ok("à l'accueil de l'aide : pas de bouton Retour", !(await page.locator(".octo-luciole__foot button", { hasText: "Retour" }).isVisible()));
  await page.locator(".octo-luciole__foot button", { hasText: "Fermer" }).click();
  ok("Fermer (souris) : le panneau se ferme, le focus est relâché", !(await isOpen(page)) && !(await active(page)).isBtn);
  await page.click(".octo-luciole-btn");
  await page.mouse.click(20, 450); // fond assombri, hors de la carte
  ok("clic sur le fond : le panneau se ferme", !(await isOpen(page)));

  /* ---------- 2. clavier ---------- */
  await page.focus(".octo-luciole-btn");
  await page.keyboard.press("Enter");
  ok("Entrée sur « ? » : ouvre l'aide, focus sur la 1re question", (await isOpen(page)) && (await active(page)).topic === "play", JSON.stringify(await active(page)));
  let trapped = true;
  for (let i = 0; i < 14; i++) { await page.keyboard.press("Tab"); if (!(await active(page)).inCard) trapped = false; }
  for (let i = 0; i < 14; i++) { await page.keyboard.press("Shift+Tab"); if (!(await active(page)).inCard) trapped = false; }
  ok("Tab et Maj+Tab restent dans le panneau", trapped);
  for (let i = 0; i < 12 && (await active(page)).topic !== "keys"; i++) await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  ok("Entrée sur une question : la réponse s'affiche, focus sur son titre", (await title(page)) === T.keys.title && (await active(page)).tag === "H2", JSON.stringify(await active(page)));
  await page.keyboard.press("Escape");
  ok("Échap : ferme l'aide et rend le focus au « ? »", !(await isOpen(page)) && (await active(page)).isBtn);
  ok("Échap n'a pas ouvert les réglages ⚙", (await page.locator(".octo-set.is-open").count()) === 0);
  await page.keyboard.press("Space");
  ok("Espace sur « ? » : rouvre l'aide", await isOpen(page));
  for (let i = 0; i < 20 && !/Fermer/.test((await active(page)).text || ""); i++) await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  ok("Fermer au clavier : focus rendu au « ? »", !(await isOpen(page)) && (await active(page)).isBtn);
  await page.keyboard.press("Escape"); // aide fermée : Échap ouvre les réglages comme avant
  ok("aide fermée : Échap ouvre toujours les réglages", (await page.locator(".octo-set.is-open").count()) === 1);
  await page.keyboard.press("Escape");

  /* ---------- 3. vers le bon endroit du jeu : onglet des réglages ---------- */
  await page.click(".octo-luciole-btn");
  await page.locator('.octo-luciole__btn[data-topic="save"]').click();
  await page.locator(".octo-luciole__btn--go").click();
  const tab = await page.evaluate(() => { const t = document.querySelector(".octo-set.is-open .octo-set__tab.is-on"); return t && t.getAttribute("data-tab"); });
  ok("« Ouvrir la sauvegarde » : aide fermée, réglages ouverts sur l'onglet Jeu", !(await isOpen(page)) && tab === "game", String(tab));
  await shot(page, "sauvegarde-reglages-bureau");
  await page.keyboard.press("Escape");
  await page.click(".octo-luciole-btn");
  await page.locator('.octo-luciole__btn[data-topic="keys"]').click();
  await page.locator(".octo-luciole__btn--go").click();
  ok("« Changer mes touches » : onglet Touches", await page.evaluate(() => { const t = document.querySelector(".octo-set.is-open .octo-set__tab.is-on"); return !!t && t.getAttribute("data-tab") === "keys"; }));
  await page.keyboard.press("Escape");

  /* ---------- 4. trajet : le chat ne bouge pas pendant l'aide ---------- */
  await page.goto("about:blank");
  await page.goto(URL_BASE + "?unlock=all#level1", { waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const pos = () => page.evaluate(() => { const p = window.OctoPlay.current.sim.player; return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }; });
  await page.click(".octo-luciole-btn");
  const p0 = await pos();
  for (const key of ["ArrowRight", "KeyD", "Space", "ArrowUp", "KeyX", "KeyF", "KeyV"]) { await page.keyboard.down(key); await page.waitForTimeout(250); await page.keyboard.up(key); }
  await page.waitForTimeout(300);
  const p1 = await pos();
  ok("aide ouverte : flèches, Espace, X, F, V ne font pas bouger le chat (partie en pause)", p0.x === p1.x && p0.y === p1.y, `${JSON.stringify(p0)} → ${JSON.stringify(p1)}`);
  await shot(page, "trajet-pause-bureau");
  await page.keyboard.press("Escape");
  ok("Échap ferme l'aide dans le trajet, sans ouvrir les réglages", !(await isOpen(page)) && (await page.locator(".octo-set.is-open").count()) === 0);
  await page.keyboard.down("ArrowRight"); await page.waitForTimeout(700); await page.keyboard.up("ArrowRight");
  const p2 = await pos();
  ok("aide fermée : le chat repart (les touches remarchent)", p2.x > p1.x + 5, `${p1.x} → ${p2.x}`);

  /* ---------- 5. énigme : montrer le bouton 💡 Indice, relire le briefing ---------- */
  await page.evaluate(() => localStorage.setItem("octocat-code:settings:v1", JSON.stringify({ skipAlways: true })));
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => window.OctoPlay && window.OctoPlay.current, null, { timeout: 20000 });
  await page.locator(".octo-skip").click();
  await page.waitForSelector(".octo-dialog.is-open");
  await page.locator(".octo-dialog .octo-btn--primary").click();
  await page.waitForSelector(".octo-panel.is-open");
  const code0 = await page.locator(".octo-editor").inputValue();
  await page.click(".octo-luciole-btn");
  await page.locator('.octo-luciole__btn[data-topic="stuck"]').click();
  ok("énigme : « bloqué » propose de montrer l'indice et le briefing", (await page.locator(".octo-luciole__btn--go").count()) === 2);
  const stuckText = await page.locator(".octo-luciole__body").innerText();
  ok("« bloqué » : des conseils, aucune solution (pas de v_…, pas de réponse)", !/v_[a-z]/.test(stuckText) && /Indice/.test(stuckText));
  await shot(page, "bloque-enigme-bureau");
  await page.locator(".octo-luciole__btn--go", { hasText: "Indice" }).click();
  const spot = await page.evaluate(() => { const a = document.activeElement; return !!a && a.getAttribute("data-octo-btn") === "hint" && a.classList.contains("octo-luciole-spot"); });
  ok("« Montre-moi » : aide fermée, le bouton 💡 Indice a le focus et brille (rien n'est acheté)", !(await isOpen(page)) && spot && (await page.locator(".octo-hint").count()) === 0);
  await shot(page, "indice-montre-bureau");
  ok("le code du joueur n'a pas bougé", (await page.locator(".octo-editor").inputValue()) === code0);
  await page.click(".octo-luciole-btn");
  await page.locator('.octo-luciole__btn[data-topic="stuck"]').click();
  await page.locator(".octo-luciole__btn--go", { hasText: "briefing" }).click();
  ok("« Relire le briefing » : le briefing s'ouvre", (await page.locator(".octo-dialog.is-open").count()) === 1 && !(await isOpen(page)));
  await ctx.close();
}

/* ---------- 6. tailles d'écran et tactile ---------- */
const UA_PHONE = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const touch = (w, h, dpr) => ({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: UA_PHONE });
const SIZES = [
  ["telephone-320", touch(320, 568, 2), true],
  ["telephone-375", touch(375, 667, 2), true],
  ["telephone-paysage", touch(667, 375, 2), false],
  ["tablette-768", touch(768, 1024, 2), true],
  ["bureau-1440", { viewport: { width: 1440, height: 900 } }, false]
];
for (const [name, opts, portrait] of SIZES) {
  const { ctx, page } = await newPage(opts, name);
  await hub(page, portrait);
  const g = await geo(page);
  ok(`${name} : « ? » visible dans l'écran, ≥ 44 px, sans chevaucher ⚙`, inside(g.help, g) && g.help.h >= 44 && g.help.w >= 44 && g.help.l >= g.gear.r - 0.5, JSON.stringify(g.help));
  if (name !== "bureau-1440") await shot(page, `bouton-${name}`);
  if (opts.hasTouch) await page.tap(".octo-luciole-btn"); else await page.click(".octo-luciole-btn");
  const g2 = await geo(page);
  ok(`${name} : l'aide s'ouvre, tient dans l'écran, pas de défilement horizontal, boutons ≥ 44 px`, (await isOpen(page)) && inside(g2.card, g2) && g2.sw <= g2.iw + 1 && g2.minBtn >= 44, `${JSON.stringify(g2.card)} sw ${g2.sw}/${g2.iw} min ${g2.minBtn}`);
  if (name !== "bureau-1440") await shot(page, `accueil-${name}`);
  if (opts.hasTouch) {
    await page.tap('.octo-luciole__btn[data-topic="keys"]');
    await page.tap('.octo-luciole__btn[data-topic="touch"]');
    ok(`${name} : au toucher, on va de question en question`, (await title(page)) === "Sur téléphone ou tablette");
    if (name === "telephone-paysage") await shot(page, `tactile-${name}`);
    await page.tap(".octo-luciole__foot button:has-text('Fermer')");
    ok(`${name} : Fermer au toucher`, !(await isOpen(page)));
  }
  await ctx.close();
}

/* ---------- 7. hors ligne : le fichier est dans le précache du service worker ---------- */
const sw = fs.readFileSync(path.join(SITE, "sw.js"), "utf8");
ok("hors ligne : luciole.js est précaché par le service worker", /"javascripts\/luciole\.js"/.test(sw));

ok("console propre (aucune erreur)", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
server.close();
console.log(out.join("\n"));
console.log(`captures : ${OUT}`);
