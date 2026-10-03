"use client";

import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DocumentPreviewPanel } from "@/modules/library/ui/DocumentPreviewPanel";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type DocumentPreviewDockProps = Readonly<{ documentId: string | null; onClose: () => void }>;

/** Wide screens keep the preview beside the list; narrower ones slide it over as a drawer. */
export function DocumentPreviewDock({ documentId, onClose }: DocumentPreviewDockProps) {
  const isWide = useMediaQuery(useTheme().breakpoints.up("xl"));

  if (isWide) {
    if (!documentId) return null;
    return <GlassPanel aria-label="Document preview" role="complementary" sx={(theme) => ({ "@keyframes previewEnter": { from: { opacity: 0, transform: "translateX(14px)" }, to: { opacity: 1, transform: "translateX(0)" } }, alignSelf: "start", animation: "previewEnter 240ms cubic-bezier(.22,1,.36,1) both", height: `calc(100vh - ${theme.spacing(7)})`, position: "sticky", top: theme.spacing(3.5) })}><DocumentPreviewPanel documentId={documentId} key={documentId} onClose={onClose} /></GlassPanel>;
  }

  return (
    <Drawer anchor="right" aria-label="Document preview" onClose={onClose} open={documentId !== null} slotProps={{ paper: { sx: { maxWidth: "100%", width: { xs: "100%", sm: 440 } } } }}>
      {documentId ? <Box sx={{ "@keyframes previewEnter": { from: { opacity: 0, transform: "translateX(18px)" }, to: { opacity: 1, transform: "translateX(0)" } }, animation: "previewEnter 240ms cubic-bezier(.22,1,.36,1) both", height: "100%" }}><DocumentPreviewPanel documentId={documentId} key={documentId} onClose={onClose} /></Box> : null}
    </Drawer>
  );
}
