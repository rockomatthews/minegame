# Static-analysis evidence

## Slither 0.11.6

Slither must compile this repository through `solc` directly. The previous Foundry-framework invocation produced invalid OpenZeppelin reference-resolution errors and is retired.

Exact command:

```bash
slither contracts/src/MineGameEconomy.sol \
  --compile-force-framework solc \
  --solc-solcs-bin "/Users/rob/Library/Application Support/svm/0.8.26/solc-0.8.26" \
  --solc-remaps "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/" \
  --solc-args "--base-path . --include-path node_modules --optimize --optimize-runs 10000 --evm-version cancun" \
  --filter-paths node_modules \
  --exclude timestamp,incorrect-equality
```

Remediation result: **14 contracts analyzed with 100 detectors; 0 findings**.

The three `incorrect-equality` results excluded from the final run were reviewed manually. They are intentional zero checks in `claimMinegame`, `_updatePool`, and `_sendExact`; none is an authorization or balance-equality decision. A run excluding only `timestamp` reports exactly those three results and no others.

Static analysis is supplementary. The reward-conservation defect in the external economy audit was an accounting flaw and was not detected by Slither.
