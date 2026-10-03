"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createOutreachTheme, isThemeName, type ThemeName } from "@/shared/ui/theme";

const storageKey = "outreach-hub-theme";
const cookieKey = "nodera-theme";
const themeChangedEvent = "outreach-hub-theme-changed";

type ThemeContextValue = Readonly<{ themeName: ThemeName; setThemeName: (name: ThemeName) => void }>;
const ThemeContext = createContext<ThemeContextValue>({ themeName: "midnight", setThemeName: () => undefined });

export function ThemeSelectionProvider({ children, initialTheme = "midnight" }: Readonly<{ children: ReactNode; initialTheme?: ThemeName }>) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(themeChangedEvent, onStoreChange);
    return () => { window.removeEventListener("storage", onStoreChange); window.removeEventListener(themeChangedEvent, onStoreChange); };
  }, []);
  const getSnapshot = useCallback((): ThemeName => {
    const saved = window.localStorage.getItem(storageKey);
    const theme = isThemeName(saved) ? saved : "midnight";
    if (saved) document.cookie = `${cookieKey}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    return theme;
  }, []);
  const themeName = useSyncExternalStore(subscribe, getSnapshot, () => initialTheme);

  const value = useMemo<ThemeContextValue>(() => ({
    themeName,
    setThemeName: (name) => {
      window.localStorage.setItem(storageKey, name);
      document.cookie = `${cookieKey}=${name}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.dispatchEvent(new Event(themeChangedEvent));
    }
  }), [themeName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSelection(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useSelectedOutreachTheme() {
  const { themeName } = useThemeSelection();
  return useMemo(() => createOutreachTheme(themeName), [themeName]);
}
