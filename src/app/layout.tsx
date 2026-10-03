import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { AppProviders } from "@/shared/ui/AppProviders";
import { isThemeName, type ThemeName } from "@/shared/ui/theme";
import { isBackgroundName, type BackgroundName } from "@/shared/ui/backgrounds/background-config";

export const metadata: Metadata = {
  title: "Outreach Hub",
  description: "Private client-acquisition workspace"
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get("x-nonce");
  const savedTheme = (await cookies()).get("nodera-theme")?.value;
  const initialTheme: ThemeName = isThemeName(savedTheme) ? savedTheme : "midnight";
  const savedBackground = (await cookies()).get("nodera-background")?.value;
  const initialBackground: BackgroundName = isBackgroundName(savedBackground) ? savedBackground : "topography";

  return (
    <html lang="en">
      <body><AppProviders initialBackground={initialBackground} initialTheme={initialTheme} {...(nonce ? { nonce } : {})}>{children}</AppProviders></body>
    </html>
  );
}
