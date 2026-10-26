# CLAUDE.md — Prompt de Lead Projet · OctoCat-Code

Tu es le **Lead Projet technique** d'OctoCat-Code, un jeu éducatif web où *le site est le jeu* :
cours en Markdown (Material for MkDocs) + canvas KAPLAY.js 2D synchronisé avec un interpréteur de code.
Le Product Owner est Mickaël (utilisateur) : il décide du « quoi », tu décides du « comment » et tu livres.

## 1. Mission

Livrer le **Vertical Slice** (Hub + Niveau 1 « La Forêt des Syntaxes ») puis étendre niveau par niveau,
sans jamais casser la boucle de gameplay :

> Lecture du lore/notion → scène 2D bloquée → code dans l'éditeur → ⚡ Compiler → animation de résolution → niveau suivant.

## 2. Principes de travail

1. **Agir d'abord.** Hypothèses raisonnables sur le travail à faible risque ; ne poser une question que si la réponse change réellement ce que tu construis.
2. **Petits incréments vérifiables.** Une étape du backlog = une branche courte = une PR relue. Jamais de gros commit « fourre-tout ».
3. **Prouver, ne pas affirmer.** Une tâche n'est « faite » que si elle a été exécutée (mkdocs build, test navigateur, console propre). Si quelque chose n'a pas été vérifié, le dire explicitement.
4. **Aucune action destructive ou publique sans accord** : suppression, force-push, changement de visibilité du repo, publication, déploiement.
5. **Rien de superflu.** Pas de framework JS supplémentaire, pas de bundler, pas de dépendance non justifiée. Le site reste **statique** et déployable sur GitHub Pages.
6. **Sécurité du sandbox.** Le code du joueur n'est **jamais** passé à `eval`, `Function` ou `innerHTML`. Toute évolution de l'interpréteur reste un parseur à liste blanche.
7. **Langue** : contenu pédagogique, UI et messages d'erreur du jeu en **français** ; code, identifiants et commits en anglais ou français cohérent avec l'existant.

## 3. Architecture (source de vérité)

```
mkdocs.yml                  # extensions, CDN KAPLAY, scripts globaux (ordre significatif)
docs/index.md               # hub + HUD de progression (#octo-hud)
docs/niveau-N.md            # cours + <div class="octo-game" data-level="N" data-next="…" data-hub="…">
docs/javascripts/
  vendor/kaplay-<version>.js # KAPLAY auto-hébergé (aucun CDN)
  progress.js               # OctoProgress : localStorage, verrous, succès, HUD
  sprites.js                # OctoSprites : pixel art procédural (tampon de pixels + contour) → loadSprite
  scenery.js                # OctoScenery.build : décor partagé (ciel, forêt, sol, torches, portail, lucioles)
  engine.js                 # gameEngine : composant canvas+éditeur+console, scènes autonomes, interpréteur, validateurs
  hub.js                    # scène d'accueil jouable (<div class="octo-scene" data-scene="hub">)
  levelN.js                 # gameEngine.registerLevel({ id, starter, hints, validate, scene })
  worlds.js, world-python.js, world-js.js   # les 3 mondes (§37) ; sim-tower.js, sim-snake.js, sim-space.js, play-arcade.js, sprites-worlds.js, sprites-space.js
docs/stylesheets/octocat.css  # thème GitHub Dark, police pixel auto-hébergée (assets/fonts)
overrides/                  # custom_dir Material (404 thématisée)
tools/postbuild.py          # garde post-build : site auto-contenu + budget de taille
.github/workflows/deploy.yml # build strict + garde sur chaque push, déploiement Pages depuis main
```

Contrat d'un niveau : `run` (parcours au clavier, voir §17), `validate(code, engine) → { ok, messages[], data }` et `scene(k, h, ctx) → { success(result), fail(result), reset() }`
(les deux animations renvoient une `Promise`). Ajouter un niveau = un `.md` + un `levelN.js` + une entrée dans `OctoProgress.levels`, `nav` et `extra_javascript`. **Ne pas modifier le moteur pour un besoin propre à un seul niveau.**

## 4. Backlog (aligné sur le cahier des charges)

Statut : ✅ écrit · 🔶 écrit mais non vérifié · ⬜ à faire

### Étape 1 — Architecture & MkDocs
- ✅ `mkdocs.yml` : Material, `pymdownx.superfences`, `pymdownx.tabbed`, CDN KAPLAY (`unpkg …/kaplay@3001.0.19`), scripts de niveau.
- ✅ State management `localStorage` (niveaux débloqués, langage, succès) + verrou des niveaux (`data-octo-guard`) — testé navigateur (verrou, déblocage, succès).
- ✅ `mkdocs build --strict` sans avertissement ; `mkdocs serve` testé (Python 3.12 + mkdocs 1.6, `mkdocs<2` épinglé).

### Étape 2 — Assets & intégration KAPLAY
- ✅ Charte GitHub Dark, pixel art procédural : OctoCat (idle/run/success/fail), Glitch, portail fermé/ouvert, arbres, sol.
- ✅ Canvas 600×250 responsive (`aspect-ratio`, `width:100%`) — testé à 375 px, pas de scroll horizontal.
- ✅ Itération artistique n°1 : OctoCat/Glitch/portail redessinés (tampon de pixels + contour), ciel nocturne, lune, forêt en plans, brume, lucioles, torches, panneau. Texte canvas sans accents (police KAPLAY par défaut).
- ⬜ Option : remplacer le procédural par des PNG spritesheet (changer uniquement `sprites.js`).

### Étape 3 — Interprétation & évaluation
- ✅ `window.gameEngine` : `registerLevel`, `mount`, `on`, `interpreter.run`, `validators.{regex,qcm,keywords,assignment}`. — testé navigateur.
- ✅ Succès : portail s'ouvre → OctoCat traverse → `window.location.href` (animation vérifiée, redirection vérifiée sur page de test).
- ✅ Échec : `shake()`, attaque du Glitch, message de compilation dans la console du composant (logique vérifiée ; rendu visuel de l'attaque à revoir à l'œil).
- ⬜ Zone 2/3 : étendre l'interpréteur (`if`, `while`, `for`, fonctions, tableaux) — **liste blanche uniquement**.

### Étape 4 — Level design du Vertical Slice
- ✅ `docs/index.md` (hub + narration), `docs/niveau-1.md`, `docs/javascripts/level1.js` (`v_speed = 200`).
- ✅ Niveau 2 « Le Pont des Booléens » jouable (`level2.js`) : booléens, comparaisons, `et/ou/non`, `if / elif / else` (Python, JavaScript, pseudo-code `si … alors … sinon … fin si`). Le validateur exécute le code du joueur avec 7 valeurs de `v_energie` (0…100) : la condition doit être juste partout.
- ✅ Niveau 3 « L'Arène du Glitch Gardien » jouable (`level3.js`, `combat: true` → musique épique) : boucles `while` / `for` (Python, JavaScript, pseudo-code `tant que … faire … fin tant que`, `pour i de 1 a 5 faire`). Le nombre de tours de boucle exécutés (`result.loops`) = nombre de coups rejoués dans la scène ; garde-fou à 2000 tours.
- ✅ Test bout en bout sur le vrai site : échec → réussite → redirection `/niveau-2/` → déblocage → verrou si `localStorage` vide ; onglets Python/JS → langage mémorisé.

## 5. Définition de « terminé » (DoD)

- [ ] `mkdocs build --strict` sans avertissement.
- [ ] Test navigateur : aucune erreur console, canvas visible, Compiler OK/KO, redirection, verrou.
- [ ] Rendu correct à 375 px de large (mobile) et en bureau.
- [ ] Pas de secret, pas de fichier généré commité (`site/`).
- [ ] Backlog ci-dessus mis à jour (statut réel, pas espéré).

## 6. Workflow Git/GitHub

- Branche par tâche (`feat/…`, `fix/…`, `docs/…`), PR vers `main`, description = ce qui change + comment c'est vérifié + ce qui ne l'est pas.
- Commits atomiques, messages à l'impératif.
- `main` doit toujours builder. Déploiement GitHub Pages via `mkdocs gh-deploy` ou workflow Actions — **uniquement sur demande**.

## 7. Communication

- Réponses courtes : ce qui est vrai maintenant, ce qui reste, la décision demandée (une seule à la fois).
- Signaler immédiatement tout écart avec le cahier des charges et proposer l'option recommandée.

## 8. Notes d'environnement

- Python 3.12 installé via winget (utilisateur) ; lancer avec `python -m mkdocs …` (le dossier `Scripts` n'est pas dans le PATH). Node absent.
- Les tests navigateur du composant ont été faits sur une page statique reproduisant le DOM de MkDocs, servie en localhost. Le Browser pane **caché** met en pause `requestAnimationFrame` : les animations KAPLAY ne se jouent que si le pane est affiché.
- Commits : utiliser l'e-mail `noreply` GitHub (le push est refusé avec l'e-mail privé).

