# MineGame contracts

Install Foundry and the test dependency from the repository root:

```bash
npm run contracts:setup
```

Then verify:

```bash
npm run contracts:fmt
npm run contracts:test
```

`DeployMineGameEngine.s.sol` deploys only the game engine after the o1-created token exists. It does not create MINEGAME, launch liquidity, move an allocation, or publish metadata.
