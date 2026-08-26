# MineGame Base mainnet parameters

Approved for paused deployment rehearsal on 2026-08-25. This document does not authorize broadcasting, tier configuration, funding, approvals, or unpause.

## Deployment

| Parameter | Value |
| --- | --- |
| Token | `0xB20000000000000000000033307E6D1bB78b0201` |
| Owner Safe | `0x4114de71ccc0277e2fCe16909067F785cD742FDb` |
| Treasury Safe | `0xD9A7b8DB19C9A4012a78bBa7CA3555C4e75f14e1` |
| Extra room price | `100,000 MINEGAME` |
| Initial reward rate | `0 MINEGAME/second` |
| Immutable reward-rate ceiling | `1 MINEGAME/second` |
| Grid capacity per room | `500` contract units (`50.0 kW` in the UI) |
| B20 preflight digest | `0x19bbc24e301041791f65a494db4654b341bfff4084c35c6db6d640a08b0e51ef` |

Both Safes are deployed Safe v1.4.1 contracts on Base with three owners and a 2-of-3 threshold. A Base-node constructor simulation passed at block 50,460,553 with estimated gas `3,663,664` and returned the audited 15,847-byte runtime.

## Proposed immutable tier configuration

Hashrate uses hundredths of the displayed multiplier. Grid draw uses tenths of a displayed kW.

| Tier | Miner | Price | Hashrate | Grid | Sellback |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Tin Pan | 1,000 | 1.00x (`100`) | 0.6 kW (`6`) | 25.00% |
| 2 | Rattletrap | 2,500 | 1.35x (`135`) | 0.9 kW (`9`) | 27.50% |
| 3 | Molebox | 7,500 | 1.80x (`180`) | 1.4 kW (`14`) | 30.00% |
| 4 | Boiler Badger | 20,000 | 2.50x (`250`) | 2.2 kW (`22`) | 32.50% |
| 5 | Goldjaw | 50,000 | 3.50x (`350`) | 3.2 kW (`32`) | 35.00% |
| 6 | Deep-Core Bruiser | 125,000 | 5.00x (`500`) | 5.0 kW (`50`) | 37.50% |
| 7 | Arc Canary | 300,000 | 7.00x (`700`) | 7.5 kW (`75`) | 40.00% |
| 8 | Quantum Jack | 650,000 | 10.00x (`1000`) | 11.0 kW (`110`) | 42.50% |
| 9 | Nova Burrower | 1,250,000 | 15.00x (`1500`) | 18.0 kW (`180`) | 45.00% |
| 10 | King Midas | 2,500,000 | 24.00x (`2400`) | 30.0 kW (`300`) | 50.00% |

Every sellback is subject to the seven-day cooldown and available buyback reserve. It is not guaranteed liquidity or profit. The protocol routes 55% of each primary miner purchase into buybacks, so every proposed immutable sellback percentage remains below the corresponding self-funded reserve contribution.

## Funding posture

The creator wallet, Owner Safe, and Treasury Safe held zero MINEGAME when checked. The launch created no creator allocation: the complete fixed supply entered permanent o1/Uniswap v4 liquidity. Initial external reward and buyback funding are therefore zero. Primary miner sales self-fund 35% to rewards and 55% to buybacks; room sales self-fund 80% to rewards. The actual reward rate must remain zero until the Owner Safe separately approves a rate after tiers and live reserves are verified.
