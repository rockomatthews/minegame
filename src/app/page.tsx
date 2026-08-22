import Image from "next/image";
import coinLogo from "../../public/assets/minegame-logo.png";
import { MinerDemo } from "@/components/miner-demo";
import { MinerDashboard } from "@/components/miner-showroom";
import { ProtocolStatus } from "@/components/protocol-status";
import styles from "./page.module.css";

const mechanics = [
  ["01", "Lock in", "Deposit MINEGAME into the game vault. You can withdraw your principal, but a full exit resets your miner’s holding-age bonus."],
  ["02", "Mine POWER", "Your stake, holding age, installed parts, and active overclock determine how quickly your rig produces nontransferable POWER."],
  ["03", "Build the rig", "Spend POWER on virtual drills, cooling, carts, helmets, engines, lighting, and cosmetics that change appearance and performance."],
  ["04", "Overclock", "Spend MINEGAME to double POWER production for 24 hours. Those tokens return to the rewards system instead of creating new supply."],
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
  description: "A Base-native mining game where holding age, virtual equipment, and overclocking grow a player's miner.",
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
          <Image src={coinLogo} alt="" width={44} height={44} priority />
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
          <h2>Time turns into horsepower.</h2>
          <p>MineGame rewards commitment without printing an endless second token. POWER stays inside the game; MINEGAME remains the fixed-supply public asset.</p>
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
        <div><p className={styles.kicker}>Holding age</p><h2>The mine remembers.</h2></div>
        <div className={styles.ageTrack}>
          <div className={styles.ageLine} />
          {[["Day 1", "1.00×", "Starter rig"], ["Day 30", "1.08×", "Copper streak"], ["Day 180", "1.49×", "Deep miner"], ["Day 365", "2.00×", "Master miner"]].map(([day, multiplier, label]) => (
            <div className={styles.agePoint} key={day}><span /><strong>{multiplier}</strong><p>{day}</p><small>{label}</small></div>
          ))}
        </div>
      </section>

      <section className={styles.supplySection}>
        <div className={styles.supplyNumber}><span>Fixed supply</span><strong>1,000,000,000</strong><p>MINEGAME · no inflation</p></div>
        <div className={styles.supplyCopy}>
          <h2>One public coin. One internal resource.</h2>
          <p>MINEGAME is the transferable B20 launched through o1. POWER is nontransferable game progress. No hidden minting, no second market, and no claim that game rewards are a guaranteed financial return.</p>
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
