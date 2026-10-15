#!/usr/bin/env python3
"""Run as root in a staged release after checking the deployment request."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
from urllib.parse import quote
from urllib.request import Request, urlopen


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace(path, data):
    temporary = path.with_name(path.name + ".signplay-new")
    temporary.write_bytes(data)
    temporary.chmod(0o644)
    os.replace(temporary, path)


def switch(path, target):
    temporary = path.with_name(path.name + ".signplay-new")
    temporary.symlink_to(target)
    os.replace(temporary, path)


def main():
    stage = Path(__file__).resolve().parent
    request = json.loads((stage / "request.json").read_text())
    name = request["release"]
    assert re.fullmatch(r"\d{8}T\d{6}Z-signplay", name)
    parent = Path("/etc/nginx/sites-available/shouyulove")
    snippet = Path("/etc/nginx/snippets/signplay.conf")
    home = Path("/var/www/shouyulove-signplay")
    release = Path("/var/www/shouyulove-signplay-releases") / name
    backup = Path("/var/backups/shouyulove-signplay") / name
    assert digest(parent) == request["parent_sha256"], "Parent configuration changed"
    assert digest(stage / "manifest.json") == request["manifest_sha256"]
    assert digest(stage / "nginx-signplay.conf") == request["snippet_sha256"]
    old_target = str(home.resolve()) if home.is_symlink() else None
    assert old_target == request.get("old_release")
    assert not home.exists() or home.is_symlink(), "Public path must be a release link"
    manifest = json.loads((stage / "manifest.json").read_text())
    site = stage / "site"
    actual = {p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file() or p.is_symlink()}
    assert actual == set(manifest["files"]), "Unexpected release files"
    for filename, record in manifest["files"].items():
        path = site / filename
        assert path.resolve().is_relative_to(site.resolve()) and not path.is_symlink()
        assert path.stat().st_size == record["bytes"] and digest(path) == record["sha256"]
    backup.mkdir(parents=True, exist_ok=False)
    old_parent = parent.read_bytes()
    old_snippet = snippet.read_bytes() if snippet.exists() else None
    (backup / "parent.conf").write_bytes(old_parent)
    if old_snippet is not None:
        (backup / "snippet.conf").write_bytes(old_snippet)
    (backup / "previous.json").write_text(json.dumps({"release": old_target}) + "\n")
    release.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(site, release)
    for path in [release, *release.rglob("*")]:
        path.chmod(0o755 if path.is_dir() else 0o644)
    include = b"    include /etc/nginx/snippets/signplay.conf;"
    anchor = b"    include /etc/nginx/snippets/shouyulove-home.conf;"
    assert old_parent.count(anchor) == 1
    new_parent = old_parent if include in old_parent else old_parent.replace(anchor, anchor + b"\n" + include)
    try:
        replace(snippet, (stage / "nginx-signplay.conf").read_bytes())
        replace(parent, new_parent)
        switch(home, release)
        subprocess.run(["nginx", "-t"], check=True)
        subprocess.run(["systemctl", "reload", "nginx"], check=True)
        headers = {"Host": "shouyulove.cn", "User-Agent": "ShouYuLove-QA"}
        # Old workers can briefly answer after reload; wait for the new page hash.
        for attempt in range(40):
            try:
                with urlopen(Request("http://127.0.0.1/signplay/", headers=headers), timeout=10) as response:
                    if hashlib.sha256(response.read()).hexdigest() == manifest["files"]["index.html"]["sha256"]:
                        break
            except OSError:
                pass
            time.sleep(0.25)
        else:
            raise RuntimeError("The new signplay page did not become ready")
        for filename, record in manifest["files"].items():
            path = "/signplay/" + ("" if filename == "index.html" else quote(filename))
            with urlopen(Request("http://127.0.0.1" + path, headers=headers), timeout=30) as response:
                assert response.status == 200
                assert hashlib.sha256(response.read()).hexdigest() == record["sha256"], filename
        result = {"release": str(release), "previous_release": old_target, "files": len(manifest["files"]), "bytes": manifest["bytes"], "url": "https://shouyulove.cn/signplay/", "backup": str(backup)}
        (backup / "release.json").write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result), flush=True)
    except BaseException:
        replace(parent, old_parent)
        if old_snippet is None:
            snippet.unlink(missing_ok=True)
        else:
            replace(snippet, old_snippet)
        if old_target:
            switch(home, old_target)
        elif home.is_symlink():
            home.unlink()
        subprocess.run(["nginx", "-t"], check=True)
        subprocess.run(["systemctl", "reload", "nginx"], check=True)
        raise


if __name__ == "__main__":
    # This process owns the shared lock; callers must not hold it already.
    with open("/run/lock/nginx-deploy.lock", "a") as deployment_lock:
        fcntl.flock(deployment_lock, fcntl.LOCK_EX)
        main()
