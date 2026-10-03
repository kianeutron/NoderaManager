import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import { normalizeText } from "@/shared/lib/normalize-text";
import type { SimilarOrganizationCheckInput } from "@/modules/organizations/domain/organization.schema";
import type { SimilarOrganization } from "@/modules/organizations/domain/organization.types";

/** Companies with the same name. Advisory only: a company is never merged or blocked on its name (docs/02-data/04-deduplication.md). */
export async function findSimilarOrganizations(reads: Pick<OrganizationRepository, "findOrganizationsByNormalizedName">, { name }: SimilarOrganizationCheckInput): Promise<readonly SimilarOrganization[]> {
  return reads.findOrganizationsByNormalizedName(normalizeText(name));
}
