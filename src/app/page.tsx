import Image from "next/image";
import Link from "next/link";
import coinLogo from "../../public/assets/minegame-logo.png";
import { MinerDashboard } from "@/components/miner-showroom";
import { MINEGAME_BASE_APP_URL } from "@/lib/minegame";
import styles from "./page.module.css";

const navItems = [
  { href: "/", icon: "▦", label: "Room", active: true },
  { href: "/miners", icon: "⛏", label: "Miners" },
  { href: "/game", icon: "◆", label: "Game" },
  { href: "/launch", icon: "◉", label: "Launch" },
];

export default function Home() {
  return (
    <main className={styles.gameShell}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/" aria-label="MineGame room">
          <Image src={coinLogo} alt="" width={42} height={42} priority />
          <span><strong>MINEGAME</strong><small>Play the minegame</small></span>
        </Link>

        <div className={styles.resources} aria-label="Player resources">
          <div><span>MINEGAME</span><strong>—</strong></div>
          <div><span>Claimable</span><strong>0.00</strong></div>
          <div><span>Room</span><strong>01 / 01</strong></div>
        </div>

        <div className={styles.topActions}>
          <a className={styles.buyCoinButton} href={MINEGAME_BASE_APP_URL} target="_blank" rel="noreferrer">
            <span className={styles.buyCoinLong}>Buy MINEGAME</span>
            <span className={styles.buyCoinShort}>Buy coin</span>
            <small>Base App ↗</small>
          </a>
          <button className={styles.walletButton} type="button" title="Wallet connection activates when the game economy launches" disabled>
            <span className={styles.statusDot} /> Game pending
          </button>
        </div>
      </header>

      <div className={styles.gameBody}>
        <nav className={styles.sideNav} aria-label="Game navigation">
          {navItems.map((item) => (
            <Link
              className={item.active ? styles.navActive : undefined}
              href={item.href}
              key={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </nav>

        <section className={styles.roomStage} aria-label="Your MineGame room">
          <MinerDashboard />
        </section>
      </div>
    </main>
  );
}
