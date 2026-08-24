import Image from "next/image";
import coinLogo from "../../public/assets/minegame-logo.png";
import { MinerDemo } from "@/components/miner-demo";
import { MinerDashboard } from "@/components/miner-showroom";
import { ProtocolStatus } from "@/components/protocol-status";
import styles from "./page.module.css";

const mechanics = [
  ["01", "Buy a miner", "Every miner, including Tin Pan, costs MINEGAME. Your first room is free and holds five miners; extra rooms cost MINEGAME."],
  ["02", "Mine MINEGAME", "Active miners share a finite, funded MINEGAME reward reserve according to their effective hashrate. No new coin is minted."],
  ["03", "Build the rig", "Virtual parts, repairs, and upgrades improve visible performance metrics. They never create a second currency."],
  ["04", "Choose your exit", "List a miner for another player or use the reserve-backed protocol sellback after its cooldown. Payouts are bounded, not guaranteed profit."],
];

const launchSteps = [
  "Game contracts built and locally tested",
  "Independent security review",
  "Final allocations and vesting approved",
  "MINEGAME launched through o1 on Base",
  "Website switched from preview to live game",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "MineGame",
  url: "https://minegame.fun",
  description: "A Base-native virtual miner economy where paid rigs compete for finite, funded MINEGAME rewards.",
  image: "https://minegame.fun/assets/minegame-logo.png",
  gamePlatform: "Web",
  applicationCategory: "BlockchainGame",
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="MineGame home">
          <Image src={coinLogo} alt="" width={44} height={44} preload />
          <span>MINEGAME</span>
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#mine">The mine</a>
          <a href="#launch">Launch</a>
        </nav>
        <a className={styles.smallCta} href="#mine">Enter the mine</a>
      </header>

      <section className={styles.hero} id="top">
        <MinerDashboard />
      </section>

      <section className={styles.statusStrip} aria-label="Protocol status"><ProtocolStatus /></section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>The core loop</p>
          <h2>Build the mine. Earn the coin.</h2>
          <p>MINEGAME is the only currency. Miners, rooms, parts, rewards, marketplace sales, and protocol sellbacks all settle in the same fixed-supply coin.</p>
        </div>
        <div className={styles.mechanicsGrid}>
          {mechanics.map(([number, title, body]) => (
            <article className={styles.mechanicCard} key={number}>
              <span>{number}</span><h3>{title}</h3><p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.mineSection} id="mine">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Interactive design preview</p>
          <h2>Your miner should look stronger because it is stronger.</h2>
          <p>Try the local preview below. It demonstrates the progression model only; it does not connect a wallet or represent live balances.</p>
        </div>
        <MinerDemo />
      </section>

      <section className={styles.ageSection}>
        <div><p className={styles.kicker}>Miner progression</p><h2>The mine remembers.</h2></div>
        <div className={styles.ageTrack}>
          <div className={styles.ageLine} />
          {[["Tier 1", "1.00×", "Tin Pan"], ["Tier 4", "2.50×", "Boiler Badger"], ["Tier 7", "7.00×", "Arc Canary"], ["Tier 10", "24.00×", "King Midas"]].map(([day, multiplier, label]) => (
            <div className={styles.agePoint} key={day}><span /><strong>{multiplier}</strong><p>{day}</p><small>{label}</small></div>
          ))}
        </div>
      </section>

      <section className={styles.supplySection}>
        <div className={styles.supplyNumber}><span>Fixed supply</span><strong>1,000,000,000</strong><p>MINEGAME · no inflation</p></div>
        <div className={styles.supplyCopy}>
          <h2>One public coin. No shadow currency.</h2>
          <p>MINEGAME is the transferable B20 launched through o1 and the only economic asset in the game. Hashrate, grid draw, and machine condition are gameplay metrics—not tokens. Rewards come from disclosed reserves and are never guaranteed.</p>
        </div>
      </section>

      <section className={styles.launchSection} id="launch">
        <div className={styles.launchCard}>
          <div><p className={styles.kicker}>Launch sequence</p><h2>Built first. Audited second. Launched last.</h2><p>The website is being prepared for Vercel at minegame.fun. The token launch remains a deliberate wallet-signing gate after the contracts and allocations pass review.</p></div>
          <ol>{launchSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}><Image src={coinLogo} alt="" width={38} height={38} /><span>MINEGAME</span></div>
        <p>Play the MineGame. Don’t let it go to your head.</p>
        <p>© {new Date().getFullYear()} MineGame</p>
      </footer>
    </main>
  );
}
