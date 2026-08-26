import type { Metadata } from "next";
import { MinerDemo } from "@/components/miner-demo";
import { SiteHeader } from "@/components/site-header";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Virtual miners" };

export default function MinersPage() {
  return <main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>Miner workshop</p><h1>Every machine should feel earned.</h1><p className={styles.lede}>Ten configured miner tiers progress from patched-together scrap to impossible high-tech machinery. Prices, hashrate, grid draw, and metadata are published on Base.</p></section><section className={styles.content}><div className={styles.panel}><MinerDemo /></div><p className={styles.notice}>Open the Room to connect your wallet and use the live onchain market. Purchases remain disabled while the economy is paused.</p></section></main>;
}
