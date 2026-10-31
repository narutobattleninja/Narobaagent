#!/usr/bin/env python3
"""Verify a generated Naroba collection has complete image/metadata pairs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", default="collection", type=Path)
    parser.add_argument("--supply", default=10000, type=int)
    args = parser.parse_args()
    image_dir = args.collection / "images"
    metadata_dir = args.collection / "metadata"
    index = json.loads((args.collection / "collection.json").read_text())
    missing = []
    bad = []
    for token_id in range(1, args.supply + 1):
        stem = f"{token_id:04d}"
        image = image_dir / f"{stem}.png"
        metadata = metadata_dir / f"{stem}.json"
        if not image.exists() or not metadata.exists():
            missing.append(token_id)
            continue
        data = json.loads(metadata.read_text())
        if data.get("token_id") != token_id or str(token_id) not in index["tokens"]:
            bad.append(token_id)
    if missing or bad:
        raise SystemExit(f"Verification failed: missing={missing[:10]} bad={bad[:10]}")
    print(f"Verified {args.supply} PNG/metadata pairs and token mapping.")


if __name__ == "__main__":
    main()
