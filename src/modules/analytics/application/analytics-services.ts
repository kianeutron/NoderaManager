import { createAnalyticsServices } from "@/modules/analytics/application/create-analytics-services";
import { getDatabase } from "@/shared/db/client";

export function getAnalyticsServices() {
  return createAnalyticsServices({ database: getDatabase() });
}
