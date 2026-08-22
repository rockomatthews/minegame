# MineGame miner roster and progression plan

## Product direction

MineGame should sell and earn virtual mining machines, not merely display a cosmetic miner beside a token balance. Every machine is a game item with a distinct silhouette, base hashrate, virtual grid draw, reliability, repair time, part requirements, and upgrade ceiling.

“Hashrate” is a game statistic that controls internal POWER production. These machines do not perform real proof-of-work mining and their power consumption is a virtual capacity mechanic, not a claim about physical electricity use.

## Core loop

1. Every player begins with the Tier 1 machine.
2. Staked MINEGAME is assigned to one active machine.
3. The active machine converts stake time into internal, nontransferable POWER.
4. POWER buys repairs, parts, grid upgrades, and machine blueprints.
5. Tiers 2–10 are directly purchasable with MINEGAME at a disclosed token price sent to the rewards vault. Every transaction must include a wallet-signed maximum price.
6. Machine wear increases deterministically with operating time and heat. At zero durability, the machine stops until repaired.
7. Parts alter hashrate, efficiency, cooling, reliability, repair speed, and slot behavior.
8. A player's virtual grid capacity limits which machine/part combinations can run, preventing the best strategy from being “equip everything expensive.”

No machine price should be hardcoded in dollars. The interface may show a live approximate fiat value, but all signed bounds and contract accounting remain denominated in MINEGAME or POWER.

## Ten-machine ladder

The values below are balancing targets, not final contract constants. `Hashrate` is a multiplier against the starter machine. `Grid draw` is virtual capacity consumption.

| Tier | UI name | Visual identity | Hashrate | Grid draw | Reliability | Slots | Base repair | Key part gate |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Tin Pan | Dented lunchbox rig, weak fan, hand crank, patched wires | 1.00x | 0.6 kW | 78% | 1 | 5 min | Any starter fan |
| 2 | Rattletrap | Wheeled scrapyard tower with belt drive and wobbling flywheel | 1.35x | 0.9 kW | 80% | 2 | 12 min | Belt kit |
| 3 | Molebox | Compact burrowing chassis with drill-nose intake and dirt shields | 1.80x | 1.4 kW | 84% | 2 | 25 min | Dust filter |
| 4 | Boiler Badger | Round brass boiler body, pressure gauges, oversized radiator | 2.50x | 2.2 kW | 82% | 3 | 45 min | Pressure valve |
| 5 | Goldjaw | Heavy gold-toothed intake grille, twin turbines, armored shell | 3.50x | 3.2 kW | 88% | 3 | 90 min | Dual turbine pair |
| 6 | Deep-Core Bruiser | Massive tracked machine, industrial pistons, reinforced core | 5.00x | 5.0 kW | 90% | 4 | 3 hr | Hydraulic core |
| 7 | Arc Canary | Sleek electric rig with glowing coils and a floating cooling cage | 7.00x | 7.5 kW | 92% | 4 | 6 hr | Arc regulator |
| 8 | Quantum Jack | High-tech jackhammer silhouette, levitating panels, phase cooling | 10.00x | 11 kW | 94% | 5 | 12 hr | Phase coupler |
| 9 | Nova Burrower | Exotic deep-space tunneler with plasma ring and crystalline core | 15.00x | 18 kW | 95% | 6 | 24 hr | Plasma containment |
| 10 | King Midas | Monumental black-and-gold crown-shaped super-rig, autonomous repair drones | 24.00x | 30 kW | 97% | 8 | 48 hr | Complete relic set |

## Acquisition model

- Tier 1 is free and account-bound.
- Tiers 2–10 are virtual game items purchased directly with MINEGAME. Their token prices must be adjustable within audited bounds and every purchase must carry a caller-supplied maximum price.
- Buying a machine establishes ownership immediately. Parts, repairs, grid capacity, efficiency, and maximum performance still require gameplay and POWER, so purchasing the highest tier does not eliminate the progression loop.
- Website prices are balancing targets until the machine-purchase module receives economic review. Prices are never denominated or signed in dollars.
- Machines remain virtual game inventory. Transferability should stay disabled initially to avoid creating an unaudited secondary market.

Direct machine sales fund the disclosed rewards system while the POWER economy controls optimization. A purchased machine still needs compatible parts, sufficient virtual grid capacity, maintenance, and accumulated POWER to reach its advertised ceiling.

## Room model

- Every player receives one account-bound starter room for free.
- A room holds a maximum of five miners. Miner ownership and room capacity are separate: the free room does not include five free machines.
- Additional rooms are virtual game items purchased with MINEGAME at a disclosed bounded price. The current dashboard uses `100,000 MINEGAME` only as a balancing preview, not a deployed price.
- Room purchases must use the same caller-supplied maximum-price protection as miner purchases and send funds to the disclosed rewards vault.
- The dashboard aggregates installed miners into total hashrate, virtual grid consumption, projected POWER production, capacity, and machine health.
- Each room has one daily maintenance action. It repairs installed miners according to deterministic rules and cannot be executed more than once per maintenance period.
- “Projected yield” and “profit” in the interface refer only to expected nontransferable POWER output. The game must not present a guaranteed fiat or investment return.

## Repair and part strategy

- Wear is deterministic and auditable; avoid random onchain breakdowns.
- A repair begins a visible timer. POWER pays the base repair; spare parts reduce time or restore more durability.
- Cooling lowers wear and grid draw. Compute cores raise hashrate but increase heat. Power supplies raise efficiency. Chassis parts add reliability. Tooling parts reduce repair time.
- Each machine has at least one silhouette-changing signature part so upgrades are visible in future 3D variants.
- Full machine replacement must not erase earned account progression. Machine-specific wear and loadout can reset; lifetime POWER and player level remain.

## Art production rules

- Ten separate 1:1 images, one machine per image.
- No names, numbers, labels, logos, watermarks, currency symbols, humans, or extra characters in the art.
- Original stylized 3D designs with classic mid-century squash-and-stretch cartoon energy; never copy an existing character.
- Fixed series camera based on Tier 1: front-right three-quarter view showing the front face and right side, approximately 35-degree azimuth, approximately 8-degree downward view, medium 50mm-like perspective, centered at about 78% frame occupancy. Do not change angle, floor line, padding, backdrop, or lighting language between tiers.
- Progression must read from silhouette alone: improvised and tiny at Tier 1, monumental and near-futuristic at Tier 10.
- Higher tiers add cleaner engineering, stronger light language, more advanced materials, and more confident posture—not merely more clutter.
- Technology progression is phased: Tiers 1–4 are analog mechanical; Tier 5 is the visible industrial-to-digital transition; Tiers 6–7 are advanced digital/electrical; Tiers 8–10 introduce controlled quantum, plasma, and autonomous technology.
- Every miner must expose standardized visible attachment architecture: bolted flanges, removable cages, panel seams, mounting rails, cable/pipe couplers, and capped unused hardpoints.
- Each base image shows that tier's signature parts installed on the chassis. Later loadout variants replace those components at the same visible hardpoints so cooling, compute, power, reliability, and repair upgrades are visually recognizable during play.

## Contract impact

The current audited engine does not implement machine or room ownership and purchases, room capacity, durability, grid capacity, daily maintenance windows, repair timers, or machine-specific multipliers. This design requires a separately scoped engine revision or module, new invariants, economic review, UI transaction bounds, and another focused audit before deployment. The website dashboard must remain preview-only until that audited module is deployed and configured.
