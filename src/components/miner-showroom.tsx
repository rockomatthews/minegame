"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import tinPan from "../../public/assets/miners/tier-01-tin-pan.png";
import rattletrap from "../../public/assets/miners/tier-02-rattletrap.png";
import molebox from "../../public/assets/miners/tier-03-molebox.png";
import boilerBadger from "../../public/assets/miners/tier-04-boiler-badger.png";
import goldjaw from "../../public/assets/miners/tier-05-goldjaw.png";
import deepCoreBruiser from "../../public/assets/miners/tier-06-deep-core-bruiser.png";
import arcCanary from "../../public/assets/miners/tier-07-arc-canary.png";
import quantumJack from "../../public/assets/miners/tier-08-quantum-jack.png";
import novaBurrower from "../../public/assets/miners/tier-09-nova-burrower.png";
import kingMidas from "../../public/assets/miners/tier-10-king-midas.png";
import { MINEGAME_BASE_APP_URL } from "@/lib/minegame";
import { useMineGame, type MinerState, type TierState } from "@/components/minegame-provider";
import styles from "./miner-showroom.module.css";

type MinerCatalogEntry = { name: string; image: StaticImageData };

const minerCatalog: Record<number, MinerCatalogEntry> = {
  1: { name: "Tin Pan", image: tinPan },
  2: { name: "Rattletrap", image: rattletrap },
  3: { name: "Molebox", image: molebox },
  4: { name: "Boiler Badger", image: boilerBadger },
  5: { name: "Goldjaw", image: goldjaw },
  6: { name: "Deep-Core Bruiser", image: deepCoreBruiser },
  7: { name: "Arc Canary", image: arcCanary },
  8: { name: "Quantum Jack", image: quantumJack },
  9: { name: "Nova Burrower", image: novaBurrower },
  10: { name: "King Midas", image: kingMidas },
};

const tokenFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compactFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, notation: "compact" });
const roomCapacity = 5;
const sellbackCooldownSeconds = 7 * 24 * 60 * 60;

function tokenAmount(raw: string | bigint | undefined, compact = false) {
  if (raw === undefined) return "0";
  const value = Number(formatUnits(BigInt(raw), 18));
  return (compact ? compactFormat : tokenFormat).format(value);
}

