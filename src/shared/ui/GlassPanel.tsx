"use client";

import Paper, { type PaperProps } from "@mui/material/Paper";
import { alpha, styled } from "@mui/material/styles";
import { blurredBackdrop } from "@/shared/ui/glass";

type GlassPanelProps = PaperProps & {
  highlight?: boolean;
  /** Blur what is behind the panel. Off by default: a page has many panels, and blur is paid for by every one of them on every frame. */
  blur?: boolean;
};

/** A translucent panel. Without `blur` it is a flat translucent fill that costs nothing to draw. */
export const GlassPanel = styled(Paper, {
  shouldForwardProp: (prop) => prop !== "highlight" && prop !== "blur"
})<GlassPanelProps>(({ theme, highlight, blur }) => ({
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  border: `1px solid ${alpha(theme.palette.primary.light, highlight ? 0.38 : 0.23)}`,
  // A flat fill needs more opacity than a blurred one to stay readable over the background.
  background: `linear-gradient(118deg, ${alpha(theme.palette.common.white, highlight ? 0.13 : 0.075)} 0%, transparent 28%), linear-gradient(145deg, ${alpha(theme.palette.background.paper, blur ? (highlight ? 0.64 : 0.6) : 0.86)}, ${alpha("#071630", blur ? (highlight ? 0.54 : 0.5) : 0.8)})`,
  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, highlight ? 0.16 : 0.1)}, 0 18px 42px ${alpha("#000615", 0.28)}, 0 1px 0 ${alpha(theme.palette.primary.main, highlight ? 0.2 : 0.1)}`,
  ...(blur ? blurredBackdrop : {})
}));
