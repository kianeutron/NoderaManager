"use client";

import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BackgroundSelector } from "@/shared/ui/BackgroundSelector";
import { ThemeSelector } from "@/shared/ui/ThemeSelector";
import { isActiveRoute, navigationItems } from "@/shared/ui/navigation-config";

const primaryLabels = new Set(["Overview", "People & companies", "Outreach", "Library"]);
const primaryItems = navigationItems.filter((item) => primaryLabels.has(item.label));
const secondaryItems = navigationItems.filter((item) => !primaryLabels.has(item.label));

export function MobileNavigation() {
  const pathname = usePathname();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const moreActive = secondaryItems.some((item) => isActiveRoute(pathname, item.href));
  return <Paper component="nav" elevation={0} sx={{ backdropFilter: "blur(22px) saturate(145%)", backgroundColor: "rgba(9, 16, 40, 0.78)", border: 1, borderColor: "divider", borderRadius: 4, bottom: "max(0.85rem, env(safe-area-inset-bottom))", display: { md: "none", xs: "flex" }, left: "50%", p: 0.75, position: "fixed", transform: "translateX(-50%)", width: "min(calc(100% - 1.5rem), 31rem)", zIndex: (theme) => theme.zIndex.drawer + 2 }}>
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-around", width: "100%" }}>
      {primaryItems.map((item) => {
        const active = isActiveRoute(pathname, item.href);
        return <IconButton aria-label={item.label} component={item.href ? Link : "button"} href={item.href} key={item.label} sx={{ "&::before": active ? { background: "linear-gradient(135deg, currentColor, transparent)", borderRadius: 3, content: "\"\"", inset: 0, opacity: 0.16, position: "absolute" } : undefined, background: active ? "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.035))" : "transparent", border: active ? 1 : 0, borderColor: active ? "primary.main" : "transparent", borderRadius: 2.75, boxShadow: active ? "0 0 22px rgba(120, 140, 255, 0.22), inset 0 1px 0 rgba(255,255,255,0.14)" : "none", color: active ? "primary.light" : "text.secondary", flex: active ? 1.45 : 1, gap: 0.5, minHeight: 48, overflow: "hidden", position: "relative", transition: "flex 220ms ease, background 220ms ease, box-shadow 220ms ease" }}>
          {item.icon}
          {active ? <Typography sx={{ color: "inherit", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.01em", maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label === "People & companies" ? "People" : item.label}</Typography> : null}
        </IconButton>;
      })}
      <IconButton aria-label="More navigation options" onClick={(event) => setAnchor(event.currentTarget)} sx={{ borderRadius: 2.5, color: moreActive ? "primary.light" : "text.secondary", flex: 1, minHeight: 48 }}><MoreHorizRounded /></IconButton>
    </Stack>
    <Menu anchorEl={anchor} anchorOrigin={{ horizontal: "center", vertical: "top" }} onClose={() => setAnchor(null)} open={Boolean(anchor)} transformOrigin={{ horizontal: "center", vertical: "bottom" }}>
      <Typography color="text.secondary" sx={{ px: 2, pt: 1 }} variant="overline">Workspace</Typography>
      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1 }}><BackgroundSelector /><ThemeSelector /></Stack>
      {secondaryItems.map((item) => <MenuItem component={item.href ? Link : "li"} href={item.href} key={item.label} onClick={() => setAnchor(null)} selected={isActiveRoute(pathname, item.href)}><ListItemIcon>{item.icon}</ListItemIcon><ListItemText primary={item.label} /></MenuItem>)}
    </Menu>
  </Paper>;
}
