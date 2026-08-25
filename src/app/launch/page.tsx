import type { Metadata } from "next";
import { ProtocolStatus } from "@/components/protocol-status";
import { SiteHeader } from "@/components/site-header";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Launch status" };

const steps = ["Complete — focused remediation retest closed", "Complete — adminless MINEGAME B20 launched through o1", "Complete — reviewed Base preflight digest pinned", "Next — simulate and deploy the economy paused", "Configure and fund through separate Safe approvals", "Connect the verified website, then separately authorize unpause"];

export default function LaunchPage() {
  return <main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>Launch control</p><h1>The coin is live. The game comes next.</h1><p className={styles.lede}>MINEGAME is tradeable on Base App. The audited game economy remains a separate, paused-first deployment.</p></section><div className={styles.status}><ProtocolStatus /></div><section className={styles.content}><ol className={styles.steps}>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol><p className={styles.notice}>The MINEGAME token is live. The economy has not been deployed, configured, funded, approved, or unpaused.</p></section></main>;
}
