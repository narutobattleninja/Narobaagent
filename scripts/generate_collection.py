#!/usr/bin/env python3
"""Generate deterministic Naroba pixel identities and ERC-721 metadata.

The same token ID always produces the same PNG, traits, prompt, and metadata.
Run from the repository root:
  python3 scripts/generate_collection.py --count 10000
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

SUPPLY = 10_000
CANVAS = 32
SCALE = 4
PALETTES = [
    {"name": "Signal Lime", "bg": "#0b1012", "shadow": "#263b22", "body": "#b9ff59", "accent": "#a99cff", "eye": "#f2f0ea"},
    {"name": "Archive Lilac", "bg": "#100d1a", "shadow": "#34264a", "body": "#a99cff", "accent": "#b9ff59", "eye": "#f2f0ea"},
    {"name": "Checkpoint Amber", "bg": "#15100c", "shadow": "#523924", "body": "#ffbd6b", "accent": "#b9ff59", "eye": "#f2f0ea"},
    {"name": "Static Blue", "bg": "#091219", "shadow": "#1d3a4c", "body": "#76d7ff", "accent": "#a99cff", "eye": "#f2f0ea"},
]
MOODS = ["quiet", "electric", "strange", "patient", "restless", "observant"]
FORMS = ["scout", "listener", "courier", "keeper", "drifter", "cartographer"]
ARTIFACTS = ["a pocket horizon", "a tiny beacon", "an amber key", "a folded star map", "a packet of starlight", "a glass signal"]


def token_seed(token_id: int) -> int:
    digest = hashlib.sha256(f"naroba:{token_id}".encode()).digest()
    return int.from_bytes(digest[:8], "big")


def tier_for_token(token_id: int) -> tuple[str, str]:
    if token_id <= 1_000:
        return "freemint", "FREE"
    if token_id <= 3_000:
        return "passage", "0.000222 BNB"
    return "open", "0.001 BNB"


def make_prompt(token_id: int, mood: str, form: str, artifact: str, palette: str) -> str:
    return f"A {mood} {form} from the Naroba archive, carrying {artifact}. {palette} signal, pixel-native silhouette, precise details, and a calm on-chain identity."


def pixel_identity(token_id: int) -> tuple[Image.Image, dict[str, Any]]:
    rng = random.Random(token_seed(token_id))
    palette = PALETTES[rng.randrange(len(PALETTES))]
    mood = MOODS[rng.randrange(len(MOODS))]
    form = FORMS[rng.randrange(len(FORMS))]
    artifact = ARTIFACTS[rng.randrange(len(ARTIFACTS))]
    visor = rng.choice([True, False])
    antenna = rng.choice([True, False])
    eye_style = rng.choice(["square", "wide", "single"])

    image = Image.new("RGB", (CANVAS, CANVAS), palette["bg"])
    draw = ImageDraw.Draw(image)

    # Deterministic star field and scanline accents.
    for _ in range(18):
        x = rng.randrange(2, CANVAS - 2)
        y = rng.randrange(2, CANVAS - 2)
        color = palette["accent"] if rng.random() > 0.66 else palette["shadow"]
        draw.rectangle((x, y, x + rng.choice([0, 1]), y), fill=color)
    draw.rectangle((3, 28, 28, 28), fill=palette["shadow"])

    # Blocky head/body silhouette.
    draw.rectangle((9, 7, 22, 22), fill=palette["shadow"])
    draw.rectangle((11, 5, 20, 23), fill=palette["body"])
    draw.rectangle((9, 9, 22, 19), fill=palette["body"])
    draw.rectangle((13, 4, 18, 5), fill=palette["body"])
    draw.rectangle((8, 12, 10, 17), fill=palette["accent"])
    draw.rectangle((21, 12, 23, 17), fill=palette["accent"])

    if visor:
        draw.rectangle((10, 10, 21, 13), fill=palette["bg"])
        draw.rectangle((12, 11, 19, 12), fill=palette["accent"])
    else:
        if eye_style == "single":
            draw.rectangle((16, 12, 18, 14), fill=palette["eye"])
        elif eye_style == "wide":
            draw.rectangle((12, 12, 14, 14), fill=palette["eye"])
            draw.rectangle((18, 12, 20, 14), fill=palette["eye"])
        else:
            draw.rectangle((13, 12, 14, 13), fill=palette["eye"])
            draw.rectangle((18, 12, 19, 13), fill=palette["eye"])

    draw.rectangle((14, 17, 17, 18), fill=palette["bg"])
    draw.rectangle((8, 21, 23, 25), fill=palette["shadow"])
    draw.rectangle((11, 22, 20, 26), fill=palette["body"])
    draw.rectangle((7, 25, 24, 27), fill=palette["accent"])
    draw.rectangle((10, 27, 21, 28), fill=palette["body"])

    if antenna:
        draw.rectangle((18, 2, 19, 5), fill=palette["accent"])
        draw.rectangle((18, 1, 20, 2), fill=palette["body"])
    else:
        draw.rectangle((12, 3, 14, 4), fill=palette["accent"])

    # One token-specific artifact pixel cluster.
    artifact_x = 4 + rng.randrange(0, 22)
    artifact_y = 8 + rng.randrange(0, 15)
    draw.rectangle((artifact_x, artifact_y, artifact_x + 1, artifact_y + 1), fill=palette["accent"])
    draw.point((artifact_x + 2, artifact_y), fill=palette["body"])

    image = image.resize((CANVAS * SCALE, CANVAS * SCALE), Image.Resampling.NEAREST)
    tier, price = tier_for_token(token_id)
    prompt = make_prompt(token_id, mood, form, artifact, palette["name"])
    traits = [
        {"trait_type": "Stage", "value": tier.title()},
        {"trait_type": "Palette", "value": palette["name"]},
        {"trait_type": "Mood", "value": mood.title()},
        {"trait_type": "Form", "value": form.title()},
        {"trait_type": "Visor", "value": "Active" if visor else "Open"},
        {"trait_type": "Antenna", "value": "Signal" if antenna else "Grounded"},
        {"trait_type": "Artifact", "value": artifact.title()},
    ]
    return image, {"tier": tier, "price": price, "prompt": prompt, "traits": traits}


def write_collection(out_dir: Path, start: int, end: int, metadata_base_uri: str, image_base_uri: str) -> None:
    images_dir = out_dir / "images"
    metadata_dir = out_dir / "metadata"
    if start == 1 and end == SUPPLY:
        for generated_path in (images_dir, metadata_dir, out_dir / "collection.json", out_dir / "ipfs-manifest.json"):
            if generated_path.is_dir():
                for child in generated_path.iterdir():
                    if child.is_file() or child.is_symlink():
                        child.unlink()
                    elif child.is_dir():
                        import shutil
                        shutil.rmtree(child)
                generated_path.rmdir()
            elif generated_path.exists():
                generated_path.unlink()
    images_dir.mkdir(parents=True, exist_ok=True)
    metadata_dir.mkdir(parents=True, exist_ok=True)

    index: dict[str, Any] = {
        "name": "Naroba Pixel Identity Archive",
        "symbol": "NRB",
        "supply": SUPPLY,
        "network": "BNB Chain",
        "metadata_base_uri": metadata_base_uri,
        "image_base_uri": image_base_uri,
        "token_uri_pattern": f"{metadata_base_uri}{{tokenId}}.json",
        "image_uri_pattern": f"{image_base_uri}{{tokenId}}.png",
        "tokens": {},
    }

    for token_id in range(start, end + 1):
        image, info = pixel_identity(token_id)
        token_name = f"Naroba Identity #{token_id:04d}"
        token_file = f"{token_id:04d}"
        image.save(images_dir / f"{token_file}.png", format="PNG", optimize=True)
        metadata = {
            "name": token_name,
            "description": f"{info['prompt']} Mint stage: {info['tier']}. Price: {info['price']}.",
            "image": f"{image_base_uri}{token_file}.png",
            "external_url": "https://narobaagent.example/collection",
            "token_id": token_id,
            "prompt": info["prompt"],
            "attributes": [{"trait_type": "Token ID", "value": token_id}, *info["traits"]],
        }
        (metadata_dir / f"{token_file}.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
        index["tokens"][str(token_id)] = {
            "image": f"images/{token_file}.png",
            "metadata": f"metadata/{token_file}.json",
            "tier": info["tier"],
            "price": info["price"],
            "sha256": hashlib.sha256((metadata_dir / f"{token_file}.json").read_bytes()).hexdigest(),
        }

    (out_dir / "collection.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default="collection", type=Path)
    parser.add_argument("--start", default=1, type=int)
    parser.add_argument("--end", default=None, type=int)
    parser.add_argument("--count", default=None, type=int, help="Generate this many tokens from --start.")
    parser.add_argument("--metadata-base-uri", default="ipfs://REPLACE_WITH_METADATA_CID/")
    parser.add_argument("--image-base-uri", default="ipfs://REPLACE_WITH_IMAGES_CID/")
    args = parser.parse_args()
    end = args.start + args.count - 1 if args.count is not None else (args.end or SUPPLY)
    if not (1 <= args.start <= end <= SUPPLY):
        raise SystemExit(f"Token range must be between 1 and {SUPPLY}.")
    write_collection(args.out_dir, args.start, end, args.metadata_base_uri, args.image_base_uri)
    print(f"Generated tokens {args.start}-{end} in {args.out_dir}")


if __name__ == "__main__":
    main()
