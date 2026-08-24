# Static-analysis evidence

## Slither 0.11.6

Command:

```bash
slither contracts --compile-force-framework foundry
```

Result: **not a valid analysis result**. Slither fails to resolve inheritance/reference IDs in OpenZeppelin Contracts 5.6.1, including `Ownable2Step`, `SafeERC20`, `Pausable`, `ReentrancyGuard`, and `Math`. The same failure was reproduced against `MineGameEconomy.sol`. Any detector output after those parser errors is partial and must not be treated as a finding or clearance.

Representative error:

```text
Failed to resolved name for reference id ... Ownable2Step.sol
ContractSolcParsing: Missing inheritance MineGameEconomy
```

The installed `0.11.6` release was the latest published Slither version when this remediation was prepared.

## Aderyn 0.6.8

Equivalent-analyzer fallback commands:

```bash
npx --yes @cyfrin/aderyn@0.6.8 . --src src --path-includes src/MineGameEngine.sol --output /tmp/minegame-aderyn.md
npx --yes @cyfrin/aderyn@0.6.8 . --src src --path-includes src/MineGameEconomy.sol --output /tmp/minegame-economy-aderyn.md
npx --yes @cyfrin/aderyn@0.6.8 . --src src --output /tmp/minegame-aderyn.md
```

Result: **not a valid analysis result**. Both the single-file and full-production-source runs stop during AST ingestion with Aderyn's fatal compiler bug:

```text
Ingesting 1 compiled files [solc : v0.8.26]
Panic: aderyn_driver/src/compile.rs:78
content not found
Aderyn version: 0.6.8
```

The static-analysis gate therefore remains open. The Foundry unit/fuzz/invariant suite and the independent auditor's executed harness do not substitute for it.
