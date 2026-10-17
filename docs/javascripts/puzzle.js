/* OctoCat-Code — Briques communes des énigmes de fin de niveau.
 *
 *   OctoPuzzle.validateCases(code, engine, spec)  validation « sur plusieurs cas » (l'énigme doit être juste
 *                                                  pour toutes les valeurs d'entrée, pas seulement celle montrée)
 *   OctoPuzzle.scene(opts)                         scène d'énigme standard : décor, OctoCat, portail, HUD,
 *                                                  animation d'échec (le Glitch riposte) et de succès (portail)
 *
 * opts = { title, wash:[hex, opacité], lines:[{text,color}], decorate(k, sc, h, hud) -> { reveal(result), fail(result) } }
 */
(function () {
  "use strict";

  var NL = "\n";

  /** Messages d'aide communs (écrits pour être compris par un enfant de 8 ans). */
  var MSG = {
    empty: "L'éditeur est vide. Écris ton code dedans ✏️",
    todo: "Oups, il reste des « ??? » ! Remplace-les par ta réponse.",
    syntax: function (e) { return "Ligne " + e.line + " : petite faute d'écriture → " + e.msg; }
  };

  /** Reste-t-il des ??? dans le code ? Les commentaires (# ou //) ne comptent pas : le code de départ en contient un qui explique les ???. */
  function hasBlank(code) {
    return String(code).split("\n").some(function (line) { return /\?\?\?/.test(line.replace(/(#|\/\/).*$/, "")); });
  }

  function describeEnv(env) {
    var keys = Object.keys(env || {});
    return keys.length ? "Avec " + keys.map(function (n) { return n + " = " + JSON.stringify(env[n]); }).join(" et ") + ", " : "";
  }
  function show(v) { return typeof v === "string" ? JSON.stringify(v) : String(v); }

  /**
   * spec = { name, type: "number"|"string"|"boolean", cases:[{ env, expect }], okMessage? }
   * Le premier cas est celui montré dans la scène. Les messages imitent des erreurs de compilation lisibles.
   */
  function validateCases(code, engine, spec) {
    var run = engine.interpreter.run, name = spec.name, i;
    if (!code.trim()) return { ok: false, messages: [MSG.empty] };
    if (hasBlank(code)) return { ok: false, messages: [MSG.todo] };

    var first = run(code, spec.cases[0].env);
    if (first.errors.length) {
      return { ok: false, messages: first.errors.map(MSG.syntax) };
    }
    for (i = 0; i < spec.cases.length; i++) {
      var c = spec.cases[i], r = run(code, c.env);
      if (r.errors.length) {
        return { ok: false, messages: r.errors.map(function (e) { return describeEnv(c.env) + "ligne " + e.line + " : " + e.msg; }) };
      }
      if (!Object.prototype.hasOwnProperty.call(r.vars, name)) {
        var near = Object.keys(r.vars).filter(function (n) { return n.toLowerCase().replace(/_/g, "") === name.toLowerCase().replace(/_/g, ""); });
        return {
          ok: false,
          messages: [near.length
            ? "Je ne trouve pas la boîte « " + name + " ». Tu as écrit « " + near[0] + " » : fais attention aux majuscules et aux _ !"
            : "La boîte « " + name + " » n'existe pas encore : donne-lui une valeur avec le signe =."]
        };
      }
      var got = r.vars[name];
      if (typeof got !== spec.type) {
        var human = { number: "un nombre (comme 200)", string: "du texte entre guillemets (comme \"salut\")", boolean: "true ou false (vrai ou faux)" }[spec.type];
        return { ok: false, messages: [name + " doit contenir " + human + "."] };
      }
      if (got !== c.expect) {
        var tip = spec.type === "string" && typeof got === "string" && got.toLowerCase() === String(c.expect).toLowerCase() ? " (attention aux majuscules)" : "";
        return {
          ok: false,
          messages: [describeEnv(c.env) + name + " vaut " + show(got) + " alors qu'il devrait valoir " + show(c.expect) + tip + ". Presque ! Relis ta mission 🎯."]
        };
      }
    }
    var shownRun = run(code, spec.cases[0].env);
    return {
      ok: true,
      messages: [(spec.okMessage || name + " est juste") + "  ✓" + (spec.cases.length > 1 ? " (testé sur " + spec.cases.length + " cas)" : "")],
      data: { env: spec.cases[0].env, value: shownRun.vars[name], loops: shownRun.loops }
    };
  }

  /* ---------- scène standard ---------- */

  function scene(opts) {
    return function (k, h, ctx) {
      var sc = OctoScenery.build(k, h, { portalOpen: false, reserve: ctx.reserve });
      var rgb = sc.rgb, BASE_Y = sc.BASE_Y, PORTAL_X = sc.PORTAL_X, S = 3, OCTO_X = 70, GLITCH_X = 300;

      if (opts.wash) k.add([k.rect(sc.viewW + 100, sc.viewH + 100), k.pos(-50, -50), k.color(rgb(opts.wash[0])), k.opacity(opts.wash[1]), k.fixed(), k.z(29)]);

      // HUD (capitales sans accents : la police par défaut de KAPLAY n'a pas les accents)
      // panneau sombre derrière le texte : lisible sur tous les décors, même clairs
      k.add([k.rect(Math.min(sc.viewW, 286), 28 + (opts.lines || []).length * 16), k.pos(0, 0), k.color(rgb("#0d1117")), k.opacity(0.62), k.fixed(), k.z(30.5)]);
      k.add([k.text(opts.title, { size: 11, font: "monospace" }), k.pos(10, 8), k.color(rgb("#e6edf3")), k.fixed(), k.z(31)]);
      var lines = (opts.lines || []).map(function (l, i) {
        return k.add([k.text(l.text, { size: i === 0 ? 14 : 12, font: "monospace" }), k.pos(10, 24 + i * 16), k.color(rgb(l.color || "#d29922")), k.fixed(), k.z(31)]);
      });
      var banner = k.add([k.text("", { size: 18, font: "monospace" }), k.pos(sc.viewW / 2, 70), k.anchor("center"), k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);
      var hud = {
        set: function (i, text, color) { if (lines[i]) { lines[i].text = text; if (color) lines[i].color = rgb(color); } },
        reset: function () { (opts.lines || []).forEach(function (l, i) { hud.set(i, l.text, l.color || "#d29922"); }); }
      };

      var octoShadow = sc.shadow(OCTO_X, 0.85);
      var glitchShadow = sc.shadow(GLITCH_X, 0.9);
      var glitch = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(GLITCH_X, BASE_Y), k.anchor("bot"), k.scale(S), k.color(), k.opacity(0), k.z(8)]);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(OCTO_X, BASE_Y), k.anchor("bot"), k.scale(S), k.color(), k.opacity(1), k.rotate(0), k.z(9)]);
      sc.laita(octo, OCTO_X);
      var deco = (opts.decorate && opts.decorate(k, sc, h, hud, { octo: octo, rgb: rgb })) || {};

      var bob = 0;
      sc.onFrame(function (t) {
        bob = Math.abs(Math.sin(t * 3)) * 5;
        if (!glitch.__locked) glitch.pos.y = BASE_Y - bob;
        octoShadow.pos.x = octo.pos.x; octoShadow.opacity = 0.6 * octo.opacity;
        glitchShadow.pos.x = glitch.pos.x; glitchShadow.opacity = 0.6 * glitch.opacity;
      });

      function resetState() {
        octo.pos.x = OCTO_X; octo.pos.y = BASE_Y; octo.opacity = 1; octo.scale = k.vec2(S, S); octo.angle = 0; octo.color = k.Color.WHITE; octo.play("idle");
        glitch.pos.x = GLITCH_X; glitch.opacity = 0; glitch.__locked = false; glitch.play("idle");
        sc.setPortal(false); banner.opacity = 0; hud.reset();
        if (deco.reset) deco.reset();
      }

      return {
        reset: resetState,

        success: function (result) {
          var go = deco.reveal ? deco.reveal(result, hud) : Promise.resolve();
          return Promise.resolve(go)
            .then(function () {
              octo.play("run");
              return h.tween(1.1, function (e) { octo.pos.x = OCTO_X + (PORTAL_X - 60 - OCTO_X) * e; }, function (p) { return p; });
            })
            .then(function () { octo.play("success"); sc.portal.play("opening"); k.shake(4); return h.wait(0.35); })
            .then(function () {
              sc.setPortal(true);
              banner.text = "ACCES AUTORISE"; banner.opacity = 1;
              sc.burst(PORTAL_X, sc.GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 28);
              return h.wait(0.5);
            })
            .then(function () {
              octo.play("run");
              return h.tween(0.7, function (e) {
                octo.pos.x = PORTAL_X - 60 + 60 * e; octo.opacity = 1 - e;
                var s = S * (1 - 0.6 * e); octo.scale = k.vec2(s, s);
              });
            });
        },

        fail: function (result) {
          var custom = deco.fail ? deco.fail(result, hud) : Promise.resolve();
          k.shake(12);
          octo.play("fail");
          sc.floatText("ERREUR", octo.pos.x, octo.pos.y - 84, "#f85149");
          glitch.opacity = 1; glitch.__locked = true; glitch.play("attack");
          var gx0 = glitch.pos.x;
          return Promise.resolve(custom)
            .then(function () {
              return h.tween(0.22, function (e) { glitch.pos.x = gx0 - 150 * e; glitch.pos.y = BASE_Y - Math.sin(e * Math.PI) * 18; }, function (p) { return p * p; });
            })
            .then(function () {
              octo.color = rgb("#f85149"); octo.angle = -12;
              sc.burst(octo.pos.x + 20, octo.pos.y - 36, ["#f85149", "#d29922"], 12);
              k.shake(8);
              return h.tween(0.25, function (e) { octo.pos.x = OCTO_X - 25 * e; });
            })
            .then(function () { return h.wait(0.2); })
            .then(function () {
              return h.tween(0.5, function (e) { glitch.pos.x = gx0 - 150 * (1 - e); octo.pos.x = OCTO_X - 25 * (1 - e); glitch.opacity = 1 - e; });
            })
            .then(function () { resetState(); });
        }
      };
    };
  }

  window.OctoPuzzle = { msg: MSG, hasBlank: hasBlank, validateCases: validateCases, scene: scene, NL: NL };
})();
