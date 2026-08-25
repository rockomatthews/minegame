# MineGame

MineGame is a Base-native virtual mining economy built around a fixed-supply `MINEGAME` B20 launched through [o1.exchange](https://launch.o1.exchange/). Players buy virtual miners with MINEGAME, compete for finite reserve-funded MINEGAME rewards, and can resell miners to players or to a bounded protocol buyback reserve. Hashrate, grid draw, and condition are gameplay metrics only.

The canonical website is `https://minegame.fun`. The web app is prepared for Vercel, but this repository does not deploy the site, launch the token, or broadcast a contract transaction.

## Token metadata authority

The creator wallet `0x8A0182c099A618583e9EF98716DAcF739b3BD944` permanently holds the Base B20 `METADATA_ROLE`. It can change the token name, symbol, and contract URI. Because MINEGAME was created adminless, this role cannot be revoked or transferred. These display-level changes do not alter the fixed supply or MineGame economy accounting, but they can change how the token appears in wallets, explorers, and exchanges.

## Repository layout

- `contracts/` — Foundry contracts for the historical POWER engine and the new MINEGAME-only miner economy.
- `src/app/` — Next.js 16 App Router site and Base status endpoint.
- `metadata/` — o1/B20 metadata template.
- `docs/` — architecture, audit, o1 launch, and Vercel handoffs.
- `scripts/check-live.mjs` — post-launch read-only health check.

## Local verification

```bash
npm install
npm run lint
npm run build
npm run contracts:fmt
npm run contracts:test
```

Run the site:

```bash
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Blank addresses intentionally render clearly labeled pre-launch mode.

## Release gates

1. Approve final o1 allocations and vesting.
2. Obtain the independent review described in `docs/ECONOMY_AUDITOR_BRIEF.md`.
3. Launch the B20 through o1 and verify metadata/liquidity.
4. Deploy the economy paused only after the real B20 address is known; configure and fund it through the Safe.
5. Configure Vercel addresses and run `npm run monitor`.

Never commit wallet private keys, seed phrases, RPC secrets, or Foundry broadcast caches.
