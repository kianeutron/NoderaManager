import type { Metadata } from "next";
import { OverviewPage } from "@/modules/analytics/ui/OverviewPage";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";

export const metadata: Metadata = { title: "Overview · Nodera" };
export default async function OverviewRoute() { await requireDashboardPageAccess(); return <OverviewPage />; }
