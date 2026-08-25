import {
  createPublicClient,
  getAddress,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  toBytes,
  toHex,
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
const rpcChainId = await client.getChainId();
if (rpcChainId !== base.id) {
  throw new Error(`Wrong RPC chain: expected ${base.id}, received ${rpcChainId}`);
}
const latestBlock = await client.getBlockNumber();
if (deploymentBlock > latestBlock) throw new Error("Deployment block is in the future");

const codeAtDeployment = await client.getBytecode({ address: token, blockNumber: deploymentBlock });
const codeBeforeDeployment = await client.getBytecode({ address: token, blockNumber: deploymentBlock - 1n });
const currentCode = await client.getBytecode({ address: token, blockNumber: latestBlock });
if (!codeAtDeployment || codeAtDeployment === "0x") throw new Error("No token code at deployment block");
if (codeBeforeDeployment && codeBeforeDeployment !== "0x") {
  throw new Error("Token code existed before MINEGAME_TOKEN_DEPLOYMENT_BLOCK");
}
if (!currentCode || currentCode === "0x") throw new Error("Token has no current runtime code");
if (currentCode !== codeAtDeployment) throw new Error("Token runtime code changed after deployment");

const zeroWord = `0x${"00".repeat(32)}`;
const proxySlots = {
  implementation: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
  admin: "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
  beacon: "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50",
};
const proxySlotPreimages = {
  implementation: "eip1967.proxy.implementation",
  admin: "eip1967.proxy.admin",
  beacon: "eip1967.proxy.beacon",
};
for (const [name, slot] of Object.entries(proxySlots)) {
  const derivedSlot = toHex(BigInt(keccak256(toBytes(proxySlotPreimages[name]))) - 1n, { size: 32 });
  if (slot.length !== 66 || slot !== derivedSlot) {
    throw new Error(`Invalid EIP-1967 ${name} slot constant`);
  }
}
const proxySlotEntries = await Promise.all(
  Object.entries(proxySlots).map(async ([name, slot]) => [
    name,
    (await client.getStorageAt({ address: token, slot, blockNumber: latestBlock })) ?? zeroWord,
  ]),
);
const proxySlotValues = Object.fromEntries(proxySlotEntries);
for (const [name, value] of Object.entries(proxySlotValues)) {
  if (value !== zeroWord) throw new Error(`Nonzero EIP-1967 ${name} slot: ${value}`);
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
const observedAccounts = new Map(observedRoleNames.map((name) => [name, new Set()]));

for (const log of logs) {
  const name = roleNamesByHash.get(log.args.role.toLowerCase());
  if (!name) continue;
  const account = getAddress(log.args.account);
  observedAccounts.get(name).add(account);
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
const unsupportedPolicyTypeSelector = keccak256(toBytes("UnsupportedPolicyType(bytes32)")).slice(0, 10);
const optionalPolicyNames = new Set(["SEIZE_HOLDER_POLICY", "SEIZE_RECEIVER_POLICY"]);
const findRevertData = (error) => {
  let current = error;
  for (let depth = 0; current && depth < 12; depth += 1) {
    for (const field of ["raw", "data"]) {
      if (typeof current[field] === "string" && current[field].startsWith("0x")) return current[field];
    }
    current = current.cause;
  }
  return undefined;
};
const readPolicy = async (policyName) => {
  const policyScope = roleHash(policyName);
  try {
    return { status: "supported", policyId: await read("policyId", [policyScope]) };
  } catch (error) {
    const revertData = findRevertData(error);
    const expectedUnsupportedError = `${unsupportedPolicyTypeSelector}${policyScope.slice(2)}`;
    if (
      optionalPolicyNames.has(policyName)
      && revertData?.toLowerCase() === expectedUnsupportedError.toLowerCase()
    ) {
      return { status: "unsupported", policyId: null };
    }
    throw error;
  }
};
const [name, symbol, decimals, totalSupply, supplyCap, pausedFeatures] = await Promise.all([
  read("name"),
  read("symbol"),
  read("decimals"),
  read("totalSupply"),
  read("supplyCap"),
  read("pausedFeatures"),
]);

for (const roleName of observedRoleNames) {
  for (const account of observedAccounts.get(roleName)) {
    const liveMembership = await read("hasRole", [roles[roleName], account]);
    const reconstructedMembership = holders.get(roleName).has(account);
    if (liveMembership !== reconstructedMembership) {
      throw new Error(
        `Role-log reconstruction disagrees with hasRole for ${roleName}/${account}: reconstructed=${reconstructedMembership}, live=${liveMembership}`,
      );
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
  policyNames.map(async (policyName) => [policyName, await readPolicy(policyName)]),
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
for (const [policyName, policy] of Object.entries(policies)) {
  if (policy.status === "supported" && policy.policyId !== 0n) {
    failures.push(`${policyName} is policy ${policy.policyId}`);
  }
}

const report = {
  chainId: rpcChainId,
  checkedThroughBlock: latestBlock.toString(),
  deploymentBlock: deploymentBlock.toString(),
  token,
  deploymentRuntimeCodeHash: keccak256(codeAtDeployment),
  currentRuntimeCodeHash: keccak256(currentCode),
  eip1967Slots: proxySlotValues,
  name,
  symbol,
  decimals,
  totalSupply: totalSupply.toString(),
  supplyCap: supplyCap.toString(),
  pausedFeatures,
  forbiddenRoleHolders: Object.fromEntries(forbiddenRoleNames.map((roleName) => [roleName, [...holders.get(roleName)]])),
  metadataRoleHolders: [...holders.get("METADATA_ROLE")],
  policies: Object.fromEntries(
    Object.entries(policies).map(([key, value]) => [
      key,
      value.status === "supported" ? { status: value.status, policyId: value.policyId.toString() } : value,
    ]),
  ),
  roleEventsScanned: logs.length,
  roleAccountsCrossChecked: Object.fromEntries(
    observedRoleNames.map((roleName) => [roleName, [...observedAccounts.get(roleName)]]),
  ),
};
const digest = keccak256(toBytes(JSON.stringify(report)));
console.log(JSON.stringify({ pass: failures.length === 0, digest, ...report, failures }, null, 2));
if (failures.length) process.exitCode = 1;
