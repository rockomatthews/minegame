import type { Address } from "viem";

export const MINEGAME_TOKEN_ADDRESS = "0xB20000000000000000000033307E6D1bB78b0201" as Address;
export const MINEGAME_ECONOMY_ADDRESS = "0x3a0d0C4feaE4eaB9275fDc13068C083deE7c8131" as Address;
export const MINEGAME_ECONOMY_DEPLOYMENT_BLOCK = BigInt(50_461_551);
export const BASE_CHAIN_ID = 8453;
export const MINEGAME_BASE_APP_URL =
  "https://go.base.app/swap?ni=networks%2Fbase-mainnet&ca=0xB20000000000000000000033307E6D1bB78b0201";
export const MINEGAME_UNISWAP_URL =
  "https://app.uniswap.org/swap?chain=base&inputCurrency=NATIVE&outputCurrency=0xB20000000000000000000033307E6D1bB78b0201";

export const minegameTokenAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const minegameEconomyAbi = [
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "roomPrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardRatePerSecond", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buybackReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardLiability", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalActiveHashrate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "gridCapacityPerRoom", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isSolvent", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "roomsOf", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ownedMinerIds", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { type: "function", name: "playerMinerCount", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "playerActiveHashrate", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "playerGridDraw", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "pendingRewards", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "tierExists", stateMutability: "view", inputs: [{ name: "tierId", type: "uint256" }], outputs: [{ type: "bool" }] },
  {
    type: "function", name: "tiers", stateMutability: "view", inputs: [{ name: "tierId", type: "uint256" }],
    outputs: [{ name: "price", type: "uint256" }, { name: "baseHashrate", type: "uint128" }, { name: "gridDraw", type: "uint64" }, { name: "buybackBps", type: "uint16" }, { name: "active", type: "bool" }, { name: "metadataURI", type: "string" }],
  },
  {
    type: "function", name: "miners", stateMutability: "view", inputs: [{ name: "minerId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }, { name: "tierId", type: "uint256" }, { name: "buybackBasis", type: "uint256" }, { name: "acquiredAt", type: "uint64" }, { name: "listed", type: "bool" }],
  },
  {
    type: "function", name: "listings", stateMutability: "view", inputs: [{ name: "minerId", type: "uint256" }],
    outputs: [{ name: "seller", type: "address" }, { name: "price", type: "uint256" }],
  },
  { type: "function", name: "buyMiner", stateMutability: "nonpayable", inputs: [{ name: "tierId", type: "uint256" }, { name: "maxPrice", type: "uint256" }], outputs: [{ name: "minerId", type: "uint256" }] },
  { type: "function", name: "buyRoom", stateMutability: "nonpayable", inputs: [{ name: "maxPrice", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimMinegame", stateMutability: "nonpayable", inputs: [], outputs: [{ name: "amount", type: "uint256" }] },
  { type: "function", name: "listMiner", stateMutability: "nonpayable", inputs: [{ name: "minerId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [] },
  { type: "function", name: "cancelListing", stateMutability: "nonpayable", inputs: [{ name: "minerId", type: "uint256" }], outputs: [] },
  { type: "function", name: "buyListedMiner", stateMutability: "nonpayable", inputs: [{ name: "minerId", type: "uint256" }, { name: "maxPrice", type: "uint256" }], outputs: [] },
  { type: "function", name: "sellMinerBack", stateMutability: "nonpayable", inputs: [{ name: "minerId", type: "uint256" }, { name: "minimumPayout", type: "uint256" }], outputs: [] },
  { type: "function", name: "fundRewards", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
] as const;
