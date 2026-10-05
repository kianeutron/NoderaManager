"use client";

import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { useBackgroundSelection } from "@/shared/ui/backgrounds/background-context";
import { useThemeSelection } from "@/shared/ui/theme-context";
import { themeDefinitions } from "@/shared/ui/theme";

// Each animated background brings a WebGL library, so only the selected one is downloaded, and only in the browser.
const Ferrofluid = dynamic(() => import("@/shared/ui/backgrounds/Ferrofluid"), { ssr: false });
const Plasma = dynamic(() => import("@/shared/ui/backgrounds/Plasma"), { ssr: false });
const Topography = dynamic(() => import("@/shared/ui/Topography").then((module) => module.Topography), { ssr: false });

export function BackgroundCanvas() {
  const { backgroundName } = useBackgroundSelection();
  const { themeName } = useThemeSelection();
  const definition = themeDefinitions[themeName];
  const background = backgroundName === "ferrofluid"
    ? <Ferrofluid colors={[definition.primary, definition.secondary, definition.primaryLight]} glow={1.2} opacity={0.28} speed={0.22} />
    : backgroundName === "plasma"
      ? <Plasma color={definition.primary} opacity={0.22} renderScale={0.45} speed={0.45} targetFps={30} />
      : backgroundName === "topography"
        ? <Topography highColor={definition.topography[2]} lowColor={definition.topography[0]} midColor={definition.topography[1]} />
        : <Box sx={(theme) => ({ background: `radial-gradient(60% 50% at 18% 0%, ${alpha(theme.palette.primary.main, 0.2)}, transparent 70%), radial-gradient(50% 45% at 92% 12%, ${alpha(theme.palette.secondary.main, 0.16)}, transparent 70%), radial-gradient(70% 55% at 50% 110%, ${alpha(definition.topography[1], 0.22)}, transparent 70%)`, height: "100%", width: "100%" })} />;

  return <Box aria-hidden="true" sx={{ inset: 0, pointerEvents: "none", position: "fixed", zIndex: 0 }}>{background}</Box>;
}
