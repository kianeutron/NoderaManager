/** How long after the last scroll event the page still counts as scrolling. */
const scrollIdleMilliseconds = 150;

let lastScrollAt = Number.NEGATIVE_INFINITY;
let listening = false;

function listenForScroll(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  // Capture, because scroll events do not bubble and the page scrolls inside nested containers too.
  window.addEventListener("scroll", () => { lastScrollAt = performance.now(); }, { capture: true, passive: true });
}

/**
 * Whether an animation should skip drawing this frame: it is sooner than `1000 / maxFps` after the last drawn frame, or the
 * user is scrolling (the browser needs every millisecond to move content, and a background nobody is watching can wait).
 */
export function shouldSkipFrame(now: number, lastDrawnAt: number, maxFps: number): boolean {
  listenForScroll();
  return now - lastDrawnAt < 1000 / maxFps || now - lastScrollAt < scrollIdleMilliseconds;
}
