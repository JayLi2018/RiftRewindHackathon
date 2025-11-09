#!/usr/bin/env python3
"""
Fetches Riot Data Dragon "dragontail-<version>.tgz", extracts it, and copies assets/JSON
into ./public/lol/<version>/ for easy use in a frontend project (CRA/Vite).

Usage:
  python fetch_ddragon_assets.py               # latest version
  python fetch_ddragon_assets.py --version 14.20.1

After running, you can reference files like:
  /lol/<version>/img/champion/Ahri.png
  /lol/<version>/data/en_US/champion.json
"""

import argparse
import io
import json
import os
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
import socket

VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
DRAGONTAIL_URL_TMPL = "https://ddragon.leagueoflegends.com/cdn/dragontail-{ver}.tgz"

# Which subpaths to copy from the extracted bundle (relative to <extract_root>/<ver>/)
COPY_PATHS = [
    # Images
    "img/champion",              # champion squares + splash subfolder lives under this
    "img/item",
    "img/spell",
    "img/profileicon",
    "img/perk-images",           # runes/perks
    # Data (JSON)
    "data/en_US",                # includes champion.json, item.json, summoner.json, runesReforged.json
]

def http_json(url: str):
    req = Request(url, headers={"User-Agent": "ddrag-fetcher/1.0"})
    with urlopen(req, timeout=30) as r:
        return json.load(r)

def http_download(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "ddrag-fetcher/1.0"})
    with urlopen(req, timeout=60) as r:
        return r.read()

def http_probe_exists(url: str, timeout: float = 6.0) -> bool:
    """
    Quickly check if a big file exists without downloading it.
    Uses a 1-byte ranged GET (accepts 206 or 200) and short timeouts.
    """
    req = Request(
        url,
        headers={
            "User-Agent": "ddrag-fetcher/1.1",
            "Range": "bytes=0-0",
        }
    )
    try:
        with urlopen(req, timeout=timeout) as r:
            # Accept 206 Partial Content (preferred) or 200 OK
            code = getattr(r, "status", None) or getattr(r, "code", None)
            return code in (200, 206)
    except HTTPError as e:
        # 403/404 => doesn't exist for this patch; try next
        if e.code in (403, 404):
            return False
        # other HTTP errors: treat as non-existent and move on
        return False
    except (URLError, socket.timeout):
        return False


def find_latest_working_version(preferred: str | None = None) -> str:
    versions = http_json(VERSIONS_URL)
    candidates = [preferred] + [v for v in versions if v != preferred] if preferred else versions

    # Try only the first ~8 candidates to avoid long loops if CDN is flaky
    for ver in candidates[:8]:
        url = DRAGONTAIL_URL_TMPL.format(ver=ver)
        print(f"Checking dragontail for version {ver} ...", flush=True)
        if http_probe_exists(url, timeout=6.0):
            print(f"  ✔ Found: {url}", flush=True)
            return ver
        else:
            print(f"  ✖ Not available; trying next…", flush=True)

    # As a last resort, expand search some more:
    for ver in candidates[8:24]:
        url = DRAGONTAIL_URL_TMPL.format(ver=ver)
        print(f"(extended) Checking {ver} …", flush=True)
        if http_probe_exists(url, timeout=6.0):
            print(f"  ✔ Found: {url}", flush=True)
            return ver

    raise RuntimeError("Could not find any working dragontail version after probing.")

def extract_tgz(bytes_blob: bytes, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(bytes_blob), mode="r:gz") as tf:
        tf.extractall(dest_dir)
    # The bundle expands into <dest_dir>/<version>/...
    # Find the single top-level directory that looks like a version folder.
    children = [p for p in dest_dir.iterdir() if p.is_dir()]
    if not children:
        raise RuntimeError("Extraction produced no directories, unexpected dragontail layout.")
    # Usually there's exactly one folder named like the version
    # If multiple, prefer the one that looks like semantic version.
    candidates = sorted(children, key=lambda p: (not any(ch.isdigit() for ch in p.name), p.name))
    return candidates[0]

