/* OctoCat-Code — LUCIOLE, l'aide du jeu (bouton « ? » à côté de ♪ et ⚙).
 *
 *   OctoLuciole.topics                       les rubriques (textes écrits à la main, testés sous Node)
 *   OctoLuciole.open(id?) / close() / isOpen() le panneau ; isOpen() met la partie en pause (comme le menu ⚙)
 *   OctoLuciole.mountButton(conteneur)       ajoute le bouton « ? » à la boîte son
 *
 * Assistant guidé par boutons : aucune saisie, aucun serveur, rien n'est envoyé, aucune ressource externe chargée.
 * Les seuls liens sortants (rubrique « Apprendre plus ») s'ouvrent dans un nouvel onglet, sur demande du joueur.
 * Jamais de solution d'énigme : des conseils de méthode et un renvoi vers les indices payants du jeu.
 * Textes : lisibles par un enfant de 8 ans ; « **gras** » et « `code` » deviennent de vrais éléments (jamais innerHTML).
 */
(function () {
  "use strict";

  var WELCOME = "Je suis LUCIOLE, comment puis-je t'aider dans ta recherche ?";

  // Chaque rubrique : ask (texte du bouton qui y mène), title, lines (paragraphes), next (questions de suivi),
  // actions (boutons qui mènent à l'endroit du jeu : réglages, indice, briefing), links (pages à lire avec un adulte).
  var TOPICS = {
    home: {
      title: WELCOME,
      lines: ["Bzzz ! Choisis une question : je t'éclaire. ✨"],
      next: ["play", "keys", "stuck", "save", "settings", "learn"]
    },
    play: {
      ask: "🎮 Comment on joue ?",
      title: "Comment on joue ?",
      lines: [
        "**1.** À l'accueil, clique sur l'écran (ou appuie sur Entrée) : OctoCat file dans le portail.",
        "**2.** D'abord, un trajet : cours, saute et ramasse les pièces jusqu'au terminal.",
        "**3.** Ensuite, une énigme : remplace les `???` dans le code, puis clique sur **⚡ Compiler**.",
        "**4.** Ton code marche ? Le portail s'ouvre : niveau suivant !",
        "10 niveaux font un tour. Il y a **3 tours** : le pseudo-code d'abord, puis Python et JavaScript, dans l'ordre que tu choisis."
      ],
      next: ["coins", "laita", "keys", "stuck"]
    },
    coins: {
      ask: "🪙 À quoi servent les pièces ?",
      title: "Les pièces",
      lines: [
        "Les pièces achètent des **indices 💡** pendant les énigmes.",
        "Une pièce ramassée ne revient jamais. Alors ouvre l'œil !",
        "Psst… certains trous cachent une salle pleine de pièces. Cherche les petites étincelles dorées. 🤫",
        "Le compteur de l'accueil garde toutes les pièces gagnées depuis le début. À 500, tu peux choisir un **🎭 costume** !"
      ],
      next: ["stuck", "play"]
    },
    laita: {
      ask: "🐕 Comment Laïta m'aide ?",
      title: "Laïta, ta coéquipière",
      lines: [
        "Laïta, la chienne d'OctoCat, court avec toi dans les trajets.",
        "Appelle-la (au départ : **clic droit** ou **V**, et le bouton **🐕** sur écran tactile) : elle fait peur au monstre le plus proche.",
        "Elle ne se blesse jamais. Après, elle se repose un peu : regarde sa jauge **LAITA** en bas à gauche."
      ],
      next: ["keys", "play"]
    },
    keys: {
      ask: "⌨️ Quelles sont les touches ?",
      title: "Les touches du clavier",
      keys: true, // la liste des touches choisies par le joueur s'affiche ici (menu ⚙ → Touches)
      lines: [
        "Voici **tes** touches en ce moment :",
        "**Échap** ouvre les réglages ⚙ (la partie se met en pause).",
        "Dans l'énigme, **Ctrl + Entrée** lance ⚡ Compiler, et **Tab** ajoute des espaces pour décaler une ligne.",
        "Dans les trajets à plateformes, appuie **deux fois** sur sauter : c'est le double saut !"
      ],
      actions: [{ label: "⚙ Changer mes touches", go: "settings:keys" }],
      next: ["touch", "laita"]
    },
    touch: {
      ask: "📱 Et sur écran tactile ?",
      title: "Sur téléphone ou tablette",
      lines: [
        "Pendant les trajets, des boutons apparaissent à l'écran :",
        "**◀ ▶** pour avancer, **⤒** pour sauter, **⚔** pour frapper (ou **TIR** dans l'espace).",
        "**★** lance un shuriken dans certains niveaux, **🐕** appelle Laïta, et **▲ ▼** font monter ou descendre dans certains trajets.",
        "À l'accueil, touche l'écran pour commencer. Tiens ton appareil couché : c'est plus grand !"
      ],
      actions: [{ label: "⚙ Régler les boutons tactiles", go: "settings:screen" }],
      next: ["keys", "laita"]
    },
    stuck: {
      ask: "🧩 Je suis bloqué sur une énigme",
      title: "Bloqué ? Pas de panique !",
      lines: [
        "Même les grands codeurs bloquent. Voici mes astuces de luciole :",
        "🔎 Relis ta mission dans le **📜 Briefing**. Il est gratuit !",
        "👀 Compare avec l'exemple du briefing : ton code lui ressemble souvent.",
        "❓ Commence par les `???` : c'est là qu'il faut écrire.",
        "🔤 Regarde les petits détails : un nom mal écrit, un signe oublié…",
        "📟 Lis la console sous ton code : elle dit ce qui coince.",
        "↺ Tout est mélangé ? **Réinitialiser** remet le code du début.",
        "💡 Toujours coincé ? Le bouton **💡 Indice** t'aide pour 5 pièces. Le dernier indice donne la réponse et coûte 15 pièces : garde-le pour la toute fin !"
      ],
      actions: [
        { label: "👉 Montre-moi le bouton 💡 Indice", go: "hint", when: "puzzle" },
        { label: "📜 Relire le briefing", go: "brief", when: "puzzle" }
      ],
      next: ["stuckRun", "coins"]
    },
    stuckRun: {
      ask: "🏃 Je bloque dans un trajet",
      title: "Un passage trop dur ?",
      lines: [
        "Respire et réessaie : chaque essai t'apprend le chemin.",
        "Après quelques chutes, un bouton **Passer le trajet ▸** apparaît en bas de l'écran.",
        "Tu peux aussi choisir le **mode détente** : les ennemis et les pics ne font plus mal.",
        "Appelle Laïta : elle fait fuir les monstres. Et pense au double saut !"
      ],
      actions: [{ label: "⚙ Ouvrir le mode détente", go: "settings:game" }],
      next: ["laita", "keys"]
    },
    save: {
      ask: "💾 Ma partie est-elle gardée ?",
      title: "La sauvegarde",
      lines: [
        "Le jeu note tes progrès **dans ce navigateur**, à la fin de chaque niveau.",
        "Attention : certains navigateurs effacent tout quand on les ferme (ou en navigation privée). Le jeu ne peut pas le savoir.",
        "Pour ne rien perdre, enregistre un **fichier de sauvegarde** : ⚙ → **Jeu** → **💾 Enregistrer un fichier**.",
        "Pour reprendre ta partie : ⚙ → **Jeu** → **📂 Charger un fichier**.",
        "Tu quittes en plein niveau ? Ce niveau-là sera à refaire."
      ],
      actions: [{ label: "⚙ Ouvrir la sauvegarde", go: "settings:game" }],
      next: ["settings"]
    },
    settings: {
      ask: "⚙️ Les réglages et le son",
      title: "Les réglages et le son",
      lines: [
        "**♪ ON / OFF** coupe ou remet la musique. Le petit curseur à côté règle le volume.",
        "Le bouton **⚙** (ou **Échap**) ouvre les réglages. La partie se met en pause.",
        "Il y a 4 onglets : **Touches**, **Son** (avec les effets sonores), **Affichage** (boutons tactiles, plein écran) et **Jeu** (mode détente, sauvegarde)."
      ],
      actions: [{ label: "⚙ Ouvrir le son", go: "settings:sound" }, { label: "⚙ Ouvrir l'affichage", go: "settings:screen" }],
      next: ["save", "keys"]
    },
    learn: {
      ask: "📚 Apprendre plus",
      title: "Apprendre plus",
      lines: [
        "Tu veux devenir un vrai codeur ? Génial !",
        "Ces pages sont écrites pour les grands : demande à un adulte de les lire avec toi. Il faut Internet.",
        "Et dans le jeu, chaque briefing **🧠 Pour comprendre** t'explique une idée nouvelle. Tu progresses déjà !"
      ],
      links: [
        { label: "🐍 Le tutoriel officiel de Python (en français)", href: "https://docs.python.org/fr/3/tutorial/" },
        { label: "🌌 Le guide JavaScript de MDN (en français)", href: "https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide" }
      ],
      next: ["play"]
    }
  };

  var Luciole = {
    welcome: WELCOME,
    topics: TOPICS,
    isOpen: function () { return false; },
    open: function () {}, close: function () {}, mountButton: function () {}
  };
  window.OctoLuciole = Luciole;

  if (typeof document === "undefined" || !document.createElement) return; // Node (tests) : pas d'interface

  /* ---------- interface ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  /** Texte enrichi sans innerHTML : **gras** et `code` deviennent de vrais éléments. */
  function rich(node, text) {
    var re = /\*\*(.+?)\*\*|`([^`]+)`/g, last = 0, m;
    text = String(text);
    while ((m = re.exec(text))) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1] != null) node.appendChild(el("strong", "", m[1]));
      else node.appendChild(el("code", "octo-key", m[2]));
      last = re.lastIndex;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
    return node;
  }
  function settings() { return window.OctoSettings || null; }
  function inPuzzle() { return document.documentElement.classList.contains("octo-puzzle") && !!document.querySelector(".octo-panel.is-open"); }

  var overlay = null, card = null, bodyEl = null, backBtn = null, btn = null, uiRoot = null, openState = false, stack = [], current = "home";

  function focusables() {
    return Array.prototype.filter.call(card.querySelectorAll("button, a[href]"), function (n) { return !n.disabled && n.offsetParent !== null; });
  }

  function choice(label, cls, fn) {
    var b = el("button", "octo-luciole__btn " + (cls || ""), label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }

  function keysList() {
    var S = settings(), list = el("ul", "octo-luciole__keys");
    if (!S) return list;
    S.actions.forEach(function (a) {
      var li = el("li"), codes = S.keys(a.id);
      li.appendChild(el("span", "octo-luciole__keyname", a.label.replace("Laita", "Laïta")));
      var chips = el("span", "octo-luciole__chips");
      if (!codes.length) chips.appendChild(el("span", "octo-luciole__none", "aucune touche"));
      codes.forEach(function (c) { chips.appendChild(el("kbd", "octo-luciole__kbd", S.label(c))); });
      li.appendChild(chips); list.appendChild(li);
    });
    return list;
  }

  /** Mène à l'endroit du jeu concerné : un onglet des réglages, le bouton 💡 Indice ou le 📜 Briefing de l'énigme. */
  function goTo(where) {
    var S = settings();
    if (/^settings:/.test(where)) {
      close(false);
      if (S) S.open(uiRoot, where.slice(9));
      return;
    }
    var target = document.querySelector('.octo-panel.is-open [data-octo-btn="' + (where === "hint" ? "hint" : "brief") + '"]');
    close(false);
    if (!target) return;
    if (where === "brief") { target.click(); return; }
    try { target.focus({ preventScroll: true }); } catch { /* ignoré */ }
    target.classList.remove("octo-luciole-spot"); void target.offsetWidth; target.classList.add("octo-luciole-spot");
    window.setTimeout(function () { target.classList.remove("octo-luciole-spot"); }, 3200);
  }

  function render(id, focusTitle) {
    var t = TOPICS[id] || TOPICS.home;
    current = TOPICS[id] ? id : "home";
    bodyEl.textContent = "";
    var title = el("h2", "octo-luciole__title", t.title);
    title.id = "octo-luciole-title"; title.tabIndex = -1;
    bodyEl.appendChild(title);
    t.lines.forEach(function (line, i) {
      bodyEl.appendChild(rich(el("p", "octo-luciole__text"), line));
      if (t.keys && i === 0) bodyEl.appendChild(keysList());
    });
    var puzzle = inPuzzle();
    var acts = (t.actions || []).filter(function (a) { return !a.when || (a.when === "puzzle" && puzzle); });
    (t.links || []).forEach(function (l) {
      var a = el("a", "octo-luciole__btn octo-luciole__link", l.label);
      a.href = l.href; a.target = "_blank"; a.rel = "noopener noreferrer";
      bodyEl.appendChild(a);
    });
    if (acts.length) {
      var row = el("div", "octo-luciole__acts");
      acts.forEach(function (a) { row.appendChild(choice(a.label, "octo-luciole__btn--go", function () { goTo(a.go); })); });
      bodyEl.appendChild(row);
    }
    if ((t.next || []).length) {
      if (current !== "home") bodyEl.appendChild(el("div", "octo-luciole__label", "Autres questions"));
      var qs = el("div", "octo-luciole__qs");
      t.next.forEach(function (n) {
        if (!TOPICS[n]) return;
        var b = choice(TOPICS[n].ask, "octo-luciole__btn--ask", function () { stack.push(current); render(n, true); });
        b.setAttribute("data-topic", n);
        qs.appendChild(b);
      });
      bodyEl.appendChild(qs);
    }
    backBtn.hidden = current === "home";
    bodyEl.scrollTop = 0;
    if (focusTitle) { try { title.focus({ preventScroll: true }); } catch { /* ignoré */ } }
  }

  function back() {
    var prev = stack.pop() || "home";
    render(prev, true);
  }

  function build() {
    overlay = el("div", "octo-luciole");
    card = el("div", "octo-luciole__card");
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "octo-luciole-name"); card.setAttribute("aria-describedby", "octo-luciole-title");
    var head = el("div", "octo-luciole__head");
    head.appendChild(el("span", "octo-luciole__fly")); // la luciole : un point de lumière dessiné en CSS (aucune image)
    var name = el("span", "octo-luciole__name", "LUCIOLE"); name.id = "octo-luciole-name";
    head.appendChild(name);
    bodyEl = el("div", "octo-luciole__body");
    var foot = el("div", "octo-luciole__foot");
    backBtn = choice("◂ Retour", "", function () { back(); });
    foot.appendChild(backBtn);
    foot.appendChild(choice("Fermer ✕", "octo-luciole__btn--ok", function (e) { close(!e || e.detail === 0); }));
    card.appendChild(head); card.appendChild(bodyEl); card.appendChild(foot);
    overlay.appendChild(card);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(false); }); // « click » (pas « pointerdown ») : le geste ne traverse pas jusqu'au décor (l'accueil lancerait la partie)
  }

  function open(id) {
    if (openState) { if (id) { stack = []; render(id, true); } return; }
    var S = settings();
    if (S && S.isOpen()) S.close();
    if (!overlay) build();
    (uiRoot || document.querySelector(".octo-ui") || document.querySelector(".octo-fs") || document.body).appendChild(overlay);
    openState = true; stack = [];
    document.documentElement.classList.add("octo-menu-open"); // la souris reste visible, comme dans le menu ⚙
    overlay.classList.add("is-open");
    if (btn) btn.setAttribute("aria-expanded", "true");
    render(id || "home", !!id);
    if (!id) { var first = bodyEl.querySelector(".octo-luciole__btn"); if (first) { try { first.focus({ preventScroll: true }); } catch { /* ignoré */ } } }
    document.dispatchEvent(new CustomEvent("octo:luciole", { detail: { open: true } }));
  }

  /** refocus : rendre le focus au bouton « ? » (fermeture au clavier) ; sinon on le relâche, comme le menu ⚙ (Espace ne rouvrira pas l'aide). */
  function close(refocus) {
    if (!openState) return;
    openState = false;
    overlay.classList.remove("is-open");
    if (!(settings() && settings().isOpen())) document.documentElement.classList.remove("octo-menu-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (refocus && btn && btn.isConnected) { try { btn.focus({ preventScroll: true }); } catch { /* ignoré */ } }
    else if (document.activeElement && overlay.contains(document.activeElement)) document.activeElement.blur();
    document.dispatchEvent(new CustomEvent("octo:luciole", { detail: { open: false } }));
  }

  Luciole.isOpen = function () { return openState; };
  Luciole.open = open;
  Luciole.close = function () { close(false); };

  Luciole.mountButton = function (container) {
    uiRoot = container.parentNode;
    btn = el("button", "octo-mute octo-luciole-btn", "?");
    btn.type = "button"; btn.setAttribute("aria-label", "Aide de LUCIOLE"); btn.title = "Aide de LUCIOLE";
    btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      if (openState) { close(e.detail === 0); return; }
      open();
      if (e.detail !== 0) btn.blur();
    });
    btn.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") { e.stopPropagation(); return; } // active le bouton sans faire sauter OctoCat
      if (e.code !== "Tab" && e.code !== "Escape" && settings() && settings().lookup(e.code)) btn.blur(); // le joueur reprend la partie : la touche suivante (Espace) sautera
    });
    container.appendChild(btn);
    if (overlay && !openState) uiRoot.appendChild(overlay);
    return btn;
  };

  // Panneau ouvert : le clavier est pour lui seul (le chat ne bouge pas, les raccourcis du jeu ne partent pas).
  // Échap le ferme et rend le focus au bouton « ? » ; Tab tourne dans le panneau.
  window.addEventListener("keydown", function (e) {
    if (!openState) return;
    if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) close(true); return; }
    if (e.code === "Tab") {
      var list = focusables(), i = list.indexOf(document.activeElement);
      if (list.length && (e.shiftKey ? i <= 0 : (i === -1 || i === list.length - 1))) {
        e.preventDefault();
        var to = e.shiftKey ? list[list.length - 1] : list[0];
        try { to.focus({ preventScroll: true }); } catch { /* ignoré */ }
      }
    }
    e.stopPropagation(); // Entrée / Espace activent toujours le bouton qui a le focus (action par défaut du navigateur)
  }, true);

  document.addEventListener("octo:settings", function (e) { if (e.detail && e.detail.open && openState) close(false); });
})();
