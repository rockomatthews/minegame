import { getAddress, isAddress } from "viem";
import { normalizeProfileSlug, resolveAddressProfile, resolveProfileSlug } from "@/lib/basenames";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const address = query.get("address");
  const slug = query.get("slug");

  if (address) {
    if (!isAddress(address)) return Response.json({ error: "Invalid wallet address" }, { status: 400 });
    const profile = await resolveAddressProfile(getAddress(address));
    return Response.json(profile ? { ...profile, address: getAddress(address) } : { address: getAddress(address), name: null, slug: null }, { headers });
  }

  if (slug) {
    const normalized = normalizeProfileSlug(slug);
    if (!normalized) return Response.json({ error: "Invalid Basename" }, { status: 400 });
    const resolved = await resolveProfileSlug(normalized);
    if (!resolved) return Response.json({ error: "Basename not found" }, { status: 404 });
    return Response.json({ address: resolved, slug: normalized, name: `${normalized}.base.eth` }, { headers });
  }

  return Response.json({ error: "Provide an address or profile slug" }, { status: 400 });
}
