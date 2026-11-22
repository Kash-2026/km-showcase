#!/usr/bin/env python3
"""Inject the KashMakr neon glassmorphic theme into demo index.html files.

Idempotent: adds a <style id="km-neon-theme"> block before </head> if not
already present. Targets a directory (and its demos/ subdirs) or individual
index.html files.

Usage: python3 inject_neon.py <dir-or-file> [<dir-or-file> ...]
"""
import sys
import re
from pathlib import Path

STYLE_ID = "km-neon-theme"
CSS_PATH = Path(__file__).resolve().parent / "neon-theme.css"


def load_css() -> str:
    return CSS_PATH.read_text(encoding="utf-8")


def inject(html: str, css: str) -> str:
    if f'id="{STYLE_ID}"' in html:
        return html  # already injected
    block = f'<style id="{STYLE_ID}">\n{css}\n</style>\n</head>'
    if "</head>" in html:
        return html.replace("</head>", block, 1)
    # no </head>: prepend style after <body> or at top
    if "<body" in html:
        return re.sub(r"(<body[^>]*>)", r"\1\n" + block.replace("</head>", ""), html, count=1)
    return block.replace("</head>", "") + html


def main():
    css = load_css()
    targets = sys.argv[1:]
    if not targets:
        print("usage: python3 inject_neon.py <dir-or-file> ...")
        sys.exit(2)
    changed = 0
    for t in targets:
        p = Path(t)
        files = []
        if p.is_dir():
            files = sorted(p.rglob("index.html"))
        elif p.is_file():
            files = [p]
        for f in files:
            html = f.read_text(encoding="utf-8")
            new = inject(html, css)
            if new != html:
                f.write_text(new, encoding="utf-8")
                changed += 1
                print(f"  injected: {f}")
            else:
                print(f"  already themed: {f}")
    print(f"\nDone: {changed} file(s) updated.")


if __name__ == "__main__":
    main()