import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import styles from "../secondary.module.css";

export const metadata: Metadata = { title: "How the game works" };

const mechanics = [
  ["01", "Buy a miner", "Every miner costs MINEGAME. The first room is free and holds five machines; additional rooms cost MINEGAME."],
  ["02", "Mine MINEGAME", "Active miners share a finite, funded MINEGAME reserve according to their effective hashrate. The game never mints rewards."],
  ["03", "Build the rig", "Virtual parts, repairs, and upgrades improve performance metrics and appearance. Hashrate and power draw are metrics—not currencies."],
  ["04", "Choose your exit", "List a miner for another player or use the reserve-backed protocol sellback after its cooldown. Profit is never guaranteed."],
];

export default function GamePage() {
  return <main className={styles.page}><SiteHeader /><section className={styles.hero}><p className={styles.eyebrow}>The MineGame loop</p><h1>Build the mine. Earn the coin.</h1><p className={styles.lede}>MINEGAME is the only economic asset. Machines create competitive hashrate; funded reserves create rewards.</p></section><section className={styles.content}><div className={styles.grid}>{mechanics.map(([number, title, body]) => <article className={styles.card} key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}</div><p className={styles.notice}>Fixed supply: 1,000,000,000 MINEGAME. Rewards are finite, variable, reserve-funded, and never guaranteed.</p></section></main>;
}
