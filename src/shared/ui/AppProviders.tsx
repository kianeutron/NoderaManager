"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createQueryClient } from "@/shared/api/create-query-client";
import { ThemeSelectionProvider, useSelectedOutreachTheme } from "@/shared/ui/theme-context";
import type { ThemeName } from "@/shared/ui/theme";
import { defaultBackground } from "@/shared/ui/backgrounds/background-config";
import { BackgroundSelectionProvider, type BackgroundName } from "@/shared/ui/backgrounds/background-context";
import { BackgroundCanvas } from "@/shared/ui/BackgroundCanvas";

type AppProvidersProps = Readonly<{ children: ReactNode; nonce?: string; initialTheme?: ThemeName; initialBackground?: BackgroundName }>;

export function AppProviders({ children, nonce, initialTheme = "midnight", initialBackground = defaultBackground }: AppProvidersProps) {
  // Created per browser session, never at module scope, so server renders cannot share cache between users.
  const [queryClient] = useState(createQueryClient);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true, ...(nonce ? { nonce } : {}) }}>
      <ThemeSelectionProvider initialTheme={initialTheme}><BackgroundSelectionProvider initialBackground={initialBackground}><BackgroundCanvas /><ThemedApplication queryClient={queryClient}>{children}</ThemedApplication></BackgroundSelectionProvider></ThemeSelectionProvider>
    </AppRouterCacheProvider>
  );
}

function ThemedApplication({ children, queryClient }: Readonly<{ children: ReactNode; queryClient: QueryClient }>) {
  const theme = useSelectedOutreachTheme();
  return <ThemeProvider theme={theme}><CssBaseline enableColorScheme /><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ThemeProvider>;
}
