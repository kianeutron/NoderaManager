"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { backgroundNames, defaultBackground, type BackgroundName, isBackgroundName } from "@/shared/ui/backgrounds/background-config";

export { backgroundNames, isBackgroundName, type BackgroundName } from "@/shared/ui/backgrounds/background-config";

const storageKey = "nodera-background";
const cookieKey = "nodera-background";

type BackgroundContextValue = Readonly<{ backgroundName: BackgroundName; setBackgroundName: (name: BackgroundName) => void }>;
const BackgroundContext = createContext<BackgroundContextValue>({ backgroundName: defaultBackground, setBackgroundName: () => undefined });

export function BackgroundSelectionProvider({ children, initialBackground = defaultBackground }: Readonly<{ children: ReactNode; initialBackground?: BackgroundName }>) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener("nodera-background-changed", onStoreChange);
    return () => { window.removeEventListener("storage", onStoreChange); window.removeEventListener("nodera-background-changed", onStoreChange); };
  }, []);
  const getSnapshot = useCallback((): BackgroundName => {
    const saved = window.localStorage.getItem(storageKey);
    return isBackgroundName(saved) ? saved : defaultBackground;
  }, []);
  const backgroundName = useSyncExternalStore(subscribe, getSnapshot, () => initialBackground);
  const value = useMemo<BackgroundContextValue>(() => ({
    backgroundName,
    setBackgroundName: (name) => {
      window.localStorage.setItem(storageKey, name);
      document.cookie = `${cookieKey}=${name}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.dispatchEvent(new Event("nodera-background-changed"));
    }
  }), [backgroundName]);
  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackgroundSelection(): BackgroundContextValue {
  return useContext(BackgroundContext);
}
