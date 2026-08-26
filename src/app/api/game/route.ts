import { createPublicClient, fallback, getAddress, http, isAddress, zeroAddress } from "viem";
import { base } from "viem/chains";
import {
  MINEGAME_ECONOMY_ADDRESS,
  MINEGAME_TOKEN_ADDRESS,
  minegameEconomyAbi,
  minegameTokenAbi,
} from "@/lib/minegame";

export const dynamic = "force-dynamic";

function rpcClient() {
  const transports = [
    ...(process.env.BASE_RPC_URL ? [http(process.env.BASE_RPC_URL)] : []),
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
  ];
  return createPublicClient({ chain: base, transport: fallback(transports, { rank: false }) });
}

export async function GET(request: Request) {
  const requestedAddress = new URL(request.url).searchParams.get("address");
  if (requestedAddress && !isAddress(requestedAddress)) {
    return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  const player = requestedAddress ? getAddress(requestedAddress) : zeroAddress;

  try {
    const client = rpcClient();
    const tierIds = Array.from({ length: 10 }, (_, index) => BigInt(index + 1));
    const [
      paused,
      roomPrice,
      rewardRatePerSecond,
      rewardReserve,
      buybackReserve,
      rewardLiability,
      totalActiveHashrate,
      gridCapacityPerRoom,
      solvent,
      balance,
      allowance,
      rooms,
      minerCount,
      activeHashrate,
      gridDraw,
      pendingRewards,
      ownedIds,
      tierResults,
    ] = await Promise.all([
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "paused" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "roomPrice" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "rewardRatePerSecond" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "rewardReserve" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "buybackReserve" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "rewardLiability" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "totalActiveHashrate" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "gridCapacityPerRoom" }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "isSolvent" }),
      client.readContract({ address: MINEGAME_TOKEN_ADDRESS, abi: minegameTokenAbi, functionName: "balanceOf", args: [player] }),
      client.readContract({ address: MINEGAME_TOKEN_ADDRESS, abi: minegameTokenAbi, functionName: "allowance", args: [player, MINEGAME_ECONOMY_ADDRESS] }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "roomsOf", args: [player] }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "playerMinerCount", args: [player] }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "playerActiveHashrate", args: [player] }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "playerGridDraw", args: [player] }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "pendingRewards", args: [player] }),
      client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "ownedMinerIds", args: [player] }),
      Promise.all(tierIds.map((tierId) => client.readContract({
        address: MINEGAME_ECONOMY_ADDRESS,
        abi: minegameEconomyAbi,
        functionName: "tiers",
        args: [tierId],
      }))),
    ]);

    const minerResults = await Promise.all(ownedIds.map(async (minerId) => {
      const [miner, listing] = await Promise.all([
        client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "miners", args: [minerId] }),
        client.readContract({ address: MINEGAME_ECONOMY_ADDRESS, abi: minegameEconomyAbi, functionName: "listings", args: [minerId] }),
      ]);
      return {
        minerId: minerId.toString(),
        owner: miner[0],
        tierId: miner[1].toString(),
        buybackBasis: miner[2].toString(),
        acquiredAt: miner[3].toString(),
        listed: miner[4],
        listingPrice: listing[1].toString(),
      };
    }));

    return Response.json({
      timestamp: Math.floor(Date.now() / 1000),
      chainId: base.id,
      token: MINEGAME_TOKEN_ADDRESS,
      economy: MINEGAME_ECONOMY_ADDRESS,
      paused,
      solvent,
      roomPrice: roomPrice.toString(),
      rewardRatePerSecond: rewardRatePerSecond.toString(),
      rewardReserve: rewardReserve.toString(),
      buybackReserve: buybackReserve.toString(),
      rewardLiability: rewardLiability.toString(),
      totalActiveHashrate: totalActiveHashrate.toString(),
      gridCapacityPerRoom: gridCapacityPerRoom.toString(),
      tiers: tierResults.map((tier, index) => ({
        tierId: String(index + 1),
        price: tier[0].toString(),
        baseHashrate: tier[1].toString(),
        gridDraw: tier[2].toString(),
        buybackBps: tier[3],
        active: tier[4],
        metadataURI: tier[5],
      })),
      player: requestedAddress ? {
        address: player,
        balance: balance.toString(),
        allowance: allowance.toString(),
        rooms: rooms.toString(),
        minerCount: minerCount.toString(),
        activeHashrate: activeHashrate.toString(),
        gridDraw: gridDraw.toString(),
        pendingRewards: pendingRewards.toString(),
        miners: minerResults,
      } : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("MineGame player state read failed", error);
    return Response.json({ error: "Base RPC read failed" }, { status: 503 });
  }
}
