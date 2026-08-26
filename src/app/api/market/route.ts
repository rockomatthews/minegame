import { createPublicClient, fallback, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  MINEGAME_ECONOMY_ADDRESS,
  MINEGAME_ECONOMY_DEPLOYMENT_BLOCK,
  minegameEconomyAbi,
} from "@/lib/minegame";

export const dynamic = "force-dynamic";

const minerListedEvent = parseAbiItem(
  "event MinerListed(address indexed seller, uint256 indexed minerId, uint256 price)",
);

export async function GET() {
  try {
    const transports = [
      ...(process.env.BASE_RPC_URL ? [http(process.env.BASE_RPC_URL)] : []),
      http("https://mainnet.base.org"),
      http("https://base-rpc.publicnode.com"),
    ];
    const client = createPublicClient({ chain: base, transport: fallback(transports, { rank: false }) });
    const logs = await client.getLogs({
      address: MINEGAME_ECONOMY_ADDRESS,
      event: minerListedEvent,
      fromBlock: MINEGAME_ECONOMY_DEPLOYMENT_BLOCK,
      toBlock: "latest",
    });
    const ids = Array.from(new Set(logs.map((log) => log.args.minerId?.toString()).filter(Boolean)));
    const candidates = await Promise.all(ids.map(async (id) => {
      const minerId = BigInt(id!);
      const [miner, listing] = await Promise.all([
        client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "miners", args: [minerId] }),
        client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "listings", args: [minerId] }),
      ]);
      if (!miner[4] || listing[1] === BigInt(0)) return null;
      return {
        minerId: minerId.toString(),
        owner: miner[0],
        tierId: miner[1].toString(),
        buybackBasis: miner[2].toString(),
        acquiredAt: miner[3].toString(),
        seller: listing[0],
        price: listing[1].toString(),
      };
    }));

    return Response.json({ listings: candidates.filter(Boolean) }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch (error) {
    console.error("MineGame marketplace read failed", error);
    return Response.json({ error: "Marketplace RPC read failed" }, { status: 503 });
  }
}