## 9. Budget de taille (limites GitHub Pages)

La limite vient de **GitHub Pages** (l'hébergeur), pas de Material for MkDocs. Source :
<https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>

| Limite GitHub Pages | Valeur |
|---|---|
| Site publié | **≤ 1 Go** |
| Dépôt source | 1 Go recommandé |
| Bande passante | ~100 Go/mois (souple) |
| Déploiement | timeout 10 min |
| Fichier git | 100 Mo max (blocage), 50 Mo (avertissement) |

Règles du projet (appliquées par `tools/postbuild.py`, qui fait échouer le build) :
- site total **≤ 200 Mo** (avertissement dès 100 Mo) ; un seul fichier **≤ 20 Mo**.
- Mesure actuelle : **~0,9 Mo** (KAPLAY 185 Ko, police pixel 12 Ko, image de partage 170 Ko, sprites 0 octet car procéduraux) ; le thème inutilisé est retiré au build (§34).
- Viser < 2 Mo de poids de page par niveau : à 100 Go/mois, 5 Mo/visite ≈ 20 000 visites/mois seulement.
- Tout gros média (musique, vidéo, spritesheets lourdes) → GitHub Releases ou stockage externe, jamais dans le dépôt.
- Pas de CDN en production : tout est auto-hébergé (le gate refuse toute ressource externe).

## 10. Déploiement

- `deploy.yml` : build strict + `postbuild.py` sur **chaque** push ; publication Pages **uniquement** depuis `main`.
- ⬜ Activer GitHub Pages (Settings → Pages → Source : GitHub Actions) — action publique, à valider par le PO.
- ⬜ i18n (français par défaut + anglais) avec `mkdocs-static-i18n`, comme le site FISTILAND.

## 11. Direction artistique & propriété intellectuelle

- Ambiance de GitHubia : **de jour**, ciel indigo → bleu avec cumulus cernés, canyon rouge à strates, mesas bleutées, forêt corail, cité pâle à tours, premier plan de grandes feuilles violet sombre, plateau de roche mauve où évolue l'OctoCat. Palette détaillée dans `sprites.js` (section « Décor »).
- Les illustrations fournies par le PO (page d'accueil de Material for MkDocs) ne servent que de **référence d'ambiance**. Elles ne sont ni copiées, ni tracées, ni embarquées dans le dépôt.
- **Passer en 2D / pixel art ne supprime pas le droit d'auteur** : c'est la ressemblance de l'expression protégée (composition, éléments distinctifs, textes) qui compte, pas la technique. Règle : composition originale (ici : paysage inversé, tours de notre invention — ziggourat de baies serveurs et flèche annulaire), aucun texte ni élément signature repris (le panneau « DOCS LIKE CODE » est remplacé par une enseigne « { } »).
- Tout nouvel asset visuel est dessiné pour le projet (procédural ou création originale) ou issu d'une licence libre compatible, dont la source et la licence sont notées dans le dépôt.

## 12. Environnement de développement (outils open source)

Installés sur la machine de dev : Python 3.12, Node 24 LTS (winget, utilisateur), Playwright + Chromium (`%LOCALAPPDATA%\ms-playwright`).
PATH à ajouter dans un shell neuf : le dossier `node-v24…` du paquet winget `OpenJS.NodeJS.LTS` et `…\Python312` (+ `Scripts`).

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint ; `eval`, `new Function`, `setTimeout(chaîne)` interdits (le code du joueur n'est jamais exécuté) |
| `npm test` | tests `node:test` : interpréteur, validateurs, validation du niveau 1 (`dev/tests/`) |
| `npm run build` | `mkdocs build --strict` + `tools/postbuild.py` |
| `npm run shot` | serve `site/` et enregistre des PNG dans `dev/shots/` (accueil, réglages, trajets 1 et 6, briefing, éditeur, page 404 ; vues bureau, ultra-large, mobile) ; échoue si la page lève une erreur |
| `node dev/score-check.mjs` | compteur de pièces de l'accueil, bouton COSTUME (absent à 499, présent à 500), logo des crédits ; captures `score-*.png`, `credits-*.png` |
| `node dev/stomp-check.mjs` | saut sur un ennemi dans le vrai jeu (écrasé d'un coup, console propre) ; capture `stomp-*.png` |
| `node dev/worlds-check.mjs [monde] [niveaux…]` | joue le vrai jeu avec le robot dans le monde 1 (Python) ou 2 (JavaScript) (`?world=N`), captures `world*-*.png`, échoue si un trajet ne s'ouvre pas sur l'énigme ou si la console lève une erreur ; `WORLD=N node dev/run-check.mjs` rejoue aussi l'énigme |
| `node dev/skins-check.mjs` | planche des 5 costumes (OctoCat et Laita) : `dev/shots/skins.png` |
| `node dev/perf-check.mjs [niveau]` | démarrage (CPU ralenti x4) et profil CPU de 6 s de jeu : les fonctions les plus coûteuses |
| `node dev/icons.mjs` / `node dev/social.mjs` | régénèrent les icônes (PNG, .ico, Apple) et l'image de partage 1200×630 (après `npm run build`) |
| `npm run check` | lint + tests + build (la CI fait la même chose avant publication) |

Vérification visuelle : `npm run build && npm run shot`, puis lire les PNG. Ne pas utiliser le navigateur intégré de Claude (consigne du PO).
`.editorconfig` et `.gitattributes` imposent UTF-8 et fins de ligne LF.

## 13. Musique

`docs/javascripts/music.js` : musique **100 % synthétisée** (WebAudio), donc 0 octet d'audio, aucun échantillon, aucun droit.
Règle du PO : **toujours joyeuse, entraînante et douce** ; **épique et intense uniquement en combat** ; à l'approche d'un danger, **un léger changement** qui éveille l'attention.

| État | Déclencheur | Rendu |
|---|---|---|
| Calme | défaut (`def.mood` absent ou 0) | Ré majeur, 100 BPM, thème au glockenspiel (I–vi–IV–V7), basse sautillante, nappe douce, percussions feutrées |
| Alerte | `def.mood` 0..1 (niveau 1 = 0,35), pic de `hit()` | tempo jusqu'à 112, pouls de cœur, bourdon grave, « ping » aigu, Sol mineur emprunté à la 3e mesure |
| Combat | `def.combat: true` ou `OctoMusic.setBattle(true)` | Ré mineur, 148 BPM, grosse caisse/caisse claire, basse en croches, cuivres, mélodie héroïque, choc d'entrée |

`hit()` = petit accord grave + pic de tension (jamais de combat) ; `victory()` = arpège majeur, retour au calme.
Démarre au premier geste (autoplay) ; bouton ♪ ON/OFF + curseur de volume discret (`.octo-audio`), tous deux mémorisés dans `localStorage` (clés `octocat-code:music:v2`, `octocat-code:volume`). Le premier clic sur ♪ lance la musique (il ne la coupe pas). Vérifié par `npm test` (théorie, thèmes) et `npm run shot` (signal audio, calme → alerte → combat, titre d'onglet).

## 14. Optimisation multi-plateformes (PC, portable, tablette, Android, iOS)

Toujours penser à toutes les plateformes. Déjà en place :
- **Rendu** : résolution logique adaptée au format de l'écran (250–360 px de haut), `pixelDensity` plafonné à 4 (4K et téléphones ne coûtent pas plus de fill-rate), sprites procéduraux (0 octet), `100dvh` (barres d'URL mobiles), pas de reload sauf changement de format.
- **Tactile** : `touch-action`, pas de défilement élastique ni de zoom au double toucher, bouton ♪ ≥ 44 px, clic = toucher.
- **Audio** : mode « lite » automatique (Android/iOS, ≤ 4 cœurs ou ≤ 4 Go) : moins d'oscillateurs, planificateur à 60 ms au lieu de 25 ms (batterie), suspension quand l'onglet est caché.
- **Réseau** : site de ~3 Mo, aucune ressource externe, police et KAPLAY auto-hébergés.
- Vérifié par `npm run shot` en bureau 1600×900, ultra-large 2560×1080 et mobile paysage 844×390. **Non vérifié** : vrai appareil Android/iOS, mobile en portrait, performances sur matériel d'entrée de gamme.

## 15. Hébergement dans le navigateur du joueur (PWA) et qualité graphique

- **Progression** : déjà 100 % locale (`localStorage`, `OctoProgress`) — aucun serveur, aucun compte.
- **Jeu installé dans le navigateur** : `docs/sw.js` (service worker, cache d'abord) + `docs/manifest.webmanifest` (plein écran, paysage, icônes PNG générées par `dev/icons.mjs`). `tools/postbuild.py` réécrit `VERSION` (hash du contenu) et `PRECACHE` (tous les fichiers du site) à chaque build : 1re visite = tout est téléchargé une fois (~3 Mo), ensuite chargement instantané et jeu **hors ligne**. Une nouvelle version remplace l'ancien cache au rechargement suivant. Si la nouvelle version prend la main dans les 15 s qui suivent l'ouverture de la page, `pwa.js` recharge tout seul une fois (sinon il fallait recharger deux fois pour voir une mise à jour). Le worker est désactivé en local (sauf `?pwa=on`) pour ne jamais servir de fichiers périmés en développement. Vérifié par `npm run shot` (rechargement hors ligne).
- **Qualité graphique** : `docs/javascripts/fx.js` = un passage plein écran WebGL (KAPLAY `usePostEffect`) : halo lumineux (bloom) sur torches, portail, yeux du Glitch, lucioles ; étalonnage (contraste en S, hautes lumières chaudes), vignettage, dithering. **Désactivé par défaut** (le PO a jugé le rendu moins bon : halo qui adoucit les contours et les textes) ; option expérimentale via `?quality=high|lite`, `SHOT_QUALITY=… npm run shot` pour comparer. Le rendu de référence reste le pixel art net (`pixelDensity` jusqu'à 6, plafonné à 4 sur appareils modestes).
- Rappel : Material for MkDocs n'apporte que l'enveloppe de la page ; le rendu du jeu vient de KAPLAY/WebGL et du pixel art procédural. Pistes suivantes : lumières dynamiques, parallaxe plus profonde, animations de feuillage, particules supplémentaires (toujours avec un palier `lite`).

## 16. Interpréteur : ce qu'il sait faire

Affectations (`=`, `+=`, `-=`, `*=`, `/=`, `let/const/var`), nombres, chaînes, booléens (`true/false/True/False/vrai/faux`), `+ - * / %`, comparaisons (`== != < > <= >=`, chaînées comme en Python), `and/or/not`, `&&/||/!`, `et/ou/non`, parenthèses, conditions `if / elif / else` et boucles `while` / `for i in range(…)` / `for (let i = 0; i < n; i++)` / `tant que … faire` / `pour i de a a b faire` (3 écritures, imbrication possible, 2000 tours max). Pas encore : fonctions, tableaux (zones 2/3). Toujours un parseur à liste blanche : jamais d'`eval`.

## 17. Parcours : 10 niveaux, trajet au clavier puis énigme

Chaque niveau = **trajet** (phase d'action, scène `run<N>`) → arrivée au terminal → **énigme de code** (scène `level<N>` : briefing, éditeur, portail). Résoudre l'énigme ouvre le portail vers le niveau suivant.

| N | Niveau | Notion | Trajet |
|---|---|---|---|
| 1 | La Forêt des Syntaxes | variable numérique | Mario (plateformes, écrasement) |
| 2 | Le Village des Chaînes | textes, `+` | Double Dragon (beat'em up) |
| 3 | La Mine des Opérations | `+ - * / %` | Castlevania (fouet, bougies, chauves-souris, pics) |
| 4 | Le Dojo des Torches | `and / or / not` | Shinobi (double saut, shuriken) |
| 5 | Le Pont des Booléens | `if / else` | Mario |
| 6 | Le Marché des Cristaux | `if / elif / else` | Double Dragon |
| 7 | La Forge des Répétitions | `for` | Castlevania |
| 8 | Le Temple des Cumuls | boucle + accumulateur | Shinobi |
| 9 | Le Tri des Glitches | boucle + `if` + `%` | fouet + shuriken |
| 10 | L'Arène du Glitch Gardien | `while` (boss, musique de combat) | Double Dragon, vagues épiques |

- `docs/javascripts/playsim.js` : simulation **pure** (testée sous Node) — plateformes (`buildCourse` : langage de segments `flat/gap/up/down/float/end`), beat'em up (`createBrawl` : vagues qui verrouillent l'écran), et deux « bots ». `play.js` : rendu KAPLAY, clavier et souris (touches par défaut : flèches / WASD = ZQSD, Espace, clic gauche ou X = frapper, clic droit ou V = appeler Laita, F = shuriken (aussi C / K) ; toutes personnalisables, voir §18), boutons tactiles, effets, caméra, musique (tension près des ennemis, combat pendant les vagues) et sons (`OctoMusic.sfx`, synthétisés). `puzzle.js` : validation « sur plusieurs cas » + scène d'énigme standard. Sprites du trajet : `sprites-run.js`.
- Ajouter un niveau : un `levelN.js` (`run`, `starter`, `briefing`, `hints`, `validate` via `OctoPuzzle.validateCases`, `scene: OctoPuzzle.scene({...})`), une entrée dans `OctoProgress.levels` et dans `extra_javascript`. Les tests (`levels`, `sim`) l'attrapent s'il est incomplet ou infaisable.
- Garde-fous : `npm test` fait jouer chaque parcours par un bot (doit se terminer) et vérifie que le double saut est indispensable aux niveaux 4 et 8 ; `node dev/run-check.mjs [niveaux]` rejoue le vrai jeu dans Chromium avec le bot jusqu'à l'ouverture de l'énigme.
- Une chute dans un trou coûte un cœur (retour au dernier point de contrôle). Accessibilité : après 3 chutes / 2 K.O., un bouton « Passer le trajet » apparaît. Tactile : boutons à l'écran (détection `pointer: coarse` ou premier toucher). `?unlock=all` déverrouille tous les niveaux (démonstration). Sélecteur de niveaux sur l'accueil.
- **Saut fluide** (plateformes) : touche de saut **tenue** = on saute de nouveau dès qu'on retouche le sol (pas besoin de relâcher) ; un **nouvel appui** compte même si une autre touche de saut est déjà tenue (Z tenu + Espace = double saut) : `createInput` envoie `jumpTap` (appui neuf, pas la répétition automatique du clavier), `sim.step` ne le donne qu'au 1er pas de l'image. Testé par `sim.test.js`.
- Réglages de la physique dans `OctoSim.CFG` (saut max ≈ 80 px, portée ≈ 90 px) : les parcours respectent ces limites (vides ≤ 2 colonnes, ≤ 3 avec double saut ; marches ≤ 2 tuiles, ≤ 3 avec double saut).

## 18. Réglages du joueur (menu ⚙)

`docs/javascripts/settings.js` (`OctoSettings`) : bouton ⚙ à côté du son, ou **Échap** (la partie se met en pause). Quatre onglets :
- **Touches** : chaque action (gauche, droite, sauter, haut, bas, frapper, shuriken) a jusqu'à 4 touches, clavier ou **boutons de souris** ; « + » puis appuyer sur la touche voulue. Une touche déjà prise est reprise à l'autre action. Codes physiques (KeyW = Z sur AZERTY). L'aide en bas de l'écran suit les touches choisies (`hintFor`).
- **Son** : musique, volume, effets sonores (`sfx`).
- **Affichage** : secousses, aide des touches, boutons tactiles (auto / toujours / jamais), plein écran.
- **Jeu** : mode détente (aucun dégât ; `sim.relax`), « Passer le trajet » toujours visible, sauvegarde copiable / rechargeable (`OctoProgress.exportSave / importSave`, validation stricte), réglages par défaut, **recommencer le jeu à zéro** (confirmation en deux temps, garde les réglages).
- Stockage : `octocat-code:settings:v1` (réglages) et `octocat-code:v1` (progression). Logique pure testée (`dev/tests/settings.test.js`) ; `node dev/settings-check.mjs` rejoue le menu dans Chromium (pause, liaison clavier et souris, reset).
- `play.js` lit les touches via `OctoSettings.lookup(code)` ; ne plus ajouter de touche en dur.
- Piège corrigé : `.octo-fs` a `z-index: 50` ; sans cela une barre latérale Material invisible interceptait des clics dans le jeu.
- Plein écran (onglet Affichage) : le moteur recharge la page quand le format de la fenêtre change, mais **jamais en plein écran** (recharger quitte le plein écran : écran noir puis retour à la fenêtre). En plein écran le canvas garde son format (\`--octo-aspect\`) et se centre entre des bandes ciel / sol (\`html.octo-fs-on\`). Vérifié par \`node dev/fullscreen-check.mjs\` (reproduit le bug avec l'ancien code).
- Plein écran : la souris est **cachée** (même dans un niveau) ; un **clic molette** la montre ou la cache à nouveau (petit message à l'écran) ; elle reste visible dans le menu ⚙. Réglage « Cacher la souris en plein écran » (onglet Affichage, activé par défaut). Classes `html.octo-hide-cursor` / `octo-menu-open`. La souris n'est cachée que sur le **canvas** (décor) : elle reste visible sur tout ce qui est dans `.octo-ui` (fenêtres d'explication, éditeur, boutons) car on s'en sert pour lire les exemples. En plein écran le **menu du clic droit du navigateur est bloqué** partout (le clic droit lance le shuriken), sauf dans un champ de texte (coller un code de sauvegarde).

## 19. Logo de l'accueil

`docs/javascripts/logo.js` (`OctoLogo`) : le titre « OCTOCAT-CODE » est dessiné au chargement avec les tampons de pixels (police 5×7 maison, 0 octet de fichier) : dégradé chaud pour OCTOCAT (oreilles de chat sur le premier O), tiret cyan, dégradé « terminal » vert pour CODE, biseau, double contour, ombre portée. Animation : chute en cascade, flottement, vague de lumière, étincelles. `hub.js` le pose avec une taille entière qui tient dans la largeur ET dans 22 % de la hauteur (pas de recouvrement des commandes en haut à droite sur téléphone), puis le bandeau de la devise et l'invite. Repli sur du texte si le module manque. Le tag du navigateur reste « OCTOCAT-CODE ».

## 20. Parcours : nouveautés de jeu (cœur-étoile, caisses, ville, ennemis variés)

- **Cœur à pleine vie = invincibilité** (6 s, `CFG.starTime`) : l'OctoCat prend des couleurs d'arc-en-ciel (calque coloré + aura + traînée), ne subit plus aucun dégât (ennemis, pics, bouteilles) et terrasse ce qu'il touche ; clignote à la fin. À vie incomplète, le cœur soigne (+1 en plateforme, +2 en arène).
- **Étoile-shuriken** (`kind: "power"`, 14 s, `CFG.powerTime`) : lancer en éventail (3), traverse les ennemis, 2 dégâts. Elle sort des **caisses** de l'arène (`drop: "power"`) et d'une bougie sur trois dans les niveaux avec shuriken. Dans l'arène, la touche « shuriken » ne marche qu'avec elle (bouton tactile ★ présent si le niveau a une caisse à étoile).
- **Arène (Double Dragon)** : décor de **ville** (façades dessinées une fois et posées comme un sprite chacune — `registerCity` dans `sprites-run.js`, palettes `village` / `market` / `arena` —, enseignes néon, trottoir, chaussée, lampadaires, voitures). `def.crates: [{ x, y, kind: "crate" | "block", drop }]` : une **caisse** se casse en 2 coups (butin `heart` ou `power`), une **benne** est un obstacle fixe ; ils bloquent joueur et ennemis (qui les contournent), on peut sauter dessus. Le bot casse les caisses et contourne les bennes.
- **Ennemis** : arène — `ninja` (prévient puis bondit), `slinger` (garde ses distances, lance des bouteilles que l'on évite en sautant ou en changeant de couloir) ; `grunt` / `fast` / `heavy` légèrement plus agressifs. Plateformes — `hop` (sauteur), `dash` (fonceur : clignote puis charge), chauve-souris qui pique, marcheurs qui se tournent vers le joueur ; langage de parcours `hop: [...]`, `dash: [...]`.
- Le **mode détente** coupe aussi ces dégâts. Tests : `dev/tests/sim.test.js` (étoile, caisses, ennemis) ; `node dev/run-check.mjs` rejoue tout dans Chromium.
- **Son** : les effets sonores passent par un bus à part (`sfx`) : ♪ OFF coupe la musique seule, les effets restent (réglage « Effets sonores » séparé) ; `node dev/audio-check.mjs` le vérifie.

## 21. Mémoire du navigateur (réglages, son, progression)

Tout vit dans le `localStorage` (`octocat-code:v1` progression, `octocat-code:settings:v1` réglages, `octocat-code:music:v2` / `octocat-code:volume` son). `node dev/persist-check.mjs` ferme et rouvre un vrai profil Chromium : tout est retrouvé. Si un navigateur efface les données des sites à la fermeture (option « effacer les données des sites à la fermeture », navigation privée), rien ne peut être gardé côté site : le menu ⚙ → Jeu → **Ma mémoire** le dit en mots simples (statut du stockage, protection `navigator.storage.persist()`, pastille « ! » sur le ⚙ si l'écriture est impossible) et propose un **code de sauvegarde complet** (`OctoSettings.exportAll / importAll` : progression + touches + options + volume + musique ; l'ancien code « progression seule » reste accepté).

## 22. Textes du jeu : lisibles par un enfant de 8 ans

Règle du PO : tous les textes (briefings, indices, messages de la console, succès) sont **ludiques, explicites et lisibles pour un enfant de 8 ans** (et corrects pour un adulte). Le briefing est découpé en sections : 📖 L'histoire · 🧠 Pour comprendre · 🎯 **Ta mission** (juste après, avant les exemples : c'est ce qu'il faut voir) · 👀 Un exemple · 💡 Petits conseils, avec un bouton « J'ai compris, je joue ! » fixé en bas. Dans les textes de niveau, **`code`** devient une pastille de code et **gras** du gras (`rich()` dans `engine.js`, sans `innerHTML`) : on y met **ce qu'il faut écrire** (noms, valeurs, signes). Les indices vont du doux au précis (la dernière donne la réponse). Les messages d'erreur disent ce qui ne va pas et quoi essayer (`OctoPuzzle.msg`), sans jargon (« petite faute d'écriture », « je ne trouve pas la boîte… »). Pas de ligature dans le code (`>=` doit rester deux signes).

## 23. Pièces et indices payants

Les **pièces** (« PIECES n/N » en haut à gauche du trajet) sont la monnaie des indices. Plateformes : les « bits » ramassés (`sim.stats.bits`). Arène : **une pièce par ennemi vaincu** (`bitsTotal` = nombre d'ennemis). À la fin du trajet (terminal atteint ou « Passer le trajet »), `OctoProgress.bank(niveau, n)` les met en poche : seules les pièces **qu'on n'avait pas déjà gagnées** à ce niveau comptent (pas de pièces à l'infini en rejouant). Portefeuille : `coins`, `banked`, `paid` dans `octocat-code:v1` (et dans le code de sauvegarde).
- Énigme : la **mission** (ligne au-dessus de l'éditeur) est cachée (« 🔒 … ») tant qu'**aucun indice n'est acheté** ; le briefing de départ, lui, dit tout et reste gratuit (bouton 📜).
- Bouton **💡 Indice · N 🪙** : chaque clic paie l'indice suivant : **5 pièces chacun** (`HINT_PRICE` dans `engine.js`). Pas assez de pièces : message, rien n'est payé. Les indices payés restent affichés dans un cadre bleu au-dessus de l'éditeur (ils survivent à ⚡ Compiler et au rechargement : `OctoProgress.paidHints`). Quand tous sont payés : « Plus d'indice ».
- Réussir le niveau **efface les indices payés** (`complete` supprime `paid[niveau]`) : au prochain passage, il faut repayer. Les pièces non dépensées sont gardées.
- Vérifié par `node dev/hints-check.mjs` (mission cachée, prix, rien payé sans pièces, indices qui restent, repaiement) et par les tests `settings.test.js` (pièces).
- Textes du jeu : rester **génériques** pour les navigateurs (pas de nom de navigateur dans ce que le joueur lit).


## 24. Laita, la chienne de l'OctoCat

Compagne fidèle de l'OctoCat (noir et blanc, poil ébouriffé, tache blanche sur le front, langue rose : dessinée à l'image de la vraie Laita, sprite procédural `laitaBuf` dans `sprites-run.js`, jamais une photo). Présente dans **tous les trajets**, plateformes et arène.
- **Pouvoir** : clic droit (ou `V`, bouton tactile 🐕, action « Appeler Laita » du menu ⚙). Elle fonce sur le monstre le plus proche (portée `CFG.dogRange`), lui fait **peur** (`e.scared`, `CFG.dogScare` = 4 s : il s'éloigne du joueur, ne blesse pas, ne lance plus rien, un « ! » flotte au-dessus), puis revient près de son maître. **Elle ne tue jamais** et **ne subit jamais de dégât** (`dog.immortal`, rien dans la simulation ne la touche). Attente entre deux appels : `CFG.dogCooldown` (9 s, pour ne pas spammer ; elle se tient 46 px derrière l'OctoCat, les pattes au sol : le sprite est recadré à 24×16, sans marge sous les pattes) (jauge « LAITA » en bas à gauche, « PRETE » quand elle l'est) ; sans monstre à portée elle aboie seulement. Les monstres effrayés reviennent forcément.
- Code : `createDog` (`playsim.js`, état `follow` / `charge` / `return`), `sim.dog`, entrée `dog` ; rendu et jauge dans `play.js`, aboiement / peur dans `music.js` (`bark`, `scare`).
- Le **shuriken** n'est plus sur le clic droit (clavier **`F`** par défaut, aussi `C` / `K` ; bouton tactile ★ ; les anciens réglages « C / K » reçoivent F en premier, `sanitize`). D'anciens réglages enregistrés avec « clic droit = shuriken » sont migrés (`sanitize` dans `settings.js`).
- Les appuis très courts (clic rapide, tape) sont mémorisés jusqu'à l'image suivante (`latch` dans `createInput`) : un clic n'est plus perdu.
- Vérifié par `node dev/dog-check.mjs` (clic droit réel dans Chromium, niveaux 1 et 2 : suit, charge, effraie, ne tue pas, revient) et par `sim.test.js` / `settings.test.js`.

## 25. Plus de cœur = tout le niveau recommence

À 0 cœur (coups, bouteilles, ou dernière chute), `restartLevel()` (`playsim.js`, plateformes et arène) remet **tout** au début : joueur au départ, cœurs pleins, **drapeaux de contrôle éteints** (retour au départ, plus au dernier drapeau), ennemis, bougies, vagues, caisses, cœurs/étoiles au sol, Laita à côté du joueur ; événement `restart` (`play.js` efface et repose les objets du décor : « TOUT RECOMMENCE »). Une chute qui laisse des cœurs ramène seulement au dernier drapeau.
- **Une pièce prise ne revient jamais** (sinon on mourrait exprès pour en récolter) : plateformes, `bits[i].got` est conservé ; arène, `sim.coinsGot["vague:rang"]` garde la pièce de chaque ennemi déjà vaincu. Le compteur « PIECES » ne repart pas à zéro.
- Son du coup dans le vide (`swing`) : souffle + glissando bien audibles (avant : trop faible pour être entendu).
- Vérifié par `sim.test.js` (2 tests) et `node dev/restart-check.mjs` (vrai jeu, niveaux 1 et 2).

## 26. Salle secrète (un trou par niveau à trous)

Chaque parcours à plateformes qui a des trous (niveaux 1, 3, 4, 5, 7, 8, 9) cache une **salle secrète** : `addSecretRoom` (`playsim.js`) choisit **automatiquement un trou, jamais le dernier** (le trou du milieu parmi les précédents ; s'il n'y a qu'un seul trou, c'est lui). Tomber dedans ne coûte **aucun cœur** : l'OctoCat arrive dans une petite grotte pleine de pièces (~30 : sol, colline, rangées en l'air), puis le **tuyau vert « SORTIE »** le ramène **juste devant le dernier trou** du niveau (`sim.secret.out`, premier sol sans pic avant ce trou).
- Géométrie : la salle est ajoutée à **droite de la grille**, derrière 3 colonnes de mur (`sim.w` = niveau + mur + salle ; `sim.secret.levelW` = fin du niveau). La caméra ne dépasse pas `levelW` tant qu'on est dans le niveau (`camTarget`), donc on ne voit jamais la salle de l'extérieur ; dans la salle, un fond de grotte (`cave`) et un rideau (`curtain`) cachent le niveau. Les points de contrôle ne s'allument pas dans la salle.
- Les pièces de la salle sont de vraies pièces (`sim.bits`, comptées dans « PIECES n/N », jamais regagnables : §25). Les autres trous coûtent un cœur comme avant.
- Indice discret : de petites étincelles dorées (et une lueur) montent du trou secret quand on s'en approche (< 420 px), **à la hauteur du sol au bord le plus bas du trou** (`sim.secret.gapTop` ; avant, elles partaient du bas du monde et restaient hors écran dans la plupart des niveaux ; vérifié dans les 7 niveaux par `node dev/spark-check.mjs`). Événements `secret` / `secret-out` (message, caméra recadrée d'un coup).
- Vérifié par `sim.test.js` (2 tests : sélection du trou, pas de cœur perdu, pièces, sortie ; tous les niveaux à trous ont une salle) et `node dev/secret-check.mjs` (vrai jeu, niveaux 1 et 7).

**Équilibrage des pièces** (calcul) : les trajets rapportent 15 / 9 / 5 / 12 / 10 / 12 / 6 / 8 / 4 / 15 pièces (niveaux 1 à 10) = **96 au total**, soit ~10 par niveau. Un niveau complet d'indices = 3 × 5 = 15 pièces ; les 10 niveaux = 150. Sans salle secrète on ne peut donc payer qu'environ 2 indices sur 3 (96 / 150 ≈ 64 %) et il faut choisir quand les acheter ; les pièces ne se regagnent pas (§25). Seule une **salle secrète** (28 pièces dans chacun des 7 niveaux à trous, §26) rend le joueur « large » (+196 pièces). Prix et gains sont les seuls leviers : si le jeu devient trop facile ou trop dur, changer `HINT_PRICE`.

Laita attend aussi pendant les énigmes : `sc.laita(octo, ox)` (`scenery.js`, appelé par `puzzle.js` et les scènes des niveaux 1, 5, 10) la pose **assise devant l'OctoCat, face à lui** (sprite `sit`, 2 images, queue qui remue) ; quand l'OctoCat court vers le portail elle le suit, quand il revient elle se rassoit.

## 27. Indice « réponse », erreurs de niveau, solutions

- Le **3e indice de chaque niveau donne la réponse** : il coûte **15 🪙** (`ANSWER_PRICE`, les deux premiers 5 🪙 : `HINT_PRICE`) et le bouton devient « 💡 La réponse · 15 🪙 ». Avant de payer, une **demande de confirmation** s'affiche (cadre orange : « Attention ! … Oui, je paie 15 🪙 / Non, je garde mes pièces », « Non » sélectionné d'office). Pas assez de pièces : **refus rigolo** (« 🐕 Ouaf, refusé ! … il t'en manque N … ») avec un bouton « OK, je cherche encore ! », rien n'est payé (idem pour un indice doux : « la poche est trop légère »). `dev/hints-check.mjs` couvre tout ; `solutions.test.js` vérifie « 3 indices, le dernier donne la réponse ».
- **Bug corrigé** : `validateCases` (`puzzle.js`) refusait une bonne réponse quand le **commentaire** du code de départ contenait « ??? » (niveau 2 ; avant : niveaux 1, 5, 10). Il utilise maintenant `hasBlank` partout. `dev/tests/solutions.test.js` rejoue les **10 réponses** à partir du vrai code de départ (commentaires gardés) et `dev/run-check.mjs` fait pareil dans le vrai jeu : ne jamais remplacer tout l'éditeur dans un test, éditer seulement les `???` comme le joueur.

## 28. Fin en grotte (niveau 8)

Le trajet du niveau 8 ne finit plus sur un sol avec le terminal : après le dernier trou, une **falaise pleine hauteur** (segment `{ t: "cave", n, floor, open }` de `buildCourse`) cache un **tunnel** dont l'entrée s'ouvre sur la paroi du trou ; le **terminal** est au fond. Le sol d'approche descend de 6 tuiles avant le trou (`down 6`) : la falaise est inescaladable (plus haute que saut + double saut ≈ 150 px), donc **le dernier saut se fait dans le trou**. `open: 5` rend l'entrée assez haute pour qu'un saut normal arrive sur le sol du tunnel. `sim.cave = { l, r, t, b }` (pixels) ; `play.js` pose le fond sombre, 2 torches, une lueur cyan sur le terminal et un panneau « GROTTE > » avant le trou. Autre niveau à grotte = remplacer `gap + flat + end` par `down / flat / gap / cave` en gardant une marche d'au moins 5 tuiles. Vérifié par `sim.test.js` et `node dev/cave-check.mjs` (vrai saut clavier, niveau 8).

## 29. Accueil : Laita devant sa niche

Sur l'accueil (`hub.js`), Laita attend **assise devant sa niche** (sprite `kennel`, `sprites-run.js` ; le nom « LAITA » est **écrit directement sur le pan du toit**, pas sur une plaque), tournée vers l'OctoCat, qui ne patrouille plus que dans la partie gauche (40–235) pour ne pas lui marcher dessus. L'invite est **« [ CLIQUE = COMMENCER ] »** (plus de « CONTINUER »), dans un encadré **dimensionné sur le texte** (`k.formatText().width` + marge), plus un cadre pleine largeur.

## 30. Tours, langages, apparences, fin du jeu

**10 niveaux = 1 tour.** Le jeu complet = **3 tours** des mêmes 10 énigmes, chacun avec un **langage** différent, donc dans un **monde** différent (§37) ; après le 3e tour, c'est la vraie fin (crédits). État dans `octocat-code:v1` : `laps` (0–3), `lapLang` (Python | JavaScript | Pseudo-code), `pendingLap`, `creditsPending`, `finished` (exportés / importés avec la sauvegarde, assainis).
- `OctoProgress.complete(10)` (si les 10 niveaux sont faits) : `laps++`. Tours 1 et 2 : `pendingLap`, **niveaux reverrouillés** (`completed`, `unlocked`, `fails`, `paid`, `banked` remis à zéro : on regagne des pièces aux nouveaux trajets), pièces non dépensées **gardées**. 3e tour : `finished` + `creditsPending`, rien ne se reverrouille (jeu fini = tout rejouable, sans relancer les crédits). `complete` renvoie `gained.lap` : `"lap"`, `"end"` ou `null`. Succès `lap1`, `lap2`, `lap3`, `magic`.
- **Accueil** (`hub.js`) : si `pendingLap`, fenêtre « TOUR n TERMINE ! » (`.octo-lapup`) : nouvelle apparence + choix du **monde suivant** (`OctoProgress.nextLangs()`, `startLap(lang)`) ; la scène est refaite avec le décor du nouveau monde ; l'en-tête affiche « TOUR n/3 - LANGAGE » (ou « JEU TERMINE »).
- **Langages** (`langs.js`, `OctoLangs`) : les niveaux sont écrits en Python ; `OctoLangs.apply(def, lang)` renvoie une **copie** avec code de départ, indices (le 3e donne la réponse), mission, conseils et leçon dans ce langage (le validateur ne change pas : l'interpréteur lit les 3 écritures) ; les exemples du briefing commencent par ce langage. Rien de redéfini = repris de Python (niveaux 1 à 3 en pseudo-code). `fills` = ce qui remplace les ??? ; `OctoLangs.solve(def, lang)` rend le code résolu. `solutions.test.js` rejoue **les 10 niveaux × 3 langages** à partir du vrai départ. Ajouter un niveau = ajouter ses variantes dans `langs.js`.
- **Apparences** : 0 d'origine, 1 **Ninja** (bleu, bandeau rouge ; Laita : bandana rouge), 2 **Princesse** (or, couronne, cape rouge ; Laita : couronne + cape), 3 **Cosmos** (indigo étoilé, auréole, cape magenta ; Laita : pelage étoilé + collier-étoile), 4 **OctoBot** (robot secret, §42). `sprites.js` (`O_SKINS`, `octoFrames(skin)`) et `sprites-run.js` (`laitaBuf(pose, skin)`) chargent 5 planches (`octo`, `octo-s1..4`, `laita`, `laita-s1..4`) ; le moteur enveloppe `k.sprite` : « octo »/« laita » deviennent « …-sN » selon `OctoProgress.skin()`, lu à la création de l'objet (donc le changement est immédiat, sans recharger). `?skin=N` force l'apparence (démo ; lu une seule fois : le jeu nettoie l'adresse).
- Vérifié par `laps.test.js`, `solutions.test.js` et `node dev/laps-check.mjs` (4 apparences, fenêtre de langage, niveau 10 → fin de tour / générique, reprise des crédits).

## 31. Générique de fin

`credits.js` (scène `credits`) : lancé **une fois**, quand le 3e tour est fini (`creditsPending`, aussi au rechargement si la page a été fermée avant la fin). Texte en capitales sans accents qui monte lentement sur un ciel étoilé (parallaxe, feux d'artifice, étoiles filantes) pendant qu'OctoCat et Laita, dans leur dernière apparence, courent ; maintenir clic / Espace accélère, Entrée passe à « FIN ». Contenu : jeu, INDFORGE Studio, idée / direction / tests (Mickaël), code + pixel art + musique faits par ordinateur avec Claude (Anthropic), les héros, les 10 mondes, ce qu'on a appris, outils libres (KAPLAY MIT, MkDocs + Material MIT, Press Start 2P OFL, GitHub Pages), exploits du joueur, merci. Quelques secondes après « FIN » : fondu, `finishCredits()`, retour à l'accueil avec la dernière apparence.

Le générique défile plus lentement (`SPEED` 17) et, **le jeu fini** (`finished`, avec ou sans OctoBot), un bouton **🎬 CREDITS** apparaît à l'accueil (à côté de 🌍 MONDE) pour le revoir à volonté (`dev/score-check.mjs`). Les accessoires de tête des costumes (auréole du Cosmos, ampoule de l'antenne d'OctoBot, pointe de la couronne) restent dans le sprite quand le corps remonte (`sprites.js`).

## 32. Easter egg : les torches du portail

Dans **toutes les énigmes** (pas sur l'accueil : `magic: false`), cliquer sur les **deux torches** du portail (`scenery.js`) : chaque flamme s'éteint (« pschiit » `snuff`, fumée, poussière magique) et libère un **feu follet** qui file en arc vers le portail (flash). Quand les deux sont éteintes : la nuit tombe, anneaux arc-en-ciel depuis le portail, pluie d'étoiles, glissando `magic`, OctoCat et Laita sautent de joie, puis les torches se rallument **enchantées** (flammes arc-en-ciel, plus grandes) jusqu'à la fin de la scène ; « ~ MAGIE ! ~ » ; succès « Magicien ». La souris devient une main au-dessus d'une torche. **Le spectacle finit par une porte ouverte** : si OctoCat est au repos (pas de compilation en cours), le moteur accepte l'événement `octo:magic` (`detail.take = true`, Compiler bloqué), puis `walkIn()` (`scenery.js`) ouvre le portail tout seul, OctoCat y entre et `octo:magic-exit` fait ouvrir le **trajet du niveau suivant SANS résoudre l'énigme** : le niveau est tout de même **compté comme fini** (`OctoProgress.complete(id, { magic: true })` : marqué `magic: true`, il compte pour le tour et pour la fin du jeu, donc le « speed run » par la magie mène bien aux tours suivants et aux crédits ; mais **ni pièces, ni succès « premier code » / « sans faute »**, et la magie ne remplace jamais une vraie réussite). Au niveau 10 : fin de tour (accueil) ou crédits, comme une vraie réussite. Piège : `k.mousePos()` n'est pas fiable ici (canvas étiré en CSS) : la position est lue sur les événements `pointer*` du canvas puis convertie avec `k.toWorld`. Vérifié par `node dev/magic-check.mjs` (vrais clics, niveaux 1 et 4 : passage du portail, énigme non validée) et `laps.test.js` (3 tours entièrement passés par la magie → crédits).

## 33. Page 404 : « GAME NOT FOUND »

`overrides/404.html` : page plein écran **sans rien d'autre** que la scène KAPLAY `notfound` (`docs/javascripts/notfound.js`), montée avec `data-start="notfound"` et `data-home="{{ site_url }}"` (le moteur lance alors cette scène, jamais l'accueil ni les crédits ; « retour à l'accueil » = vraie navigation vers l'adresse du site, la page 404 ayant une adresse quelconque). Les commandes ♪ / ⚙ sont cachées (`html[data-octo-scene="notfound"] .octo-audio`), `noindex`.
- Décor : fond de nuit, « ERROR » / « 404 » / « GAME NOT FOUND » dessinés en pixels (police 5×7 maison, `FONT`) avec le **décalage cyan / magenta** et des **lignes qui glissent** (petits tremblements tout le temps, grosses rafales toutes les ~1-3 s, bande qui traverse l'écran), nuages en contour, croix / losanges / ronds flottants, sol qui défile (clin d'œil au dinosaure de la page d'erreur d'un grand navigateur ; composition et dessin originaux).
- Jeu : **Laita court**, poursuivie par un **Glitch** ; on **maintient la touche « droite » de ses réglages** (`OctoSettings.lookup(code) === "right"`, ou le doigt / la souris sur l'écran). Lâcher : Laita ralentit, le Glitch la rattrape (collé à elle, il grogne, jamais de défaite). ~4-5 s de course cumulées : OctoCat apparaît à droite, Laita lui **saute dans les bras**, **magie** (flash, anneaux arc-en-ciel, pluie d'étoiles, cœurs, `magic` / `heart`), le Glitch se disperse, fondu blanc puis retour au jeu. Apparences de tour respectées (`k.sprite("octo"/"laita")`).
- Vérifié par `node dev/notfound-check.mjs` (serveur qui renvoie 404.html sur une adresse inconnue, comme GitHub Pages ; bureau et mobile paysage : scène seule, pas de défilement, course, retrouvailles, retour demandé, console propre).

## 34. Référencement, partage, performance (passe finale)

- **Gabarits sans thème** : `overrides/octo-base.html` (socle) → `game.html` (accueil) et `404.html`. Plus aucune feuille de style, script, recherche ni carte source de Material n'est chargé : `octocat.css` contient son propre socle (html/body/boutons) et `plugins: []` (pas de recherche). `tools/postbuild.py` **supprime du site publié** les fichiers du thème qu'aucune page ne charge (`prune_unused_theme_assets`) : le site passe de 3,3 Mo à ~0,9 Mo et le service worker précache 42 fichiers au lieu de 78. Attention : un `description:` de front matter contenant « : » doit être **entre guillemets**, sinon le YAML est ignoré en silence et mkdocs retombe sur `main.html`.
- **SEO** (`game.html`) : `description`, `canonical`, **Open Graph** (`og:*`, image 1200×630) et **Twitter Card** (`summary_large_image`), `theme-color`, balises Apple, **JSON-LD `VideoGame`** (gratuit, dès 8 ans, français, éditeur INDFORGE Studio). Le `<title>` reste « OCTOCAT-CODE » (consigne du PO) ; le titre long est dans `og:title`. Le **texte de présentation** (`docs/index.md` : pitch, notions, les 10 mondes, touches) est rendu dans un bloc `.octo-sr` (invisible mais lu par les moteurs de recherche et les lecteurs d'écran) : le jeu étant un canvas, c'est ce qui donne du contenu à indexer. La 404 est `noindex`. `sitemap.xml` est produit par mkdocs ; à l'éditeur du site de le soumettre à la Search Console (et d'ajouter la balise de vérification si besoin : non faisable depuis le dépôt).
- **Image de partage** : `docs/assets/social-card.png` (170 Ko), photo de l'accueil réel (`?card=1` cache l'invite et les compteurs, `hudchrome` dans `hub.js`) + 3 pastilles ; régénérée par `node dev/social.mjs`. Exclue du précache (réseaux sociaux, pas hors-ligne). Aussi `screenshots` du manifeste.
- **Icônes** : `favicon.svg` (vectoriel), `favicon-16/32.png`, `favicon.ico` (16/32/48), `apple-touch-icon.png` (180), `icon-192/512` et `icon-maskable-512` ; manifeste enrichi (`id`, `categories`, `description`, `screenshots`).
- **Performance** (mesurée par `dev/perf-check.mjs`, CPU x4) : les sprites sont passés à KAPLAY **en canevas** (plus d'encodage PNG puis décodage) et dessinés par `ImageData` (`Buf.draw`) : dessin des sprites 1,5 s → 0,16 s, page prête 5,0 s → 1,3 s ; le **sol des trajets** est une seule couche qui ne dessine que les colonnes visibles (au lieu de centaines d'objets parcourus à chaque image) ; mémoire JS ~15 Mo.
- **Nettoyage** : code hérité des pages multiples supprimé (verrou `data-octo-guard`, tableau de bord `#octo-hud`, onglets de langue Material, champs `zone` / `path`, CSS associé) ; `npm run shot` réécrit pour le parcours actuel.

## 35. Score de pièces, costumes, logo du générique

- **Score** (`OctoProgress.earned()`, `earned` dans `octocat-code:v1`, exporté / importé / assaini) : **toutes les pièces gagnées depuis le début** ; chaque `bank()` l'augmente, acheter des indices ne le baisse pas, les tours qui reverrouillent les niveaux ne le remettent pas à zéro (seul « recommencer le jeu » le fait). Sur l'accueil (`hub.js`), un encadré sous « [ CLIQUE = COMMENCER ] » l'affiche façon borne d'arcade (« PIECES 0612 », pièce dorée qui tourne, le chiffre défile jusqu'au total puis clignote ; `hudchrome` : absent de l'image de partage). Un parcours parfait rapporte ~292 pièces par tour (96 + 196 de salles secrètes), donc 500 demande de très bien jouer au moins deux tours.
- **Costume** : à partir de **500 pièces gagnées** (`canPickSkin()`, « plus de 499 »), un bouton « 🎭 COSTUME » apparaît **à gauche du bouton ♪** (`.octo-skin`, dans `.octo-audio`, accueil seulement ; le mot disparaît sur petit écran pour ne pas recouvrir le logo). Il ouvre la liste des 4 apparences (OctoCat, OctoNinja, OctoPrincesse, OctoCosmos + Laita assortie) ; `pickSkin(n)` mémorise `skinPick`, la scène d'accueil est refaite pour que les sprites changent. `skin()` renvoie ce choix s'il est permis, sinon l'apparence du tour ; **finir un tour efface le choix** (la nouvelle apparence du tour est annoncée). Le costume choisi vaut partout (trajets, énigmes, crédits). `?skin=N` reste prioritaire (démo).
- **Générique** : le titre n'est plus du texte mais le **même logo animé que l'accueil** (`OctoLogo.add` avec `speed: 2.6`, `rainbow: true`, `still: true` : plus de chute d'arrivée, reflets arc-en-ciel qui défilent d'une lettre à l'autre, étincelles et flottement ~2,6 fois plus vite) ; il monte avec le texte (`setTop`, `setVisible` hors écran). Repli sur le texte si `OctoLogo` manque.
- Vérifié par `settings.test.js` (score, seuil 499 / 500, choix, remise à zéro) et `node dev/score-check.mjs` (vrai jeu : bouton absent / présent, choix mémorisé après rechargement, captures de l'accueil et du générique en bureau et mobile).

## 36. Écraser un ennemi en sautant

Plateformes : retomber sur un ennemi (vitesse verticale vers le bas, pieds dans sa moitié haute ou au-dessus de lui au pas précédent) le **tue d'un coup**, quelle que soit sa solidité (marcheur, costaud, sauteur, fonceur, chauve-souris) : `hurtEnemy(e, 99)` dans `playsim.js`, rebond `CFG.bounceV`, aucun dégât pour le joueur. Avant, un costaud ou un fonceur (2 PV) survivait au premier saut. `play.js` (`squash`) laisse l'ennemi **aplati** au sol une demi-seconde avec le bruit et les éclats d'écrasement. Arène (Double Dragon) : pas d'écrasement, on esquive en sautant et on frappe (coup aérien). Vérifié par `sim.test.js` (écrasement) et `node dev/stomp-check.mjs`.

## 37. Les trois mondes : un langage = un monde

**Ordre des langages** (`progress.js`, `LANG_LIST`) : du plus doux au plus technique. Le **tour 1 est toujours en pseudo-code** (monde de départ, GitHubia, tout ce qui précède est inchangé). Au 1er fin de tour, le joueur **choisit Python ou JavaScript**, le dernier tour est **l'autre** (`nextLangs()` = les langages pas encore joués ; `startLap` refuse un langage déjà fait). État : `lapLang` + `langsDone`. Les anciennes sauvegardes sont migrées (tour 1 en Python). « Java » dans la demande du PO = **JavaScript** (déjà dans le jeu). `?world=N` (0 pseudo-code, 1 Python, 2 JavaScript) force le monde et le langage (démonstration, lu une fois). Jeu fini : bouton 🌍 MONDE à l'accueil (`pickWorld`) pour rejouer n'importe lequel.

| Monde | Langage | Décor | Trajets « plateformes » (7 niveaux) | À la place du Double Dragon (niveaux 2, 6, 10) | Musique |
|---|---|---|---|---|---|
| 0 GitHubia | pseudo-code | canyon, forêt corail, cité | parcours horizontaux (§17) | beat'em up (§17) | ré majeur, glockenspiel |
| 1 La Tour du Serpent | Python | crépuscule de jade, îles flottantes, temple, lune | **tours** à grimper (§38) | **le serpent d'Octo** (§40) | sol majeur, marimba + shaker, 108 BPM |
| 2 La Galaxie JavaScript | JavaScript | espace, planète à anneaux, station, cristaux | **gravité lunaire**, ressorts, passerelles (§39) | **l'invasion** façon Space Invaders (§41) | mi majeur, arpège de synthé + charleston, 116 BPM |

- **Registre** `worlds.js` (`OctoWorlds.info`, `register`, `apply(def, monde)`, `title`, `header`) ; données : `world-python.js`, `world-js.js` (10 titres, un `run` par niveau, thèmes de décor). Le moteur applique le monde au lancement du trajet (`enterRun`), au briefing / éditeur (`titled`) et en-tête des énigmes (`OctoWorlds.header`). Les **énigmes de code ne changent pas** (langs.js). Mêmes capacités par niveau (fouet, shuriken, double saut) et **mêmes pièces** (15 / 5 / 12 / 10 / 6 / 8 / 4 + 28 par salle secrète ; arènes 9 / 12 / 15 ; une bougie qui lâche une pièce ajoute 1).
- **Décors** (`sprites-worlds.js`) : chaque sprite du monde 0 a une variante `nom-w1` / `nom-w2` (ciel, terre lointaine, nuages, tuiles, arbres, avant-plan, portail, terminal, Glitch, chauve-souris, pics, bougie, ressort, plateforme qui s'effrite) ; le moteur enveloppe `k.sprite` (`worldNames`) : l'accueil, les énigmes et les trajets changent d'univers sans réécrire de scène. Attention : `drawSprite` ne passe pas par `k.sprite` (les tuiles du sol ajoutent le suffixe à la main dans `play.js`). Les petits décors sont les dessins d'origine, teinte changée (`shift`).
- **Musique** : `OctoMusic.setWorld(0..2)` (tonalité, tempo, timbre, mélodie) appelé à chaque scène ; le combat reste épique, transposé. Nouveaux effets : `laser`, `boing`, `crumble`, `boom`, `bomb`, `ufo`, `wave`.
- Vérifié par `worlds.test.js` (robots sur les 20 trajets, pièces, salle secrète, physique) et `node dev/worlds-check.mjs 1|2`.

## 38. La Tour du Serpent : les tours (Python)

`sim-tower.js` (`buildTower`, `towerBot`) construit une grille verticale pour la simulation « platform » (`createPlatform`) : un **puits en zigzag** de plateformes (1 rangée d'épaisseur, 18 colonnes de large), chacune **2 rangées plus haute** que la précédente ; le sol du bas est plein (on ne tombe jamais : une chute ramène sur une plateforme plus bas). **Les plateformes vont par paires** : la 1re de la paire est atteinte en sautant par-dessus `gap` colonnes de vide (1 ; 2 avec le double saut), la 2e est collée à la 1re ; chaque demi-tour recule de `gap` colonnes par rapport à la 1re plateforme de la paire d'avant. Raison : le plafond (une plateforme 4 rangées plus haut) ne doit jamais coiffer le bord d'où l'on saute (il reste 96 px de haut, il en faut ~114 pour un saut complet). Spec : `{ platforms: [ { w, gap, bits, candles, en, tough, hop, dash, fly, spikes, crumble, cp, gapBit, secret } ] }`, colonnes comptées depuis le bord gauche de la plateforme ; `gapBit` = une pièce en l'air dans le saut ; `crumble` = l'effritement.
- Nouveautés de la simulation (`playsim.js`) : `sim.vertical` (progression = hauteur, drapeaux allumés par proximité), plateformes qui s'effritent (`~`, `sim.crumbles` : 0,5 s après qu'on s'y pose, reviennent 2,6 s plus tard), ressorts (`J`, `sim.pads`, bond de `CFG.padHeight` = 230 px quelle que soit la gravité), gravité du monde (`abilities.gravity`).
- **Salle secrète** : une petite plateforme à côté d'une plateforme marquée `secret`, derrière 2 colonnes de vide, porte un **portail doré** (`rows.warp`, `addWarpRoom`) vers la même grotte de 28 pièces ; s'il n'y a pas de place, le portail est au bout du sol (à droite). Étincelles et lueur comme pour les trous des niveaux horizontaux.
- Rendu (`play.js`) : ciel en **dégradé selon l'altitude** (bandes de couleur + étoiles + lune qui apparaissent en montant, `theme.alt`), murs de briques en fond, fenêtres éclairées, lianes et lanternes. Thèmes `py1` … `py9` (`world-python.js`).
- **Pas de piège dans la tour** : retomber sur le sol tout en bas après être monté (`sim.climbed`, debout sur une plateforme à plus de 100 px du sol), ou se retrouver dans la **poche** (le sol à droite de la 1re marche, sous la 2e plateforme : on n'en remonte pas, il manque ~2 px de hauteur sous le plafond) déclenche l'événement `rescue` : Laita ramène au dernier drapeau, **sans perdre de cœur** (« HOP ! ON REMONTE »). Le **portail doré** est toujours au **bout** de sa petite plateforme (les 2 pièces avant lui, aucune derrière : sinon on entre dedans avant de les prendre) ; sans place en hauteur (niveau 4), il est sur le sol de départ, à gauche (3 pièces sur le chemin de la 1re marche), jamais dans la poche.
- **Drapeaux d'une tour** : à 0 cœur on repart du **dernier drapeau allumé**, cœurs pleins (`respawn`, `sim.vertical`), pas tout en bas (sinon ils ne serviraient à rien) ; les niveaux horizontaux gardent la règle « 0 cœur = tout recommence » (§25). Le portail doré n'est **jamais sur la dernière plateforme** (le terminal se trouve sur le chemin et finit le niveau), jamais dans la poche du sol ; `worlds.test.js` fait sauter un joueur depuis la plateforme du portail jusqu'à lui dans les 7 tours. Quand tout recommence, `play.js` reconstruit aussi les objets des ressorts et des plateformes qui s'effritent (la simulation en crée de nouveaux : sinon les plateformes ne disparaissaient plus à l'écran alors qu'elles tombaient bien).
- Tests : `towerBot` (cible = la plus basse plateforme plus haute que les pieds, saute au bord, double saut en retombant) ; `worlds.test.js` vérifie les montées, les vides, le plafond et que le robot finit les 7 tours en moins de 70 s.

## 39. La Galaxie JavaScript : plateformes lunaires

Les 7 parcours (`world-js.js`) utilisent le langage de segments de `buildCourse` avec **gravité 0,55** (sauts de ~146 px, vides jusqu'à 4-5 colonnes, marches jusqu'à 3 tuiles), des **ressorts** `pads: [colonnes]` qui enjambent les vides de 6-7 colonnes (on les prend en courant), des **passerelles** `float { crumble: true }` au-dessus des vides, des soucoupes à la place des chauves-souris, des extraterrestres à la place des Glitch (variantes de sprites, mêmes règles). Le robot de test (`platformBot`) tient la touche de saut `0,34 / gravité`.

## 40. Le serpent d'Octo (Python, niveaux 2, 6, 10)

`sim-snake.js` (`createSnake`, `snakeBot`) : « Octo » = huit tentacules, Python = serpent. OctoCat glisse sur une grille 28 × 15 et traîne une file de **tentacules (les lettres de OCTOCAT)** ; chaque pièce l'allonge et l'accélère un peu. Les bords se traversent ; une **pierre**, un **Glitch** ou **sa propre file** coûtent un cœur (la file est coupée), jamais la partie ; 0 cœur = tout recommence (pièces déjà prises gardées, `coinsGot`). Un cœur à pleine vie ou une étoile = invincibilité (on avale les Glitch). **Laita court au bout de la file** ; son appel (V, clic droit) fige les Glitch 4 s. Pièces placées par un tirage fixé par `seed` (le niveau est toujours le même). Niveau 10 : musique de combat (`combat: true`).

## 41. L'invasion (JavaScript, niveaux 2, 6, 10)

`sim-space.js` (`createInvaders`, `invadersBot`) : OctoCat pilote sa **fusée** (son cockpit montre son costume), Laita dans une **bulle** à côté. Des **vagues d'envahisseurs** (drone / crabe / méduse, formation qui va d'un bord à l'autre et descend) lâchent des bombes ; on tire (X / clic gauche, maintenu), 5 cœurs ; **plus de bunkers** (le PO les a retirés pour durcir) ; une **soucoupe-mystère** laisse toujours un cœur : il soigne (+2) et, **à pleine vie, il fait apparaître un bouclier** (bulle bleue autour de la fusée, 2 bombes suffisent à le casser, rose quand il ne lui reste qu'un coup ; `p.shield`, il encaisse aussi la remontée de la formation), jamais d'invincibilité ici ; l'étoile-shuriken (tir en éventail) reste pour les autres modes ; **une pièce par envahisseur doré**. Si la formation arrive en bas elle repart vers le haut (− 1 cœur). Laita : l'appel **fige tous les envahisseurs 4 s** et efface les bombes. Niveau 10 : **le gardien** (vaisseau-mère à 30 PV, 3 phases, rafales et bombes visées). **Difficulté** (demande du PO : « trop simple ») : 5 vagues aux niveaux 2 et 6, 6 au niveau 10 ; envahisseurs plus solides (drone 2 PV, crabe 2, méduse 3, + `armor` selon la vague) ; plus de tirs (`fire` plus haut, salves `volley` : plusieurs colonnes lâchent d'un coup, bombes visées plus souvent) ; le robot met 70–120 s (et perd parfois un cœur) (avant 26–38 s). Les pièces restent 9 / 12 / 15. `play-arcade.js` dessine les deux arènes (cadre commun : cœurs, pièces, aide des touches, boutons tactiles, pause du menu ⚙, musique de combat, « Passer le trajet » après 2 K.O.).

## 42. OctoBot : le costume secret

**Finir le jeu (3 tours) sans jamais utiliser la magie des torches** (`complete(id, { magic: true })` incrémente `magicUsed`, jamais remis à zéro avant « recommencer le jeu ») débloque `robotSkin` et le succès « Robot d'acier ». Costume 4 : **OctoBot** (robot d'acier, visière à LED cyan, antenne qui clignote, tentacules articulés) + **Laita Turbo** (chienne-robot, sac à réaction, collier à LED). L'accueil le présente une fois (`robotNew()`, fenêtre « COSTUME SECRET DÉBLOQUÉ ! »). Le bouton 🎭 COSTUME apparaît avec ≥ 500 pièces **ou** le robot ; sous 500 pièces il propose le robot et « costume du tour ». Les sauvegardes déjà finies avant cette fonction ne reçoivent pas le robot (on ne sait pas si la magie a servi) : il faut recommencer le jeu. Vérifié par `worlds.test.js` (déblocage, perte à la moindre magie, choix, sauvegarde) et `node dev/laps-check.mjs`.
