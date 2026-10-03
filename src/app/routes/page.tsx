import type { Metadata } from "next";
import { RoutesAndCampaignsPage } from "@/modules/campaigns/ui/RoutesAndCampaignsPage";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";

export const metadata: Metadata = { title: "Routes & campaigns · Outreach Hub" };

export default async function RoutesRoute() {
  await requireDashboardPageAccess();

  return <RoutesAndCampaignsPage />;
}
