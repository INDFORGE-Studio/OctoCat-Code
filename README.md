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
| `mkdocs.yml` | Configuration MkDocs, CDN KAPLAY, scripts de niveau |
| `docs/index.md`, `docs/niveau-N.md` | Hub et niveaux (cours + composant de jeu) |
| `docs/javascripts/progress.js` | Persistance `localStorage`, verrous de niveau, succès |
| `docs/javascripts/engine.js` | `window.gameEngine` : composant canvas/éditeur, interpréteur, validateurs |
| `docs/javascripts/sprites.js`, `scenery.js` | Pixel art procédural (palette GitHub Dark) et décor partagé |
| `docs/javascripts/hub.js` | Scène d'accueil jouable |
| `tools/postbuild.py` | Garde post-build : site auto-contenu et budget de taille (GitHub Pages ≤ 1 Go) |
| `docs/javascripts/levelN.js` | Énigme et scène d'un niveau |

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
