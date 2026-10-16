"""Post-build gate: fail the build if the generated site is not self-contained.

Usage: python tools/postbuild.py site

Checks every built HTML page:
  * no <script src> or loaded <link> (stylesheet, icon, preload, manifest...) points to an
    external host: everything is self-hosted;
  * every such local reference exists in the build output.
Navigation links (canonical, alternate, next, prev, <a href>) are not loaded resources and are ignored.
Also enforces a size budget (total site and per-file) well under the GitHub Pages limits.
"""
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


def main(root: str) -> int:
    site = Path(root).resolve()
    base = site_base_path(site.parent / "mkdocs.yml")
    pages = sorted(site.rglob("*.html"))
    if not pages:
        print(f"postbuild: no HTML found in {site}")
        return 1

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
