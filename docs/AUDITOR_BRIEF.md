# MineGame focused audit brief

Review whether the game layer safely accepts the separately launched fixed-supply o1/B20 and whether anyone can steal stake, manufacture POWER, preserve unearned age, obtain parts without payment, extend overclock without payment, or block exits.

## In-scope production files

- `contracts/src/MineGameEngine.sol`
- `contracts/script/DeployMineGameEngine.s.sol`
- `contracts/foundry.toml`

The o1 launchpad, Base B20 implementation, token factory, Uniswap, Safe contracts, and website are dependencies or operational surfaces; integration findings are still requested.

## Security invariants

1. Sum of stakes equals `totalStaked`, which never exceeds the engine's token balance.
2. No account withdraws more principal than it staked; no owner path moves principal.
3. Full withdrawal resets age and overclock.
4. Added stake cannot make the combined position older than its amount-weighted age.
5. POWER is nontransferable; accrual is monotonic and splits correctly at overclock expiry.
6. Age bonus never exceeds 10,000 bps, equipment 50,000 bps, and overclock adds exactly 10,000 bps.
7. Published part cost, boost, and metadata cannot be rewritten.
8. Overclock payment reaches the immutable vault before activation completes.
9. Pausing cannot trap principal.
10. Reentrancy and nonstandard tokens cannot corrupt accounting.

## Priority review areas

- Linear holding-age integration and rounding across arbitrary intervals.
- Weighted timestamps under repeated deposits.
- Accrual splitting at `overclockUntil`.
- ERC-20/B20 assumptions and fee-on-transfer/rebasing incompatibility.
- Owner powers, pause behavior, immutable vault, and price bound.
- Overflow, precision, gas, timestamp manipulation, and square-root level math.
- Deployment-script checks and Base chain gating.

Run `npm run contracts:fmt` and `npm run contracts:test`. Freeze the repository to an exact commit before review. No deployment should precede written closure of all Critical and High findings.

## Static-analysis tooling note

Local Slither `0.11.6` exits `255` while resolving inheritance/reference IDs inside OpenZeppelin Contracts `5.6.1` (`Ownable2Step`, `SafeERC20`, `Pausable`, and `ReentrancyGuard`). Its partial output is not a clean result and should not be treated as contract findings or clearance. Please rerun Slither with a version that supports this OpenZeppelin AST, or use an equivalent compatible analyzer, and include the complete command and output in the audit evidence.
