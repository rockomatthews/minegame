import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { base } from "viem/chains";

const token = process.env.NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS;
const engine = process.env.NEXT_PUBLIC_MINEGAME_ENGINE_ADDRESS;
if (!token || !engine || !isAddress(token) || !isAddress(engine)) {
  console.error("Set valid NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS and NEXT_PUBLIC_MINEGAME_ENGINE_ADDRESS.");
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
const engineAbi = [
  { type: "function", name: "minegame", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "rewardsVault", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalStaked", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];
const read = (address, abi, functionName) => client.readContract({ address, abi, functionName });
const [name, symbol, decimals, totalSupply, contractURI, engineToken, rewardsVault, totalStaked, paused] = await Promise.all([
  read(token, tokenAbi, "name"), read(token, tokenAbi, "symbol"), read(token, tokenAbi, "decimals"),
  read(token, tokenAbi, "totalSupply"), read(token, tokenAbi, "contractURI"), read(engine, engineAbi, "minegame"),
  read(engine, engineAbi, "rewardsVault"), read(engine, engineAbi, "totalStaked"), read(engine, engineAbi, "paused"),
]);

const failures = [];
if (name !== "MineGame") failures.push(`name is ${name}`);
if (symbol !== "MINEGAME") failures.push(`symbol is ${symbol}`);
if (decimals !== 18) failures.push(`decimals is ${decimals}`);
if (totalSupply !== 1_000_000_000n * 10n ** 18n) failures.push(`supply is ${totalSupply}`);
if (String(engineToken).toLowerCase() !== token.toLowerCase()) failures.push("engine token mismatch");
if (!String(contractURI).startsWith("ipfs://")) failures.push("contractURI is not IPFS");

console.log(JSON.stringify({ chainId: base.id, token, engine, name, symbol, decimals, totalSupply: formatUnits(totalSupply, 18), contractURI, engineToken, rewardsVault, totalStaked: formatUnits(totalStaked, 18), paused, failures }, null, 2));
if (failures.length) process.exit(1);
