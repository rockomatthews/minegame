"use client";

import { useEffect, useState } from "react";
import styles from "./protocol-status.module.css";

type Status = {
  phase: "prelaunch" | "token-live" | "configured" | "live" | "degraded";
  network: string;
  token: string | null;
  economy: string | null;
  rewardReserve?: string;
  buybackReserve?: string;
  runwaySeconds?: string;
};
const fallback: Status = { phase: "prelaunch", network: "Base Mainnet", token: null, economy: null };

function compactTokenAmount(value?: string) {
  if (!value) return "Not funded";
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(Number(value))} MINEGAME`;
}

function formatRunway(value?: string) {
  if (!value) return "Not available";
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds > 31_536_000_000) return "Rate stopped";
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} hours`;
  return `${Math.floor(seconds / 86_400)} days`;
}

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
  const label = status.phase === "live" ? "Economy live" : status.phase === "configured" ? "Configured · paused" : status.phase === "token-live" ? "Token live · game pending" : status.phase === "degraded" ? "Status degraded" : "Pre-launch";
  const short = (address: string | null) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not deployed";
  return (
    <div className={styles.inner}>
      <div><span className={styles.dot} data-phase={status.phase} /><strong>{label}</strong></div>
      <div><span>Network</span><strong>{status.network}</strong></div>
      <div><span>Token</span><strong>{short(status.token)}</strong></div>
      <div><span>Economy</span><strong>{short(status.economy)}</strong></div>
      <div><span>Reward reserve</span><strong>{compactTokenAmount(status.rewardReserve)}</strong></div>
      <div><span>Buyback reserve</span><strong>{compactTokenAmount(status.buybackReserve)}</strong></div>
      <div><span>Reward runway</span><strong>{formatRunway(status.runwaySeconds)}</strong></div>
    </div>
  );
}
