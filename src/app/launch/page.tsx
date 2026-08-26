import type { Metadata } from "next";
import { ProtocolStatus } from "@/components/protocol-status";
import { SiteHeader } from "@/components/site-header";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Launch status" };

const steps = ["Complete — focused remediation retest closed", "Complete — adminless MINEGAME B20 launched through o1", "Complete — economy deployed paused and verified", "Complete — ten IPFS miner tiers configured through the Owner Safe", "Current — connect the live wallet UI and seed the finite reward reserve", "Final gate — set the reviewed reward rate, verify, then separately authorize unpause"];

export default function LaunchPage() {
  return <main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>Launch control</p><h1>The coin and miner catalog are live.</h1><p className={styles.lede}>MINEGAME is tradeable on Base. The audited economy and ten miner tiers are deployed; funding, reward-rate activation, and unpause remain separate final controls.</p></section><div className={styles.status}><ProtocolStatus /></div><section className={styles.content}><ol className={styles.steps}>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol><p className={styles.notice}>The economy remains paused until its finite rewards are funded, the live wallet interface passes production verification, and the Owner Safe separately approves activation.</p></section></main>;
}
