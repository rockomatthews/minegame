import type { Metadata } from "next";
import { ProtocolStatus } from "@/components/protocol-status";
import { SiteHeader } from "@/components/site-header";
import { LaunchActivationPanel } from "@/components/launch-activation-panel";
import { MineGameProvider } from "@/components/minegame-provider";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Launch status" };

const steps = ["Complete — focused remediation retest closed", "Complete — adminless MINEGAME B20 launched through o1", "Complete — economy deployed and verified", "Complete — ten IPFS miner tiers configured through the Owner Safe", "Complete — live wallet UI deployed and production verified", "Complete — 100K reward reserve funded and 0.00025/second rate set", "LIVE — Owner Safe unpause executed on Base"];

export default function LaunchPage() {
  return <MineGameProvider><main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>MineGame live</p><h1>The mine is open.</h1><p className={styles.lede}>MINEGAME is tradeable on Base and the audited game economy is live. Connect a Base wallet in the Room to buy miners, expand capacity, earn from the finite reward reserve, and trade virtual miners with other players.</p></section><div className={styles.status}><ProtocolStatus /></div><section className={styles.content}><LaunchActivationPanel /><ol className={styles.steps}>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol><p className={styles.notice}>Rewards are distributed globally according to active hashrate and the finite reserve. Yield is variable and not guaranteed; miner sellback remains subject to its cooldown and available buyback reserve.</p></section></main></MineGameProvider>;
}
