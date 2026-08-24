import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { base } from "viem/chains";

const tokenAbi = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const economyAbi = [
  { type: "function", name: "minegame", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "rewardReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buybackReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardLiability", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalActiveHashrate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardRunwaySeconds", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isSolvent", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS;
  const economy = process.env.NEXT_PUBLIC_MINEGAME_ECONOMY_ADDRESS;
  if (!token || !economy || !isAddress(token) || !isAddress(economy)) {
    return Response.json({ phase: "prelaunch", network: "Base Mainnet", token: null, economy: null });
  }

  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org") });
    const [totalSupply, economyToken, paused, rewardReserve, buybackReserve, rewardLiability, totalActiveHashrate, runwaySeconds, solvent] = await Promise.all([
      client.readContract({ address: token, abi: tokenAbi, functionName: "totalSupply" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "minegame" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "paused" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "rewardReserve" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "buybackReserve" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "rewardLiability" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "totalActiveHashrate" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "rewardRunwaySeconds" }),
      client.readContract({ address: economy, abi: economyAbi, functionName: "isSolvent" }),
    ]);
    const tokenMatches = economyToken.toLowerCase() === token.toLowerCase();
    const healthy = solvent && tokenMatches;

    return Response.json({
      phase: healthy ? (paused ? "configured" : "live") : "degraded",
      network: "Base Mainnet",
      token,
      economy,
      paused,
      solvent,
      tokenMatches,
      totalSupply: formatUnits(totalSupply, 18),
      rewardReserve: formatUnits(rewardReserve, 18),
      buybackReserve: formatUnits(buybackReserve, 18),
      rewardLiability: formatUnits(rewardLiability, 18),
      activeHashrate: totalActiveHashrate.toString(),
      runwaySeconds: runwaySeconds.toString(),
    }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } });
  } catch {
    return Response.json(
      { phase: "degraded", network: "Base Mainnet", token, economy, error: "RPC read failed" },
      { status: 503 },
    );
  }
}
