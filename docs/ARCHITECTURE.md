# MineGame architecture

The canonical MINEGAME token launches on Base through o1 as a fixed-supply B20. The token is not replaced, wrapped, minted, or modified by the game. `MineGameEconomy` is the new gameplay contract; `MineGameEngine` is retained only as the previously audited POWER prototype and is not the proposed launch architecture.

## One-currency rule

- **MINEGAME is the only economic asset.** Miners, rooms, marketplace purchases, protocol sellbacks, and reward claims settle in MINEGAME.
- **Hashrate, grid draw, condition, and repair state are metrics.** They are not tokens, transferable balances, or redeemable assets.
- The contract cannot mint MINEGAME. Rewards stop when the disclosed reward reserve is exhausted.

## Core loop

1. Every wallet has one free room with five miner slots, but receives no free miner.
2. A player buys any configured miner tier with MINEGAME using a wallet-signed maximum price.
3. Active miners share the funded reward stream in proportion to active hashrate.
4. A listed miner stops earning until the listing is cancelled or purchased.
5. A buyer can purchase a listed miner with a wallet-signed maximum price. Five percent returns to the reward reserve and the remainder goes to the seller.
6. After a seven-day ownership cooldown, a miner can be sold to the protocol at its configured basis percentage if the separate buyback reserve has enough MINEGAME.
7. Additional five-slot rooms are purchased with MINEGAME using a wallet-signed maximum price.

## Reserve accounting

Primary miner payments are allocated 35% to rewards, 55% to buybacks, and 10% to the treasury. Room payments are allocated 80% to rewards and 20% to the treasury. Marketplace fees are 5% and return entirely to rewards.

The contract tracks three obligations independently:

- `rewardReserve`: unearned MINEGAME available for future emissions.
- `rewardLiability`: MINEGAME already earned but not claimed.
- `buybackReserve`: MINEGAME reserved for protocol sellbacks.

`accountedTokenBalance()` is their sum. `isSolvent()` requires the contract's actual MINEGAME balance to cover that sum. Emission is capped by both the owner-configured rate ceiling and available `rewardReserve`.

## Buyback basis

Protocol sellback uses a miner-specific basis, not the current admin price. A secondary-market premium cannot increase that basis. A discounted secondary sale reduces the basis to the lower purchase price. This prevents a buyer from acquiring a cheap transferable protocol put backed by the original higher primary-sale price.

Protocol sellback is not a guaranteed profit or guaranteed liquidity. It is subject to a seven-day ownership cooldown, the tier's immutable buyback percentage, a caller-supplied minimum payout, and available buyback reserves.

## Safety posture

- Deployment starts paused. The owner Safe must separately configure tiers, verify reserves, and explicitly unpause.
- Purchases and new listings stop while paused; claims, listing cancellation, and protocol sellback remain available.
- Incoming and outgoing token transfers require exact balance deltas, rejecting fee-on-transfer behavior.
- State-changing token paths use `nonReentrant`.
- Tier hashrate, grid draw, buyback percentage, and metadata URI are immutable after publication. Only tier price and primary-sale availability can change.
- Every admin-controlled purchase price is bounded in the contract, and every purchase/sellback carries a caller-signed price or payout bound.
- Ownership uses `Ownable2Step`; renunciation is disabled; deployment requires contract-wallet owner and treasury addresses.

## Administrative powers

The owner Safe can configure new immutable tiers, change existing primary prices within the hard cap, enable or disable primary tier sales, change room price within its hard cap, change reward rate within its immutable ceiling, and pause/unpause. It cannot mint MINEGAME, seize miners, rewrite existing tier performance/buyback data, move reserve accounting to the treasury, change marketplace fee shares, or bypass player price bounds.

## Deliberate exclusions

The reviewed economy contract does not yet implement repair timers, machine wear, parts, loadout appearance, overclocking, or an ownership-age reward multiplier. Those remain interface/design previews and require a separately specified and audited module before becoming wallet-enabled. The historical POWER staking engine is not required for the MINEGAME-only launch path.

Before deployment, independently verify the live o1 B20 bytecode and ABI has no holder burn, negative rebase, blacklist, seizure, pause, or upgrade path. Record the token address, runtime bytecode hash, factory/implementation path, and exact total supply.
