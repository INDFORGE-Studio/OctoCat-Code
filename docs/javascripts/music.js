/* OctoCat-Code — Musique d'ambiance adaptative, 100 % synthétisée (WebAudio).
 * Aucun fichier audio, aucun échantillon, aucun droit : tout est généré par ce code.
 *
 * Trois états, du plus doux au plus intense :
 *   1. CALME (par défaut) : joyeux et doux, un air par monde (voir plus bas), sans grosse caisse ni charleston continus.
 *   2. ALERTE (curseur « tension » 0..1) : petit changement pour éveiller l'attention, sans casser l'ambiance :
 *      tempo un peu plus vif, pouls de cœur, bourdon grave, « ping » aigu, couleur modale (sol mineur) sur la 3e mesure.
 *   3. COMBAT (setBattle) : épique et intense. Ré mineur, ~148 BPM, grosse caisse et caisse claire, basse
 *      en croches, cuivres, mélodie héroïque. Réservé aux affrontements.
 * Trois MONDES, trois airs calmes (setWorld, choisis à l'écoute par le PO) : GitHubia en ré majeur (ukulélé du matin : accords grattés, basse douce, sifflement),
 * la Tour du Serpent de Python en sol majeur (kalimba de bambou sur un bourdon, tambour sourd, pluie légère), la Galaxie JavaScript en mi majeur
 * (vibraphone cosmique, basse qui marche, balais). Le combat reste épique dans les trois, transposé dans la tonalité du monde.
 * API : unlock() (geste utilisateur), setWorld(0..2), setMood(0..1) = tension, setBattle(bool), hit(), victory(), toggle(), state(), level().
 */
