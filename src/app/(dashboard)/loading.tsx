import { PageLoading } from "@/shared/ui/PageLoading";

/** Shown at once when a dashboard page is opened, while the server prepares it: the click always gives feedback. */
export default function DashboardLoading() {
  return <PageLoading />;
}
