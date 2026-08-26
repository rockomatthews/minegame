"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import type { GameState, MinerState } from "@/components/minegame-provider";
import styles from "./public-profile-room.module.css";

const miners: Record<number, { name: string; image: string }> = {
  1: { name: "Tin Pan", image: "/assets/miners/tier-01-tin-pan.png" },
  2: { name: "Rattletrap", image: "/assets/miners/tier-02-rattletrap.png" },
  3: { name: "Molebox", image: "/assets/miners/tier-03-molebox.png" },
  4: { name: "Boiler Badger", image: "/assets/miners/tier-04-boiler-badger.png" },
  5: { name: "Goldjaw", image: "/assets/miners/tier-05-goldjaw.png" },
  6: { name: "Deep-Core Bruiser", image: "/assets/miners/tier-06-deep-core-bruiser.png" },
  7: { name: "Arc Canary", image: "/assets/miners/tier-07-arc-canary.png" },
  8: { name: "Quantum Jack", image: "/assets/miners/tier-08-quantum-jack.png" },
  9: { name: "Nova Burrower", image: "/assets/miners/tier-09-nova-burrower.png" },
  10: { name: "King Midas", image: "/assets/miners/tier-10-king-midas.png" },
};

const compact = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, notation: "compact" });

function amount(value?: string | bigint) {
  return compact.format(Number(formatUnits(BigInt(value || 0), 18)));
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PublicProfileRoom({ slug, address }: { slug: string; address: Address }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [room, setRoom] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/game?address=${address}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Live Base data is temporarily unavailable.");
      setGame(await response.json() as GameState);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this room.");
    }
  }, [address]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  const player = game?.player;
  const roomCount = Math.max(1, Number(player?.rooms || 1));
  const roomMiners = useMemo(() => (player?.miners || []).slice(room * 5, room * 5 + 5), [player?.miners, room]);
  const totalHashrate = BigInt(game?.totalActiveHashrate || 0);
  const activeHashrate = BigInt(player?.activeHashrate || 0);
  const rate = BigInt(game?.rewardRatePerSecond || 0);
  const reserve = BigInt(game?.rewardReserve || 0);
  const dailyPool = rate * BigInt(86_400);
  const estimatedDaily = activeHashrate && totalHashrate
    ? ((dailyPool < reserve ? dailyPool : reserve) * activeHashrate) / totalHashrate
    : BigInt(0);

  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `${slug}'s MineGame room`, url });
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <main className={styles.profileShell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/"><span>⛏</span><strong>MINEGAME</strong></Link>
        <div className={styles.identity}><small>Public mining room</small><h1>{slug}</h1><span>{slug}.base.eth · {shortAddress(address)}</span></div>
        <div className={styles.headerActions}><button type="button" onClick={() => void share()}>{copied ? "Copied!" : "Share room"}</button><Link href="/">Enter your room</Link></div>
      </header>

      <section className={styles.dashboard} aria-label={`${slug}'s mining room`}>
        <div className={styles.stats}>
          <div><span>Miners</span><strong>{player?.minerCount ?? "—"}</strong></div>
          <div><span>Hashrate</span><strong>{amount(player?.activeHashrate)} H/s</strong></div>
          <div><span>Grid draw</span><strong>{amount(player?.gridDraw)} / {amount(BigInt(game?.gridCapacityPerRoom || 0) * BigInt(roomCount))}</strong></div>
          <div><span>Est. daily</span><strong>{amount(estimatedDaily)} MINEGAME</strong></div>
          <div><span>Claimable</span><strong>{amount(player?.pendingRewards)}</strong></div>
        </div>

        <div className={styles.roomNav}>
          <div><small>Room network</small><strong>Room {room + 1} of {roomCount}</strong></div>
          <div>{Array.from({ length: roomCount }, (_, index) => <button className={room === index ? styles.activeRoom : undefined} type="button" onClick={() => setRoom(index)} key={index}>{index + 1}</button>)}</div>
        </div>

        <div className={styles.minerGrid}>
          {Array.from({ length: 5 }, (_, index) => {
            const owned = roomMiners[index] as MinerState | undefined;
            const catalog = owned ? miners[Number(owned.tierId)] : null;
            return (
              <article className={`${styles.minerBay} ${owned ? styles.occupied : ""}`} key={owned ? `miner-${owned.minerId}` : `empty-${room}-${index}`}>
                {owned && catalog ? <><Image src={catalog.image} alt={catalog.name} width={330} height={330} priority={index < 2} /><div><small>Tier {owned.tierId} · Miner #{owned.minerId}</small><strong>{catalog.name}</strong><span>{owned.listed ? "Listed for sale" : "Mining live"}</span></div></> : <div className={styles.emptyBay}><span>+</span><strong>Empty bay</strong><small>Awaiting miner</small></div>}
              </article>
            );
          })}
        </div>

        <footer className={styles.liveFooter}><span><i /> Live on Base</span><strong>{error || "Read-only public profile · Updates every 15 seconds"}</strong></footer>
      </section>
    </main>
  );
}
