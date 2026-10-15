#!/usr/bin/env python3
"""Build the standalone page with embedded styles, scripts, and brand images."""
import base64
from pathlib import Path
import re


def build():
    root = Path(__file__).resolve().parent
    html = (root / "index.html").read_text(encoding="utf-8")
    css_tag = '<link rel="stylesheet" href="css/style.css">'
    if css_tag not in html:
        raise ValueError("Stylesheet tag not found in index.html")
    html = html.replace(css_tag, "<style>\n" + (root / "css/style.css").read_text(encoding="utf-8") + "\n</style>")
    for name in ("data", "meta", "guides", "app"):
        tag = f'<script src="js/{name}.js"></script>'
        code = (root / f"js/{name}.js").read_text(encoding="utf-8")
        if tag not in html or "</script" in code.lower():
            raise ValueError(f"Cannot inline js/{name}.js")
        html = html.replace(tag, "<script>\n" + code + "\n</script>")

    mime = {".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"}

    def embed(match):
        path = root / match[2]
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        return f'{match[1]}="data:{mime[path.suffix]};base64,{data}"'

    html = re.sub(r'(src|href)="(assets/brand-v1/[^"<>]+)"', embed, html)
    output = root / "ShouYu-game.html"
    output.write_text(html, encoding="utf-8")
    print(f"Built {output.name} ({output.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    build()
