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
CANVAS = 64
SCALE = 4
PALETTES = [
    {"name": "Solar Gold", "bg": "#0b0c0b", "shadow": "#423311", "body": "#d99e24", "accent": "#f7d65c", "eye": "#fff6b9", "highlight": "#fff2a1", "metal": "#79521d", "grid": "#171714", "glow": "#241708"},
    {"name": "Arcane Violet", "bg": "#0b0910", "shadow": "#30204d", "body": "#8447e5", "accent": "#c7a5ff", "eye": "#f7edff", "highlight": "#f2e8ff", "metal": "#43236f", "grid": "#17131c", "glow": "#180d2c"},
    {"name": "Neon Cyan", "bg": "#071015", "shadow": "#173d50", "body": "#178bb8", "accent": "#59d8ff", "eye": "#e7fbff", "highlight": "#c6f6ff", "metal": "#17506a", "grid": "#111b20", "glow": "#081e2a"},
    {"name": "Emerald Signal", "bg": "#08100c", "shadow": "#19432e", "body": "#188955", "accent": "#66f0a2", "eye": "#eafff0", "highlight": "#d0ffe0", "metal": "#18563b", "grid": "#121b15", "glow": "#092218"},
    {"name": "Hot Magenta", "bg": "#100910", "shadow": "#4b203e", "body": "#ae3e84", "accent": "#ff79cf", "eye": "#fff0f9", "highlight": "#ffe0f3", "metal": "#612346", "grid": "#1c131b", "glow": "#260d1c"},
    {"name": "Electric Blue", "bg": "#090d17", "shadow": "#23366d", "body": "#365ed5", "accent": "#83a8ff", "eye": "#eef3ff", "highlight": "#e0ecff", "metal": "#273c82", "grid": "#151821", "glow": "#101a39"},
    {"name": "Coral Flame", "bg": "#100b09", "shadow": "#552b1d", "body": "#d55535", "accent": "#ff9d69", "eye": "#fff4e8", "highlight": "#ffe1bf", "metal": "#73351f", "grid": "#1d1613", "glow": "#290f08"},
    {"name": "Ice Silver", "bg": "#0a0d10", "shadow": "#314250", "body": "#9aaabc", "accent": "#d7eeff", "eye": "#ffffff", "highlight": "#ffffff", "metal": "#526578", "grid": "#171c20", "glow": "#131f2b"},
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
    if token_id <= 9_000:
        return "passage", "0.000222 BNB"
    return "open", "0.001 BNB"


def make_prompt(token_id: int, mood: str, form: str, artifact: str, palette: str) -> str:
    return f"A {mood} {form} Naroba signal terminal with a luminous golden pixel-art laptop, carrying {artifact}. {palette} gold, dark grid, radiant signal crystal, crisp details, and a calm on-chain identity."



PIXEL_FONT = {
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "010", "010", "010"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
    "#": ("101", "111", "101", "111", "101"),
}


def draw_pixel_text(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, color: str) -> None:
    """Draw compact 3x5 pixel lettering for the unique on-screen token number."""
    for char_index, character in enumerate(text):
        glyph = PIXEL_FONT[character]
        for row, bits in enumerate(glyph):
            for column, bit in enumerate(bits):
                if bit == "1":
                    draw.point((x + char_index * 4 + column, y + row), fill=color)


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

    # Subtle square grid and quiet golden aura, inspired by the supplied reference.
    for coordinate in range(0, CANVAS, 8):
        draw.line((coordinate, 0, coordinate, CANVAS - 1), fill=palette["grid"], width=1)
        draw.line((0, coordinate, CANVAS - 1, coordinate), fill=palette["grid"], width=1)
    draw.polygon([(32, 9), (45, 28), (55, 50), (9, 50), (19, 28)], fill=palette["glow"])
    draw.polygon([(32, 15), (41, 30), (48, 47), (16, 47), (23, 30)], fill=palette["bg"])

    # Sparkling pixels around the device: restrained so they do not obscure it.
    for _ in range(34):
        x = rng.randrange(3, CANVAS - 3)
        y = rng.randrange(3, CANVAS - 3)
        color = palette["accent"] if rng.random() > 0.48 else palette["metal"]
        size = rng.choice([0, 0, 1, 2])
        draw.rectangle((x, y, x + size, y + size), fill=color)

    # A vertical signal beam leads to a bright, pixelated crystal above the laptop.
    draw.rectangle((31, 9, 32, 30), fill=palette["metal"])
    draw.rectangle((31, 12, 32, 28), fill=palette["accent"])
    draw.polygon([(32, 13), (39, 20), (39, 23), (32, 30), (25, 23), (25, 20)], fill=palette["shadow"])
    draw.polygon([(32, 14), (38, 21), (32, 28), (26, 21)], fill=palette["body"])
    draw.polygon([(32, 16), (36, 21), (32, 26), (28, 21)], fill=palette["highlight"])
    draw.rectangle((31, 18, 33, 23), fill=palette["eye"])
    draw.rectangle((31, 3, 33, 5), fill=palette["accent"])

    # Screen: clear bezel, bright pixel border, status lights, and varied code rows.
    draw.rectangle((11, 29, 52, 51), fill=palette["shadow"])
    draw.rectangle((12, 30, 51, 50), fill=palette["body"])
    draw.rectangle((13, 31, 50, 49), fill=palette["bg"])
    draw.rectangle((14, 32, 49, 48), fill="#10100e")
    draw.rectangle((14, 32, 49, 33), fill=palette["shadow"])
    draw.rectangle((16, 34, 17, 35), fill=palette["accent"])
    draw.rectangle((19, 34, 20, 35), fill=palette["metal"])
    draw.rectangle((22, 34, 23, 35), fill=palette["highlight"])
    draw.rectangle((44, 34, 47, 35), fill=palette["metal"])

    # The exact token ID is printed on every laptop screen, including five-digit #10000.
    token_label = f"#{token_id:04d}"
    label_width = len(token_label) * 4 - 1
    draw_pixel_text(draw, token_label, (CANVAS - label_width) // 2, 36, palette["highlight"])

    # Token-specific terminal lines keep every screen composition deterministic but unique.
    for row in range(3):
        y = 43 + row * 2
        x = 16 + rng.randrange(0, 5)
        remaining = 31 - (x - 16)
        first = rng.randrange(4, 10)
        second = rng.randrange(4, 12)
        third = rng.randrange(3, 9)
        for offset, width, color in (
            (0, min(first, remaining), palette["accent"]),
            (first + 1, min(second, max(0, remaining - first - 1)), palette["metal"]),
            (first + second + 2, min(third, max(0, remaining - first - second - 2)), palette["shadow"]),
        ):
            if width > 0:
                draw.rectangle((x + offset, y, x + offset + width - 1, y), fill=color)

    # Pixel hinge and laptop base, with a broad trapezoid for a recognizable profile.
    draw.rectangle((27, 51, 36, 52), fill=palette["highlight"])
    draw.polygon([(11, 53), (52, 53), (60, 59), (4, 59)], fill=palette["shadow"])
    draw.polygon([(13, 54), (50, 54), (56, 58), (8, 58)], fill=palette["body"])
    draw.polygon([(15, 54), (48, 54), (52, 57), (11, 57)], fill="#11100d")

    # Keyboard rows use distinct luminous keycaps and a visible central trackpad.
    for row, (left, right) in enumerate(((15, 48), (17, 46), (19, 44))):
        y = 54 + row
        for x in range(left, right, 3):
            if rng.random() > 0.2:
                key_color = palette["highlight"] if rng.random() > 0.78 else palette["accent"]
                draw.rectangle((x, y, min(x + 1, right - 1), y), fill=key_color)
    draw.rectangle((27, 57, 36, 58), fill=palette["shadow"])
    draw.rectangle((28, 57, 35, 57), fill=palette["highlight"])
    draw.rectangle((5, 60, 58, 60), fill=palette["metal"])
    draw.rectangle((15, 61, 48, 61), fill=palette["glow"])

    # Mood/form/artifact traits alter the signal crest without changing the laptop silhouette.
    if form in {"listener", "scout"}:
        draw.rectangle((30, 10, 33, 11), fill=palette["highlight"])
    elif form == "courier":
        draw.rectangle((39, 19, 41, 22), fill=palette["accent"])
        draw.point((42, 21), fill=palette["highlight"])
    elif form == "keeper":
        draw.rectangle((23, 20, 25, 23), fill=palette["accent"])
    elif form == "drifter":
        draw.rectangle((39, 19, 41, 20), fill=palette["highlight"])
    else:  # cartographer
        draw.rectangle((30, 11, 33, 12), fill=palette["accent"])

    image = image.resize((CANVAS * SCALE, CANVAS * SCALE), Image.Resampling.NEAREST)
    tier, price = tier_for_token(token_id)
    prompt = make_prompt(token_id, mood, form, artifact, palette["name"])
    traits = [
        {"trait_type": "Stage", "value": tier.title()},
        {"trait_type": "Palette", "value": palette["name"]},
        {"trait_type": "Mood", "value": mood.title()},
        {"trait_type": "Form", "value": form.title()},
        {"trait_type": "Screen", "value": f"#{token_id:04d}"},
        {"trait_type": "Signal Crest", "value": "Charged" if antenna else "Steady"},
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
