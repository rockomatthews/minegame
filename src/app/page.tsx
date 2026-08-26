import Link from "next/link";
import { GameHeader } from "@/components/game-header";
import { MinerDashboard } from "@/components/miner-showroom";
import { MineGameProvider } from "@/components/minegame-provider";
import styles from "./page.module.css";

const navItems = [
  { href: "/", icon: "▦", label: "Room", active: true },
  { href: "/miners", icon: "⛏", label: "Miners" },
  { href: "/game", icon: "◆", label: "Game" },
  { href: "/launch", icon: "◉", label: "Launch" },
];

export default function Home() {
  return (
    <MineGameProvider>
      <main className={styles.gameShell}>
        <GameHeader />
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
    </MineGameProvider>
  );
}
