"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
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
import styles from "./miner-showroom.module.css";

type Miner = {
  tier: number;
  name: string;
  image: StaticImageData;
  price: number;
  hashRate: number;
  gridDraw: number;
  condition: number;
};

const tokenFormat = new Intl.NumberFormat("en-US");

const miners: Miner[] = [
  { tier: 1, name: "Tin Pan", image: tinPan, price: 1_000, hashRate: 1, gridDraw: 0.6, condition: 92 },
  { tier: 2, name: "Rattletrap", image: rattletrap, price: 2_500, hashRate: 1.35, gridDraw: 0.9, condition: 74 },
  { tier: 3, name: "Molebox", image: molebox, price: 7_500, hashRate: 1.8, gridDraw: 1.4, condition: 100 },
  { tier: 4, name: "Boiler Badger", image: boilerBadger, price: 20_000, hashRate: 2.5, gridDraw: 2.2, condition: 100 },
  { tier: 5, name: "Goldjaw", image: goldjaw, price: 50_000, hashRate: 3.5, gridDraw: 3.2, condition: 100 },
  { tier: 6, name: "Deep-Core Bruiser", image: deepCoreBruiser, price: 125_000, hashRate: 5, gridDraw: 5, condition: 100 },
  { tier: 7, name: "Arc Canary", image: arcCanary, price: 300_000, hashRate: 7, gridDraw: 7.5, condition: 100 },
  { tier: 8, name: "Quantum Jack", image: quantumJack, price: 650_000, hashRate: 10, gridDraw: 11, condition: 100 },
  { tier: 9, name: "Nova Burrower", image: novaBurrower, price: 1_250_000, hashRate: 15, gridDraw: 18, condition: 100 },
  { tier: 10, name: "King Midas", image: kingMidas, price: 2_500_000, hashRate: 24, gridDraw: 30, condition: 100 },
];

const installedMiners: Miner[] = [];
const roomCapacity = 5;
const roomPrice = 100_000;
const claimableMinegame = 0;
const projectedDailyMinegame = 0;

function formatPrice(price: number) {
  return `${tokenFormat.format(price)} MINEGAME`;
}

