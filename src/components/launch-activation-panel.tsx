"use client";

import { formatUnits, parseUnits } from "viem";
import { useMineGame } from "@/components/minegame-provider";
import styles from "@/app/secondary.module.css";

const AUTHORIZED_FUNDER = "0x8A0182c099A618583e9EF98716DAcF739b3BD944";
const FUNDING_AMOUNT = parseUnits("100000", 18);
const RATE_BATCH = "/safe/MINEGAME_REWARD_RATE_0_00025_BASE.json";
const UNPAUSE_BATCH = "/safe/MINEGAME_FINAL_UNPAUSE_BASE.json";

function amount(raw?: string) {
  if (!raw) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(formatUnits(BigInt(raw), 18)));
}

export function LaunchActivationPanel() {
  const { account, approve, connect, fundRewards, game, loading, notice, pendingAction } = useMineGame();
  const player = game?.player;
  const isFunder = account?.toLowerCase() === AUTHORIZED_FUNDER.toLowerCase();
  const hasBalance = BigInt(player?.balance || 0) >= FUNDING_AMOUNT;
  const hasAllowance = BigInt(player?.allowance || 0) >= FUNDING_AMOUNT;
  const funded = BigInt(game?.rewardReserve || 0) >= FUNDING_AMOUNT;
  const rateSet = BigInt(game?.rewardRatePerSecond || 0) === BigInt(250_000_000_000_000);

  return (
    <section className={styles.activation} aria-label="Approved MineGame activation controls">
      <div className={styles.activationHeader}>
        <div><p className={styles.eyebrow}>{game?.paused ? "Approved activation" : "Live on Base"}</p><h2>{game?.paused ? "Fund rewards, then set the rate." : "The MineGame economy is live."}</h2></div>
        <strong>{game?.paused ? "Economy remains paused" : "Economy is live"}</strong>
      </div>
      <div className={styles.activationGrid}>
        <article><span>Funding wallet</span><strong>{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Not connected"}</strong><small>{loading ? "Reading Base…" : `${amount(player?.balance)} MINEGAME`}</small></article>
        <article><span>Reward reserve</span><strong>{amount(game?.rewardReserve)} MINEGAME</strong><small>Approved target: 100,000</small></article>
        <article><span>Reward rate</span><strong>{rateSet ? "0.00025 / second" : "Not set"}</strong><small>21.6 MINEGAME/day globally</small></article>
      </div>
      <div className={styles.activationActions}>
        {!account ? <button type="button" onClick={() => void connect()}>Connect funding wallet</button> : !isFunder ? <button type="button" disabled>Connect approved wallet</button> : funded ? <button type="button" disabled>100K funding confirmed</button> : !hasBalance ? <button type="button" disabled>Insufficient MINEGAME</button> : !hasAllowance ? <button type="button" onClick={() => void approve(FUNDING_AMOUNT)} disabled={Boolean(pendingAction)}>1. Approve exactly 100K</button> : <button type="button" onClick={() => void fundRewards(FUNDING_AMOUNT)} disabled={Boolean(pendingAction)}>2. Fund exactly 100K</button>}
        {rateSet ? <button type="button" disabled>Rate confirmed on Base</button> : <a href={RATE_BATCH} download>3. Download Owner Safe rate file</a>}
        {funded && rateSet && game?.paused ? <a href={UNPAUSE_BATCH} download>Final: Download unpause file</a> : null}
      </div>
      <p className={styles.activationNotice} aria-live="polite">{game?.paused ? `${notice} The final file contains one Owner Safe unpause call and no other transaction.` : "Unpause confirmed on Base. Players can now buy miners, purchase rooms, list and trade miners, sell eligible miners back, and claim earned MINEGAME."}</p>
    </section>
  );
}