def copy_selected_paths(src_root: Path, dst_root: Path):
    for rel in COPY_PATHS:
        src = src_root / rel
        dst = dst_root / rel
        if not src.exists():
            print(f"  (skip) {rel} not present in bundle")
            continue
        print(f"  Copying {rel} ...")
        if src.is_dir():
            # Copy preserving substructure
            for path in src.rglob("*"):
                if path.is_dir():
                    continue
                rel_file = path.relative_to(src_root)  # keep "img/..." or "data/en_US/..."
                final_path = dst_root / rel_file
                final_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, final_path)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

def build_champion_maps(dst_version_root: Path):
    """Generate id_to_slug.json and slug_to_id.json for easy runtime mapping."""
    champ_json = dst_version_root / "data" / "en_US" / "champion.json"
    if not champ_json.exists():
        print("  (note) champion.json not found; skipping maps")
        return
    data = json.loads(champ_json.read_text(encoding="utf-8"))
    # Structure: {"data": { "Aatrox": {..., "key": "266", "id": "Aatrox", "name": "Aatrox", ...}, ...}}
    id_to_slug = {}
    slug_to_id = {}
    for slug, obj in data.get("data", {}).items():
        key = obj.get("key")  # numeric string
        if key:
            id_to_slug[key] = slug
            slug_to_id[slug] = key
    maps_dir = dst_version_root / "data" / "maps"
    maps_dir.mkdir(parents=True, exist_ok=True)
    (maps_dir / "id_to_slug.json").write_text(json.dumps(id_to_slug, indent=2, ensure_ascii=False), encoding="utf-8")
    (maps_dir / "slug_to_id.json").write_text(json.dumps(slug_to_id, indent=2, ensure_ascii=False), encoding="utf-8")
    print("  Wrote data/maps/id_to_slug.json and data/maps/slug_to_id.json")

def main():
    parser = argparse.ArgumentParser(description="Download & stage Riot DDragon assets into ./public/lol/<version>/")
    parser.add_argument("--version", help="Specific DDragon version (e.g., 14.20.1). Defaults to latest working.")
    parser.add_argument("--out", default="public/lol", help="Output base folder (default: public/lol)")
    args = parser.parse_args()

    project_root = Path.cwd()
    out_base = (project_root / args.out).resolve()

    try:
        ver = find_latest_working_version(args.version)
        url = DRAGONTAIL_URL_TMPL.format(ver=ver)
        print(f"\nDownloading dragontail {ver} ...")
        blob = http_download(url)
        print(f"  Downloaded {len(blob)/1_000_000:.1f} MB")

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            print("Extracting archive ...")
            extracted_root = extract_tgz(blob, tmpdir)
            # Expected structure: <tmp>/<ver>/img/... and <tmp>/<ver>/data/...
            if extracted_root.name != ver:
                print(f"  (note) Extracted root '{extracted_root.name}' differs from version '{ver}'")

            dest_version_root = out_base / ver
            print(f"Staging into {dest_version_root} ...")
            dest_version_root.mkdir(parents=True, exist_ok=True)

            copy_selected_paths(extracted_root, dest_version_root)
            build_champion_maps(dest_version_root)

        print("\n✅ Done!")
        print("\nUse paths like:")
        print(f"  /lol/{ver}/img/champion/Ahri.png")
        print(f"  /lol/{ver}/img/item/1001.png")
        print(f"  /lol/{ver}/img/spell/Flash.png")
        print(f"  /lol/{ver}/img/profileicon/0.png")
        print(f"  /lol/{ver}/img/perk-images/Styles/Precision/Conqueror/Conqueror.png")
        print(f"  /lol/{ver}/data/en_US/champion.json")
        print(f"  /lol/{ver}/data/en_US/item.json")
        print(f"  /lol/{ver}/data/en_US/summoner.json")
        print(f"  /lol/{ver}/data/en_US/runesReforged.json")
        print(f"  /lol/{ver}/data/maps/id_to_slug.json")
        print(f"  /lol/{ver}/data/maps/slug_to_id.json")

    except Exception as e:
        print(f"\n❌ Failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
