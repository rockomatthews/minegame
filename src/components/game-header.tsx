"use client";

import Image from "next/image";
import Link from "next/link";
import { formatUnits } from "viem";
import coinLogo from "../../public/assets/minegame-logo.png";
import { MINEGAME_BASE_APP_URL } from "@/lib/minegame";
import { useMineGame } from "@/components/minegame-provider";
import { ProfileControl } from "@/components/profile-control";
import styles from "@/app/page.module.css";

const compact = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, notation: "compact" });

function tokenAmount(value?: string) {
  return value ? compact.format(Number(formatUnits(BigInt(value), 18))) : "0";
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function GameHeader() {
  const { account, chainId, connect, connected, disconnect, game, loading, pendingAction } = useMineGame();
  const wrongNetwork = connected && chainId !== 8453;

  return (
    <header className={styles.topBar}>
      <Link className={styles.brand} href="/" aria-label="MineGame room">
        <Image src={coinLogo} alt="" width={42} height={42} priority />
        <span><strong>MINEGAME</strong><small>Play the minegame</small></span>
      </Link>

      <div className={styles.resources} aria-label="Player resources">
        <div><span>MINEGAME</span><strong>{loading ? "…" : tokenAmount(game?.player?.balance)}</strong></div>
        <div><span>Claimable</span><strong>{tokenAmount(game?.player?.pendingRewards)}</strong></div>
        <div><span>Rooms</span><strong>{game?.player?.rooms || "1"} / 20</strong></div>
      </div>

      <div className={styles.topActions}>
        <ProfileControl />
        <a className={styles.buyCoinButton} href={MINEGAME_BASE_APP_URL} target="_blank" rel="noreferrer">
          <span className={styles.buyCoinLong}>Buy MINEGAME</span>
          <span className={styles.buyCoinShort}>Buy coin</span>
          <small>Base App ↗</small>
        </a>
        <button
          className={`${styles.walletButton} ${wrongNetwork ? styles.walletWrong : connected ? styles.walletConnected : ""}`}
          type="button"
          onClick={() => wrongNetwork ? void connect() : connected ? disconnect() : void connect()}
          disabled={Boolean(pendingAction)}
          title={connected ? "Disconnect this page" : "Connect a Base wallet"}
        >
          <span className={styles.statusDot} />
          {pendingAction || (wrongNetwork ? "Switch to Base" : account ? shortAddress(account) : "Connect wallet")}
        </button>
      </div>
    </header>
  );
}
