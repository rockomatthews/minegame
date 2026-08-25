# MineGame economy deployment runbook

This is preparation, not authorization to broadcast or unpause.

## Required inputs

- Verified canonical o1 MINEGAME B20 address on Base.
- Exact token deployment block and a passing adminless B20 preflight report.
- Owner Safe address and separate treasury Safe address.
- Exact room price, initial reward rate, immutable reward-rate ceiling, and grid capacity per room.
- Ten immutable tier definitions: price, hashrate, grid draw, buyback bps, and IPFS metadata URI.
- Approved initial reward and buyback reserve amounts.

## Deployment environment

```bash
export MINEGAME_TOKEN_ADDRESS=0x...
export MINEGAME_TOKEN_DEPLOYMENT_BLOCK=...
export MINEGAME_SAFE_ADDRESS=0x...
export MINEGAME_TREASURY_SAFE_ADDRESS=0x...
export MINEGAME_ROOM_PRICE_WEI=...
export MINEGAME_REWARD_RATE_WEI_PER_SECOND=...
export MINEGAME_MAX_REWARD_RATE_WEI_PER_SECOND=...
export MINEGAME_GRID_CAPACITY_PER_ROOM=...
export MINEGAME_B20_PREFLIGHT_DIGEST=0x...
export BASE_RPC_URL=...
export BASESCAN_API_KEY=...
```

## Mandatory B20 preflight

Run this against the current Base state before every deployment simulation:

```bash
npm run check:b20 | tee /tmp/minegame-b20-preflight.json
export MINEGAME_B20_PREFLIGHT_DIGEST=0x...
```

Copy the `digest` only from a report with `"pass": true`. Preserve the complete JSON with the audit/deployment evidence. Because `checkedThroughBlock` is part of the attested report body, a later clean rerun normally produces a different digest even when every security-relevant token property is unchanged. Compare the reports field by field, explain every difference, and pin only the latest reviewed report. The check proves the supplied block is the creation block, reconstructs role membership from every `RoleGranted` and `RoleRevoked` event, confirms current membership with `hasRole`, and rejects any holder of admin, mint, burn, blocked-burn, seize, pause, unpause, or operator authority. It permits `METADATA_ROLE` so the approved metadata can remain mutable. It also requires fixed supply/cap, no paused features, and all built-in policy slots at the always-allow policy (`0`).

Some B20 versions do not expose the two newer seizure policy scopes. For those two scopes only, the report may record `status: "unsupported"` when the token returns the exact canonical `UnsupportedPolicyType(bytes32)` error for the requested scope. The four transfer/mint scopes must remain supported at policy `0`, and the complete role-history check must still show no admin or seizure authority. Any other revert fails closed.

Before deployment can compile as an authorized release, replace the deliberately zero `EXPECTED_B20_PREFLIGHT_DIGEST` constant in `DeployMineGameEconomy.s.sol` with that exact reviewed digest and commit the change. The deploy script requires exact equality. Any other value—including an arbitrary nonzero value—fails closed. Pinning the digest is a new review gate because it binds the release to one token report at one Base block.

The B20 ABI does not enumerate role members. The Solidity deploy script therefore cannot independently discover every historical role holder; it requires the pinned offchain report digest and repeats every directly enumerable B20 check onchain. The report also asserts Base chain ID, compares deployment and current runtime bytecode, checks EIP-1967 implementation/admin/beacon slots, and cross-checks every address ever observed in relevant role events. Use an archive-capable RPC and preserve the JSON; the digest does not replace the evidence it binds.

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
