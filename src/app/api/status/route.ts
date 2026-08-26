import { createPublicClient, fallback, formatUnits, http, isAddress } from "viem";
import { base } from "viem/chains";
import { MINEGAME_TOKEN_ADDRESS } from "@/lib/minegame";

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
  const token = process.env.NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS || MINEGAME_TOKEN_ADDRESS;
  const economy = process.env.NEXT_PUBLIC_MINEGAME_ECONOMY_ADDRESS;
  if (!isAddress(token)) {
    return Response.json({ phase: "degraded", network: "Base Mainnet", token: null, economy: null, error: "Invalid token address" }, { status: 500 });
  }

  try {
    const rpcTransports = [
      ...(process.env.BASE_RPC_URL ? [http(process.env.BASE_RPC_URL)] : []),
      http("https://mainnet.base.org"),
      http("https://base-rpc.publicnode.com"),
    ];
    const client = createPublicClient({ chain: base, transport: fallback(rpcTransports, { rank: false }) });
    if (!economy) {
      const totalSupply = await client.readContract({ address: token, abi: tokenAbi, functionName: "totalSupply" });
      return Response.json({
        phase: "token-live",
        network: "Base Mainnet",
        token,
        economy: null,
        totalSupply: formatUnits(totalSupply, 18),
      }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } });
    }
    if (!isAddress(economy)) {
      return Response.json({ phase: "degraded", network: "Base Mainnet", token, economy: null, error: "Invalid economy address" }, { status: 500 });
    }
    // Sequential reads keep public fallback RPCs below burst limits during provider outages.
    const totalSupply = await client.readContract({ address: token, abi: tokenAbi, functionName: "totalSupply" });
    const economyToken = await client.readContract({ address: economy, abi: economyAbi, functionName: "minegame" });
    const paused = await client.readContract({ address: economy, abi: economyAbi, functionName: "paused" });
    const rewardReserve = await client.readContract({ address: economy, abi: economyAbi, functionName: "rewardReserve" });
    const buybackReserve = await client.readContract({ address: economy, abi: economyAbi, functionName: "buybackReserve" });
    const rewardLiability = await client.readContract({ address: economy, abi: economyAbi, functionName: "rewardLiability" });
    const totalActiveHashrate = await client.readContract({ address: economy, abi: economyAbi, functionName: "totalActiveHashrate" });
    const runwaySeconds = await client.readContract({ address: economy, abi: economyAbi, functionName: "rewardRunwaySeconds" });
    const solvent = await client.readContract({ address: economy, abi: economyAbi, functionName: "isSolvent" });
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
