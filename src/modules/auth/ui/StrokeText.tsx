"use client";

import { useId, useMemo } from "react";
import styles from "./StrokeText.module.css";

type StrokeTextProps = Readonly<{
  text: string;
  className?: string;
  onSettled?: () => void;
}>;

/**
 * A lightweight, one-shot adaptation of the supplied React Bits StrokeText.
 * CSS drives the timeline so the loading experience needs no animation library.
 */
export function StrokeText({ text, className, onSettled }: StrokeTextProps) {
  const maskId = useId().replace(/[^a-z0-9_-]/gi, "");
  const characters = useMemo(() => Array.from(text), [text]);

  return (
    <span aria-label={text} className={[styles.root, className].filter(Boolean).join(" ")} role="img">
      <svg aria-hidden="true" className={styles.svg} viewBox="0 0 760 210">
        <defs>
          <clipPath id={`nodera-fill-${maskId}`}>
            <rect className={styles.fillMask} height="210" onAnimationEnd={onSettled} width="760" x="0" y="0" />
          </clipPath>
        </defs>
        <text className={styles.outline} textAnchor="middle" x="380" y="155">
          {characters.map((character, index) => (
            <tspan key={`${character}-${index}`} style={{ animationDelay: `${index * 72}ms` }}>
              {character}
            </tspan>
          ))}
        </text>
        <text clipPath={`url(#nodera-fill-${maskId})`} className={styles.fill} textAnchor="middle" x="380" y="155">
          {text}
        </text>
      </svg>
    </span>
  );
}
