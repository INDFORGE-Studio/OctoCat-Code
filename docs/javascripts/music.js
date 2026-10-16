/* OctoCat-Code — Musique d'ambiance adaptative, 100 % synthétisée (WebAudio).
 * Aucun fichier audio, aucun échantillon, aucun droit : tout est généré par ce code.
 *
 * Un curseur « danger » (0 = calme, 1 = hostile) pilote en continu :
 *   - la gamme : pentatonique majeure lumineuse (D E F# A B) ⇄ gamme sombre à triton (D Eb F G# A C) ;
 *   - le tempo : 76 → 132 BPM ;
 *   - les couches : nappes, arpèges, basse, charleston, grosse caisse, caisse claire ;
 *   - le timbre : nappes douces ⇄ nappes en dents de scie filtrées.
 * API : OctoMusic.unlock() (geste utilisateur), setMood(0..1), hit(), victory(), toggle(), state(), level().
 */
(function () {
  "use strict";

  var KEY = "octocat-code:music";

  /* ---------- théorie (pure, testée sous Node) ---------- */

  var ROOT = 50; // ré 3 (MIDI)
  var SCALE_CALM = [0, 2, 4, 7, 9];
  var SCALE_DARK = [0, 1, 3, 6, 7, 10];
  var CHORDS_CALM = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 4]];
  var CHORDS_DARK = [[0, 3, 7, 10], [1, 5, 8, 12], [-1, 2, 5, 8], [-5, -1, 2, 5]];

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function bpmFor(mood) { return 76 + 56 * Math.pow(clamp(mood, 0, 1), 1.2); }
  /** Note d'arpège : gamme sombre avec une probabilité égale au danger, sinon gamme claire. */
  function pickNote(mood, rnd) {
    var scale = rnd() < mood ? SCALE_DARK : SCALE_CALM;
    var degree = scale[Math.floor(rnd() * scale.length)];
    return ROOT + 12 + degree + (rnd() < 0.4 ? 12 : 0);
  }
  function chordFor(mood, index) {
    return (mood > 0.5 ? CHORDS_DARK : CHORDS_CALM)[((index % 4) + 4) % 4];
  }

  /* ---------- moteur audio ---------- */

  var ctx = null, master, analyser, padCalm, padDark, drumBus, arpBus, noiseBuf;
  var running = false, muted = false, timer = null;
  var base = 0.1, spike = 0, mood = 0.1;
  var step = 0, nextTime = 0;
  var rnd = Math.random;

  try { muted = window.localStorage.getItem(KEY) === "off"; } catch { /* stockage indisponible */ }

  function init() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);

    padCalm = ctx.createGain(); padDark = ctx.createGain(); drumBus = ctx.createGain(); arpBus = ctx.createGain();
    padCalm.connect(master); padDark.connect(master); drumBus.connect(master);
    // écho filtré sur les arpèges : de la profondeur pour presque rien
    var delay = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    delay.delayTime.value = 0.29; fb.gain.value = 0.32; lp.type = "lowpass"; lp.frequency.value = 2200;
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

  function noise(t, dur, vol, type, hz, dest) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = hz;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, rnd() * 0.5); s.stop(t + dur + 0.02);
  }

  function kick(t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.25);
  }

  /** Nappe d'accord sur 2 mesures (calme : sinus/triangle doux ; hostile : dents de scie filtrées). */
  function pad(t, dur, index) {
    [[CHORDS_CALM, padCalm, "triangle", 0], [CHORDS_DARK, padDark, "sawtooth", 900]].forEach(function (set) {
      var chord = set[0][((index % 4) + 4) % 4];
      chord.forEach(function (semi, i) {
        [-4, 4].forEach(function (detune) {
          var o = ctx.createOscillator(), g = ctx.createGain(), out = g;
          o.type = set[2]; o.frequency.value = midiToHz(ROOT + semi + (i === 0 ? -12 : 0)); o.detune.value = detune;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(set[3] ? 0.035 : 0.05, t + 0.9);
          g.gain.setValueAtTime(set[3] ? 0.035 : 0.05, t + dur - 1.1);
          g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
          o.connect(g);
          if (set[3]) { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = set[3]; g.connect(f); out = f; }
          out.connect(set[1]);
          o.start(t); o.stop(t + dur + 0.3);
        });
      });
    });
  }

  function scheduleStep(s, t, stepDur) {
    var m = mood, pos = s % 16;
    if (s % 32 === 0) pad(t, stepDur * 32, Math.floor(s / 32));
    var chord = chordFor(m, Math.floor(s / 32));

    // basse : toujours un pouls sur les temps forts, plus nerveuse quand le danger monte
    var bassHz = midiToHz(ROOT + chord[0] - 12);
    if (pos === 0 || pos === 8) tone(m > 0.5 ? "sawtooth" : "sine", bassHz, t, stepDur * 6, 0.16, master, 0.01, 420);
    else if (m > 0.35 && pos % 4 === 0) tone("sine", bassHz, t, stepDur * 2.5, 0.12, master, 0.01);
    if (m > 0.6 && pos % 2 === 0) tone("square", bassHz * (pos % 4 === 2 ? 2 : 1), t, stepDur * 1.4, 0.05, master, 0.004, 600);

    // arpèges : plus fréquents et plus sombres avec le danger
    if (rnd() < 0.1 + 0.3 * m + (pos % 2 === 0 ? 0.12 : 0)) {
      tone(m > 0.55 ? "square" : "triangle", midiToHz(pickNote(m, rnd)), t, 0.26 + 0.12 * (1 - m), 0.06 + 0.02 * m, arpBus, 0.004, m > 0.55 ? 2400 : 0);
    }

    // percussions : apparaissent par couches
    if (m > 0.3 && pos % 2 === 0) noise(t, 0.04, 0.025 + 0.04 * m, "highpass", 7000, drumBus);
    if (m > 0.45 && (pos === 0 || pos === 8 || (m > 0.7 && pos === 6))) kick(t, 0.55);
    if (m > 0.65 && (pos === 4 || pos === 12)) noise(t, 0.12, 0.09, "bandpass", 1800, drumBus);
  }

  function tick() {
    if (!running || !ctx) return;
    spike *= 0.985;
    mood += (clamp(base + spike, 0, 1) - mood) * 0.04;
    var now = ctx.currentTime;
    padCalm.gain.setTargetAtTime(clamp(1 - mood * 1.4, 0, 1), now, 0.4);
    padDark.gain.setTargetAtTime(clamp(mood * 1.4 - 0.2, 0, 1), now, 0.4);
    var stepDur = 60 / bpmFor(mood) / 4;
    while (nextTime < now + 0.15) {
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
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8); // fondu d'entrée
    timer = window.setInterval(tick, 25);
  }

  function halt() {
    if (!running) return;
    running = false;
    window.clearInterval(timer);
    if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
  }

  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (running) ctx.resume();
  });

  var Music = {
    /** À appeler depuis un geste utilisateur (politique d'autoplay des navigateurs). */
    unlock: function () { begin(); },
    setMood: function (m) { base = clamp(m, 0, 1); },
    /** Coup dur (erreur) : accord dissonant grave + pic de danger qui retombe. */
    hit: function () {
      spike = Math.max(spike, 0.4);
      if (!running || !ctx) return;
      var t = ctx.currentTime;
      tone("sawtooth", 55, t, 0.5, 0.2, master, 0.005, 500);
      tone("sawtooth", 58.3, t, 0.5, 0.15, master, 0.005, 500);
      noise(t, 0.25, 0.14, "lowpass", 900, drumBus);
    },
    /** Victoire : arpège majeur ascendant, retour au calme. */
    victory: function () {
      base = 0.08; spike = 0;
      if (!running || !ctx) return;
      var t = ctx.currentTime + 0.05;
      [74, 78, 81, 86, 90].forEach(function (n, i) { tone("triangle", midiToHz(n), t + i * 0.09, 0.9, 0.1, arpBus, 0.004); });
    },
    toggle: function () {
      muted = !muted;
      try { window.localStorage.setItem(KEY, muted ? "off" : "on"); } catch { /* ignoré */ }
      if (muted) halt(); else begin();
      return muted;
    },
    isMuted: function () { return muted; },
    state: function () {
      return { running: running, muted: muted, mood: mood, bpm: bpmFor(mood), ctx: ctx ? ctx.state : "none" };
    },
    /** Niveau sonore instantané (RMS 0..1), pour les tests et un éventuel visualiseur. */
    level: function () {
      if (!analyser) return 0;
      var buf = new Uint8Array(analyser.fftSize), sum = 0, i;
      analyser.getByteTimeDomainData(buf);
      for (i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / buf.length);
    },
    _theory: { ROOT: ROOT, SCALE_CALM: SCALE_CALM, SCALE_DARK: SCALE_DARK, midiToHz: midiToHz, bpmFor: bpmFor, pickNote: pickNote, chordFor: chordFor }
  };

  window.OctoMusic = Music;
})();
