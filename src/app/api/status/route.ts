import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { base } from "viem/chains";

const tokenAbi = [{ type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;
const engineAbi = [{ type: "function", name: "totalStaked", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.NEXT_PUBLIC_MINEGAME_TOKEN_ADDRESS;
  const engine = process.env.NEXT_PUBLIC_MINEGAME_ENGINE_ADDRESS;
  if (!token || !engine || !isAddress(token) || !isAddress(engine)) {
    return NextResponse.json({ phase: "prelaunch", network: "Base Mainnet", token: null, engine: null });
  }
  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org") });
    const [totalSupply, totalStaked] = await Promise.all([
      client.readContract({ address: token, abi: tokenAbi, functionName: "totalSupply" }),
      client.readContract({ address: engine, abi: engineAbi, functionName: "totalStaked" }),
    ]);
    return NextResponse.json({
      phase: "live", network: "Base Mainnet", token, engine,
      totalSupply: Number(formatUnits(totalSupply, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 }),
      totalStaked: formatUnits(totalStaked, 18),
    }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } });
  } catch {
    return NextResponse.json({ phase: "degraded", network: "Base Mainnet", token, engine, error: "RPC read failed" }, { status: 503 });
  }
}
