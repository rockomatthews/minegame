import { writeFile } from "node:fs/promises";
import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  isAddress,
  parseUnits,
  zeroAddress,
} from "viem";

const CHAIN_ID = "8453";
const OWNER_SAFE = "0x4114de71ccc0277e2fCe16909067F785cD742FDb";
const TREASURY_SAFE = "0xD9A7b8DB19C9A4012a78bBa7CA3555C4e75f14e1";
const TOKEN = "0xB20000000000000000000033307E6D1bB78b0201";
const METADATA_ROOT = "bafybeifogoiym5no6ilomsc6eopuquvefd6vrnqbvhdsafqe5pv3axcogq";

const configureTierAbi = [{
  type: "function",
  name: "configureTier",
  stateMutability: "nonpayable",
  inputs: [
    { internalType: "uint256", name: "tierId", type: "uint256" },
    { internalType: "uint256", name: "price", type: "uint256" },
    { internalType: "uint128", name: "baseHashrate", type: "uint128" },
    { internalType: "uint64", name: "gridDraw", type: "uint64" },
    { internalType: "uint16", name: "buybackBps", type: "uint16" },
    { internalType: "string", name: "metadataURI", type: "string" },
  ],
  outputs: [{ internalType: "uint256", name: "configuredTierId", type: "uint256" }],
}];

const tiers = [
  [1, "Tin Pan", 1_000, 100, 6, 2_500, "tier-01-tin-pan.json"],
  [2, "Rattletrap", 2_500, 135, 9, 2_750, "tier-02-rattletrap.json"],
  [3, "Molebox", 7_500, 180, 14, 3_000, "tier-03-molebox.json"],
  [4, "Boiler Badger", 20_000, 250, 22, 3_250, "tier-04-boiler-badger.json"],
  [5, "Goldjaw", 50_000, 350, 32, 3_500, "tier-05-goldjaw.json"],
  [6, "Deep-Core Bruiser", 125_000, 500, 50, 3_750, "tier-06-deep-core-bruiser.json"],
  [7, "Arc Canary", 300_000, 700, 75, 4_000, "tier-07-arc-canary.json"],
  [8, "Quantum Jack", 650_000, 1_000, 110, 4_250, "tier-08-quantum-jack.json"],
  [9, "Nova Burrower", 1_250_000, 1_500, 180, 4_500, "tier-09-nova-burrower.json"],
  [10, "King Midas", 2_500_000, 2_400, 300, 5_000, "tier-10-king-midas.json"],
];

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const economyInput = option("--economy") || process.env.MINEGAME_ECONOMY_ADDRESS;
const outputPath = option("--out");

if (!economyInput || !isAddress(economyInput)) {
  console.error("Pass the deployed economy with --economy 0x... or MINEGAME_ECONOMY_ADDRESS.");
  process.exit(1);
}

const economy = getAddress(economyInput);
const forbiddenTargets = [zeroAddress, OWNER_SAFE, TREASURY_SAFE, TOKEN].map((address) => address.toLowerCase());
if (forbiddenTargets.includes(economy.toLowerCase())) {
  console.error("The economy address cannot be the token, Owner Safe, or Treasury Safe.");
  process.exit(1);
}

const transactions = tiers.map(([tierId, , priceTokens, baseHashrate, gridDraw, buybackBps, file]) => {
  const price = parseUnits(String(priceTokens), 18);
  const metadataURI = `ipfs://${METADATA_ROOT}/${file}`;
  const args = [BigInt(tierId), price, BigInt(baseHashrate), BigInt(gridDraw), buybackBps, metadataURI];
  const data = encodeFunctionData({ abi: configureTierAbi, functionName: "configureTier", args });
  const decoded = decodeFunctionData({ abi: configureTierAbi, data });

  if (decoded.functionName !== "configureTier" || decoded.args[0] !== BigInt(tierId)) {
    throw new Error(`Calldata self-check failed for tier ${tierId}.`);
  }

  return {
    to: economy,
    value: "0",
    data,
    contractMethod: configureTierAbi[0],
    contractInputsValues: {
      tierId: String(tierId),
      price: price.toString(),
      baseHashrate: String(baseHashrate),
      gridDraw: String(gridDraw),
      buybackBps: String(buybackBps),
      metadataURI,
    },
  };
});

const batch = {
  version: "1.0",
  chainId: CHAIN_ID,
  createdAt: Date.now(),
  meta: {
    name: "MineGame reviewed miner tier configuration",
    description: "Ten configureTier calls only. No funding, approval, reward-rate change, or unpause.",
    txBuilderVersion: "1.18.0",
    createdFromSafeAddress: OWNER_SAFE,
    createdFromOwnerAddress: "",
  },
  transactions,
};

const json = `${JSON.stringify(batch, null, 2)}\n`;
if (outputPath) {
  await writeFile(outputPath, json, { flag: "wx" });
  console.error(`Wrote ${transactions.length} reviewed configureTier calls to ${outputPath}`);
} else {
  process.stdout.write(json);
}
