import { createProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { getDatabase } from "@/shared/db/client";

export function getProspectsServices() {
  return createProspectsServices({ database: getDatabase() });
}
