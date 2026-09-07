#!/usr/bin/env python3

"""Rewrite the shared <header> across every page, preserving aria-current.

The cost of hand-authored pages: a header change is a 23-file edit. This
script makes that edit mechanical and reversible instead of manual. It reads
which nav item each page marks as current, regenerates the block from one
template, and puts the marker back. Run from the repo root.
"""

import pathlib
import re
import sys

NAV_ITEMS = [
    ("/about", "About"),
    ("/team", "Team"),
    ("/agents", "For Agents"),
    ("/reviews", "Reviews"),
    ("/faq", "FAQ"),
    ("/blog", "Blog"),
    ("/contact", "Contact"),
]

LOGO = """        <a class="site-logo" href="/">
          <svg
            class="site-logo__mark"
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
          >
            <rect width="32" height="32" rx="6" fill="#1a4d8f" />
            <path d="M16 7 6 15h3v10h5v-6h4v6h5V15h3z" fill="#fff" />
          </svg>
          <span class="site-logo__text">
            Meadowbrook
            <small>Mortgage Demo</small>
          </span>
        </a>"""


def build_header(current: str) -> str:
    """Render the header block, marking `current` (a href) as the active page."""
    links = []
    for href, label in NAV_ITEMS:
        marker = ' aria-current="page"' if href == current else ""
        links.append(f'            <li><a href="{href}"{marker}>{label}</a></li>')

    cta_marker = ' aria-current="page"' if current == "/apply" else ""

    return f"""<header class="site-header">
      <div class="wrapper site-header__inner">
{LOGO}

        <a class="button site-header__cta" href="/apply"{cta_marker}>Apply</a>

        <button
          class="nav-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="site-nav"
          hidden
        >
          <span class="nav-toggle__bars" aria-hidden="true"></span>
          <span class="nav-toggle__label">Menu</span>
        </button>

        <nav class="site-nav" id="site-nav" aria-label="Main">
          <ul class="cluster">
{chr(10).join(links)}
          </ul>
        </nav>
      </div>
    </header>"""


HEADER_RE = re.compile(r'<header class="site-header">.*?</header>', re.S)
CURRENT_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*aria-current="page"')


def main() -> int:
    root = pathlib.Path(".")
    pages = sorted(
        p
        for p in root.rglob("*.html")
        if not any(part in {".git", ".claude", ".superpowers", "docs"} for part in p.parts)
    )

    if not pages:
        print("no pages found; run from the repo root", file=sys.stderr)
        return 2

    changed = 0
    for page in pages:
        text = page.read_text()
        match = HEADER_RE.search(text)
        if not match:
            print(f"  SKIP {page}: no header block")
            continue

        old = match.group(0)
        found = CURRENT_RE.search(old)
        current = found.group(1) if found else ""

        new = build_header(current)
        if old == new:
            continue

        page.write_text(text[: match.start()] + new + text[match.end() :])
        changed += 1
        print(f"  ok   {page} (current={current or 'none'})")

    print(f"\nrewrote {changed} of {len(pages)} pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
