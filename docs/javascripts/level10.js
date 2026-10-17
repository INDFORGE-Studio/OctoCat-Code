/* Niveau 10 — L'Arène du Glitch Gardien (combat de fin de zone)
 * Énigme : une boucle qui frappe le Gardien tant qu'il lui reste des points de vie (v_pv = 5).
 * Chaque tour de boucle = un coup d'épée : la scène rejoue exactement le nombre de tours exécutés.
 * Combat => `combat: true` : la musique passe en mode épique pendant tout le niveau.
 */
(function () {
  "use strict";

  var OCTO_X = 70, BOSS_X = 330, S = 3, BOSS_S = 4, HP = 5;

  window.gameEngine.registerLevel({
    id: 10,
    zone: 1,
    combat: true, // musique épique et intense
    mood: 0,
    title: "L'Arène du Glitch Gardien",
    run: {
      mode: "brawl", theme: "arena", length: 1900, hpMax: 6,
      waves: [
        { at: 420, enemies: [["grunt", "right"], ["grunt", "left"], ["fast", "right"]] },
        { at: 820, enemies: [["fast", "left"], ["fast", "right"], ["grunt", "right"], ["grunt", "left"]] },
        { at: 1220, enemies: [["heavy", "right"], ["grunt", "left"], ["grunt", "right"]] },
        { at: 1620, enemies: [["heavy", "left"], ["heavy", "right"], ["fast", "left"]] }
      ]
    },
    alt: "Une arène : l'OctoCat à gauche fait face au Glitch Gardien, un gros monstre rouge, devant un portail verrouillé.",

    starter:
      "# 👾 Le Glitch Gardien a 5 points de vie (v_pv).\n" +
      "# Chaque tour de boucle = un coup d'épée de l'OctoCat.\n" +
      "# Frappe tant qu'il lui reste des points de vie !\n" +
      "\n" +
      "v_pv = 5\n" +
      "\n" +
      "while ???:\n" +
      "    v_pv = v_pv - 1",

    briefing: {
      title: "L'Arène du Glitch Gardien",
      lore: "Le dernier Glitch de la forêt garde le chemin vers le monde suivant : c'est le **Glitch Gardien** ! Pour le battre, il faut frapper encore et encore, **sans t'arrêter** tant qu'il tient debout.",
      lesson: "`while` veut dire « **tant que** » : la boucle recommence **tant que** sa condition est vraie. On s'en sert quand on ne sait pas combien de tours il faudra. Attention ! Si la condition ne devient **jamais** fausse, la boucle tourne **pour toujours** 😱. Il faut donc que quelque chose, dans la boucle, la fasse changer. (`for` sert quand on connaît le nombre de tours.)",
      examples: {
        "Pseudo-code": "tant que v_vie > 0 faire\n  v_vie = v_vie - 1\nfin tant que",
        "Python": "while v_vie > 0:\n    v_vie = v_vie - 1\n\n# ou, pour un nombre de tours connu :\nfor i in range(3):\n    v_vie = v_vie - 1",
        "JavaScript": "while (v_vie > 0) {\n  v_vie = v_vie - 1;\n}\n\nfor (let i = 0; i < 3; i++) {\n  v_vie = v_vie - 1;\n}"
      },
      tips: [
        "La condition est regardée **avant chaque tour**. Quand elle devient fausse, la boucle s'arrête.",
        "Une ligne de la boucle fait changer `v_pv` : sans elle, ça ne s'arrêterait jamais !",
        "Compte bien : 5 points de vie = **5 coups**, ni 4, ni 6."
      ],
      goal: "Complète le `while` : frappe le Gardien **tant qu'il lui reste des points de vie** (`v_pv` plus grand que 0). Il doit tomber en **5 coups** exactement."
    },

    hints: [
      "while est suivi d'une condition. La boucle continue tant que cette condition est vraie.",
      "Tant que le Gardien a des points de vie : compare v_pv à 0 avec « plus grand que ».",
      "La réponse : while v_pv > 0:"
    ],

    validate: function (code, engine) {
      if (!code.trim()) return { ok: false, messages: [OctoPuzzle.msg.empty] };
      if (/\?\?\?/.test(code)) return { ok: false, messages: ["Oups, il reste des « ??? » ! Écris la condition de ta boucle à leur place."] };

      var r = engine.interpreter.run(code);
      if (r.errors.length) {
        var loopy = r.errors.some(function (e) { return /tours de boucle/.test(e.msg); });
        return {
          ok: false,
          messages: r.errors.map(function (e) { return /tours de boucle/.test(e.msg) ? "Ligne " + e.line + " : boucle infinie ! " + e.msg : OctoPuzzle.msg.syntax(e); }),
          data: { hits: loopy ? HP : 0, fumble: true }
        };
      }
      var pv = r.vars.v_pv, hits = r.loops;
      if (typeof pv !== "number") return { ok: false, messages: ["La boîte v_pv a disparu ! Elle doit rester un nombre."], data: { hits: 0, fumble: true } };
      if (hits === 0) {
        return { ok: false, messages: ["Aucun coup n'a été porté : la boucle n'a fait aucun tour. Sa condition est-elle vraie au départ ?"], data: { hits: 0, fumble: true } };
      }
      if (pv > 0) {
        return { ok: false, messages: ["Le Gardien a encore " + pv + " PV : tu as frappé " + hits + " fois, il en fallait " + HP + "."], data: { hits: hits, fumble: false } };
      }
      if (pv < 0 || hits > HP) {
        return { ok: false, messages: ["Tu as frappé " + hits + " fois alors qu'il y avait " + HP + " PV (v_pv = " + pv + ") : un coup de trop ! Vérifie ta condition (> ou >= ?)."], data: { hits: HP, fumble: false } };
      }
      if (hits !== HP) {
        return { ok: false, messages: ["v_pv vaut 0 mais en " + hits + " coup(s) seulement : le combat doit durer " + HP + " tours de boucle."], data: { hits: hits, fumble: false } };
      }
      return { ok: true, messages: ["La boucle a tourné " + hits + " fois : v_pv = " + pv + "  ✓"], data: { hits: hits } };
    },

    scene: function (k, h, ctx) {
      var sc = OctoScenery.build(k, h, { portalOpen: false, reserve: ctx.reserve });
      var rgb = sc.rgb, BASE_Y = sc.BASE_Y, PORTAL_X = sc.PORTAL_X;

      var octoShadow = sc.shadow(OCTO_X, 0.85);
      var bossShadow = sc.shadow(BOSS_X, 1.6);
      var boss = k.add([k.sprite("glitch", { anim: "idle" }), k.pos(BOSS_X, BASE_Y), k.anchor("bot"), k.scale(BOSS_S),
        k.color(), k.opacity(1), k.z(8)]);
      var octo = k.add([k.sprite("octo", { anim: "idle" }), k.pos(OCTO_X, BASE_Y), k.anchor("bot"), k.scale(S),
        k.color(), k.opacity(1), k.rotate(0), k.z(9)]);

      // HUD : titre, ligne de code d'état et barre de vie du Gardien (5 cases)
      k.add([k.text("ARENE DU GARDIEN - NIVEAU 10", { size: 11, font: "monospace" }), k.pos(10, 8), k.color(rgb("#e6edf3")), k.fixed(), k.z(31)]);
      var pvTxt = k.add([k.text("v_pv = " + HP, { size: 14, font: "monospace" }), k.pos(10, 24), k.color(rgb("#f85149")), k.fixed(), k.z(31)]);
      var pips = [];
      for (var i = 0; i < HP; i++) {
        pips.push(k.add([k.rect(14, 8), k.pos(130 + i * 18, 27), k.color(rgb("#f85149")), k.fixed(), k.z(31)]));
      }
      var banner = k.add([k.text("", { size: 18, font: "monospace" }), k.pos(sc.viewW / 2, 70), k.anchor("center"),
        k.color(rgb("#ffffff")), k.opacity(0), k.fixed(), k.z(32)]);

      var bob = 0;
      sc.onFrame(function (t) {
        if (!boss.__locked) { bob = Math.abs(Math.sin(t * 2.4)) * 6; boss.pos.y = BASE_Y - bob; }
        octoShadow.pos.x = octo.pos.x;
        octoShadow.opacity = 0.6 * octo.opacity;
        bossShadow.opacity = boss.exists() ? 0.6 * boss.opacity * (1 - bob / 16) : 0;
      });

      function showPv(n) {
        pvTxt.text = "v_pv = " + n;
        pips.forEach(function (p, idx) { p.opacity = idx < n ? 1 : 0.18; });
      }

      function resetState() {
        octo.pos.x = OCTO_X; octo.pos.y = BASE_Y; octo.opacity = 1; octo.scale = k.vec2(S, S); octo.angle = 0;
        octo.color = k.Color.WHITE; octo.play("idle");
        boss.pos.x = BOSS_X; boss.__locked = false; boss.color = k.Color.WHITE; boss.opacity = 1; boss.scale = k.vec2(BOSS_S, BOSS_S); boss.play("idle");
        sc.setPortal(false); banner.opacity = 0; showPv(HP);
      }
      resetState();

      /** Un coup d'épée : l'OctoCat fonce, touche, recule. */
      function strike(left) {
        var hitX = BOSS_X - 100;
        octo.play("run");
        return h.tween(0.16, function (e) { octo.pos.x = OCTO_X + (hitX - OCTO_X) * e; }, function (p) { return p; })
          .then(function () {
            k.shake(7);
            boss.__locked = true; boss.play("hurt"); boss.color = rgb("#ffffff");
            showPv(left);
            sc.burst(BOSS_X - 40, BASE_Y - 70, ["#ffffff", "#e3b341", "#f85149"], 14);
            sc.floatText("-1", BOSS_X, BASE_Y - 150, "#e3b341");
            return h.tween(0.16, function (e) { octo.pos.x = hitX - (hitX - OCTO_X) * e; boss.pos.x = BOSS_X + 8 * (1 - e); boss.pos.y = BASE_Y; }, function (p) { return p; });
          })
          .then(function () { boss.color = k.Color.WHITE; boss.__locked = false; boss.play("idle"); octo.play("idle"); return h.wait(0.08); });
      }

      return {
        reset: resetState,

        success: function (result) {
          var chain = Promise.resolve();
          for (var n = 1; n <= result.data.hits; n++) {
            (function (left) { chain = chain.then(function () { return strike(left); }); })(HP - n);
          }
          return chain
            .then(function () { // le Gardien s'effondre
              boss.__locked = true; boss.play("hurt");
              k.shake(12);
              sc.burst(BOSS_X, BASE_Y - 80, ["#f85149", "#e3b341", "#ffffff", "#39c5cf"], 40);
              return h.tween(0.7, function (e) {
                boss.opacity = 1 - e; boss.scale = k.vec2(BOSS_S + e * 2.2, BOSS_S * (1 - e * 0.85)); boss.pos.y = BASE_Y;
              });
            })
            .then(function () {
              boss.destroy();
              octo.play("run");
              return h.tween(0.9, function (e) { octo.pos.x = OCTO_X + (PORTAL_X - 60 - OCTO_X) * e; }, function (p) { return p; });
            })
            .then(function () {
              octo.play("success");
              sc.portal.play("opening");
              k.shake(4);
              return h.wait(0.35);
            })
            .then(function () {
              sc.setPortal(true);
              banner.text = "GARDIEN VAINCU"; banner.opacity = 1;
              sc.burst(PORTAL_X, sc.GROUND_Y - 60, ["#58a6ff", "#39c5cf", "#3fb950", "#bc8cff"], 28);
              return h.wait(0.5);
            })
            .then(function () {
              octo.play("run");
              return h.tween(0.7, function (e) {
                octo.pos.x = PORTAL_X - 60 + 60 * e;
                octo.opacity = 1 - e;
                var s = S * (1 - 0.6 * e); octo.scale = k.vec2(s, s);
              });
            });
        },

        fail: function (result) {
          var d = (result && result.data) || { hits: 0, fumble: true };
          var hits = Math.min(d.hits || 0, HP), chain = Promise.resolve();
          if (!d.fumble) { // la boucle a bien tourné mais pas comme il fallait : on rejoue les coups, puis le Gardien riposte
            for (var n = 1; n <= hits; n++) {
              (function (left) { chain = chain.then(function () { return strike(left); }); })(Math.max(0, HP - n));
            }
          }
          return chain.then(function () {
            k.shake(14);
            boss.__locked = true;
            boss.play("attack");
            octo.play("fail");
            sc.floatText("ERREUR", octo.pos.x, octo.pos.y - 84, "#f85149");
            var bx0 = boss.pos.x;
            return h.tween(0.24, function (e) { boss.pos.x = bx0 - 170 * e; boss.pos.y = BASE_Y - Math.sin(e * Math.PI) * 22; }, function (p) { return p * p; })
              .then(function () {
                octo.color = rgb("#f85149"); octo.angle = -14;
                sc.burst(octo.pos.x + 20, octo.pos.y - 36, ["#f85149", "#d29922"], 14);
                k.shake(9);
                return h.tween(0.25, function (e) { octo.pos.x = OCTO_X - 26 * e; });
              })
              .then(function () { return h.wait(0.25); })
              .then(function () {
                return h.tween(0.5, function (e) { boss.pos.x = bx0 - 170 * (1 - e); octo.pos.x = OCTO_X - 26 * (1 - e); });
              })
              .then(function () { resetState(); });
          });
        }
      };
    }
  });
})();
