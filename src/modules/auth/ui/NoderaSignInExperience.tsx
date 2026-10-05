"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StrokeText } from "./StrokeText";
import styles from "./NoderaSignInExperience.module.css";

type NoderaSignInExperienceProps = Readonly<{ signInAction: ReactNode }>;
const welcomeDurationMs = 2500;

export function NoderaSignInExperience({ signInAction }: NoderaSignInExperienceProps) {
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setShowSignIn(true), reduceMotion ? 0 : welcomeDurationMs);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main className={styles.root}>
      <section aria-hidden={showSignIn} className={[styles.stage, styles.welcomeStage, showSignIn ? styles.stageHidden : styles.stageVisible].join(" ")}>
        <div className={styles.welcomeGlass}><StrokeText text="Nodera" /></div>
      </section>
      <section aria-hidden={!showSignIn} aria-live="polite" className={[styles.stage, styles.signInStage, showSignIn ? styles.stageVisible : styles.stageHidden].join(" ")}>
        <div aria-hidden="true" className={styles.backgroundShade} />
        <div className={styles.formGlass}><SignInContent signInAction={signInAction} /></div>
      </section>
    </main>
  );
}

function SignInContent({ signInAction }: NoderaSignInExperienceProps) {
  return (
    <div className={styles.formInner}>
      <div className={styles.brandLockup}><span aria-hidden="true" className={styles.brandMark}><i /><i /><i /></span><span>Nodera</span></div>
      <div className={styles.formCopy}>
        <p className={styles.kicker}>WELCOME BACK</p>
        <h1 id="sign-in-title">Your network,<br />in motion.</h1>
        <p>Sign in with the private Google account approved for this workspace.</p>
      </div>
      <div className={styles.googleAction}>{signInAction}</div>
    </div>
  );
}
