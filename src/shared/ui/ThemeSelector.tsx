"use client";

import PaletteRounded from "@mui/icons-material/PaletteRounded";
import { Box, IconButton, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { themeDefinitions, themeNames, type ThemeName } from "@/shared/ui/theme";
import { useThemeSelection } from "@/shared/ui/theme-context";

function ThemeSwatch({ name }: Readonly<{ name: ThemeName }>) {
  return <Stack direction="row" sx={{ gap: 0.35 }}><Box sx={{ backgroundColor: themeDefinitions[name].swatch[0], border: "1px solid rgba(255,255,255,.24)", borderRadius: "50%", height: 16, width: 16 }} /><Box sx={{ backgroundColor: themeDefinitions[name].swatch[1], borderRadius: "50%", height: 16, width: 16 }} /><Box sx={{ backgroundColor: themeDefinitions[name].swatch[2], borderRadius: "50%", height: 16, width: 16 }} /></Stack>;
}

export function ThemeSelector() {
  const { themeName, setThemeName } = useThemeSelection();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return <>
    <Tooltip title="Change theme"><IconButton aria-label="Change theme" onClick={(event) => setAnchor(event.currentTarget)} size="small" sx={{ border: 1, borderColor: "divider", color: "text.secondary" }}><PaletteRounded fontSize="small" /></IconButton></Tooltip>
    <Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
      <Box sx={{ px: 2, pb: 0.75, pt: 1 }}><Typography color="text.secondary" variant="overline">Workspace theme</Typography></Box>
      {themeNames.map((name) => <MenuItem key={name} onClick={() => { setThemeName(name); setAnchor(null); }} selected={name === themeName} sx={{ gap: 1.5, minWidth: 250 }}><ThemeSwatch name={name} /><ListItemText primary={themeDefinitions[name].label} secondary={themeDefinitions[name].description} /></MenuItem>)}
    </Menu>
  </>;
}
