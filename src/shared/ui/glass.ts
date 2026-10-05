import type { CSSObject } from "@mui/material/styles";

/** The largest blur radius used anywhere. Blur is the costliest filter, and a larger radius samples a larger area per pixel. */
const blurRadius = 12;

const reducedTransparency = "@media (prefers-reduced-transparency: reduce)";
const smallScreen = "@media (max-width: 600px)";

/**
 * Blurs what is behind a surface. Use it on a few large layers (the sidebar, the top banner, the mobile bar), not on every
 * card: each blurred layer is recomputed whenever what is behind it moves. It switches itself off where a person asks for
 * less transparency and on small screens, where the surface is already opaque enough to read.
 */
export const blurredBackdrop: CSSObject = {
  backdropFilter: `blur(${blurRadius}px) saturate(140%)`,
  WebkitBackdropFilter: `blur(${blurRadius}px) saturate(140%)`,
  [reducedTransparency]: { backdropFilter: "none", WebkitBackdropFilter: "none" },
  [smallScreen]: { backdropFilter: "none", WebkitBackdropFilter: "none" }
};
