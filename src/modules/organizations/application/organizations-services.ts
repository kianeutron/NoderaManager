import { createOrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { getDatabase } from "@/shared/db/client";

export function getOrganizationsServices() {
  return createOrganizationsServices({ database: getDatabase() });
}