export function MinerDashboard() {
  const [repaired, setRepaired] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [notice, setNotice] = useState("Connect a wallet to load owned miners · preview mode only");

  const totalHashRate = installedMiners.reduce((total, miner) => total + miner.hashRate, 0);
  const totalGridDraw = installedMiners.reduce((total, miner) => total + miner.gridDraw, 0);
  const averageCondition = installedMiners.length === 0
    ? null
    : repaired
      ? 100
      : Math.round(installedMiners.reduce((total, miner) => total + miner.condition, 0) / installedMiners.length);

  function repairRoom() {
    if (repaired) return;
    setRepaired(true);
    setNotice("Daily maintenance complete. The repair action refreshes again tomorrow.");
  }

  function previewRoomPurchase() {
    setNotice(`Additional rooms will cost ${tokenFormat.format(roomPrice)} MINEGAME after the audited room module is deployed.`);
  }

  function previewMinerPurchase(miner: Miner) {
    setNotice(`${miner.name} will cost ${formatPrice(miner.price)} after the audited miner-purchase module is deployed.`);
  }

  return (
    <section className={styles.dashboard} aria-label="MineGame mining dashboard">
      <header className={styles.dashboardHeader}>
        <div>
          <p>MineGame operations</p>
          <h1>Your mining room</h1>
        </div>
        <div className={styles.roomTabs} aria-label="Mining rooms">
          <button className={styles.roomActive} type="button" aria-current="page">
            <span>Room 01</span>
            <strong>Starter room · free</strong>
          </button>
          <button type="button" onClick={previewRoomPurchase}>
            <span>+</span>
            <strong>Buy room · {tokenFormat.format(roomPrice)} MINEGAME</strong>
          </button>
        </div>
        <div className={styles.powerBalance}>
          <span>Claimable MINEGAME</span>
          <strong>{tokenFormat.format(claimableMinegame)}</strong>
        </div>
      </header>

      <div className={styles.stats} aria-label="Current room performance">
        <div><span>Total hashrate</span><strong>{totalHashRate.toFixed(2)}x</strong><small>combined output</small></div>
        <div><span>Grid consumption</span><strong>{totalGridDraw.toFixed(1)} / 5.0 kW</strong><small>{Math.round((totalGridDraw / 5) * 100)}% room load</small></div>
        <div><span>Estimated rewards</span><strong>{tokenFormat.format(projectedDailyMinegame)}</strong><small>MINEGAME per day · variable</small></div>
        <div><span>Machine health</span><strong>{averageCondition === null ? "—" : `${averageCondition}%`}</strong><small>{averageCondition === null ? "no miners installed" : repaired ? "maintenance complete" : "repair available"}</small></div>
        <div><span>Capacity</span><strong>{installedMiners.length} / {roomCapacity}</strong><small>{roomCapacity} open slots</small></div>
      </div>

      <div className={styles.roomView}>
        <div className={styles.roomLabel}>
          <span>Room 01 · active</span>
          <strong>{installedMiners.length} miners online</strong>
        </div>
        <div className={styles.slots}>
          {Array.from({ length: roomCapacity }, (_, index) => {
            const miner = installedMiners[index];
            if (!miner) {
              return (
                <button className={styles.emptySlot} type="button" key={`empty-${index}`} onClick={() => setMarketOpen(true)}>
                  <span>+</span>
                  <strong>Empty miner slot</strong>
                  <small>Add a miner</small>
                </button>
              );
            }

            const condition = repaired ? 100 : miner.condition;
            return (
              <article className={styles.minerCard} key={miner.tier}>
                <div className={styles.minerVisual}>
                  <Image
                    src={miner.image}
                    alt={`${miner.name} virtual mining machine`}
                    sizes="(max-width: 760px) 180px, 18vw"
                    loading="eager"
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                  <span className={styles.online}>Online</span>
                </div>
                <div className={styles.minerInfo}>
                  <div><span>Tier {miner.tier}</span><h2>{miner.name}</h2></div>
                  <dl>
                    <div><dt>Hash</dt><dd>{miner.hashRate.toFixed(2)}x</dd></div>
                    <div><dt>Grid</dt><dd>{miner.gridDraw.toFixed(1)} kW</dd></div>
                    <div><dt>Health</dt><dd>{condition}%</dd></div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <footer className={styles.actionBar}>
        <div className={styles.yieldReadout}>
          <span>Today&apos;s estimated room rewards</span>
          <strong>+{tokenFormat.format(projectedDailyMinegame)} MINEGAME</strong>
        </div>
        <button className={styles.repairButton} type="button" onClick={repairRoom} disabled={repaired || installedMiners.length === 0}>
          {installedMiners.length === 0 ? "No miners to repair" : repaired ? "Maintenance complete · returns tomorrow" : "Run daily repair"}
        </button>
        <button className={styles.marketButton} type="button" onClick={() => setMarketOpen(true)}>Buy a miner</button>
        <p className={styles.notice} aria-live="polite">{notice}</p>
      </footer>

      {marketOpen ? (
        <div className={styles.marketBackdrop} role="presentation" onMouseDown={() => setMarketOpen(false)}>
          <section className={styles.market} role="dialog" aria-modal="true" aria-label="Miner market" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>Miner market</span><h2>Buy with MINEGAME</h2></div><button type="button" onClick={() => setMarketOpen(false)} aria-label="Close miner market">×</button></header>
            <p className={styles.marketIntro}>Every machine is a virtual game item. Purchase controls activate only after the machine module passes audit and deployment.</p>
            <div className={styles.marketGrid}>
              {miners.map((miner) => (
                <article key={miner.tier}>
                  <Image src={miner.image} alt="" sizes="120px" loading="eager" />
                  <div><span>Tier {miner.tier}</span><h3>{miner.name}</h3><strong>{formatPrice(miner.price)}</strong></div>
                  <button type="button" onClick={() => previewMinerPurchase(miner)}>Buy</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
