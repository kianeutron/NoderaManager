"use client";

import { useEffect, useRef, useState } from "react";

const duration = 700;
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/**
 * Eases a figure towards its latest value. People who ask for reduced motion, and environments without
 * `matchMedia` (server rendering, tests), get the value immediately.
 */
export function useAnimatedNumber(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const reduced = typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = shownRef.current;
    if (reduced || start === value) {
      shownRef.current = value;
      setShown(value);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      shownRef.current = start + (value - start) * easeOut(progress);
      setShown(shownRef.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}