function tierNumber(tierId: string) {
  return Number(tierId);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function MinerDashboard() {
  const {
    account, approve, buyListedMiner, buyMiner, buyRoom, cancelListing, claim, connect, game, listings,
    listMiner, loadMarketplace, loading, marketLoading, notice, pendingAction, sellMinerBack,
  } = useMineGame();
  const [activeRoom, setActiveRoom] = useState(0);
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketTab, setMarketTab] = useState<"primary" | "resale">("primary");
  const [listingMiner, setListingMiner] = useState<MinerState | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [repaired, setRepaired] = useState(false);
  const [localNotice, setLocalNotice] = useState("");

  const player = game?.player;
  const rooms = Number(player?.rooms || 1);
  const visibleRoom = Math.min(activeRoom, Math.max(0, rooms - 1));
  const ownedMiners = player?.miners || [];
  const allowance = BigInt(player?.allowance || 0);
  const balance = BigInt(player?.balance || 0);
  const paused = game?.paused ?? true;
  const busy = Boolean(pendingAction);
  const tiersById = useMemo(() => new Map((game?.tiers || []).map((tier) => [tier.tierId, tier])), [game?.tiers]);
  const roomMiners = ownedMiners.slice(visibleRoom * roomCapacity, (visibleRoom + 1) * roomCapacity);
  const activeHashrate = BigInt(player?.activeHashrate || 0);
  const totalHashrate = BigInt(game?.totalActiveHashrate || 0);
  const rate = BigInt(game?.rewardRatePerSecond || 0);
  const reserve = BigInt(game?.rewardReserve || 0);
  const oneDayRewards = rate * BigInt(86_400);
  const dailyShare = !paused && activeHashrate > BigInt(0) && totalHashrate > BigInt(0) && rate > BigInt(0)
    ? ((oneDayRewards < reserve ? oneDayRewards : reserve) * activeHashrate) / totalHashrate
    : BigInt(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!account) {
        setRepaired(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      setRepaired(window.localStorage.getItem(`minegame-maintenance:${account}`) === today);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [account]);

  function openMarket(tab: "primary" | "resale" = "primary") {
    setMarketTab(tab);
    setMarketOpen(true);
    if (tab === "resale") void loadMarketplace();
  }

  function runMaintenance() {
    if (!account || ownedMiners.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(`minegame-maintenance:${account}`, today);
    setRepaired(true);
    setLocalNotice("Daily visual maintenance complete. Maintenance does not change onchain rewards.");
  }

  async function buyTier(tier: TierState) {
    if (!account) return connect();
    const price = BigInt(tier.price);
    if (allowance < price) return approve(price);
    return buyMiner(BigInt(tier.tierId), price);
  }

  async function purchaseRoom() {
    if (!game) return;
    if (!account) return connect();
    const price = BigInt(game.roomPrice);
    if (allowance < price) return approve(price);
    return buyRoom(price);
  }

  async function buyResale(minerId: string, priceRaw: string) {
    if (!account) return connect();
    const price = BigInt(priceRaw);
    if (allowance < price) return approve(price);
    return buyListedMiner(BigInt(minerId), price);
  }

  async function submitListing() {
    if (!listingMiner) return;
    try {
      const price = parseUnits(listingPrice.replaceAll(",", ""), 18);
      if (price <= BigInt(0)) throw new Error();
      setListingMiner(null);
      await listMiner(BigInt(listingMiner.minerId), price);
    } catch {
      setLocalNotice("Enter a valid MINEGAME listing price.");
    }
  }

  function actionLabel(price: bigint, defaultLabel: string) {
    if (!account) return "Connect wallet";
    if (paused) return "Game paused";
    if (balance < price) return "Need MINEGAME";
    if (allowance < price) return "Approve exact price";
    return defaultLabel;
  }

  return (
    <section className={styles.dashboard} aria-label="MineGame mining dashboard">
      <header className={styles.dashboardHeader}>
        <div><p>MineGame operations</p><h1>Your mining room</h1></div>
        <div className={styles.roomTabs} aria-label="Mining rooms">
          {Array.from({ length: rooms }, (_, index) => (
            <button className={visibleRoom === index ? styles.roomActive : undefined} type="button" onClick={() => setActiveRoom(index)} key={index}>
              <span>Room {String(index + 1).padStart(2, "0")}</span><strong>{index === 0 ? "Starter room · free" : "Expansion room"}</strong>
            </button>
          ))}
          <button type="button" onClick={() => void purchaseRoom()} disabled={paused || busy || rooms >= 20}>
            <span>+</span><strong>{rooms >= 20 ? "Maximum rooms" : `Buy room · ${tokenAmount(game?.roomPrice, true)} MINEGAME`}</strong>
          </button>
        </div>
        <div className={styles.powerBalance}><span>Claimable MINEGAME</span><strong>{tokenAmount(player?.pendingRewards, true)}</strong></div>
      </header>

      <div className={styles.stats} aria-label="Current room performance">
        <div><span>Total hashrate</span><strong>{(Number(player?.activeHashrate || 0) / 100).toFixed(2)}x</strong><small>active machines</small></div>
        <div><span>Grid consumption</span><strong>{(Number(player?.gridDraw || 0) / 10).toFixed(1)} / {(Number(game?.gridCapacityPerRoom || 0) * rooms / 10).toFixed(1)} kW</strong><small>all owned rooms</small></div>
        <div><span>Estimated rewards</span><strong>{tokenAmount(dailyShare)}</strong><small>MINEGAME/day · variable</small></div>
        <div><span>Reward reserve</span><strong>{tokenAmount(game?.rewardReserve, true)}</strong><small>{rate === BigInt(0) ? "emission rate is zero" : "finite shared pool"}</small></div>
        <div><span>Capacity</span><strong>{player?.minerCount || 0} / {rooms * roomCapacity}</strong><small>{rooms * roomCapacity - Number(player?.minerCount || 0)} open slots</small></div>
      </div>

      <div className={styles.roomView}>
        <div className={styles.roomLabel}><span>Room {String(visibleRoom + 1).padStart(2, "0")} · {paused ? "paused" : "active"}</span><strong>{roomMiners.length} miners installed</strong></div>
        <div className={styles.slots}>
          {Array.from({ length: roomCapacity }, (_, index) => {
            const miner = roomMiners[index];
            if (!miner) return <button className={styles.emptySlot} type="button" key={`empty-${index}`} onClick={() => openMarket("primary")}><span>+</span><strong>Empty miner slot</strong><small>Add a miner</small></button>;
            const tier = tiersById.get(miner.tierId);
            const catalog = minerCatalog[tierNumber(miner.tierId)];
            const payout = tier ? BigInt(miner.buybackBasis) * BigInt(tier.buybackBps) / BigInt(10_000) : BigInt(0);
            const cooldownReady = Number(game?.timestamp || 0) >= Number(miner.acquiredAt) + sellbackCooldownSeconds;
            const reserveEnough = BigInt(game?.buybackReserve || 0) >= payout;
            return (
              <article className={styles.minerCard} key={miner.minerId}>
                <div className={styles.minerVisual}>
                  <Image src={catalog.image} alt={`${catalog.name} virtual mining machine`} sizes="(max-width: 760px) 180px, 18vw" loading="eager" fetchPriority={index === 0 ? "high" : "auto"} />
                  <span className={miner.listed ? styles.listed : styles.online}>{miner.listed ? "Listed" : paused ? "Paused" : "Online"}</span>
                </div>
                <div className={styles.minerInfo}>
                  <div><span>Tier {miner.tierId} · #{miner.minerId}</span><h2>{catalog.name}</h2></div>
                  <dl>
                    <div><dt>Hash</dt><dd>{(Number(tier?.baseHashrate || 0) / 100).toFixed(2)}x</dd></div>
                    <div><dt>Grid</dt><dd>{(Number(tier?.gridDraw || 0) / 10).toFixed(1)} kW</dd></div>
                    <div><dt>Health</dt><dd>{repaired ? "100%" : "Ready"}</dd></div>
                  </dl>
                  <div className={styles.minerActions}>
                    {miner.listed ? <button type="button" onClick={() => void cancelListing(BigInt(miner.minerId))} disabled={busy}>Cancel listing</button> : <button type="button" onClick={() => { setListingMiner(miner); setListingPrice(tier ? tokenAmount(tier.price) : ""); }} disabled={paused || busy}>List</button>}
                    <button type="button" onClick={() => void sellMinerBack(BigInt(miner.minerId), payout)} disabled={!cooldownReady || !reserveEnough || miner.listed || busy} title={!cooldownReady ? "Seven-day cooldown active" : !reserveEnough ? "Buyback reserve is too low" : `Sell for ${tokenAmount(payout)} MINEGAME`}>Sell back</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <footer className={styles.actionBar}>
        <div className={styles.yieldReadout}><span>Live economy</span><strong>{loading ? "Refreshing Base…" : paused ? "Configured · awaiting activation" : `+${tokenAmount(dailyShare)} MINEGAME/day estimated`}</strong></div>
        <button className={styles.claimButton} type="button" onClick={() => void claim()} disabled={!account || BigInt(player?.pendingRewards || 0) === BigInt(0) || busy}>Claim</button>
        <button className={styles.repairButton} type="button" onClick={runMaintenance} disabled={repaired || ownedMiners.length === 0}>
          <span className={styles.repairIcon} aria-hidden="true">⚡</span>
          <span className={styles.repairCopy}>
            <strong>{ownedMiners.length === 0 ? "Install a miner first" : repaired ? "Rig tuned for today" : "Tune the rig"}</strong>
            <small>{ownedMiners.length === 0 ? "Maintenance locked" : repaired ? "Returns tomorrow" : "Daily maintenance ready"}</small>
          </span>
        </button>
        <button className={styles.marketButton} type="button" onClick={() => openMarket("primary")}>Miner market</button>
        <p className={styles.notice} aria-live="polite">{localNotice || notice}</p>
      </footer>

      {marketOpen ? (
        <div className={styles.marketBackdrop} role="presentation" onMouseDown={() => setMarketOpen(false)}>
          <section className={styles.market} role="dialog" aria-modal="true" aria-label="Miner market" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>Onchain miner market</span><h2>Buy with MINEGAME</h2></div><button type="button" onClick={() => setMarketOpen(false)} aria-label="Close miner market">×</button></header>
            <div className={styles.marketTabs}>
              <button className={marketTab === "primary" ? styles.marketTabActive : undefined} type="button" onClick={() => setMarketTab("primary")}>New miners</button>
              <button className={marketTab === "resale" ? styles.marketTabActive : undefined} type="button" onClick={() => { setMarketTab("resale"); void loadMarketplace(); }}>Player listings</button>
            </div>
            <p className={styles.marketIntro}>{paused ? "The economy is configured but paused. Browse prices now; purchases activate only after funded launch." : "Prices and availability are read directly from Base. Exact-price approvals prevent stale-price overpayment."}</p>
            <div className={styles.marketGrid}>
              {marketTab === "primary" ? (game?.tiers || []).map((tier) => {
                const catalog = minerCatalog[tierNumber(tier.tierId)];
                const price = BigInt(tier.price);
                const canSubmit = Boolean(account) && !paused && tier.active && balance >= price && !busy;
                return (
                  <article key={tier.tierId}>
                    <Image src={catalog.image} alt="" sizes="120px" loading="eager" />
                    <div><span>Tier {tier.tierId} · {(Number(tier.baseHashrate) / 100).toFixed(2)}x</span><h3>{catalog.name}</h3><strong>{tokenAmount(price)} MINEGAME</strong></div>
                    {balance < price && account ? <a href={MINEGAME_BASE_APP_URL} target="_blank" rel="noreferrer">Buy coin</a> : <button type="button" onClick={() => void buyTier(tier)} disabled={Boolean(account) && !canSubmit}>{actionLabel(price, "Buy")}</button>}
                  </article>
                );
              }) : marketLoading ? <p className={styles.marketEmpty}>Loading onchain listings…</p> : listings.length === 0 ? <p className={styles.marketEmpty}>No miners are currently listed by players.</p> : listings.map((listing) => {
                const catalog = minerCatalog[tierNumber(listing.tierId)];
                const price = BigInt(listing.price);
                const ownListing = account?.toLowerCase() === listing.seller.toLowerCase();
                return (
                  <article key={listing.minerId}>
                    <Image src={catalog.image} alt="" sizes="120px" loading="eager" />
                    <div><span>Tier {listing.tierId} · #{listing.minerId} · {shortAddress(listing.seller)}</span><h3>{catalog.name}</h3><strong>{tokenAmount(price)} MINEGAME</strong></div>
                    {ownListing ? <button type="button" onClick={() => void cancelListing(BigInt(listing.minerId))} disabled={busy}>Cancel</button> : balance < price && account ? <a href={MINEGAME_BASE_APP_URL} target="_blank" rel="noreferrer">Buy coin</a> : <button type="button" onClick={() => void buyResale(listing.minerId, listing.price)} disabled={paused || busy}>{actionLabel(price, "Buy")}</button>}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {listingMiner ? (
        <div className={styles.marketBackdrop} role="presentation" onMouseDown={() => setListingMiner(null)}>
          <section className={styles.listingDialog} role="dialog" aria-modal="true" aria-label="List miner" onMouseDown={(event) => event.stopPropagation()}>
            <span>List miner #{listingMiner.minerId}</span><h2>Choose a MINEGAME price</h2>
            <input value={listingPrice} onChange={(event) => setListingPrice(event.target.value)} inputMode="decimal" aria-label="Listing price in MINEGAME" />
            <p>A 5% marketplace fee funds game rewards. A discounted resale can reduce this miner&apos;s protocol buyback basis.</p>
            <div><button type="button" onClick={() => setListingMiner(null)}>Cancel</button><button type="button" onClick={() => void submitListing()}>Confirm listing</button></div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
