import { Box } from "@mui/material";
import type { ReactNode } from "react";

type PreviewLayoutProps = Readonly<{
  /** Whether a record is open. The preview column only takes space then. */
  hasPreview: boolean;
  /** A `PreviewDock`. */
  preview: ReactNode;
  /** The whole page content, header included. */
  children: ReactNode;
}>;

/**
 * The page on the left, the preview beside it on desktop and tablet layouts. The preview column runs the full height of the page, from
 * its very top, so the dock can stick there at viewport height and is fully visible from the first moment, instead of
 * starting below the header and needing the page to scroll before its end comes into view.
 */
export function PreviewLayout({ hasPreview, preview, children }: PreviewLayoutProps) {
  return (
    <Box sx={{ alignItems: "start", display: "grid", gap: 2.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: hasPreview ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)" }, transition: "grid-template-columns 320ms cubic-bezier(.22,1,.36,1)" }}>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
      {preview}
    </Box>
  );
}
