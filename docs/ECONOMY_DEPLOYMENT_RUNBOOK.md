# MineGame economy deployment runbook

This is preparation, not authorization to broadcast or unpause.

## Required inputs

- Verified canonical o1 MINEGAME B20 address on Base.
- Owner Safe address and separate treasury Safe address.
- Exact room price, initial reward rate, immutable reward-rate ceiling, and grid capacity per room.
- Ten immutable tier definitions: price, hashrate, grid draw, buyback bps, and IPFS metadata URI.
- Approved initial reward and buyback reserve amounts.

## Deployment environment

```bash
export MINEGAME_TOKEN_ADDRESS=0x...
export MINEGAME_SAFE_ADDRESS=0x...
export MINEGAME_TREASURY_SAFE_ADDRESS=0x...
export MINEGAME_ROOM_PRICE_WEI=...
export MINEGAME_REWARD_RATE_WEI_PER_SECOND=...
export MINEGAME_MAX_REWARD_RATE_WEI_PER_SECOND=...
export MINEGAME_GRID_CAPACITY_PER_ROOM=...
export BASE_RPC_URL=...
export BASESCAN_API_KEY=...
```

Do not put a private key in a committed file. Use the approved wallet/broadcast method only after deployment authorization.

## Simulation command

```bash
forge script contracts/script/DeployMineGameEconomy.s.sol:DeployMineGameEconomy \
  --root contracts \
  --rpc-url "$BASE_RPC_URL" \
  --sender 0xDEPLOYER \
  -vvvv
```

The script deploys only the economy and asserts it is paused. It does not configure tiers, fund reserves, approve token spending, unpause, or launch MINEGAME.

## Separate Safe gates after deployment

1. Verify deployment bytecode, constructor arguments, source, owner, treasury, token, configuration, and `paused() == true`.
2. Configure the ten reviewed tiers through the owner Safe.
3. Transfer/approve only the approved reserve amounts and call `fundRewards` / `fundBuybacks`.
4. Reconcile actual token balance against `accountedTokenBalance()` and require `isSolvent() == true`.
5. Point the website at the verified economy and confirm it reads rooms, miners, tier prices, reserves, reward rate/runway, listings, and claimable balances.
6. Simulate every Safe transaction and save the receipts.
7. Treat `unpause()` as its own final authorization. Do not bundle it with deployment or configuration.
