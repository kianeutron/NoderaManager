import { createCampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import { getDatabase } from "@/shared/db/client";

export function getCampaignsServices() {
  return createCampaignsServices({ database: getDatabase() });
}
