# MineGame architecture

The canonical MINEGAME token launches on Base through o1 Launchpad as a fixed-supply B20. The o1 token is not modified or replaced. `MineGameEngine` accepts that ERC-20-compatible B20 and provides the game around it.

## Assets

- **MINEGAME:** transferable public B20; exactly 1,000,000,000 tokens; no inflation or game-controlled minting.
- **POWER:** internal `uint256` balance; not ERC-20, transferable, tradable, or withdrawable; earned from staked MINEGAME and spent on virtual parts.

## Game loop

1. A player approves and stakes MINEGAME.
2. One staked MINEGAME produces one base POWER per day before bonuses.
3. Holding age increases linearly from `1.00x` to `2.00x` over 365 days, then caps.
4. Adding stake uses an amount-weighted start time, preventing age laundering.
5. Immutable virtual parts are purchased with POWER and equipped for additive boosts.
6. A 24-hour overclock adds `1.00x`; its MINEGAME price goes to the immutable rewards vault.
7. Full withdrawal resets holding age but preserves earned POWER and owned parts.

## Safety properties

- Players can withdraw normally while paused; `emergencyWithdraw()` provides a minimal principal-only exit.
- The owner cannot withdraw or seize player stake.
- Fee-on-transfer and balance-discrepant transfers are rejected.
- Parts are immutable after publication; only future purchases can be stopped or resumed.
- Overclock price is bounded at one million MINEGAME.
- Owner transfer uses OpenZeppelin `Ownable2Step`; the deployment script requires a contract-wallet owner.

## Administrative powers

The owner can pause/unpause game actions, publish new immutable parts, disable future purchases of a part, and change the bounded overclock price. The owner cannot alter POWER, rewrite existing parts, move player stake, or mint MINEGAME.

## Deliberate exclusion

The first engine does not promise or emit financial yield in MINEGAME. “Yield rate” means POWER production. Any later finite MINEGAME season or leaderboard reward module must be separately specified, funded from a disclosed allocation, and audited.
