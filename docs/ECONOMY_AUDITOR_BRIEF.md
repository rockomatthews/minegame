# MineGame economy focused audit brief

## Review target

Review the new MINEGAME-only miner economy for loss of funds, fabricated rewards, reserve insolvency, ownership/accounting corruption, price-bound bypass, reward manipulation, capacity bypass, marketplace abuse, protocol-buyback abuse, pause lockout, and unsafe administration.

The historical `MineGameEngine.sol` POWER staking engine is outside this focused review except where shared mocks or repository configuration affect compilation. The proposed launch contract is `MineGameEconomy.sol`.

## Freeze and toolchain

- Repository: `https://github.com/rockomatthews/minegame`
- Branch: `main`
- Audit commit: auditor must record the exact submitted commit before review
- Solidity: `0.8.26`
- EVM: Cancun
- Optimizer: enabled, 10,000 runs
- OpenZeppelin Contracts: exactly `5.6.1` in `package-lock.json`
- Foundry fuzz: 10,000 runs
- Foundry invariants: 512 runs, depth 100

Install JavaScript dependencies with `npm ci`, not `npm install`, so the exact lockfile is honored.

## In-scope files

- `contracts/src/MineGameEconomy.sol`
- `contracts/test/MineGameEconomy.t.sol`
- `contracts/test/MineGameEconomy.invariant.t.sol`
- Economy-specific mocks in `contracts/test/MockMineGame.sol`
- `contracts/script/DeployMineGameEconomy.s.sol`
- `contracts/foundry.toml`
- `package.json` and `package-lock.json`
- `docs/ARCHITECTURE.md`
- `docs/MINER_ROSTER.md`
- `docs/STATIC_ANALYSIS.md`

## Intended invariants

1. The contract never mints MINEGAME and never pays more than recorded reserves/liabilities.
2. `minegame.balanceOf(economy) >= rewardReserve + rewardLiability + buybackReserve` after every successful action.
3. Every miner has exactly one owner and appears exactly once in that owner's enumerable inventory.
4. `totalActiveHashrate` equals the sum of active player hashrate; listed miners contribute zero.
5. Player miner count, room slot capacity, grid capacity, active hashrate, and grid draw stay consistent through buys, listings, cancellations, sales, and sellbacks.
6. Every miner and room requires nonzero MINEGAME payment. There is one implicit free room but no free miner.
7. Primary miner, room, and marketplace purchases revert before payment if the current price exceeds the caller-signed maximum.
8. Protocol sellback reverts if payout is below the caller-signed minimum or the buyback reserve is insufficient.
9. A discounted P2P sale reduces protocol buyback basis; a premium sale cannot increase it.
10. A P2P transfer resets the seven-day protocol-sellback cooldown.
11. Reward emission cannot exceed the immutable rate ceiling or available reward reserve.
12. Pause stops emissions, primary purchases, new listings, and marketplace buys; claims, listing cancellation, and reserve-backed sellback remain available.
13. Fee-on-transfer behavior and reentrant token callbacks cannot corrupt accounting.
14. Ownership cannot be renounced and uses two-step transfer.
15. Deployment succeeds only on Base Mainnet or local Anvil, validates canonical token identity/supply, requires contract wallets, and leaves the economy paused.

## Economic constants to challenge

- Miner purchase: 35% rewards / 55% buybacks / 10% treasury.
- Room purchase: 80% rewards / 20% treasury.
- Marketplace fee: 5%, all to rewards.
- Maximum protocol buyback: 50% of miner basis.
- Sellback cooldown: 7 days after each acquisition.
- One free room, five miners per room, maximum 20 rooms.

Please distinguish code-security findings from economic-design recommendations. In particular, analyze whether reserve segmentation, basis reduction on discounted sales, fee routing, cooldowns, rounding dust, owner-controlled emission rate, and a finite shared reward stream create exploitable or materially misleading outcomes.

## Reproduction

```bash
npm ci
npm run contracts:fmt
npm run contracts:test
forge build --root contracts --sizes
npm run lint
npm run build
```

The economy suite includes unit, 10,000-run fuzz, and stateful invariant campaigns. `fail_on_revert` is enabled, so any unexpected handler revert fails the campaign. Please add independent PoCs rather than relying only on project tests.

Latest remediation verification: 55 Foundry tests passed, 0 failed, including 31 focused economy unit/fuzz tests and four economy invariant campaigns at 512 runs × 100 calls with zero handler reverts. `MineGameEconomy` runtime bytecode is 15,847 bytes, leaving 8,729 bytes below the EIP-170 limit. `npm ci`, `forge fmt --check`, ESLint, the Next.js production build, and the documented Slither command pass. The auditor must reproduce these results from the frozen remediation commit.

## Static analysis

Slither 0.11.6 analyzes the economy successfully when driven through the exact Solidity 0.8.26 binary instead of Foundry's compiler framework. The remediation run analyzed 14 contracts with 100 enabled detectors and returned zero findings after excluding three reviewed strict-equality false positives. See `docs/STATIC_ANALYSIS.md` for the exact command and evidence boundary.

## Deployment and launch gates

No deployment, tier configuration, reserve funding, approval, unpause, or token launch is authorized by this brief. Before any deployment:

1. Freeze and independently review the exact commit.
2. Close all Critical and High findings in writing and retest remediations.
3. Verify the live o1 B20 address, creation block, bytecode, ABI, factory/implementation, supply, and absence of burn/rebase/blacklist/seizure/pause/upgrade behavior. Run `npm run check:b20`, require `pass: true`, and preserve its report and digest.
4. Simulate the exact deployment against a current Base Mainnet fork/precompile environment.
5. Independently approve primary prices, reward rate/ceiling, grid capacity, buyback percentages, tier metadata CIDs, initial reward funding, and initial buyback funding.
6. Deploy paused and verify source code.
7. Prepare and simulate separate Safe transactions for tier configuration and reserve funding.
8. Unpause only after the live website reads verified onchain state and all monitoring checks pass.

## Explicit exclusions

Repairs, wear, parts, visual loadouts, overclocking, and holding-age bonuses are not implemented by the proposed economy contract. The website may preview those concepts but must not enable wallet transactions for them. Any such module requires a new specification, test suite, economic review, and focused audit.
