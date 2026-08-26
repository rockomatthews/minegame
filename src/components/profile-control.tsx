"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { useMineGame } from "@/components/minegame-provider";
import styles from "@/app/page.module.css";

type ProfileResponse = { address: string; name: string | null; slug: string | null };

export function ProfileControl() {
  const { account, connect } = useMineGame();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [candidate, setCandidate] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!account) {
      const reset = window.setTimeout(() => setSlug(null), 0);
      return () => window.clearTimeout(reset);
    }
    let cancelled = false;
    const load = async () => {
      const saved = window.localStorage.getItem(`minegame-profile:v1:${account.toLowerCase()}`);
      const requested = saved ? `slug=${encodeURIComponent(saved)}` : `address=${account}`;
      const response = await fetch(`/api/profile?${requested}`);
      if (!response.ok) return;
      const profile = await response.json() as ProfileResponse;
      if (!cancelled && profile.slug && getAddress(profile.address) === getAddress(account)) {
        setSlug(profile.slug);
        setCandidate(profile.slug);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [account]);

  async function openProfile() {
    if (!account) {
      await connect();
      return;
    }
    setOpen((current) => !current);
  }

  async function saveProfile() {
    if (!account) return;
    const normalized = candidate.trim().toLowerCase().replace(/\.base\.eth$/, "");
    setChecking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/profile?slug=${encodeURIComponent(normalized)}`);
      if (!response.ok) throw new Error("That Basename was not found.");
      const profile = await response.json() as ProfileResponse;
      if (getAddress(profile.address) !== getAddress(account)) throw new Error(`This wallet does not own ${normalized}.base.eth.`);
      window.localStorage.setItem(`minegame-profile:v1:${account.toLowerCase()}`, normalized);
      setSlug(normalized);
      setMessage("Public room ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify that Basename.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={styles.profileControl}>
      <button className={styles.profileButton} type="button" onClick={() => void openProfile()} aria-expanded={open}>
        <span aria-hidden="true">ME</span>
        <span>{slug ? `/${slug}` : "Profile"}</span>
      </button>
      {open && account ? (
        <section className={styles.profilePanel} aria-label="Mining profile">
          <div className={styles.profilePanelHeading}>
            <div><small>Public mining room</small><strong>{slug ? `minegame.fun/${slug}` : "Choose your Basename"}</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close profile panel">×</button>
          </div>
          <label htmlFor="profile-name">Basename you own</label>
          <div className={styles.profileEntry}>
            <input id="profile-name" value={candidate} onChange={(event) => setCandidate(event.target.value)} placeholder="rocketship" autoCapitalize="none" spellCheck={false} />
            <span>.base.eth</span>
          </div>
          <button className={styles.profileSave} type="button" onClick={() => void saveProfile()} disabled={checking || !candidate.trim()}>{checking ? "Verifying…" : "Use this name"}</button>
          {message ? <p className={styles.profileMessage}>{message}</p> : null}
          <div className={styles.profileLinks}>
            {slug ? <Link href={`/${slug}`}>View public room ↗</Link> : null}
            <a href="https://www.base.org/names" target="_blank" rel="noreferrer">Get a Basename ↗</a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
