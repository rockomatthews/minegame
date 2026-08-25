import type { Metadata } from "next";
import { ProtocolStatus } from "@/components/protocol-status";
import { SiteHeader } from "@/components/site-header";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "Launch status" };

const steps = ["Close the focused remediation retest", "Launch the reviewed adminless MINEGAME B20 through o1", "Pin the exact Base preflight digest", "Simulate and deploy the economy paused", "Configure and fund through separate Safe approvals", "Connect the verified website, then separately authorize unpause"];

export default function LaunchPage() {
  return <main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>Launch control</p><h1>Built first. Audited second. Live last.</h1><p className={styles.lede}>Every launch action remains a separate gate. This page reports status; it does not authorize a wallet signature.</p></section><div className={styles.status}><ProtocolStatus /></div><section className={styles.content}><ol className={styles.steps}>{steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol><p className={styles.notice}>No token launch, deployment, configuration, reserve funding, approval, or unpause has been performed by this site update.</p></section></main>;
}
