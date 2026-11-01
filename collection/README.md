# Naroba collection pipeline

The collection is generated deterministically from the token ID. Token `0001` will always produce the same PNG, prompt, traits, and metadata when regenerated with the same script version.

## Generate the full 10,000-token collection

From the repository root:

```bash
python3 scripts/generate_collection.py --count 10000
```

The generator writes:

- `collection/images/0001.png` through `0010000.png`
- `collection/metadata/0001.json` through `0010000.json`
- `collection/collection.json`, a token-to-image and token-to-metadata manifest

The files use a four-digit naming convention for token IDs below 1,000 and natural five-digit names above it, matching the Solidity helper's padded token URI rule.

## Verify the mapping

```bash
python3 scripts/verify_collection.py --collection collection --supply 10000
```

## Pin to IPFS

Create a Pinata JWT locally, then run:

```bash
PINATA_JWT='your-token' EXTERNAL_URL='https://your-domain.example/collection' node scripts/pin_to_ipfs.mjs
```

The script pins images first, rewrites every metadata `image` field to the real image CID, then pins metadata as a separate directory. It writes `collection/ipfs-manifest.json`. Never commit the JWT. After pinning, set the contract base URI to the metadata CID with the pattern:

```text
ipfs://<metadata-cid>/
```

The contract helper in `contracts/NarobaMetadataURI.sol` maps token `1` to `ipfs://<metadata-cid>/0001.json`, and each JSON points to the matching image under the image CID. The final CID values cannot be known until the pinning step has run.

## Important deployment step

An IPFS CID cannot be created offline. The repository now contains the reproducible PNG/metadata generator and the upload script, but the final CID and contract binding must be created with your own pinning account and then set on the deployed BNB Chain NFT contract.

## Artwork system

The collection uses a luminous pixel-art laptop on a dark grid, with a signal crystal, ambient pixels, a terminal screen, and a detailed keyboard. Each token is assigned one of eight strongly differentiated color palettes (gold, violet, cyan, emerald, magenta, blue, coral, or silver); terminal bars and particles also vary deterministically. The screen prints that NFT's exact ID (for example, `#0001` or `#10000`) in pixel lettering. Art is drawn on a 64 × 64 canvas and enlarged to 256 × 256 with nearest-neighbour scaling. The `/nft` folder contains website previews for tokens 0001, 0638, 0771, and 2814. Regenerate artwork and metadata together using `python3 scripts/generate_collection.py --count 10000` before pinning a collection revision.

## Mint phases

- Tokens 1–1,000: free mint (1,000 total).
- Tokens 1,001–9,000: paid mint at 0.000222 BNB (8,000 total).
- Tokens 9,001–10,000: paid mint at 0.001 BNB (1,000 total).

`collection/config.json`, the deterministic metadata generator, and the collection manifest use the same boundaries.
