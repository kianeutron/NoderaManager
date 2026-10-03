"use client";

import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type PreviewDockProps = Readonly<{
  selectedId: string | null;
  onClose: () => void;
  label: string;
  /** Renders the panel for one record. Keyed by id so switching records starts a fresh load. */
  children: (selectedId: string) => ReactNode;
}>;

const enter = { "@keyframes previewEnter": { from: { opacity: 0, transform: "translateX(14px)" }, to: { opacity: 1, transform: "translateX(0)" } }, "@media (prefers-reduced-motion: no-preference)": { animation: "previewEnter 240ms cubic-bezier(.22,1,.36,1) both" } } as const;

/**
 * Wide screens keep the preview beside the list; narrower ones slide it over as a drawer. Either way the container is a flex
 * column that never outgrows the viewport, and the `PreviewFrame` inside owns the scrolling (header and footer stay put).
 */
export function PreviewDock({ selectedId, onClose, label, children }: PreviewDockProps) {
  const isWide = useMediaQuery(useTheme().breakpoints.up("xl"));

  if (isWide) {
    if (!selectedId) return null;
    return (
      <GlassPanel aria-label={label} key={selectedId} role="complementary" sx={(theme) => ({ ...enter, alignSelf: "start", display: "flex", flexDirection: "column", maxHeight: `calc(100dvh - ${theme.spacing(7)})`, position: "sticky", top: theme.spacing(3.5) })}>
        {children(selectedId)}
      </GlassPanel>
    );
  }

  return (
    <Drawer anchor="right" aria-label={label} onClose={onClose} open={selectedId !== null} slotProps={{ paper: { sx: { maxWidth: "100%", width: { xs: "100%", sm: 440 } } } }}>
      {selectedId ? <Box key={selectedId} sx={{ ...enter, display: "flex", flexDirection: "column", height: "100%" }}>{children(selectedId)}</Box> : null}
    </Drawer>
  );
}
