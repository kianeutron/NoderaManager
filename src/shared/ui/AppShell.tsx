"use client";

import SettingsRounded from "@mui/icons-material/SettingsRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeSelector } from "@/shared/ui/ThemeSelector";
import { BackgroundSelector } from "@/shared/ui/BackgroundSelector";
import { MobileNavigation } from "@/shared/ui/MobileNavigation";
import { isActiveRoute, navigationItems } from "@/shared/ui/navigation-config";
import { useThemeSelection } from "@/shared/ui/theme-context";
import { themeDefinitions } from "@/shared/ui/theme";

const drawerWidth = 258;
const collapsedDrawerWidth = 78;

// Items without an `href` are placeholders for screens that do not exist yet.

// styled() drops ListItemButton's polymorphic `component` overloads; the cast restores them.
const NavigationButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
  minHeight: 42,
  "&.Mui-selected": {
    background: `linear-gradient(100deg, ${alpha(theme.palette.primary.main, 0.22)}, ${alpha(theme.palette.primary.main, 0.06)})`,
    color: theme.palette.common.white,
    "& .MuiListItemIcon-root": { color: theme.palette.primary.light }
  },
  "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
})) as typeof ListItemButton;

function SidebarContent({ collapsed, onToggle }: Readonly<{ collapsed: boolean; onToggle: () => void }>) {
  const pathname = usePathname();
  const { themeName } = useThemeSelection();
  const theme = themeDefinitions[themeName];

  return (
    <Stack sx={{ height: "100%", p: collapsed ? 1 : 2, transition: "padding 220ms ease" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: collapsed ? "center" : "space-between", minHeight: 42, px: collapsed ? 0 : 1, py: 1.5 }}>
        {collapsed ? null : <Typography sx={(theme) => ({ background: `linear-gradient(110deg, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent", fontSize: "1.55rem", fontWeight: 850, letterSpacing: "-0.055em", lineHeight: 1 })}>Nodera</Typography>}
        <Tooltip title={collapsed ? "Expand navigation" : "Collapse navigation"} placement="right"><IconButton aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={onToggle} size="small">{collapsed ? <ChevronRightRounded /> : <ChevronLeftRounded />}</IconButton></Tooltip>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <List disablePadding>
        {navigationItems.filter((item) => item.label !== "Settings & security").map((item) => {
          const active = isActiveRoute(pathname, item.href);
          return (
            <Tooltip key={item.label} title={collapsed ? item.label : ""} placement="right">
              <NavigationButton key={item.label} selected={active} sx={{ justifyContent: collapsed ? "center" : "initial", px: collapsed ? 1 : 2 }} {...(item.href ? { component: Link, href: item.href, "aria-current": active ? "page" : undefined } : {})}>
                <ListItemIcon sx={{ color: "inherit", minWidth: collapsed ? 0 : 38 }}>{item.icon}</ListItemIcon>
                {collapsed ? null : <ListItemText primary={<Typography sx={{ fontSize: 14, fontWeight: active ? 700 : 500 }}>{item.label}</Typography>} />}
              </NavigationButton>
            </Tooltip>
          );
        })}
      </List>
      <Box sx={{ flex: 1 }} />
      <Tooltip title={collapsed ? "Settings & security" : ""} placement="right">
      <NavigationButton sx={{ flex: "0 0 auto", height: 42, justifyContent: collapsed ? "center" : "initial", minHeight: 42, mt: 1, px: collapsed ? 1 : 2, width: "100%" }}>
        <ListItemIcon sx={{ color: "inherit", minWidth: collapsed ? 0 : 38 }}><SettingsRounded /></ListItemIcon>
        {collapsed ? null : <ListItemText primary={<Typography sx={{ fontSize: 14 }}>Settings & security</Typography>} />}
      </NavigationButton>
      </Tooltip>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: collapsed ? "center" : "space-between", px: collapsed ? 0 : 1, py: 1 }}>
        {collapsed ? null : <Stack sx={{ minWidth: 0 }}><Typography color="text.secondary" variant="caption">Theme</Typography><Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }} variant="body2">{theme.label}</Typography></Stack>}
        <Stack direction="row" spacing={0.75}><BackgroundSelector /><ThemeSelector /></Stack>
      </Stack>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", justifyContent: collapsed ? "center" : "initial", px: collapsed ? 0 : 1, pt: 1.5 }}>
        <Avatar sx={{ bgcolor: "secondary.main", height: 30, width: 30 }}>K</Avatar>
        {collapsed ? null : <Box><Typography variant="caption">Owner workspace</Typography><Typography color="success.main" sx={{ display: "block" }} variant="caption">Protected</Typography></Box>}
      </Stack>
    </Stack>
  );
}

type AppShellProps = Readonly<{ children: ReactNode }>;

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Box sx={{ display: "flex", isolation: "isolate", minHeight: "100vh", position: "relative" }}>
      <Box component="nav" sx={{ display: { xs: "none", md: "block" }, flexShrink: 0, position: "relative", width: collapsed ? collapsedDrawerWidth : drawerWidth, zIndex: 1, transition: "width 220ms cubic-bezier(.22,1,.36,1)" }}>
        <Drawer slotProps={{ paper: { sx: (theme) => ({
          backdropFilter: "blur(20px) saturate(145%)",
          background: `linear-gradient(165deg, ${alpha(theme.palette.background.paper, 0.58)}, ${alpha(theme.palette.background.default, 0.68)}), linear-gradient(120deg, ${alpha(theme.palette.common.black, 0.18)}, transparent 58%)`,
          borderRightColor: alpha(theme.palette.primary.light, 0.2),
          boxShadow: `inset -1px 0 0 ${alpha(theme.palette.common.white, 0.045)}, 16px 0 42px ${alpha("#000615", 0.18)}`,
          WebkitBackdropFilter: "blur(20px) saturate(145%)",
          width: collapsed ? collapsedDrawerWidth : drawerWidth,
          transition: "width 220ms cubic-bezier(.22,1,.36,1)"
        }) } }} variant="permanent">
          <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3.5 }, pb: { md: 3.5, xs: "6.5rem" }, position: "relative", zIndex: 1 }}>
        {children}
      </Box>
      <MobileNavigation />
    </Box>
  );
}
