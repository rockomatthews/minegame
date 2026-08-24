"use client";

import Image from "next/image";
import { useState } from "react";
import tinPan from "../../public/assets/miners/tier-01-tin-pan.png";
import styles from "./miner-demo.module.css";

const partCatalog = [
  { id: "drill", name: "Gold-Tooth Drill", cost: 800, boost: 25, icon: "◆" },
  { id: "cooler", name: "Cryo Cooler", cost: 1200, boost: 40, icon: "❄" },
  { id: "lamp", name: "Deepbeam Lamp", cost: 450, boost: 12, icon: "✦" },
  { id: "engine", name: "Magma Engine", cost: 2000, boost: 65, icon: "⚙" },
];

export function MinerDemo() {
  const [minegameBalance, setMinegameBalance] = useState(5000);
  const [equipped, setEquipped] = useState<string[]>(["lamp"]);
  const [overclocked, setOverclocked] = useState(false);
  const boost = partCatalog.reduce((total, part) => total + (equipped.includes(part.id) ? part.boost : 0), 0);
  const hashRate = 38 + boost + (overclocked ? 38 + boost : 0);

  function equipPart(id: string, cost: number) {
    if (equipped.includes(id) || minegameBalance < cost) return;
    setMinegameBalance((current) => current - cost);
    setEquipped((current) => [...current, id]);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.mineWindow}>
        <div className={styles.caveGlow} />
        <div className={styles.rockCeiling} />
        <div className={styles.minerArt} data-overclocked={overclocked} data-lamp={equipped.includes("lamp")}>
          <Image className={styles.realMiner} src={tinPan} alt="Tin Pan virtual mining machine" sizes="(max-width: 920px) 78vw, 520px" />
        </div>
        <div className={styles.ground} />
        <div className={styles.previewLabel}>Real miner asset · loadout preview · no wallet</div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlHeader}>
          <div><span>Selected miner</span><h3>Tin Pan</h3></div>
          <div className={styles.level}>TIER 1</div>
        </div>
        <div className={styles.stats}>
          <div><span>PREVIEW BALANCE</span><strong>{minegameBalance.toLocaleString()} MINEGAME</strong></div>
          <div><span>HASH RATE</span><strong>{hashRate} H/s</strong></div>
          <div><span>AGE BONUS</span><strong>1.19×</strong></div>
        </div>
        <div className={styles.overclockRow}>
          <div><strong>24-hour overclock</strong><p>Preview double effective hashrate. Final pricing and contract logic require audit.</p></div>
          <button className={overclocked ? styles.activeButton : undefined} type="button" onClick={() => setOverclocked((current) => !current)}>{overclocked ? "Overclock active" : "Preview boost"}</button>
        </div>
        <div className={styles.partsTitle}><strong>Parts bench</strong><span>{equipped.length}/8 equipped</span></div>
        <div className={styles.partsGrid}>
          {partCatalog.map((part) => {
            const isEquipped = equipped.includes(part.id);
            return (
              <button className={isEquipped ? styles.partEquipped : styles.part} disabled={isEquipped || minegameBalance < part.cost} key={part.id} type="button" onClick={() => equipPart(part.id, part.cost)}>
                <span className={styles.partIcon}>{part.icon}</span>
                <span><strong>{part.name}</strong><small>{isEquipped ? "Equipped" : `${part.cost} MINEGAME · +${part.boost} H/s`}</small></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
