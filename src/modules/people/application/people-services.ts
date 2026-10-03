import { createPeopleServices } from "@/modules/people/application/create-people-services";
import { getDatabase } from "@/shared/db/client";

export function getPeopleServices() {
  return createPeopleServices({ database: getDatabase() });
}
