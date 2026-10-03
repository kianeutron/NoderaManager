import { createOutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { getDatabase } from "@/shared/db/client";

export function getOutreachServices() {
  return createOutreachServices({ database: getDatabase() });
}