(function () {
  "use strict";

  var KEY = "octocat-code:music:v2", VOL_KEY = "octocat-code:volume"; // v2 : repart de « son activé »

  /* ---------- théorie (pure, testée sous Node) ---------- */

  var ROOT = 50; // ré 3 (MIDI) ; change avec le monde (setWorld)
  var SCALE_CALM = [0, 2, 4, 7, 9];     // pentatonique majeure
  var SCALE_ALERT = [0, 3, 5, 7, 8];    // couleur mineure empruntée
  // une mesure par accord : I – vi – IV – V7 (Ré, Si m, Sol, La 7)
  var CHORDS_CALM = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5]];
  var CHORD_BORROW = [-7, -4, 0, 3];    // Sol mineur 7 : remplace le Sol majeur en alerte
  // combat : Ré m – Si♭ – Sol m – La
  var CHORDS_BATTLE = [[0, 3, 7, 12], [-4, 0, 3, 8], [-7, -4, 0, 5], [-5, -1, 2, 7]];

  // thème calme : [pas, hauteur au-dessus de ré 4, durée en pas] — 4 mesures de 16 doubles-croches
  var MELODY_CALM = [
    [[0, 4, 2], [2, 7, 2], [4, 12, 4], [8, 9, 2], [10, 7, 2], [12, 4, 4]],
    [[0, 12, 2], [2, 9, 2], [4, 7, 4], [8, 4, 2], [10, 7, 2], [12, 9, 4]],
    [[0, 9, 2], [2, 12, 2], [4, 14, 4], [8, 12, 2], [10, 9, 2], [12, 5, 4]],
    [[0, 7, 2], [2, 11, 2], [4, 14, 2], [6, 11, 2], [8, 7, 4], [12, 7, 2], [14, 11, 2]]
  ];
  // thème de combat : motif héroïque en mineur
  var MELODY_BATTLE = [
    [[0, 12, 3], [3, 10, 1], [4, 12, 4], [8, 15, 4], [12, 14, 2], [14, 12, 2]],
    [[0, 10, 3], [3, 8, 1], [4, 10, 4], [8, 12, 4], [12, 10, 2], [14, 8, 2]],
    [[0, 8, 3], [3, 7, 1], [4, 8, 4], [8, 12, 4], [12, 14, 2], [14, 15, 2]],
    [[0, 14, 3], [3, 11, 1], [4, 14, 4], [8, 16, 2], [10, 14, 2], [12, 11, 4]]
  ];

  /* ---------- les mondes : tonalité, tempo, timbre, mélodie ---------- */
  // Le calme de chaque monde a son propre style (choisi par le PO à l'écoute, atelier de sons) : un air doux sans grosse caisse ni charleston.
  // `fightAdd` garde le tempo de combat d'avant (108 + 48 = 156 BPM dans le monde 1, 116 + 48 = 164 dans le 2) : le combat reste épique.
  var BASE_BPM = 100, FIGHT_ADD = 48, WORLD = 0, TIMBRE = "bell", STYLE = "uke";
  var PROFILES = [
    null, // monde 0 : les valeurs ci-dessus (ré majeur, ukulélé du matin, glockenspiel pour la victoire)
    { root: 55, bpm: 80, fightAdd: 76, timbre: "marimba", style: "kalimba" }, // monde 1 : sol majeur, kalimba de bambou
    { root: 52, bpm: 86, fightAdd: 78, timbre: "chip", style: "vibe" }        // monde 2 : mi majeur, vibraphone cosmique
  ];

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  /** Tempo : 100 BPM au calme dans le monde 0 (80 / 86 dans les autres), jusqu'à +12 en alerte ; le combat remonte au tempo épique du monde (148 / 156 / 164). */
  function bpmFor(tension, fight) {
    return BASE_BPM + 12 * clamp(tension, 0, 1) + FIGHT_ADD * clamp(fight || 0, 0, 1);
  }
  /** Note d'ornement : pentatonique claire ; la couleur d'alerte n'apparaît que lorsque la tension monte. */
  function pickNote(tension, rnd) {
    var scale = rnd() < clamp(tension, 0, 1) * 0.35 ? SCALE_ALERT : SCALE_CALM;
    var degree = scale[Math.floor(rnd() * scale.length)];
    return ROOT + 12 + degree + (rnd() < 0.4 ? 12 : 0);
  }
  /** Accord de la mesure `bar` (boucle sur 4). */
  function chordFor(battle, tension, bar) {
    var i = ((bar % 4) + 4) % 4;
    if (battle) return CHORDS_BATTLE[i];
    return tension > 0.5 && i === 2 ? CHORD_BORROW : CHORDS_CALM[i];
  }
  /** Note du thème au pas `pos` de la mesure `bar` (sans tonalité d'alerte) ; null si rien ne démarre. */
  function melodyAt(battle, bar, pos) {
    var line = (battle ? MELODY_BATTLE : MELODY_CALM)[((bar % 4) + 4) % 4], i;
    for (i = 0; i < line.length; i++) if (line[i][0] === pos) return line[i];
    return null;
  }

  /* ---------- moteur audio ---------- */

  // out = volume général (musique + effets) ; master = musique seule (♪ OFF la coupe) ; sfx = effets sonores (indépendants de la musique)
  var ctx = null, out, sfx, master, analyser, padCalm, padFight, padAlert, drumBus, arpBus, noiseBuf, calmIn, verbIn;
  var CALM_GAIN = 2.2; // les instruments doux sont écrits bas : ce gain les met au niveau du reste
  var running = false, muted = false, timer = null;
  var base = 0, spike = 0, tension = 0, fight = 0, battle = false;
  var step = 0, nextTime = 0;
  var rnd = Math.random;
  // Appareils modestes (Android d'entrée de gamme, vieux portables) : moins d'oscillateurs et moins de réveils du processeur.
  var nav = typeof navigator === "object" && navigator ? navigator : {};
  var lite = /Android|Mobi|iPhone|iPad/i.test(nav.userAgent || "") || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
  var LOOKAHEAD = lite ? 0.3 : 0.15, EVERY = lite ? 60 : 25; // secondes d'avance / période du planificateur (ms)

  var volume = 0.8; // 0..1, courbe quadratique (l'oreille perçoit le volume de façon logarithmique)
  try {
    muted = window.localStorage.getItem(KEY) === "off";
    var saved = parseFloat(window.localStorage.getItem(VOL_KEY));
    if (saved >= 0 && saved <= 1) volume = saved;
  } catch { /* stockage indisponible */ }
  function masterTarget() { return 0.6 * volume * volume; }

  function init() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    out = ctx.createGain(); out.gain.value = 0;
    master = ctx.createGain(); master.gain.value = 0; // la musique démarre en fondu (begin)
    sfx = ctx.createGain(); sfx.gain.value = 1;
    var comp = ctx.createDynamicsCompressor();
    analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    master.connect(out); sfx.connect(out); out.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);

    padCalm = ctx.createGain(); padFight = ctx.createGain(); padAlert = ctx.createGain();
    drumBus = ctx.createGain(); arpBus = ctx.createGain();
    padCalm.connect(master); padFight.connect(master); padAlert.connect(master); drumBus.connect(master);
    padFight.gain.value = 0; padAlert.gain.value = 0;
    // écho filtré sur les mélodies : de la profondeur pour presque rien
    var delay = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    delay.delayTime.value = 0.3; fb.gain.value = 0.3; lp.type = "lowpass"; lp.frequency.value = 2600;
    arpBus.connect(master); arpBus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);

    // musique calme : tout passe par calmIn (qui suit le fondu padCalm quand le combat arrive) ; un peu de réverbération partagée, sauf sur appareil modeste
    calmIn = ctx.createGain(); calmIn.gain.value = CALM_GAIN; calmIn.connect(padCalm);
    if (!lite) {
      var cv = ctx.createConvolver(), wg = ctx.createGain(), len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate), c, j, st, ch;
      for (c = 0; c < 2; c++) {
        ch = ir.getChannelData(c); st = 0;
        for (j = 0; j < len; j++) { st += (Math.random() * 2 - 1 - st) * 0.35; ch[j] = st * Math.pow(1 - j / len, 3.2); }
      }
      cv.buffer = ir; wg.gain.value = 0.5;
      verbIn = ctx.createGain(); verbIn.connect(cv); cv.connect(wg); wg.connect(out);
    }

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(type, hz, t, dur, vol, dest, attack, filterHz) {
    var o = ctx.createOscillator(), g = ctx.createGain(), out = g;
    o.type = type; o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (filterHz) { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filterHz; g.connect(f); out = f; }
    out.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /** Note de glockenspiel / marimba : fondamentale triangle + harmonique sinus qui s'éteint vite. */
  function bell(midi, t, dur, vol, dest) {
    var hz = midiToHz(midi);
    if (TIMBRE === "marimba") { // jungle : un son de bois, court et rond
      tone("sine", hz, t, Math.min(dur, 0.5), vol * 1.15, dest, 0.002);
      tone("triangle", hz * 3.9, t, 0.07, vol * 0.3, dest, 0.001);
      return;
    }
    if (TIMBRE === "chip") { // espace : un synthé carré, adouci par un filtre
      tone("square", hz, t, Math.min(dur, 0.32), vol * 0.55, dest, 0.003, 3200);
      tone("triangle", hz * 2, t, Math.min(dur, 0.2), vol * 0.3, dest, 0.003);
      return;
    }
    tone("triangle", hz, t, dur, vol, dest, 0.004);
    tone("sine", hz * 2, t, dur * 0.45, vol * 0.45, dest, 0.003);
  }

  function noise(t, dur, vol, type, hz, dest) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = hz;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, rnd() * 0.5); s.stop(t + dur + 0.02);
  }

  /** Envoie `node` vers `dest`, plus un peu de réverbération (`wet` 0..1, ignorée sur appareil modeste). */
  function route(node, dest, wet) {
    node.connect(dest);
    if (wet && verbIn) { var s = ctx.createGain(); s.gain.value = wet * (dest === sfx ? 1 : CALM_GAIN); node.connect(s); s.connect(verbIn); }
  }

  /** Glissando d'un oscillateur (effets sonores). `lp` = filtre passe-bas, `wet` = réverbération, `atk` = attaque douce (évite le « clic » des sinus). */
  function sweep(type, f0, f1, t, dur, vol, lp, wet, atk) {
    var o = ctx.createOscillator(), g = ctx.createGain(), last = g, fl;
    o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (atk) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); } else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (lp) { fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; g.connect(fl); last = fl; }
    route(last, sfx, wet);
    o.start(t); o.stop(t + dur + 0.03);
  }

  /* ---------- instruments doux de la musique calme (écrits pour être agréables longtemps : sinus, cordes pincées, peu d'aigus) ---------- */
  var CH = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16] }; // accords par degré (demi-tons depuis la tonique)
  var PEN = [0, 2, 4, 7, 9];
  // 8 mesures par style, la tonique et le style viennent du monde
  var CALM = {
    uke: { root: 62, prog: ["I", "V", "vi", "IV", "I", "IV", "V", "I"] },
    kalimba: { root: 55, prog: ["I", "vi", "IV", "V", "I", "iii", "IV", "V"] },
    vibe: { root: 52, prog: ["ii", "V", "I", "vi", "ii", "V", "I", "I"] }
  };
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  /** Oscillateur à enveloppe douce (attaque `atk`, extinction exponentielle) vers la musique calme (ou `dest`). */
  function osc(type, hz, t, dur, vol, atk, wet, lp, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain(), last = g, fl;
    o.type = type; o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (atk || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (lp) { fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; g.connect(fl); last = fl; }
    route(last, dest || calmIn, wet);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function brush(t, dur, vol, hz, wet) { // souffle de balais : le bruit monte puis retombe
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = hz; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); route(g, calmIn, wet);
    s.start(t, rnd() * 0.5); s.stop(t + dur + 0.02);
  }
  function thump(t, vol) { // tambour sourd
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.14);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g); route(g, calmIn, 0.05); o.start(t); o.stop(t + 0.3);
  }
  function wood(t, vol) { osc("sine", 780, t, 0.05, vol, 0.001, 0.15); }
  function kalimba(midi, t, vol) {
    var f = midiToHz(midi);
    osc("sine", f, t, 1.1, vol, 0.002, 0.45);
    osc("sine", f * 5.4, t, 0.06, vol * 0.2, 0.001, 0.2);
  }
  function vibe(midi, t, vol) { // vibraphone : sinus + tremolo lent
    var f = midiToHz(midi), o = ctx.createOscillator(), g = ctx.createGain(), tr = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    tr.gain.value = 0.75; lfo.frequency.value = 4.6; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(tr.gain);
    o.connect(g); g.connect(tr); route(tr, calmIn, 0.45);
    o.start(t); o.stop(t + 2.3); lfo.start(t); lfo.stop(t + 2.3);
    osc("sine", f * 4, t, 0.35, vol * 0.12, 0.002, 0.3);
  }
  var ksCache = {};
  function pluckBuf(midi) { // corde pincée (Karplus-Strong) calculée une fois par note
    if (ksCache[midi]) return ksCache[midi];
    var sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / midiToHz(midi))), len = Math.floor(sr * (lite ? 1.2 : 1.7)), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), line = new Float32Array(N), i, p, j;
    for (i = 0; i < N; i++) line[i] = Math.random() * 2 - 1;
    for (p = 0; p < 2; p++) for (i = N - 1; i > 0; i--) line[i] = 0.5 * (line[i] + line[i - 1]);
    for (i = 0; i < len; i++) { j = i % N; d[i] = line[j]; line[j] = 0.997 * 0.5 * (line[j] + line[(j + 1) % N]); }
    ksCache[midi] = buf; return buf;
  }
  function pluck(midi, t, vol) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = pluckBuf(midi); f.type = "lowpass"; f.frequency.value = 2600;
    g.gain.setValueAtTime(vol * 2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    s.connect(f); f.connect(g); route(g, calmIn, 0.4); s.start(t); s.stop(t + s.buffer.duration);
  }
  function whistle(midi, t, dur, vol) { // sifflement : sinus avec vibrato, un souffle léger
    var f = midiToHz(midi), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    var atk = Math.min(0.14, dur * 0.4), nz = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(), end = t + dur + 0.15;
    o.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = 0.12;
    lfo.frequency.value = 5; lg.gain.value = f * 0.004; lfo.connect(lg); lg.connect(o.frequency);
    [[g, vol], [ng, vol * 0.22]].forEach(function (p) {
      p[0].gain.setValueAtTime(0.0001, t); p[0].gain.linearRampToValueAtTime(p[1], t + atk);
      p[0].gain.setValueAtTime(p[1], t + dur - 0.12); p[0].gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    });
    o.connect(g); o2.connect(g2); g2.connect(g);
    nz.buffer = noiseBuf; nf.type = "bandpass"; nf.frequency.value = f * 2; nf.Q.value = 2; nz.connect(nf); nf.connect(ng);
    route(g, calmIn, 0.45); route(ng, calmIn, 0.45);
    o.start(t); o2.start(t); lfo.start(t); nz.start(t, rnd() * 0.5);
    o.stop(end); o2.stop(end); lfo.stop(end); nz.stop(end);
  }
  function softPad(notes, t, dur, vol, lp) { // nappe : triangles légèrement désaccordés, très filtrés
    notes.forEach(function (m) {
      (lite ? [0] : [-6, 6]).forEach(function (dt) {
        var o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
        o.type = "triangle"; o.frequency.value = midiToHz(m); o.detune.value = dt;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * (lite ? 1.6 : 1), t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
        fl.type = "lowpass"; fl.frequency.value = lp;
        o.connect(g); g.connect(fl); route(fl, calmIn, 0.5);
        o.start(t); o.stop(t + dur * 1.1);
      });
    });
  }

  /** Un huitième de la musique calme du monde : `b` = mesure (0..7), `i` = huitième (0..7), `e` = durée d'un huitième. Le hasard (ornements) change à chaque tour. */
  function calmEighth(style, b, i, t, e) {
    var def = CALM[style], c = CH[def.prog[b]], R = def.root, k;
    if (style === "uke") { // ukulélé du matin : accords grattés, basse douce, petit sifflement
      var strums = { 0: 0.06, 2: 0.035, 3: 0.05, 5: 0.035, 7: 0.04 };
      if (strums[i]) [R + c[0], R + c[1], R + c[2], R + c[0] + 12].forEach(function (m, n) { pluck(m, t + n * 0.016, strums[i]); });
      if (i === 0) pluck(R - 12 + c[0], t, 0.1);
      if (i === 4) pluck(R - 12 + c[2], t, 0.07);
      if (i === 2 || i === 6) wood(t, 0.02);
      if ((i === 0 || i === 4) && b % 2 === 1) whistle(R + 24 + pick(PEN), t, e * 3, 0.03);
    } else if (style === "kalimba") { // kalimba de bambou : notes espacées sur un bourdon, tambour sourd, pluie très légère
      if (i === 0) { kalimba(R + 12 + pick(c), t, 0.08); softPad([R - 12, R - 5], t, e * 8, 0.035, 400); }
      else if (rnd() < (i % 2 === 0 ? 0.55 : 0.2)) kalimba(R + 12 + pick(PEN) + (rnd() < 0.3 ? 12 : 0), t, 0.06);
      if (i === 0) thump(t, 0.12); else if (i === 4) thump(t, 0.09);
      if (rnd() < 0.35) brush(t, 0.3, 0.01, 6000, 0.2);
    } else { // vibraphone cosmique : accords et notes de vibraphone, basse qui marche, balais
      if (i === 0) [c[0], c[1], c[2]].forEach(function (x) { vibe(R + 12 + x, t, 0.05); });
      else if ((i === 2 || i === 4 || i === 6) && rnd() < 0.55) vibe(R + 24 + pick(PEN), t, 0.05);
      if (i % 2 === 0) { k = [c[0], c[1], c[2], c[1]][i / 2]; osc("sine", midiToHz(R - 12 + k), t, e * 1.7, 0.1, 0.02, 0); }
      if (i === 2 || i === 6) brush(t, e * 1.2, 0.012, 5000, 0.2);
    }
  }

  /** Souffle qui monte puis retombe (le filtre glisse de f0 à f1) : l'air aspiré par le portail. */
  function swell(t, dur, vol, f0, f1) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = "bandpass"; f.Q.value = 0.8;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx);
    s.start(t, rnd() * 0.5); s.stop(t + dur + 0.02);
  }

  /** Prépare l'audio pour les effets, même musique coupée (nécessite un geste préalable de l'utilisateur, déjà fait en jeu). */
  function ensureCtx() {
    if (!ctx && !init()) return false;
    if (ctx.state === "suspended" && !document.hidden) ctx.resume();
    if (out.gain.value < 0.001) out.gain.setValueAtTime(masterTarget(), ctx.currentTime); // premier effet : volume tout de suite
    else out.gain.setTargetAtTime(masterTarget(), ctx.currentTime, 0.05);
    return true;
  }

  var lastSfx = {};
  /** Effets sonores de jeu, synthétisés (aucun fichier) : jump, djump, land, bit, heart, hit, kill, stomp, hurt, swing, throw, checkpoint, finish, laser, boing, crumble, boom, bomb, ufo, wave, portal-open, portal. */
  function playSfx(name) {
    if (window.OctoSettings && window.OctoSettings.get("sfx") === false) return;
    if (!ensureCtx()) return;
    var t = ctx.currentTime;
    if (lastSfx[name] && t - lastSfx[name] < 0.04) return; // évite les rafales
    lastSfx[name] = t;
    switch (name) {
      // effets doux (choisis par le PO à l'écoute) : sinus arrondis, plus graves, un peu d'écho, à la place des carrés et dents de scie perçants
      case "jump": sweep("sine", 260, 470, t, 0.16, 0.1, 1800, 0.2, 0.01); break;
      case "djump": sweep("sine", 360, 620, t, 0.16, 0.1, 1800, 0.2, 0.01); break;
      case "land": noise(t, 0.05, 0.05, "lowpass", 600, sfx); break;
      case "bit": osc("sine", 659, t, 0.2, 0.09, 0.004, 0.4, 0, sfx); osc("sine", 988, t + 0.08, 0.35, 0.08, 0.004, 0.5, 0, sfx); break;
      case "heart": [523, 659, 784].forEach(function (f, i) { tone("triangle", f, t + i * 0.07, 0.2, 0.09, sfx, 0.004); }); break;
      case "swing": noise(t, 0.14, 0.2, "bandpass", 1500, sfx); sweep("triangle", 620, 240, t, 0.11, 0.07); break; // « fouiii » : souffle + glissando, même dans le vide
      case "hit": noise(t, 0.08, 0.12, "bandpass", 1400, sfx); sweep("square", 220, 110, t, 0.09, 0.06); break;
      case "kill": sweep("sine", 420, 150, t, 0.16, 0.1, 1200, 0.1, 0.006); noise(t, 0.08, 0.04, "lowpass", 900, sfx); break;
      case "stomp": sweep("sine", 320, 130, t, 0.12, 0.1, 1200, 0.1, 0.006); break;
      case "hurt": sweep("sine", 240, 130, t, 0.3, 0.14, 900, 0.15, 0.01); sweep("sine", 120, 60, t, 0.24, 0.08); break;
      case "throw": sweep("triangle", 1000, 500, t, 0.12, 0.07); break;
      case "checkpoint": [392, 523, 659].forEach(function (f, i) { tone("triangle", f, t + i * 0.09, 0.3, 0.09, sfx, 0.004); }); break;
      case "star": [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone("triangle", f, t + i * 0.06, 0.28, 0.1, sfx, 0.004); tone("square", f * 2, t + i * 0.06, 0.1, 0.03, sfx, 0.004); }); break;
      case "power": [784, 988, 1175, 1568].forEach(function (f, i) { tone("sawtooth", f, t + i * 0.05, 0.14, 0.05, sfx, 0.004, 3000); }); break;
      case "crate": noise(t, 0.12, 0.13, "bandpass", 900, sfx); sweep("square", 180, 80, t, 0.1, 0.07); break;
      case "crate-hit": noise(t, 0.06, 0.09, "bandpass", 1200, sfx); break;
      case "shot": sweep("triangle", 700, 350, t, 0.1, 0.05); break;
      case "dash": noise(t, 0.16, 0.08, "bandpass", 2200, sfx); sweep("sawtooth", 200, 520, t, 0.16, 0.05); break;
      case "bark": [0, 0.17].forEach(function (dt2) { sweep("triangle", 430, 290, t + dt2, 0.13, 0.1, 1100, 0.1, 0.008); noise(t + dt2, 0.06, 0.02, "lowpass", 900, sfx); }); break;
      case "scare": sweep("triangle", 500, 1100, t, 0.14, 0.06); sweep("triangle", 1100, 700, t + 0.14, 0.1, 0.05); break;
      case "snuff": noise(t, 0.3, 0.14, "bandpass", 760, sfx); sweep("triangle", 540, 120, t, 0.32, 0.06); tone("triangle", 1760, t + 0.14, 0.18, 0.05, sfx, 0.003); tone("triangle", 2349, t + 0.2, 0.2, 0.04, sfx, 0.003); break; // « pschiit » magique
      case "magic": [523, 659, 784, 988, 1175, 1568, 1976, 2349, 3136].forEach(function (f, i) { tone("triangle", f, t + i * 0.07, 0.42, 0.08, sfx, 0.004); tone("sine", f * 2, t + i * 0.07 + 0.02, 0.3, 0.035, sfx, 0.004); }); noise(t + 0.55, 0.5, 0.05, "highpass", 5000, sfx); break; // glissando scintillant
      case "finish": [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, t + i * 0.08, 0.5, 0.1, sfx, 0.004); }); break;
      case "portal-open": sweep("sine", 150, 330, t, 0.5, 0.08); [392, 523, 659, 784].forEach(function (f, i) { tone("sine", f, t + 0.08 + i * 0.08, 0.5, 0.07, sfx, 0.01); }); break; // le portail s'ouvre : bourdon qui monte + petit accord doux
      case "portal": swell(t, 0.7, 0.16, 400, 2600); sweep("sine", 240, 900, t, 0.65, 0.06); tone("sine", 1319, t + 0.5, 0.35, 0.06, sfx, 0.01); tone("sine", 1760, t + 0.58, 0.4, 0.05, sfx, 0.01); break; // OctoCat est aspiré : souffle qui monte, puis scintillement
      case "laser": sweep("sine", 900, 520, t, 0.14, 0.07, 1600, 0.3, 0.008); break; // plip
      case "boing": sweep("sine", 200, 520, t, 0.26, 0.12, 1500, 0.3, 0.01); break; // ressort
      case "crumble": noise(t, 0.2, 0.1, "lowpass", 500, sfx); noise(t + 0.08, 0.14, 0.07, "bandpass", 900, sfx); break;
      case "boom": noise(t, 0.7, 0.28, "lowpass", 700, sfx); sweep("sawtooth", 220, 40, t, 0.6, 0.14); noise(t + 0.1, 0.5, 0.12, "bandpass", 1500, sfx); break; // le gardien explose
      case "bomb": sweep("triangle", 520, 300, t, 0.12, 0.04); break;
      case "ufo": [880, 660, 880, 660, 990].forEach(function (f, i) { tone("sine", f, t + i * 0.07, 0.1, 0.05, sfx, 0.004); }); break;
      case "wave": [196, 247, 196, 247].forEach(function (f, i) { tone("sawtooth", f, t + i * 0.12, 0.16, 0.06, sfx, 0.004, 900); }); break;
      default: break;
    }
  }

  function kick(t, vol, deep) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(deep ? 150 : 110, t); o.frequency.exponentialRampToValueAtTime(deep ? 40 : 52, t + (deep ? 0.13 : 0.1));
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (deep ? 0.26 : 0.18));
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.3);
  }

  /** Une nappe par mesure : douce (calme), puissante (combat), grave (bourdon d'alerte). */
  function pad(t, dur, bar) {
    function note(midi, type, bus, vol, cutoff, detune) {
      var o = ctx.createOscillator(), g = ctx.createGain(), out = g, up = dur * 0.3;
      o.type = type; o.frequency.value = midiToHz(midi); o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + up);
      g.gain.setValueAtTime(vol, t + dur - up);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
      o.connect(g);
      if (cutoff) { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; g.connect(f); out = f; }
      out.connect(bus);
      o.start(t); o.stop(t + dur + 0.3);
    }
    if (battle || fight > 0.02) {
      chordFor(true, 0, bar).forEach(function (semi, i) {
        (lite ? [0] : [-6, 6]).forEach(function (d) { note(ROOT + semi + (i === 0 ? -12 : 0), "sawtooth", padFight, lite ? 0.06 : 0.04, 1100, d); });
      });
    }
    if (!battle && tension > 0.05) { // bourdon grave : ré + la
      note(ROOT - 12, "sawtooth", padAlert, 0.05, 240, 0);
      note(ROOT - 5, "sawtooth", padAlert, 0.035, 240, 3);
    }
  }

  /** Musique calme / alerte : un air doux par monde (calmEighth), sans grosse caisse ni charleston ; l'alerte ajoute pouls, « ping » et pizzicato par-dessus. */
  function calmStep(s, t, stepDur, bar, pos) {
    var chord = chordFor(false, tension, bar), bassHz = midiToHz(ROOT + chord[0] - 12);
    if (pos % 2 === 0) calmEighth(STYLE, Math.floor(s / 16) % 8, pos >> 1, t, stepDur * 2);

    // alerte : pouls de cœur, « ping » aigu, pizzicato plus nerveux
    if (tension > 0.25 && (pos === 0 || pos === 3)) kick(t, 0.1 + 0.3 * tension, false);
    if (tension > 0.5 && pos % 8 === 4) tone("sine", midiToHz(ROOT + 31), t, 0.35, 0.05, arpBus, 0.004);
    if (tension > 0.4 && (pos === 2 || pos === 10)) tone("triangle", bassHz * 2, t, stepDur * 1.2, 0.07 * tension, master, 0.004, 800);
  }

  /** Musique de combat : épique et intense. */
  function battleStep(s, t, stepDur, bar, pos) {
    var chord = chordFor(true, 0, bar), bassHz = midiToHz(ROOT + chord[0] - 12);

    // mélodie héroïque (scie + carré, écho)
    var m = melodyAt(true, bar, pos);
    if (m) {
      var hz = midiToHz(ROOT + 12 + m[1]), dur = stepDur * m[2] * 1.05;
      tone("sawtooth", hz, t, dur, 0.07, arpBus, 0.01, 3400);
      if (!lite) tone("square", hz * 0.5, t, dur, 0.035, arpBus, 0.01, 1800);
    }
    // basse en croches, octave sur le contretemps
    if (pos % 2 === 0) tone("sawtooth", bassHz * (pos % 8 === 6 ? 2 : 1), t, stepDur * 1.7, 0.17, master, 0.004, 520);
    // cuivres : accords martelés sur le 1 et le « et » du 2
    if (pos === 0 || pos === 6 || (pos === 10 && bar % 2 === 1)) {
      chord.slice(0, 3).forEach(function (semi) { tone("sawtooth", midiToHz(ROOT + semi), t, stepDur * 3.2, 0.05, master, 0.012, 1900); });
    }
    // batterie
    if (pos % 4 === 0 || pos === 10) kick(t, 0.75, true);
    if (pos === 4 || pos === 12) { noise(t, 0.16, 0.16, "bandpass", 1900, drumBus); tone("triangle", 190, t, 0.1, 0.08, drumBus, 0.002); }
    if (bar === 3 && pos >= 12) noise(t, 0.08, 0.12, "bandpass", 2200, drumBus); // roulement de fin de boucle
    if (pos % 2 === 0) noise(t, 0.035, pos % 4 === 2 ? 0.07 : 0.045, "highpass", 7500, drumBus);
    if (pos === 0 && bar === 0) noise(t, 0.9, 0.09, "highpass", 5500, drumBus); // cymbale au début de chaque boucle
  }

  function scheduleStep(s, t, stepDur) {
    var bar = Math.floor(s / 16) % 4, pos = s % 16;
    if (pos === 0) pad(t, stepDur * 16, bar);
    if (battle) battleStep(s, t, stepDur, bar, pos); else calmStep(s, t, stepDur, bar, pos);
  }

  function tick() {
    if (!running || !ctx) return;
    var k = EVERY / 25; // lissages exprimés pour une période de 25 ms
    spike *= Math.pow(0.985, k);
    tension += (clamp(base + spike, 0, 1) - tension) * 0.04 * k;
    fight += ((battle ? 1 : 0) - fight) * 0.03 * k;
    var now = ctx.currentTime;
    padCalm.gain.setTargetAtTime(1 - fight, now, 0.3);
    padFight.gain.setTargetAtTime(fight, now, 0.3);
    padAlert.gain.setTargetAtTime(clamp(tension * 1.2 - 0.1, 0, 1) * (1 - fight), now, 0.5);
    var stepDur = 60 / bpmFor(tension, fight) / 4;
    while (nextTime < now + LOOKAHEAD) {
      scheduleStep(step, nextTime, stepDur);
      nextTime += stepDur; step += 1;
    }
  }

  function begin() {
    if (running || muted) return;
    if (!ctx && !init()) return;
    ctx.resume();
    running = true;
    nextTime = ctx.currentTime + 0.1;
    ensureCtx();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(1, ctx.currentTime, 0.8); // fondu d'entrée
    timer = window.setInterval(tick, EVERY);
  }

  function halt() {
    if (!running) return;
    running = false;
    window.clearInterval(timer);
    if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); // la musique seule : les effets restent audibles
  }

  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  var Music = {
    /** À appeler depuis un geste utilisateur (politique d'autoplay des navigateurs). */
    unlock: function () { begin(); },
    /** Le monde en cours (0 GitHubia, 1 Python, 2 JavaScript) : change de tonalité, de tempo, de timbre et de mélodie ; le morceau repart de la mesure en cours. */
    setWorld: function (w) {
      w = w === 1 || w === 2 ? w : 0;
      if (w === WORLD) return;
      WORLD = w;
      var pr = PROFILES[w];
      ROOT = pr ? pr.root : 50; BASE_BPM = pr ? pr.bpm : 100; FIGHT_ADD = pr ? pr.fightAdd : 48; TIMBRE = pr ? pr.timbre : "bell"; STYLE = pr ? pr.style : "uke";
    },
    world: function () { return WORLD; },
    /** Tension 0..1 : 0 = calme joyeux ; plus haut = alerte (changement léger). Le combat passe par setBattle. */
    setMood: function (m) { base = clamp(m, 0, 1); },
    /** Combat : musique épique et intense (true), retour au calme (false). */
    setBattle: function (on) {
      on = !!on;
      if (on === battle) return;
      battle = on;
      if (!running || !ctx) return;
      var t = ctx.currentTime;
      if (on) { // choc d'entrée : cymbale + grosse caisse
        noise(t, 1.2, 0.2, "highpass", 4500, drumBus);
        kick(t, 0.9, true);
        tone("sawtooth", midiToHz(ROOT - 12), t, 0.8, 0.2, master, 0.005, 500);
      } else {
        tone("triangle", midiToHz(ROOT + 24), t, 1, 0.08, arpBus, 0.01);
      }
    },
    /** Coup dur (erreur) : petit accord grave et pic de tension qui retombe (jamais de combat). */
    hit: function () {
      spike = Math.max(spike, 0.35);
      if (!running || !ctx) return;
      var t = ctx.currentTime;
      tone("sawtooth", 55, t, 0.45, 0.16, master, 0.005, 500);
      tone("sawtooth", 58.3, t, 0.45, 0.12, master, 0.005, 500);
      noise(t, 0.2, 0.1, "lowpass", 900, drumBus);
    },
    /** Victoire : arpège majeur ascendant, retour au calme joyeux. */
    victory: function () {
      base = 0; spike = 0; battle = false;
      if (!running || !ctx) return;
      var t = ctx.currentTime + 0.05;
      [74, 78, 81, 86, 90].forEach(function (n, i) { bell(n, t + i * 0.09, 0.9, 0.12, arpBus); });
    },
    toggle: function () {
      muted = !muted;
      try { window.localStorage.setItem(KEY, muted ? "off" : "on"); } catch { /* ignoré */ }
      if (muted) halt(); else begin();
      return muted;
    },
    sfx: playSfx,
    isMuted: function () { return muted; },
    isRunning: function () { return running; },
    /** Volume 0..1, mémorisé ; s'applique immédiatement. */
    setVolume: function (v) {
      volume = clamp(+v || 0, 0, 1);
      try { window.localStorage.setItem(VOL_KEY, String(volume)); } catch { /* ignoré */ }
      if (ctx) out.gain.setTargetAtTime(masterTarget(), ctx.currentTime, 0.05);
    },
    getVolume: function () { return volume; },
    state: function () {
      return { running: running, muted: muted, tension: tension, fight: fight, battle: battle, bpm: bpmFor(tension, fight), ctx: ctx ? ctx.state : "none" };
    },
    /** Niveau sonore instantané (RMS 0..1), pour les tests et un éventuel visualiseur. */
    level: function () {
      if (!analyser) return 0;
      var buf = new Uint8Array(analyser.fftSize), sum = 0, i;
      analyser.getByteTimeDomainData(buf);
      for (i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / buf.length);
    },
    _theory: {
      ROOT: ROOT, SCALE_CALM: SCALE_CALM, SCALE_ALERT: SCALE_ALERT, MELODY_CALM: MELODY_CALM, MELODY_BATTLE: MELODY_BATTLE,
      lite: lite, midiToHz: midiToHz, bpmFor: bpmFor, pickNote: pickNote, chordFor: chordFor, melodyAt: melodyAt
    }
  };

  window.OctoMusic = Music;
})();
