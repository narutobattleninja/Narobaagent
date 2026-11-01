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
    config = json.loads((args.collection / "config.json").read_text())
    free_end = config["free_mint_end"]
    passage_end = config["passage_mint_end"]
    expected_quantities = {
        "free_mint_quantity": free_end,
        "passage_mint_quantity": passage_end - free_end,
        "open_mint_quantity": args.supply - passage_end,
    }
    for key, expected in expected_quantities.items():
        if config.get(key) != expected:
            raise SystemExit(f"Invalid mint phase config: {key}={config.get(key)}, expected {expected}")
    if config["supply"] != args.supply:
        raise SystemExit(f"Config supply {config['supply']} does not match requested supply {args.supply}")
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
        indexed = index["tokens"].get(str(token_id))
        attrs = {item.get("trait_type"): item.get("value") for item in data.get("attributes", [])}
        if token_id <= free_end:
            expected_tier, expected_price, expected_stage = "freemint", "FREE", "Freemint"
        elif token_id <= passage_end:
            expected_tier, expected_price, expected_stage = "passage", "0.000222 BNB", "Passage"
        else:
            expected_tier, expected_price, expected_stage = "open", "0.001 BNB", "Open"
        if (
            data.get("token_id") != token_id
            or indexed is None
            or indexed.get("tier") != expected_tier
            or indexed.get("price") != expected_price
            or attrs.get("Stage") != expected_stage
        ):
            bad.append(token_id)
    if missing or bad:
        raise SystemExit(f"Verification failed: missing={missing[:10]} bad={bad[:10]}")
    print(f"Verified {args.supply} PNG/metadata pairs, token mapping, and 1,000/8,000/1,000 mint tiers.")


if __name__ == "__main__":
    main()
