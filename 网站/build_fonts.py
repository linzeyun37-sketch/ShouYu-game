#!/usr/bin/env python3
"""Create licensed WOFF2 subsets; ordinary HTML builds use the checked-in files."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

from fontTools import subset
from fontTools.ttLib import TTFont


def build(source_dir):
    root = Path(__file__).resolve().parent
    assets = root / "assets/type-v1"
    text = "".join(path.read_text() for path in [root / "index.html", *sorted((root / "js").glob("*.js"))])
    text += "".join(chr(n) for n in range(32, 127))
    codepoints = set(map(ord, text))
    source_dir.mkdir(parents=True, exist_ok=True)
    report = []
    for source in json.loads((assets / "sources.json").read_text()):
        key = source["key"]
        cached = source_dir / (key + ".ttf")
        if not cached.exists():
            with urlopen(Request(source["source_url"], headers={"User-Agent": "SignPlay-font-build"}), timeout=60) as response:
                cached.write_bytes(response.read())
        if hashlib.sha256(cached.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError("Font source checksum mismatch: " + key)
        font = TTFont(cached)
        available = set(font.getBestCmap())
        options = subset.Options()
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.recalc_timestamp = False
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=codepoints & available)
        sub.subset(font)
        family = "SignPlay " + key.title()
        names = {1: family, 2: "Regular", 3: family + " 1.0", 4: family,
                 6: "SignPlay" + key.title(), 16: family, 17: "Regular", 18: family}
        for record in font["name"].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        # Embedded fonts travel with their full OFL notice, including standalone HTML.
        font["name"].setName((assets / (key + "-OFL.txt")).read_text(), 13, 3, 1, 0x409)
        font["name"].setName(source["license_url"], 14, 3, 1, 0x409)
        font.flavor = "woff2"
        output = assets / ("signplay-" + key + ".woff2")
        font.save(output)
        report.append({"font": output.name, "bytes": output.stat().st_size,
                       "characters": len(codepoints & available),
                       "missing_cjk": "".join(chr(n) for n in sorted(codepoints - available) if 0x3400 <= n <= 0x9fff)})
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=Path(__file__).resolve().parents[1] / "output/font-source")
    build(parser.parse_args().source_dir)
