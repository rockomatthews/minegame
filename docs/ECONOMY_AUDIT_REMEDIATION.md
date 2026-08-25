# MineGame economy audit remediation

Remediation target: external report `MINEGAME_Economy_Audit.md` against commit `60831d2996f4415af1191bcef0d070bfb4788bf2`.

No deployment, token launch, tier configuration, reserve funding, approval, or unpause is part of this remediation.

## Findings

### H-1 — reward drift locks the last claimant: remediated

Player accrual now calculates `hashrate * (accRewardPerHash - rewardPerHashPaid) / precision`, avoiding subtraction between independently floored cumulative products. Every checkpoint moves the exact emitted amount from `rewardReserve` into `rewardLiability`; sub-wei allocation remainder therefore remains solvent liability dust and can never short a claimant.

Regression coverage includes the auditor's two-player/six-checkpoint sequence, both claim orders through a complete wind-down, 2–200 checkpoint fuzzing, and a stateful conservation invariant. Checked subtraction remains in `claimMinegame`; the fix does not mask accounting failure with a saturating subtraction.

### M-1 — invariant campaign discarded claim reverts: remediated

`fail_on_revert` is now `true`. The economy invariant handler includes bounded owner reward-rate, room-price, and tier-price actions. A new invariant requires total player rewards to remain within recorded liability plus the precisely bounded uncheckpointed emission. Contract guard behavior remains covered by direct unit tests, while the stateful handler submits only valid state transitions so every unexpected revert fails the campaign.

### M-2 — privileged B20 can freeze exits or drain reserves: operationally fail-closed

`scripts/check-b20-adminless.mjs` reconstructs dangerous B20 role membership from creation through the current block and confirms observed holders with `hasRole`. It rejects admin, mint, burn, blocked-burn, seize, pause, unpause, and operator roles; nonzero B20 policies; paused features; or a supply/cap mismatch. `METADATA_ROLE` is intentionally allowed.

The deploy script independently rechecks the B20 supply cap, pause state, and policy slots. Because the official B20 view interface does not enumerate role members, the preserved log-derived report is a mandatory deployment artifact. The exact digest-binding requirement is documented under M-4 below.

### M-3 — frozen npm install: remediated for Linux CI

The lockfile now carries explicit top-level optional entries for `@emnapi/core@1.11.3` and `@emnapi/runtime@1.11.3`, including their registry integrity hashes and dependencies. This closes the Linux-only `npm ci` consistency failure while allowing unsupported-platform optional packages to remain skipped at installation time.

### M-4 / L-4 / L-5 / L-6 — B20 preflight binding and evidence: remediated

The deploy script no longer accepts an arbitrary nonzero report digest. Its compile-time expected digest is deliberately zero, making deployment impossible until the exact reviewed live-token report digest is pinned in a subsequent reviewed commit; deployment then requires exact equality.

The preflight now queries and asserts the RPC's actual chain ID, probes every account ever observed in relevant grant or revocation logs in both directions against live `hasRole`, requires current runtime bytecode to match deployment bytecode, and rejects nonzero EIP-1967 implementation, admin, or beacon slots.

### L-7 — malformed EIP-1967 admin slot: remediated

The EIP-1967 slot constants are canonical and self-verified at startup by deriving each value from its documented preimage. A malformed or incorrect constant therefore fails before any storage query or report generation.

### L-1 / L-2 — zero-value sellback: remediated

Tier creation rejects zero buyback basis points, and `sellMinerBack` rejects a payout that rounds to zero before changing miner ownership or accounting. Both guards have direct regression tests.

### L-3 — static-analysis instructions: remediated

`docs/STATIC_ANALYSIS.md` now records the working direct-solc Slither invocation and reviewed false-positive exclusion. The remediation run analyzed 14 contracts with 100 detectors and returned zero findings.

## Residual operational gates

- Run the B20 preflight against the actual launched token and preserve the passing JSON/digest.
- Obtain focused independent review of this remediation commit.
- Simulate the exact paused deployment against current Base state.
- Keep tier configuration, funding, token approvals, and `unpause()` as separate approvals.
