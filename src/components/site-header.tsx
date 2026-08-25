import Image from "next/image";
import Link from "next/link";
import coinLogo from "../../public/assets/minegame-logo.png";
import { MINEGAME_BASE_APP_URL } from "@/lib/minegame";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/">
        <Image src={coinLogo} alt="" width={40} height={40} />
        <strong>MINEGAME</strong>
      </Link>
      <nav aria-label="MineGame pages">
        <Link href="/">Room</Link>
        <Link href="/miners">Miners</Link>
        <Link href="/game">How it works</Link>
        <Link href="/launch">Launch</Link>
      </nav>
      <div className={styles.actions}>
        <a className={styles.buyButton} href={MINEGAME_BASE_APP_URL} target="_blank" rel="noreferrer">Buy MINEGAME ↗</a>
        <Link className={styles.roomButton} href="/">Enter room</Link>
      </div>
    </header>
  );
}
