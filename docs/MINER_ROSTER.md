# MineGame miner roster and progression plan

## Product rules

- Every miner costs MINEGAME. The free starter room does not include a free machine.
- Every active miner earns a share of finite, funded MINEGAME emissions according to its hashrate.
- Hashrate, grid draw, reliability, condition, and repair time are virtual metrics only.
- A room holds five miners. Every wallet gets one free room; additional rooms cost MINEGAME.
- Miners can be listed for P2P sale or sold to the reserve-backed protocol buyback after cooldown.
- No displayed projection is a promise of profit. A player's realized result depends on token prices paid, reward reserve/runway, total competing hashrate, marketplace demand, fees, and sellback liquidity.

## Ten-machine ladder

The values below are balancing targets, not configured mainnet values. Hashrate is relative to Tin Pan and grid draw is virtual capacity.

| Tier | UI name | Visual identity | Hashrate | Grid draw | Reliability | Slots | Base repair | Signature part |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Tin Pan | Dented lunchbox rig, weak fan, hand crank, patched wires | 1.00x | 0.6 kW | 78% | 1 | 5 min | Starter fan |
| 2 | Rattletrap | Wheeled scrapyard tower with belt drive and wobbling flywheel | 1.35x | 0.9 kW | 80% | 2 | 12 min | Belt kit |
| 3 | Molebox | Compact burrowing chassis with drill-nose intake and dirt shields | 1.80x | 1.4 kW | 84% | 2 | 25 min | Dust filter |
| 4 | Boiler Badger | Round brass boiler body, pressure gauges, oversized radiator | 2.50x | 2.2 kW | 82% | 3 | 45 min | Pressure valve |
| 5 | Goldjaw | Gold-toothed intake grille, twin turbines, armored shell | 3.50x | 3.2 kW | 88% | 3 | 90 min | Dual turbines |
| 6 | Deep-Core Bruiser | Tracked machine, industrial pistons, reinforced core | 5.00x | 5.0 kW | 90% | 4 | 3 hr | Hydraulic core |
| 7 | Arc Canary | Electric rig with glowing coils and floating cooling cage | 7.00x | 7.5 kW | 92% | 4 | 6 hr | Arc regulator |
| 8 | Quantum Jack | Levitating panels, jackhammer silhouette, phase cooling | 10.00x | 11 kW | 94% | 5 | 12 hr | Phase coupler |
| 9 | Nova Burrower | Plasma ring and crystalline deep-space tunneling core | 15.00x | 18 kW | 95% | 6 | 24 hr | Plasma containment |
| 10 | King Midas | Black-and-gold crown rig with autonomous repair drones | 24.00x | 30 kW | 97% | 8 | 48 hr | Complete relic set |

## Proposed primary prices

The website currently previews 1,000 / 2,500 / 7,500 / 20,000 / 50,000 / 125,000 / 300,000 / 650,000 / 1,250,000 / 2,500,000 MINEGAME for tiers 1–10 and 100,000 MINEGAME per additional room. These are visible balancing proposals only. They must receive economic review and be converted into the exact Safe calls before mainnet configuration.

The contract makes tier price, hashrate, grid draw, buyback percentage, and metadata URI explicit. Hashrate and grid draw become immutable when a tier is created. Primary price can change within the hard cap, but the wallet always signs a maximum accepted price.

## Repairs, parts, and cosmetic growth

Wear should be deterministic. One free daily room-maintenance action can restore a limited amount of condition; faster or deeper repair and all parts would cost MINEGAME if implemented. Cooling affects wear/grid, compute affects hashrate/heat, power supplies affect efficiency, chassis parts affect reliability, and tooling affects repair time.

These mechanics are not in `MineGameEconomy.sol`. The current parts and repair controls are labeled previews and must not sign transactions until a follow-on contract and audit exist. No internal POWER currency will be reintroduced.

## Art production rules

- Ten separate 1:1 images, one machine per image.
- No names, numbers, labels, logos, watermarks, currency symbols, humans, or extra characters in the art.
- Original stylized 3D designs with classic squash-and-stretch animation energy; never copy an existing character.
- Fixed front-right three-quarter camera, approximately 35-degree azimuth and 8-degree downward view, consistent floor line, padding, backdrop, and lighting.
- Progression must read from silhouette alone: improvised and small at Tier 1, monumental and near-futuristic at Tier 10.
- Every miner exposes standardized visible attachment architecture so later loadout variants can replace parts at the same hardpoints.
