import type { Metadata } from "next";
import { OutreachPage } from "@/modules/outreach/ui/OutreachPage";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";

export const metadata: Metadata = { title: "Outreach · Nodera" };
export default async function OutreachRoute() { await requireDashboardPageAccess(); return <OutreachPage />; }
