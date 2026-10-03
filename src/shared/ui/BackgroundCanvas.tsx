"use client";

import { Box } from "@mui/material";
import { useBackgroundSelection } from "@/shared/ui/backgrounds/background-context";
import Ferrofluid from "@/shared/ui/backgrounds/Ferrofluid";
import Plasma from "@/shared/ui/backgrounds/Plasma";
import { Topography } from "@/shared/ui/Topography";
import { useThemeSelection } from "@/shared/ui/theme-context";
import { themeDefinitions } from "@/shared/ui/theme";

export function BackgroundCanvas() {
  const { backgroundName } = useBackgroundSelection();
  const { themeName } = useThemeSelection();
  const definition = themeDefinitions[themeName];
  const background = backgroundName === "ferrofluid"
    ? <Ferrofluid colors={[definition.primary, definition.secondary, definition.primaryLight]} glow={1.2} opacity={0.28} speed={0.22} />
    : backgroundName === "plasma"
      ? <Plasma color={definition.primary} opacity={0.22} renderScale={0.45} speed={0.45} targetFps={30} />
      : <Topography highColor={definition.topography[2]} lowColor={definition.topography[0]} midColor={definition.topography[1]} />;

  return <Box aria-hidden="true" sx={{ inset: 0, pointerEvents: "none", position: "fixed", zIndex: 0 }}>{background}</Box>;
}
