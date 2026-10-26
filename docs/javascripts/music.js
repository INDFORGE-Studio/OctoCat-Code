/* OctoCat-Code — Musique d'ambiance adaptative, 100 % synthétisée (WebAudio).
 * Aucun fichier audio, aucun échantillon, aucun droit : tout est généré par ce code.
 *
 * Trois états, du plus doux au plus intense :
 *   1. CALME (par défaut) : joyeux, entraînant et doux. Ré majeur, ~100 BPM, thème accrocheur au « glockenspiel »,
 *      basse sautillante, nappe douce, percussions feutrées.
 *   2. ALERTE (curseur « tension » 0..1) : petit changement pour éveiller l'attention, sans casser l'ambiance :
 *      tempo un peu plus vif, pouls de cœur, bourdon grave, « ping » aigu, couleur modale (sol mineur) sur la 3e mesure.
 *   3. COMBAT (setBattle) : épique et intense. Ré mineur, ~148 BPM, grosse caisse et caisse claire, basse
 *      en croches, cuivres, mélodie héroïque. Réservé aux affrontements.
 * API : unlock() (geste utilisateur), setMood(0..1) = tension, setBattle(bool), hit(), victory(), toggle(), state(), level().
 */
(function () {
  "use strict";

  var KEY = "octocat-code:music:v2", VOL_KEY = "octocat-code:volume"; // v2 : repart de « son activé »

  /* ---------- théorie (pure, testée sous Node) ---------- */

  var ROOT = 50; // ré 3 (MIDI)
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

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  /** Tempo : 100 BPM au calme, jusqu'à 112 en alerte, 148 en combat. */
  function bpmFor(tension, fight) {
    return 100 + 12 * clamp(tension, 0, 1) + 48 * clamp(fight || 0, 0, 1);
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
  var ctx = null, out, sfx, master, analyser, padCalm, padFight, padAlert, drumBus, arpBus, noiseBuf;
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

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
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

  /** Glissando d'un oscillateur (effets sonores). */
  function sweep(type, f0, f1, t, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.03);
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
  /** Effets sonores de jeu, synthétisés (aucun fichier) : jump, djump, land, bit, heart, hit, kill, stomp, hurt, swing, throw, checkpoint, finish, laser, boing, crumble, boom, bomb, ufo, wave. */
  function playSfx(name) {
    if (window.OctoSettings && window.OctoSettings.get("sfx") === false) return;
    if (!ensureCtx()) return;
    var t = ctx.currentTime;
    if (lastSfx[name] && t - lastSfx[name] < 0.04) return; // évite les rafales
    lastSfx[name] = t;
    switch (name) {
      case "jump": sweep("square", 240, 560, t, 0.14, 0.07); break;
      case "djump": sweep("square", 360, 820, t, 0.14, 0.07); break;
      case "land": noise(t, 0.05, 0.05, "lowpass", 600, sfx); break;
      case "bit": tone("triangle", 988, t, 0.09, 0.09, sfx, 0.003); tone("triangle", 1319, t + 0.07, 0.16, 0.09, sfx, 0.003); break;
      case "heart": [523, 659, 784].forEach(function (f, i) { tone("triangle", f, t + i * 0.07, 0.2, 0.09, sfx, 0.004); }); break;
      case "swing": noise(t, 0.14, 0.2, "bandpass", 1500, sfx); sweep("triangle", 620, 240, t, 0.11, 0.07); break; // « fouiii » : souffle + glissando, même dans le vide
      case "hit": noise(t, 0.08, 0.12, "bandpass", 1400, sfx); sweep("square", 220, 110, t, 0.09, 0.06); break;
      case "kill": sweep("sawtooth", 400, 90, t, 0.22, 0.08); noise(t, 0.14, 0.09, "lowpass", 1800, sfx); break;
      case "stomp": sweep("square", 300, 120, t, 0.12, 0.09); break;
      case "hurt": sweep("sawtooth", 200, 70, t, 0.28, 0.12); break;
      case "throw": sweep("triangle", 1000, 500, t, 0.12, 0.07); break;
      case "checkpoint": [392, 523, 659].forEach(function (f, i) { tone("triangle", f, t + i * 0.09, 0.3, 0.09, sfx, 0.004); }); break;
      case "star": [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone("triangle", f, t + i * 0.06, 0.28, 0.1, sfx, 0.004); tone("square", f * 2, t + i * 0.06, 0.1, 0.03, sfx, 0.004); }); break;
      case "power": [784, 988, 1175, 1568].forEach(function (f, i) { tone("sawtooth", f, t + i * 0.05, 0.14, 0.05, sfx, 0.004, 3000); }); break;
      case "crate": noise(t, 0.12, 0.13, "bandpass", 900, sfx); sweep("square", 180, 80, t, 0.1, 0.07); break;
      case "crate-hit": noise(t, 0.06, 0.09, "bandpass", 1200, sfx); break;
      case "shot": sweep("triangle", 700, 350, t, 0.1, 0.05); break;
      case "dash": noise(t, 0.16, 0.08, "bandpass", 2200, sfx); sweep("sawtooth", 200, 520, t, 0.16, 0.05); break;
      case "bark": [0, 0.15].forEach(function (dt2) { sweep("sawtooth", 560, 300, t + dt2, 0.1, 0.075); noise(t + dt2, 0.05, 0.05, "bandpass", 1500, sfx); }); break;
      case "scare": sweep("triangle", 500, 1100, t, 0.14, 0.06); sweep("triangle", 1100, 700, t + 0.14, 0.1, 0.05); break;
      case "snuff": noise(t, 0.3, 0.14, "bandpass", 760, sfx); sweep("triangle", 540, 120, t, 0.32, 0.06); tone("triangle", 1760, t + 0.14, 0.18, 0.05, sfx, 0.003); tone("triangle", 2349, t + 0.2, 0.2, 0.04, sfx, 0.003); break; // « pschiit » magique
      case "magic": [523, 659, 784, 988, 1175, 1568, 1976, 2349, 3136].forEach(function (f, i) { tone("triangle", f, t + i * 0.07, 0.42, 0.08, sfx, 0.004); tone("sine", f * 2, t + i * 0.07 + 0.02, 0.3, 0.035, sfx, 0.004); }); noise(t + 0.55, 0.5, 0.05, "highpass", 5000, sfx); break; // glissando scintillant
      case "finish": [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, t + i * 0.08, 0.5, 0.1, sfx, 0.004); }); break;
      case "laser": sweep("square", 1500, 500, t, 0.09, 0.05); break; // pew
      case "boing": sweep("sine", 180, 760, t, 0.22, 0.12); sweep("triangle", 360, 1500, t + 0.03, 0.18, 0.05); break; // ressort
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
    if (fight < 0.98) {
      chordFor(false, tension, bar).forEach(function (semi, i) {
        (lite ? [0] : [-4, 4]).forEach(function (d) { note(ROOT + semi + (i === 0 ? -12 : 0), "triangle", padCalm, lite ? 0.07 : 0.045, 0, d); });
      });
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

  /** Musique calme / alerte : légère, sautillante. */
  function calmStep(s, t, stepDur, bar, pos) {
    var chord = chordFor(false, tension, bar), alert = tension > 0.5 && bar === 2;

    // thème (en alerte, le si et le mi de la 3e mesure deviennent mineurs : la couleur change sans bruit)
    var m = melodyAt(false, bar, pos);
    if (m) {
      var n = ROOT + 12 + m[1];
      if (alert && (m[1] === 9 || m[1] === 14)) n -= 1;
      bell(n, t, Math.max(0.25, stepDur * m[2] * 1.1), 0.1, arpBus);
    }
    // ornements discrets (pentatonique), un peu plus présents quand la tension monte
    else if (!lite && pos % 2 === 1 && rnd() < 0.05 + 0.2 * tension) {
      bell(pickNote(tension, rnd) + 12, t, 0.3, 0.035, arpBus);
    }

    // basse sautillante
    var bassHz = midiToHz(ROOT + chord[0] - 12), fifthHz = midiToHz(ROOT + chord[2] - 12);
    if (pos === 0) tone("triangle", bassHz, t, stepDur * 3.5, 0.2, master, 0.006, 500);
    if (pos === 6) tone("triangle", bassHz * 2, t, stepDur * 1.8, 0.13, master, 0.006, 700);
    if (pos === 8) tone("triangle", fifthHz, t, stepDur * 3, 0.17, master, 0.006, 500);
    if (pos === 12 || pos === 14) tone("triangle", pos === 12 ? bassHz : fifthHz, t, stepDur * 1.8, 0.12, master, 0.006, 600);

    // percussions feutrées : pouls doux, charleston léger sur les contretemps
    if (pos === 0 || pos === 8) kick(t, 0.28, false);
    if (pos % 4 === 2) noise(t, 0.03, 0.02, "highpass", 8500, drumBus);
    if (pos === 4 || pos === 12) noise(t, 0.05, 0.03, "bandpass", 3200, drumBus); // petit clap

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
