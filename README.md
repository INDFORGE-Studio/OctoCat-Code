# 🐙 OctoCat-Code

Jeu d'aventure rétro 2D pour apprendre à programmer — **le site est le jeu**.
Cours en Markdown (Material for MkDocs) + canvas [KAPLAY.js](https://kaplayjs.com) synchronisé avec un interpréteur de code sécurisé.

## Lancer en local

```bash
pip install -r requirements.txt
mkdocs serve
```

Puis ouvrir <http://127.0.0.1:8000> (le site est servi sous `/OctoCat-Code/`, d'après `site_url`).

Contrôle complet avant un push :

```bash
mkdocs build --strict && python tools/postbuild.py site
```

## Structure

| Chemin | Rôle |
|---|---|
| `mkdocs.yml` | Configuration MkDocs, scripts du jeu (ordre significatif) |
| `docs/index.md` | Page unique : le jeu plein écran |
| `docs/javascripts/progress.js` | Persistance `localStorage`, verrous de niveau, succès |
| `docs/javascripts/engine.js` | `window.gameEngine` : composant canvas/éditeur, interpréteur, validateurs |
| `docs/javascripts/sprites.js`, `scenery.js` | Pixel art procédural (palette GitHub Dark) et décor partagé |
| `docs/javascripts/hub.js` | Scène d'accueil jouable et sélecteur de niveaux |
| `docs/javascripts/playsim.js`, `play.js`, `sprites-run.js` | Trajets au clavier entre les énigmes (plateformes et beat'em up) : simulation pure, rendu, tactile |
| `docs/javascripts/puzzle.js` | Validation d'énigme sur plusieurs cas et scène d'énigme standard |
| `docs/javascripts/music.js`, `fx.js`, `pwa.js`, `docs/sw.js` | Musique et sons synthétisés, post-traitement optionnel, cache hors ligne |
| `tools/postbuild.py` | Garde post-build : site auto-contenu et budget de taille (GitHub Pages ≤ 1 Go) |
| `docs/javascripts/level1.js` … `level10.js` | Un niveau : trajet, briefing, énigme, validation, scène |

## Les 10 niveaux

Chaque niveau se joue en deux temps : un **trajet** au clavier (flèches ou WASD/ZQSD, Espace pour sauter, clic gauche (ou X) pour frapper, clic droit (ou C) pour le shuriken, touches personnalisables dans le menu ⚙ ou Échap ; boutons à l'écran sur mobile), mêlant plateformes à la Mario, fouet à la Castlevania, ninja à la Shinobi et beat'em up à la Double Dragon, puis une **énigme de code** à résoudre pour ouvrir le portail vers le niveau suivant : variables, texte, calculs, logique, conditions, boucles `for` et `while` (boss final).

```bash
npm install && npm run check     # lint, tests (dont un bot qui termine les 10 parcours), build strict
node dev/run-check.mjs           # rejoue le vrai jeu dans Chromium : trajet, énigme ratée, énigme résolue, niveau suivant
```

Voir [`CLAUDE.md`](CLAUDE.md) pour le backlog et les consignes de travail du Lead Projet.

## Crédits et licences tierces

| Composant | Licence | Texte |
|---|---|---|
| [KAPLAY](https://kaplayjs.com) (`docs/javascripts/vendor/`) | MIT | `docs/assets/licenses/kaplay-MIT.txt` |
| Police Press Start 2P (`docs/assets/fonts/`) | SIL OFL 1.1 | `docs/assets/licenses/press-start-2p-OFL.txt` |
| [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) | MIT | (dépendance de build, non redistribuée) |

Les sprites et le décor sont dessinés pour le projet (procéduraux, voir `docs/javascripts/sprites.js`).
Ce projet n'est pas affilié à GitHub : « GitHub » et « Octocat » sont des marques de GitHub, Inc. ;
l'OctoCat du jeu est un personnage original (chat-pieuvre violet).

Licence du projet : à définir par INDFORGE Studio (aucune licence n'est accordée tant qu'elle n'est pas ajoutée).
