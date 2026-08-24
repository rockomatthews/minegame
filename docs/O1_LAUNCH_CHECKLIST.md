# o1 launch checklist

This prepares a launch; it does not authorize a wallet signature.

## Canonical identity

- Name: `MineGame`
- Symbol: `MINEGAME`
- Network: Base Mainnet (`8453`)
- Website: `https://minegame.fun`
- Supply: exactly `1,000,000,000`
- Logo: `public/assets/minegame-logo.png`, published to immutable IPFS
- Description: `metadata/token.template.json`
- Metadata editable after launch: enabled
- Add onchain metadata: enabled
- Pair: ETH unless later approved otherwise
- Pool model: locked pool

## Proposed allocation — final approval required

| Purpose | Proposed share | Treatment |
| --- | ---: | --- |
| Public launch and locked liquidity | 70% | o1 launch pool |
| Gameplay and future finite seasons | 20% | disclosed rewards Safe/vault |
| Community quests and partnerships | 5% | disclosed community Safe |
| Operations, audits, infrastructure | 3% | treasury Safe |
| Team | 2% | target 24-month vesting, 6-month cliff |

Do not enter these values until o1's current allocation math, liquidity consequences, and vesting capabilities are reproduced. Unsupported schedules must be disclosed, not silently approximated.

## Before signing

- Confirm wallet and Base network.
- Capture the generated address and verify it is unused.
- Resolve logo CID through two IPFS gateways.
- Verify name, ticker, description, website, image, fixed supply, every allocation address, pool, starting market cap, and lock behavior.
- Save screenshots and unsigned calldata.
- Obtain audit closure and final economic approval.
- Simulate the exact transaction against current Base state.
- Record the exact B20 creation block. Run `npm run check:b20`, require `pass: true`, and preserve its JSON and digest. Do not continue if any dangerous role holder, active policy, paused feature, or supply-cap mismatch is reported.

## After signing

- Verify `name()`, `symbol()`, `decimals()`, `totalSupply()`, `supplyCap()`, and `contractURI()`.
- Validate the IPFS JSON/image, Uniswap pool, allocations, and vesting.
- Re-run the fixed-supply/adminless B20 preflight against the deployed address immediately before deploying the game economy.
- Run `npm run monitor` before adding public purchase links.
- Add Base App, o1, Uniswap, DexScreener, Fomo, and BaseScan routes only after each resolves.
- Submit enhanced metadata to services that do not consume B20 data automatically.
