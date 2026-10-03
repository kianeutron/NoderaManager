import { createInteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import { getDatabase } from "@/shared/db/client";

export function getInteractionsServices() {
  return createInteractionsServices({ database: getDatabase() });
}
