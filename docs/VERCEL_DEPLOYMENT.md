# Vercel handoff

The app is standard Next.js 16 App Router and requires no custom Vercel adapter.

1. Push this repository to a new GitHub repository named `minegame`.
2. Import it in Vercel using the Next.js preset.
3. Build: `npm run build`; install: `npm ci`.
4. Add `minegame.fun` and `www.minegame.fun`; redirect `www` to the apex.

Deploy pre-launch with address variables empty. After audited deployment, add `NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS`, `NEXT_PUBLIC_MINEGAME_ECONOMY_ADDRESS`, `NEXT_PUBLIC_O1_TOKEN_URL`, `NEXT_PUBLIC_BASE_APP_COIN_URL`, and server-only `BASE_RPC_URL`, then redeploy.

Verify `/`, `/api/status`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`, the logo, favicon, Apple icon, canonical URL, Open Graph, Twitter card, and JSON-LD. Confirm the status endpoint reports the verified token/economy relationship, pause state, reward reserve, buyback reserve, liability, solvency, active hashrate, and reward runway before enabling wallet actions.

No Vercel deployment is authorized by this document.
