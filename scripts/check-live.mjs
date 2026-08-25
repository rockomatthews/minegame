import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { base } from "viem/chains";

const token = process.env.NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS || "0xB20000000000000000000033307E6D1bB78b0201";
const economy = process.env.NEXT_PUBLIC_MINEGAME_ECONOMY_ADDRESS;
if (!isAddress(token)) {
  console.error("Set a valid NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS.");
  process.exit(1);
}
if (economy && !isAddress(economy)) {
  console.error("NEXT_PUBLIC_MINEGAME_ECONOMY_ADDRESS is set but invalid.");
  process.exit(1);
}

const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org") });
const tokenAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "contractURI", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
];
const economyAbi = [
  { type: "function", name: "minegame", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "treasury", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "rewardReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buybackReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardLiability", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "accountedTokenBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardRunwaySeconds", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalActiveHashrate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isSolvent", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];
const read = (address, abi, functionName) => client.readContract({ address, abi, functionName });
const [name, symbol, decimals, totalSupply, contractURI] = await Promise.all([
  read(token, tokenAbi, "name"),
  read(token, tokenAbi, "symbol"),
  read(token, tokenAbi, "decimals"),
  read(token, tokenAbi, "totalSupply"),
  read(token, tokenAbi, "contractURI"),
]);

const failures = [];
if (name !== "MineGame") failures.push(`name is ${name}`);
if (symbol !== "MINEGAME") failures.push(`symbol is ${symbol}`);
if (decimals !== 18) failures.push(`decimals is ${decimals}`);
if (totalSupply !== 1_000_000_000n * 10n ** 18n) failures.push(`supply is ${totalSupply}`);
if (!String(contractURI).startsWith("ipfs://")) failures.push("contractURI is not IPFS");

if (!economy) {
  console.log(JSON.stringify({
    phase: "token-live",
    chainId: base.id,
    token,
    economy: null,
    name,
    symbol,
    decimals,
    totalSupply: formatUnits(totalSupply, 18),
    contractURI,
    failures,
  }, null, 2));
  if (failures.length) process.exit(1);
  process.exit(0);
}

const [economyToken, treasury, owner, paused, rewardReserve, buybackReserve, rewardLiability, accountedBalance, runwaySeconds, totalActiveHashrate, solvent] = await Promise.all([
  read(economy, economyAbi, "minegame"),
  read(economy, economyAbi, "treasury"),
  read(economy, economyAbi, "owner"),
  read(economy, economyAbi, "paused"),
  read(economy, economyAbi, "rewardReserve"),
  read(economy, economyAbi, "buybackReserve"),
  read(economy, economyAbi, "rewardLiability"),
  read(economy, economyAbi, "accountedTokenBalance"),
  read(economy, economyAbi, "rewardRunwaySeconds"),
  read(economy, economyAbi, "totalActiveHashrate"),
  read(economy, economyAbi, "isSolvent"),
]);
if (String(economyToken).toLowerCase() !== token.toLowerCase()) failures.push("economy token mismatch");
if (!solvent) failures.push("economy is insolvent");

console.log(JSON.stringify({
  phase: paused ? "configured" : "live",
  chainId: base.id, token, economy, name, symbol, decimals, totalSupply: formatUnits(totalSupply, 18), contractURI,
  economyToken, owner, treasury, paused, rewardReserve: formatUnits(rewardReserve, 18),
  buybackReserve: formatUnits(buybackReserve, 18), rewardLiability: formatUnits(rewardLiability, 18),
  accountedBalance: formatUnits(accountedBalance, 18), runwaySeconds: runwaySeconds.toString(),
  totalActiveHashrate: totalActiveHashrate.toString(), solvent, failures,
}, null, 2));
if (failures.length) process.exit(1);
