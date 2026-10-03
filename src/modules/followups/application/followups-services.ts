import { createFollowUpsServices } from "@/modules/followups/application/create-followups-services";
import { getDatabase } from "@/shared/db/client";

export function getFollowUpsServices() {
  return createFollowUpsServices({ database: getDatabase() });
}
