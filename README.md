# Naroba — Pixel Identity Mint

Narobaagent is a dark, pixel-art NFT mint experience for the Naroba identity archive.

## Development

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm dev:static`: static development server on port 3000.
- `pnpm build` / `pnpm start`: build and serve the application.
- `pnpm build:static`: build the frontend for static hosting.
- `pnpm check` / `pnpm test`: types and application tests.

## BNB Chain mint stages

- Tokens 1–1,000 (1,000 NFTs): free mint (BNB Chain gas may still apply).
- Tokens 1,001–9,000 (8,000 NFTs): paid mint at `0.000222 BNB`.
- Tokens 9,001–10,000 (1,000 NFTs): paid mint at `0.001 BNB`.

The homepage mint console supports pasted wallet prompts, AI-agent prompt generation, tier-aware pricing, and a filterable identity gallery, but it remains a local preview until its public mint flow is bound to a deployed contract. `/deploy.html` is a separate owner console for deploying the ERC-721 contract, setting its metadata URI, checking status, and opening or closing on-chain mint. Deploying the contract does not connect or activate the homepage mint UI.

## NFT assets and metadata

The `collection/` directory now contains 10,000 deterministic 256×256 PNG identities, 10,000 ERC-721 metadata JSON files, and a token-to-asset manifest. Rebuild or verify the collection with `python3 scripts/generate_collection.py --count 10000` and `python3 scripts/verify_collection.py --collection collection --supply 10000`. Use `PINATA_JWT=... node scripts/pin_to_ipfs.mjs` to pin the image and metadata folders to IPFS, then set the resulting metadata CID as the NFT contract base URI. Never commit the Pinata JWT. The deploy artifact is reproducibly compiled from `contracts/NarobaNFT.sol` with `pnpm contract:compile`; `pnpm build:static` compiles it and builds both `/` and `/deploy.html`.

The contract makes the deploying wallet owner, starts with mint disabled, and accepts one mint per transaction. The 1,000 free spots are enforced by token ID and are not a per-wallet limit. Mint proceeds remain in the contract until the owner withdraws them. Test on BNB Testnet before any mainnet deployment; the console never requests private keys or seed phrases and never submits a transaction without the connected wallet's approval.

Platform configuration is readable and editable through `webdev.config`. Private keys stay server-side.
