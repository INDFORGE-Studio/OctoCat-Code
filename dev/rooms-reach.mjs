// Salles secrètes, vraie physique : `node dev/rooms-reach.mjs [--fine] [monde…]`.
// Le vrai simulateur fait sauter un joueur de toutes les façons dans chacune des 21 salles (voir dev/tests/room-physics.mjs).
// Exigé : avec le double saut, les 28 pièces + le tuyau ; SANS double saut, le tuyau et aucun piège (on ressort toujours d'un seul saut),
// et, aux niveaux 1 et 3 (le double saut n'est pas encore connu), aussi les 28 pièces. Une salle qui échoue = exit 1.
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const LEVELS = [1, 3, 4, 5, 7, 8, 9];
if (!isMainThread) {
  const { explore } = await import("./tests/room-physics.mjs");
  parentPort.postMessage(explore(workerData.w, workerData.id, { single: workerData.single, fine: workerData.fine }));
} else {
  const args = process.argv.slice(2), fine = args.includes("--fine");
  const worlds = args.filter((a) => /^[012]$/.test(a)).map(Number), WORLDS = worlds.length ? worlds : [0, 1, 2];
  const jobs = [];
  for (const w of WORLDS) for (const id of LEVELS) for (const single of [false, true]) jobs.push({ w, id, single, fine });
  const out = [];
  let next = 0, bad = 0;
  const run = () => new Promise((done) => {
    const job = jobs[next++];
    if (!job) { done(); return; }
    const wk = new Worker(fileURLToPath(import.meta.url), { workerData: job });
    wk.once("message", (r) => {
      const must = job.single ? (job.id <= 3 ? "pieces" : "sortie") : "pieces";
      const problems = [];
      if (!r.exit) problems.push("tuyau hors de portée");
      if (r.traps.length) problems.push(`${r.traps.length} endroits sans retour (${r.traps.slice(0, 4).join(" ")}…)`);
      if (must === "pieces" && r.got < r.total) problems.push(`pièces hors de portée (colonne,hauteur) ${r.lost.map((c) => c.join(",")).join(" ")}`);
      if (problems.length) bad++;
      out.push({ k: `${job.w}-${job.id}-${job.single ? 1 : 0}`, line: `${problems.length ? "✗" : "✓"} monde ${job.w} niveau ${job.id} ${r.room} ${job.single ? "(un seul saut)" : "(double saut)"} : ${r.got}/${r.total} pièces${problems.length ? " — " + problems.join(" ; ") : ""}` });
    });
    wk.once("error", (e) => { bad++; out.push({ k: "err", line: "✗ " + e.message }); });
    wk.once("exit", () => done(run()));
  });
  await Promise.all(Array.from({ length: Math.max(1, Math.min(os.cpus().length - 1, 12)) }, run));
  out.sort((a, b) => a.k.localeCompare(b.k)).forEach((o) => console.log(o.line));
  console.log(bad ? `\n${bad} problème(s)` : "\nToutes les salles : pièces et sortie atteignables, aucun piège.");
  process.exitCode = bad ? 1 : 0;
}
