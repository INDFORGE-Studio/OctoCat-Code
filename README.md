# 🐙 OctoCat-Code

Jeu d'aventure rétro 2D pour apprendre à programmer — **le site est le jeu**.
Cours en Markdown (Material for MkDocs) + canvas [KAPLAY.js](https://kaplayjs.com) synchronisé avec un interpréteur de code sécurisé.

## Lancer en local

```bash
pip install -r requirements.txt
mkdocs serve
```

Puis ouvrir <http://127.0.0.1:8000>.

## Structure

| Chemin | Rôle |
|---|---|
| `mkdocs.yml` | Configuration MkDocs, CDN KAPLAY, scripts de niveau |
| `docs/index.md`, `docs/niveau-N.md` | Hub et niveaux (cours + composant de jeu) |
| `docs/javascripts/progress.js` | Persistance `localStorage`, verrous de niveau, succès |
| `docs/javascripts/engine.js` | `window.gameEngine` : composant canvas/éditeur, interpréteur, validateurs |
| `docs/javascripts/sprites.js` | Pixel art procédural (palette GitHub Dark) |
| `docs/javascripts/levelN.js` | Énigme et scène d'un niveau |

Voir [`CLAUDE.md`](CLAUDE.md) pour le backlog et les consignes de travail du Lead Projet.
