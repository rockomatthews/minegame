import type { Metadata } from "next";
import { ProtocolStatus } from "@/components/protocol-status";
import { SiteHeader } from "@/components/site-header";
import { LaunchActivationPanel } from "@/components/launch-activation-panel";
import { MineGameProvider } from "@/components/minegame-provider";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Launch status" };

const steps = ["Complete — focused remediation retest closed", "Complete — adminless MINEGAME B20 launched through o1", "Complete — economy deployed paused and verified", "Complete — ten IPFS miner tiers configured through the Owner Safe", "Complete — live wallet UI deployed and production verified", "Complete — 100K reward reserve funded and 0.00025/second rate set", "Final separate gate — authorize and execute unpause"];

export default function LaunchPage() {
  return <MineGameProvider><main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>Launch control</p><h1>The coin and miner catalog are live.</h1><p className={styles.lede}>MINEGAME is tradeable on Base. The audited economy and ten miner tiers are deployed; funding, reward-rate activation, and unpause remain separate final controls.</p></section><div className={styles.status}><ProtocolStatus /></div><section className={styles.content}><LaunchActivationPanel /><ol className={styles.steps}>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol><p className={styles.notice}>Funding and the reward rate are approved as separate transactions. Unpause is not included and remains the final explicit authorization after live verification.</p></section></main></MineGameProvider>;
}
