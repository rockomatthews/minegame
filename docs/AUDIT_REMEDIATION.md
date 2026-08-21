# MineGame security-audit remediation

This document maps the 20 August 2026 independent audit of commit `e89c87e4c9d3b6f69562ed327d76dae65b7d9795` to the remediation candidate. The exact candidate commit is supplied with the retest request.

## Finding disposition

| ID | Disposition | Remediation and retest target |
| --- | --- | --- |
| H-1 | Fixed | `activateOverclock(uint256 maxPrice)` reverts with `PriceExceedsMax(currentPrice, maxPrice)` before payment when the stored price exceeds the wallet-signed bound. The absolute ceiling is reduced from 1,000,000 to 10,000 MINEGAME. A regression test reproduces an owner price change between quote and execution. |
| M-1 | Fixed | `renounceOwnership()` always reverts with `OwnershipRenunciationDisabled()`. Two-step ownership transfer remains available. |
| M-2 | Mitigated in code; production receipt still required | If the token balance is short, `emergencyWithdraw()` uses full-precision pro-rata payout against `totalStaked`, preventing a first-out race. The canonical B20 must still be verified on Base as fixed-supply and free of burn, rebase, blacklist, seizure, pause, and upgrade paths before engine deployment. |
| M-3 | Fixed | The constructor rejects a vault equal to the engine, equal to the token, or without deployed code. The deployment script requires a contract-wallet vault and performs post-deployment assertions. |
| L-1 | Documented | NatSpec and architecture state that emergency exit forfeits pending POWER. The product interface must route users to normal withdrawal unless it fails. |
| L-2 | Accepted design | POWER time intentionally continues during a pause so maintenance does not rewrite holding economics. This is now explicit in the architecture. |
| L-3 | Documented product gate | A full withdrawal intentionally cancels unexpired overclock. The production interface must warn before submission. |
| L-4 | Accepted low risk | Deactivating a part can revert a pending purchase, but no token or POWER movement survives the revert. Published price, boost, and metadata remain immutable. |
| L-5 | Fixed, except intentionally no Sepolia | The deployment script checks name, symbol, decimals, exact supply, contract-wallet addresses, price floor/ceiling, and all immutable/post-deploy values. Chain gating remains Base Mainnet or Anvil because the project explicitly uses local/Base-fork rehearsal instead of Sepolia. |
| I-1 | Fixed | A multi-user handler-based invariant suite runs 512 sequences at depth 100. Fuzz tests run 10,000 cases. Solvency, stake sums, equipment limits, and bonus caps are asserted. |
| I-2 | No code change | The arithmetic bound remains unreachable by roughly 40 orders of magnitude under the asserted one-billion-token supply. |
| I-3 | Documented balancing fact | The equipment bps cap may bind before the eight-slot cap. This is intentional and should inform part balancing. |
| I-4 | Fixed | `forge-std` setup is pinned to `v1.16.2`; OpenZeppelin is declared exactly as `5.6.1`; clean environments use `npm ci`. |

## Added adversarial coverage

- Wallet-signed overclock price ceiling after an owner price update.
- Disabled ownership renunciation.
- Token-contract and EOA rewards-vault rejection.
- Two-user pro-rata emergency exit after a 75% engine-balance shrink.
- Fee-on-transfer deposit rejection with complete rollback.
- ERC-20 callback reentrancy blocked while stake accounting remains exact.
- Multi-user randomized stake, withdrawal, emergency exit, accrual, overclock, part, pause, and time-advance sequences.

## Retest commands

```bash
git checkout <REMEDIATION_COMMIT>
npm ci
npm run contracts:setup
npm run contracts:fmt
npm run contracts:test
```

The static-analysis gate remains separate from the auditor's executed harness. `docs/STATIC_ANALYSIS.md` records failed runs with the latest Slither and pinned Aderyn fallback; neither produced a valid result. Record a complete compatible analyzer command and output before mainnet engine deployment. No token launch, engine deployment, wallet transaction, or activation is authorized by this remediation.
