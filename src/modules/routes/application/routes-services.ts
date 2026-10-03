import { createRoutesServices } from "@/modules/routes/application/create-routes-services";
import { getDatabase } from "@/shared/db/client";

export function getRoutesServices() {
  return createRoutesServices({ database: getDatabase() });
}
