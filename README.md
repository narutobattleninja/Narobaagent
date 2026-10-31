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

The current frontend uses a safe demo flow until the production chain, contract address, ABI, and wallet provider are configured. The mint console supports pasted wallet prompts, AI-agent prompt generation, tier-aware pricing, and a filterable identity gallery.

Platform configuration is readable and editable through `webdev.config`. Private keys stay server-side.
