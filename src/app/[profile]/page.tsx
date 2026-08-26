import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfileRoom } from "@/components/public-profile-room";
import { normalizeProfileSlug, resolveProfileSlug } from "@/lib/basenames";

type ProfilePageProps = { params: Promise<{ profile: string }> };

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { profile } = await params;
  const slug = normalizeProfileSlug(profile);
  if (!slug) return { title: "Mining room not found | MineGame" };
  return {
    title: `${slug}'s mining room`,
    description: `See ${slug}'s live miners, hashrate, rooms, and MineGame output.`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { profile } = await params;
  const slug = normalizeProfileSlug(profile);
  if (!slug) notFound();
  const address = await resolveProfileSlug(slug);
  if (!address) notFound();
  return <PublicProfileRoom slug={slug} address={address} />;
}
