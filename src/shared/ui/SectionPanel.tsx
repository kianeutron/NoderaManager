import { Box, Stack, Typography } from "@mui/material";
import { useId, type ReactNode } from "react";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type SectionPanelProps = Readonly<{ title: string; /** One line saying what the panel answers. */ description?: string; action?: ReactNode; children: ReactNode }>;

/** A titled glass panel that is a labelled landmark region. */
export function SectionPanel({ title, description, action, children }: SectionPanelProps) {
  const headingId = useId();

  return (
    <GlassPanel aria-labelledby={headingId} role="region" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" id={headingId} variant="h6">{title}</Typography>
          {description ? <Typography color="text.secondary" variant="body2">{description}</Typography> : null}
        </Box>
        {action ? <Box sx={{ flex: "0 0 auto", ml: 2 }}>{action}</Box> : null}
      </Stack>
      {children}
    </GlassPanel>
  );
}
