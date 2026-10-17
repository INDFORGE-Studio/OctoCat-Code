"""Post-build gate: fail the build if the generated site is not self-contained.

Usage: python tools/postbuild.py site

Checks every built HTML page:
  * no <script src> or loaded <link> (stylesheet, icon, preload, manifest...) points to an
    external host: everything is self-hosted;
  * every such local reference exists in the build output.
Navigation links (canonical, alternate, next, prev, <a href>) are not loaded resources and are ignored.
Also enforces a size budget (total site and per-file) well under the GitHub Pages limits.
"""
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

SITE_BUDGET_MB = 200   # hard fail: 20 % of the GitHub Pages limit leaves ample headroom
SITE_WARN_MB = 100
FILE_BUDGET_MB = 20    # a single asset above this belongs in a release / external storage, not the repo

SCRIPT = re.compile(r'<script\b[^>]*?\bsrc="([^"]+)"', re.I)
LINK = re.compile(r"<link\b[^>]*>", re.I)
REL = re.compile(r'\brel="([^"]+)"', re.I)
HREF = re.compile(r'\bhref="([^"]+)"', re.I)
LOADED_RELS = {"stylesheet", "icon", "shortcut", "preload", "modulepreload", "manifest", "apple-touch-icon", "mask-icon"}


def loaded_resources(html: str):
    for m in SCRIPT.finditer(html):
        yield m.group(1)
    for tag in LINK.findall(html):
        rel = REL.search(tag)
        href = HREF.search(tag)
        if rel and href and LOADED_RELS & set(rel.group(1).lower().split()):
            yield href.group(1)


def site_base_path(config: Path) -> str:
    """Path component of site_url in mkdocs.yml (e.g. /OctoCat-Code/), or / when absent."""
    m = re.search(r"^site_url:\s*(\S+)", config.read_text(encoding="utf-8"), re.M) if config.exists() else None
    path = urlparse(m.group(1)).path if m else "/"
    return path if path.endswith("/") else path + "/"


def prune_unused_theme_assets(site: Path, pages: list[Path], base: str) -> int:
    """Delete the theme files (Material scripts, search workers, stylesheets, source maps) that no built page loads.

    The game pages only load our own CSS and scripts; the theme still copies its whole `assets/` folder, which
    would otherwise be published (and precached by the service worker) for nothing. Anything a page still
    references is kept, and the self-contained check that runs afterwards would fail on a missing file."""
    used: set[Path] = set()
    for page in pages:
        for url in loaded_resources(page.read_text(encoding="utf-8")):
            path = unquote(urlparse(url).path)
            if path.startswith("/"):
                path = path[len(base):] if path.startswith(base) else path.lstrip("/")
                used.add((site / path.lstrip("/")).resolve())
            else:
                used.add((page.parent / path).resolve())
    removed = 0
    for folder in ("assets/javascripts", "assets/stylesheets", "assets/images", "search"):
        root = site / folder
        if not root.exists():
            continue
        for f in sorted(root.rglob("*")):
            if f.is_file() and f.resolve() not in used:
                f.unlink()
                removed += 1
        for d in sorted((p for p in root.rglob("*") if p.is_dir()), reverse=True):
            if not any(d.iterdir()):
                d.rmdir()
        if not any(root.iterdir()):
            root.rmdir()
    return removed


def stamp_service_worker(site: Path) -> list[str]:
    """Write the precache list and a content-hash version into sw.js; return problems (empty = OK).

    Every built file except the worker itself, the 404 page, sitemaps, source maps and the social share image is precached, so
    the whole game is stored in the player's browser at first visit (instant loads, offline play)."""
    sw = site / "sw.js"
    if not sw.exists():
        return ["sw.js missing from the build"]
    skip = {"sw.js", "404.html"}
    files = sorted(p for p in site.rglob("*") if p.is_file() and p.name not in skip
                   and not p.name.startswith("sitemap") and p.suffix != ".map"
                   and not p.name.startswith("social-card"))  # l'image de partage sert aux réseaux sociaux, pas au jeu hors ligne
    urls = ["./"] + [p.relative_to(site).as_posix() for p in files if p.name != "index.html" or p.parent != site]
    digest = hashlib.sha256()
    for p in files:
        digest.update(p.relative_to(site).as_posix().encode())
        digest.update(p.read_bytes())
    src = sw.read_text(encoding="utf-8")
    src, n1 = re.subn(r'var VERSION = "[^"]*";', f'var VERSION = "{digest.hexdigest()[:10]}";', src, count=1)
    src, n2 = re.subn(r"var PRECACHE = .*?; /\* __PRECACHE__ \*/", lambda _: f"var PRECACHE = {json.dumps(urls)};", src, count=1)
    if n1 != 1 or n2 != 1:
        return ["sw.js: VERSION / PRECACHE markers not found"]
    sw.write_bytes(src.encode("utf-8"))
    print(f"postbuild: service worker precaches {len(urls)} files")
    return []


def main(root: str) -> int:
    site = Path(root).resolve()
    base = site_base_path(site.parent / "mkdocs.yml")
    pages = sorted(site.rglob("*.html"))
    if not pages:
        print(f"postbuild: no HTML found in {site}")
        return 1

    removed = prune_unused_theme_assets(site, pages, base)
    if removed:
        print(f"postbuild: removed {removed} unused theme files (scripts, styles, search, source maps)")

    errors: set[str] = set()
    for page in pages:
        rel_page = page.relative_to(site)
        for url in loaded_resources(page.read_text(encoding="utf-8")):
            if url.startswith(("data:", "#")):
                continue
            parsed = urlparse(url)
            if parsed.scheme in ("http", "https") or url.startswith("//"):
                errors.add(f"{rel_page}: external resource {url}")
                continue
            path = unquote(parsed.path)
            if path.startswith("/"):  # root-absolute (404.html): strip the site_url base path
                target = (site / path[len(base):].lstrip("/")).resolve() if path.startswith(base) else site / "__outside__"
            else:
                target = (page.parent / path).resolve()
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                errors.add(f"{rel_page}: missing local file {url}")

    errors.update(stamp_service_worker(site))

    # --- size budget -------------------------------------------------------------------------
    # GitHub Pages limits (docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits):
    # published site <= 1 GB, ~100 GB/month soft bandwidth, 10 min deploy timeout. We stay far below.
    files = [p for p in site.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    print(f"postbuild: site size {total / 1e6:.2f} MB in {len(files)} files "
          f"(budget {SITE_BUDGET_MB} MB, GitHub Pages hard limit 1000 MB)")
    if total > SITE_BUDGET_MB * 1e6:
        errors.add(f"site is {total / 1e6:.1f} MB, over the {SITE_BUDGET_MB} MB budget")
    elif total > SITE_WARN_MB * 1e6:
        print(f"postbuild: WARNING site is over {SITE_WARN_MB} MB, consider trimming assets")
    for p in files:
        if p.stat().st_size > FILE_BUDGET_MB * 1e6:
            errors.add(f"{p.relative_to(site)} is {p.stat().st_size / 1e6:.1f} MB, over the {FILE_BUDGET_MB} MB per-file budget")

    if errors:
        print("postbuild: FAILED")
        for e in sorted(errors):
            print("  -", e)
        return 1
    print(f"postbuild: OK ({len(pages)} pages, self-contained)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "site"))
