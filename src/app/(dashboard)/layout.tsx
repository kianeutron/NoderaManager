import type { ReactNode } from "react";
import { AppShell } from "@/shared/ui/AppShell";

/**
 * The sidebar and header, rendered once for every dashboard page. A client navigation only re-renders the page below this
 * layout, so the shell keeps its state (collapsed navigation) and is never rebuilt. Each page still checks access itself:
 * a layout does not run again on a client navigation, so it cannot be the only guard.
 */
export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
