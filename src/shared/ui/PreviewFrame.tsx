import CloseRounded from "@mui/icons-material/CloseRounded";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type PreviewFrameProps = Readonly<{ onClose: () => void; footer?: ReactNode; children: ReactNode }>;

/** The chrome of a preview: a header with a close button, a scrolling body and an optional pinned footer. Placement is the dock's job. */
export function PreviewFrame({ onClose, footer, children }: PreviewFrameProps) {
  return (
    <Stack sx={{ flex: "1 1 auto", minHeight: 0 }}>
      <Stack direction="row" sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", justifyContent: "space-between", px: 2.5, py: 1 }}>
        <Typography color="primary.light" variant="overline">Preview</Typography>
        <IconButton aria-label="Close preview" edge="end" onClick={onClose}><CloseRounded /></IconButton>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2.5 }}>{children}</Box>
      {footer ? <Box sx={{ borderTop: 1, borderColor: "divider", p: 2.5 }}>{footer}</Box> : null}
    </Stack>
  );
}
