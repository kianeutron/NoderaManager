"use client";

import Paper, { type PaperProps } from "@mui/material/Paper";
import { alpha, styled } from "@mui/material/styles";

export const GlassPanel = styled(Paper, {
  shouldForwardProp: (prop) => prop !== "highlight"
})<PaperProps & { highlight?: boolean }>(({ theme, highlight }) => ({
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  border: `1px solid ${alpha(theme.palette.primary.light, highlight ? 0.38 : 0.23)}`,
  background: `linear-gradient(118deg, ${alpha(theme.palette.common.white, highlight ? 0.13 : 0.075)} 0%, transparent 28%), linear-gradient(145deg, ${alpha(theme.palette.background.paper, highlight ? 0.64 : 0.6)}, ${alpha("#071630", highlight ? 0.54 : 0.5)})`,
  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, highlight ? 0.16 : 0.1)}, 0 18px 42px ${alpha("#000615", 0.28)}, 0 1px 0 ${alpha(theme.palette.primary.main, highlight ? 0.2 : 0.1)}`,
  backdropFilter: "blur(24px) saturate(145%)",
  WebkitBackdropFilter: "blur(24px) saturate(145%)"
}));
