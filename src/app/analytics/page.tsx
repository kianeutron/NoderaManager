import type { Metadata } from "next";
import { AnalyticsPage } from "@/modules/analytics/ui/AnalyticsPage";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";

export const metadata: Metadata = { title: "Analytics · Nodera" };
export default async function AnalyticsRoute() { await requireDashboardPageAccess(); return <AnalyticsPage />; }
