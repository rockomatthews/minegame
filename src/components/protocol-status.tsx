"use client";

import { useEffect, useState } from "react";
import styles from "./protocol-status.module.css";

type Status = { phase: "prelaunch" | "live" | "degraded"; network: string; token: string | null; engine: string | null; totalSupply?: string };
const fallback: Status = { phase: "prelaunch", network: "Base Mainnet", token: null, engine: null };

export function ProtocolStatus() {
  const [status, setStatus] = useState<Status>(fallback);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/status", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : fallback)
      .then((nextStatus: Status) => setStatus(nextStatus))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const label = status.phase === "live" ? "Protocol live" : status.phase === "degraded" ? "Status degraded" : "Pre-launch";
  const short = (address: string | null) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not deployed";
  return (
    <div className={styles.inner}>
      <div><span className={styles.dot} data-phase={status.phase} /><strong>{label}</strong></div>
      <div><span>Network</span><strong>{status.network}</strong></div>
      <div><span>Token</span><strong>{short(status.token)}</strong></div>
      <div><span>Engine</span><strong>{short(status.engine)}</strong></div>
      <div><span>Supply</span><strong>{status.totalSupply ?? "1B planned"}</strong></div>
    </div>
  );
}
