# Naroba — Pixel Identity Mint

Narobaagent is a dark, pixel-art NFT mint experience for the Naroba identity archive.

## Development

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm dev:static`: static development server on port 3000.
- `pnpm build` / `pnpm start`: build and serve the application.
- `pnpm build:static`: build the frontend for static hosting.
- `pnpm check` / `pnpm test`: types and application tests.

## BNB Chain mint stages

- Tokens 1–1,000: freemint (BNB Chain gas may still apply).
- Tokens 1,001–3,000: `0.000222 BNB`.
- Tokens 3,001–10,000: `0.001 BNB`.

The frontend is the public Naroba mint experience for BNB Chain. The mint console supports pasted wallet prompts, AI-agent prompt generation, tier-aware pricing, and a filterable identity gallery. The deployment binding still needs the final NFT contract address, ABI, and wallet provider before it can submit live blockchain transactions.

## NFT assets and metadata

The `collection/` directory now contains 10,000 deterministic 128×128 PNG identities, 10,000 ERC-721 metadata JSON files, and a token-to-asset manifest. Rebuild or verify the collection with `python3 scripts/generate_collection.py --count 10000` and `python3 scripts/verify_collection.py --collection collection --supply 10000`. Use `PINATA_JWT=... node scripts/pin_to_ipfs.mjs` to pin the image and metadata folders to IPFS, then set the resulting metadata CID as the NFT contract base URI. The Solidity URI helper is in `contracts/NarobaMetadataURI.sol`.

Platform configuration is readable and editable through `webdev.config`. Private keys stay server-side.
