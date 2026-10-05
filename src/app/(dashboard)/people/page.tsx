import type { Metadata } from "next";
import { PeopleAndCompaniesPage } from "@/modules/people/ui/PeopleAndCompaniesPage";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";

export const metadata: Metadata = { title: "People & companies · Outreach Hub" };

export default async function PeopleRoute() {
  await requireDashboardPageAccess();

  return <PeopleAndCompaniesPage />;
}
