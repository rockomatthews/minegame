import {
  createPublicClient,
  getAddress,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  toBytes,
} from "viem";
import { base } from "viem/chains";

const rpcUrl = process.env.BASE_RPC_URL;
const tokenAddress = process.env.MINEGAME_TOKEN_ADDRESS;
const deploymentBlockInput = process.env.MINEGAME_TOKEN_DEPLOYMENT_BLOCK;

if (!rpcUrl || !tokenAddress || !deploymentBlockInput) {
  throw new Error(
    "Set BASE_RPC_URL, MINEGAME_TOKEN_ADDRESS, and MINEGAME_TOKEN_DEPLOYMENT_BLOCK",
  );
}

const token = getAddress(tokenAddress);
const deploymentBlock = BigInt(deploymentBlockInput);
const chunkSize = BigInt(process.env.B20_LOG_CHUNK_SIZE ?? "10000");
if (deploymentBlock <= 0n || chunkSize <= 0n) throw new Error("Invalid block input");

const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
const latestBlock = await client.getBlockNumber();
if (deploymentBlock > latestBlock) throw new Error("Deployment block is in the future");

const codeAtDeployment = await client.getBytecode({ address: token, blockNumber: deploymentBlock });
const codeBeforeDeployment = await client.getBytecode({ address: token, blockNumber: deploymentBlock - 1n });
if (!codeAtDeployment || codeAtDeployment === "0x") throw new Error("No token code at deployment block");
if (codeBeforeDeployment && codeBeforeDeployment !== "0x") {
  throw new Error("Token code existed before MINEGAME_TOKEN_DEPLOYMENT_BLOCK");
}

const roleGranted = parseAbiItem(
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
);
const roleRevoked = parseAbiItem(
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
);
const logs = [];
for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += chunkSize) {
  const toBlock = fromBlock + chunkSize - 1n < latestBlock ? fromBlock + chunkSize - 1n : latestBlock;
  const [grants, revocations] = await Promise.all([
    client.getLogs({ address: token, event: roleGranted, fromBlock, toBlock }),
    client.getLogs({ address: token, event: roleRevoked, fromBlock, toBlock }),
  ]);
  logs.push(...grants.map((log) => ({ ...log, granted: true })));
  logs.push(...revocations.map((log) => ({ ...log, granted: false })));
}
logs.sort((a, b) =>
  a.blockNumber === b.blockNumber
    ? Number(a.logIndex - b.logIndex)
    : a.blockNumber < b.blockNumber
      ? -1
      : 1,
);

const roleHash = (name) => (name === "DEFAULT_ADMIN_ROLE" ? `0x${"00".repeat(32)}` : keccak256(toBytes(name)));
const forbiddenRoleNames = [
  "DEFAULT_ADMIN_ROLE",
  "MINT_ROLE",
  "BURN_ROLE",
  "BURN_BLOCKED_ROLE",
  "SEIZE_ROLE",
  "PAUSE_ROLE",
  "UNPAUSE_ROLE",
  "OPERATOR_ROLE",
];
const observedRoleNames = [...forbiddenRoleNames, "METADATA_ROLE"];
const roles = Object.fromEntries(observedRoleNames.map((name) => [name, roleHash(name)]));
const roleNamesByHash = new Map(Object.entries(roles).map(([name, hash]) => [hash.toLowerCase(), name]));
const holders = new Map(observedRoleNames.map((name) => [name, new Set()]));

for (const log of logs) {
  const name = roleNamesByHash.get(log.args.role.toLowerCase());
  if (!name) continue;
  const account = getAddress(log.args.account);
  if (log.granted) holders.get(name).add(account);
  else holders.get(name).delete(account);
}

const abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function supplyCap() view returns (uint256)",
  "function pausedFeatures() view returns (uint8[])",
  "function policyId(bytes32 policyScope) view returns (uint64)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
]);
const read = (functionName, args = []) => client.readContract({ address: token, abi, functionName, args });
const [name, symbol, decimals, totalSupply, supplyCap, pausedFeatures] = await Promise.all([
  read("name"),
  read("symbol"),
  read("decimals"),
  read("totalSupply"),
  read("supplyCap"),
  read("pausedFeatures"),
]);

for (const roleName of observedRoleNames) {
  for (const account of holders.get(roleName)) {
    if (!(await read("hasRole", [roles[roleName], account]))) {
      throw new Error(`Role-log reconstruction disagrees with hasRole for ${roleName}/${account}`);
    }
  }
}

const policyNames = [
  "TRANSFER_SENDER_POLICY",
  "TRANSFER_RECEIVER_POLICY",
  "TRANSFER_EXECUTOR_POLICY",
  "MINT_RECEIVER_POLICY",
  "SEIZE_HOLDER_POLICY",
  "SEIZE_RECEIVER_POLICY",
];
const policyEntries = await Promise.all(
  policyNames.map(async (policyName) => [policyName, await read("policyId", [roleHash(policyName)])]),
);
const policies = Object.fromEntries(policyEntries);

const expectedSupply = 1_000_000_000n * 10n ** 18n;
const failures = [];
if (name !== "MineGame") failures.push(`name is ${name}`);
if (symbol !== "MINEGAME") failures.push(`symbol is ${symbol}`);
if (decimals !== 18) failures.push(`decimals is ${decimals}`);
if (totalSupply !== expectedSupply) failures.push(`totalSupply is ${totalSupply}`);
if (supplyCap !== expectedSupply) failures.push(`supplyCap is ${supplyCap}`);
if (pausedFeatures.length !== 0) failures.push(`paused features: ${pausedFeatures.join(",")}`);
for (const roleName of forbiddenRoleNames) {
  const accounts = [...holders.get(roleName)];
  if (accounts.length) failures.push(`${roleName} holders: ${accounts.join(",")}`);
}
for (const [policyName, policyId] of Object.entries(policies)) {
  if (policyId !== 0n) failures.push(`${policyName} is policy ${policyId}`);
}

const report = {
  chainId: base.id,
  checkedThroughBlock: latestBlock.toString(),
  deploymentBlock: deploymentBlock.toString(),
  token,
  runtimeCodeHash: keccak256(codeAtDeployment),
  name,
  symbol,
  decimals,
  totalSupply: totalSupply.toString(),
  supplyCap: supplyCap.toString(),
  pausedFeatures,
  forbiddenRoleHolders: Object.fromEntries(forbiddenRoleNames.map((roleName) => [roleName, [...holders.get(roleName)]])),
  metadataRoleHolders: [...holders.get("METADATA_ROLE")],
  policies: Object.fromEntries(Object.entries(policies).map(([key, value]) => [key, value.toString()])),
  roleEventsScanned: logs.length,
};
const digest = keccak256(toBytes(JSON.stringify(report)));
console.log(JSON.stringify({ pass: failures.length === 0, digest, ...report, failures }, null, 2));
if (failures.length) process.exitCode = 1;
