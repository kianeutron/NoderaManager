"use client";

import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import { IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { backgroundNames, useBackgroundSelection, type BackgroundName } from "@/shared/ui/backgrounds/background-context";

const labels: Record<BackgroundName, { label: string; description: string }> = {
  still: { label: "Still", description: "No animation, fastest" },
  topography: { label: "Topography", description: "Quiet flowing contours" },
  ferrofluid: { label: "Ferrofluid", description: "Liquid metallic motion" },
  plasma: { label: "Plasma", description: "Soft atmospheric energy" }
};

export function BackgroundSelector() {
  const { backgroundName, setBackgroundName } = useBackgroundSelection();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <>
    <Tooltip title="Change background animation"><IconButton aria-label="Change background animation" onClick={(event) => setAnchor(event.currentTarget)} size="small" sx={{ border: 1, borderColor: "divider", color: "text.secondary" }}><AutoAwesomeRounded fontSize="small" /></IconButton></Tooltip>
    <Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
      <Typography color="text.secondary" sx={{ px: 2, pt: 1 }} variant="overline">Background animation</Typography>
      {backgroundNames.map((name) => <MenuItem key={name} onClick={() => { setBackgroundName(name); setAnchor(null); }} selected={name === backgroundName} sx={{ minWidth: 250 }}><ListItemText primary={labels[name].label} secondary={labels[name].description} /></MenuItem>)}
    </Menu>
  </>;
}
