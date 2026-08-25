import type { Metadata } from "next";
import { MinerDemo } from "@/components/miner-demo";
import { SiteHeader } from "@/components/site-header";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Virtual miners" };

export default function MinersPage() {
  return <main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>Miner workshop</p><h1>Every machine should feel earned.</h1><p className={styles.lede}>Ten miner tiers progress from patched-together scrap to impossible high-tech machinery. Parts and upgrades will visibly change each virtual rig.</p></section><section className={styles.content}><div className={styles.panel}><MinerDemo /></div><p className={styles.notice}>This workshop is a visual interaction preview only. Wallet purchases remain disabled until the reviewed economy is deployed and configured.</p></section></main>;
}
