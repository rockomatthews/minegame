import { cache } from "react";
import { createPublicClient, fallback, getAddress, http, toCoinType, type Address } from "viem";
import { base, mainnet } from "viem/chains";

const profileSlugPattern = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

function ethereumClient() {
  const transports = [
    ...(process.env.ETHEREUM_RPC_URL ? [http(process.env.ETHEREUM_RPC_URL)] : []),
    http("https://ethereum-rpc.publicnode.com"),
  ];
  return createPublicClient({ chain: mainnet, transport: fallback(transports, { rank: false }) });
}

export function normalizeProfileSlug(value: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const slug = decoded.trim().toLowerCase().replace(/\.base\.eth$/, "");
  return profileSlugPattern.test(slug) ? slug : null;
}

export const resolveProfileSlug = cache(async (value: string): Promise<Address | null> => {
  const slug = normalizeProfileSlug(value);
  if (!slug) return null;
  try {
    const address = await ethereumClient().getEnsAddress({
      name: `${slug}.base.eth`,
      coinType: toCoinType(base.id),
    });
    return address ? getAddress(address) : null;
  } catch {
    return null;
  }
});

export const resolveAddressProfile = cache(async (address: Address) => {
  try {
    const client = ethereumClient();
    const name = await client.getEnsName({ address, coinType: toCoinType(base.id) });
    if (!name) return null;
    const slug = normalizeProfileSlug(name);
    if (!slug) return null;
    const resolved = await client.getEnsAddress({ name, coinType: toCoinType(base.id) });
    if (!resolved || getAddress(resolved) !== getAddress(address)) return null;
    return { name, slug };
  } catch {
    return null;
  }
});
