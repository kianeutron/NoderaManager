import type { Metadata } from "next";
import { LibraryPage } from "@/modules/library/ui/LibraryPage";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";

export const metadata: Metadata = { title: "Library · Outreach Hub" };

export default async function LibraryRoute() {
  await requireDashboardPageAccess();

  return <LibraryPage />;
}
