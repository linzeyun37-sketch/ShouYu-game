#!/usr/bin/env python3
"""Build the server whitelist: standalone page and its referenced game materials."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def build(output):
    if output.exists():
        raise ValueError("Choose a new output directory; existing releases are preserved.")
    source = (ROOT / "网站/js/data.js").read_text(encoding="utf-8")
    groups = re.findall(r"resources:\s*(\[[^\]]*\])", source)
    if not groups:
        raise ValueError("No game resource lists found.")
    resources = sorted({item for group in groups for item in json.loads(group)})
    for name in resources:
        path = Path(name)
        if path.is_absolute() or ".." in path.parts or path.suffix.lower() not in {".doc", ".docx", ".pdf", ".pptx"}:
            raise ValueError("Unexpected resource: " + name)
        item = ROOT / path
        if item.is_symlink() or not item.is_file() or not item.resolve().is_relative_to(ROOT):
            raise ValueError("Missing or external resource: " + name)
    subprocess.run([sys.executable, str(ROOT / "网站/build_single.py")], check=True)
    html = (ROOT / "网站/ShouYu-game.html").read_text(encoding="utf-8")
    marker = 'resourceBase: "../"'
    if html.count(marker) != 1:
        raise ValueError("Expected one preview resource base.")
    html = html.replace(marker, 'resourceBase: "./resources/"')
    site = output / "site"
    site.mkdir(parents=True)
    (site / "index.html").write_text(html, encoding="utf-8")
    for name in resources:
        target = site / "resources" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
    files = {}
    for path in sorted(site.rglob("*")):
        if path.is_file():
            data = path.read_bytes()
            files[path.relative_to(site).as_posix()] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    manifest = {"route": "/signplay/", "files": files, "bytes": sum(v["bytes"] for v in files.values())}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"site": str(site), "files": len(files), "resources": len(resources), "bytes": manifest["bytes"]}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    build(parser.parse_args().output.resolve())
