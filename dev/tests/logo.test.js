// Logo de l'accueil (logo.js) : toutes les lettres du titre existent et sont bien formées (le dessin lui-même se vérifie à l'œil : npm run shot).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/javascripts");
const ctx = { window: {}, Math, parseInt, Array, Object };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, "logo.js"), "utf8"), ctx, { filename: "logo.js" });
const L = ctx.OctoLogo;

test("logo : le titre est OCTOCAT-CODE et chaque lettre a une image 7 lignes bien formée", () => {
  assert.equal(L._text, "OCTOCAT-CODE");
  for (const ch of new Set(L._text)) {
    const rows = Array.from(L._glyphs[ch]);
    assert.equal(rows.length, 7, `lettre ${ch}`);
    assert.ok(rows.every((r) => r.length === rows[0].length && /^[01]+$/.test(r)), `lettre ${ch} : lignes de même longueur, 0/1 seulement`);
    assert.ok(rows.some((r) => r.includes("1")), `lettre ${ch} : au moins un pixel`);
  }
});

test("logo : les images ont la même hauteur (lettres alignées) et la largeur suit la lettre", () => {
  const h = new Set(Array.from(L._text, (ch) => L._size(ch).h));
  assert.equal(h.size, 1);
  assert.ok(L._size("-").w < L._size("O").w);
});
