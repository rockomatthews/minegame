"use client";

import { useState } from "react";
import styles from "./miner-demo.module.css";

const partCatalog = [
  { id: "drill", name: "Gold-Tooth Drill", cost: 800, boost: 25, icon: "◆" },
  { id: "cooler", name: "Cryo Cooler", cost: 1200, boost: 40, icon: "❄" },
  { id: "lamp", name: "Deepbeam Lamp", cost: 450, boost: 12, icon: "✦" },
  { id: "engine", name: "Magma Engine", cost: 2000, boost: 65, icon: "⚙" },
];

export function MinerDemo() {
  const [power, setPower] = useState(2850);
  const [equipped, setEquipped] = useState<string[]>(["lamp"]);
  const [overclocked, setOverclocked] = useState(false);
  const boost = partCatalog.reduce((total, part) => total + (equipped.includes(part.id) ? part.boost : 0), 0);
  const hashRate = 38 + boost + (overclocked ? 38 + boost : 0);
  const level = 4 + equipped.length;

  function equipPart(id: string, cost: number) {
    if (equipped.includes(id) || power < cost) return;
    setPower((current) => current - cost);
    setEquipped((current) => [...current, id]);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.mineWindow}>
        <div className={styles.caveGlow} />
        <div className={styles.rockCeiling} />
        <div className={styles.rig}>
          <div className={styles.lampBeam} data-active={equipped.includes("lamp")} />
          <div className={styles.rigBody}><div className={styles.gauge} /><div className={styles.rivets}>••••</div><strong>MK-{level}</strong></div>
          <div className={styles.drill} data-active={equipped.includes("drill")}><span /><span /><span /></div>
          <div className={styles.treads} />
          <div className={styles.exhaust} data-active={overclocked} />
        </div>
        <div className={styles.ground} />
        <div className={styles.previewLabel}>Visual prototype · no wallet connected</div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlHeader}>
          <div><span>Your virtual miner</span><h3>Prospector MK-{level}</h3></div>
          <div className={styles.level}>LVL {level}</div>
        </div>
        <div className={styles.stats}>
          <div><span>POWER</span><strong>{power.toLocaleString()}</strong></div>
          <div><span>HASH RATE</span><strong>{hashRate} H/s</strong></div>
          <div><span>AGE BONUS</span><strong>1.19×</strong></div>
        </div>
        <div className={styles.overclockRow}>
          <div><strong>24-hour overclock</strong><p>Double this rig’s POWER rate for the day.</p></div>
          <button className={overclocked ? styles.activeButton : undefined} type="button" onClick={() => setOverclocked((current) => !current)}>{overclocked ? "Overclock active" : "Preview boost"}</button>
        </div>
        <div className={styles.partsTitle}><strong>Parts bench</strong><span>{equipped.length}/8 equipped</span></div>
        <div className={styles.partsGrid}>
          {partCatalog.map((part) => {
            const isEquipped = equipped.includes(part.id);
            return (
              <button className={isEquipped ? styles.partEquipped : styles.part} disabled={isEquipped || power < part.cost} key={part.id} type="button" onClick={() => equipPart(part.id, part.cost)}>
                <span className={styles.partIcon}>{part.icon}</span>
                <span><strong>{part.name}</strong><small>{isEquipped ? "Equipped" : `${part.cost} POWER · +${part.boost} H/s`}</small></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
