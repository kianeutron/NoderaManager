import { createOrganization } from "@/modules/organizations/application/create-organization.service";
import { getOrganization } from "@/modules/organizations/application/get-organization.service";
import { archiveOrganization, restoreOrganization } from "@/modules/organizations/application/set-organization-archived.service";
import { findSimilarOrganizations } from "@/modules/organizations/application/find-similar-organizations.service";
import { searchOrganizations } from "@/modules/organizations/application/search-organizations.service";
import { setOrganizationDomains } from "@/modules/organizations/application/set-organization-domains.service";
import { updateOrganization } from "@/modules/organizations/application/update-organization.service";
import { createOrganizationCommandsRepository } from "@/modules/organizations/data/organization-commands.repository";
import { createOrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { CreateOrganizationInput, OrganizationIdInput, OrganizationSearchQuery, SimilarOrganizationCheckInput, SetOrganizationDomainsInput, UpdateOrganizationInput } from "@/modules/organizations/domain/organization.schema";
import { createNoteRepository } from "@/modules/notes/data/note.repository";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createOrganizationsServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createOrganizationRepository(database);
  const commands = createOrganizationCommandsRepository(database);
  const notes = createNoteRepository(database);

  return {
    findSimilarOrganizations: (input: SimilarOrganizationCheckInput) => findSimilarOrganizations(reads, input),
    searchOrganizations: (query: OrganizationSearchQuery) => searchOrganizations(reads, query),
    findOrganizationsByDomains: (domains: readonly string[]) => reads.findOrganizationsByDomains(domains),
    getOrganization: (organizationId: string) => getOrganization({ reads, notes }, organizationId),
    createOrganization: (actor: AuthenticatedActor, input: CreateOrganizationInput) => createOrganization({ reads, commands }, actor, input),
    updateOrganization: (actor: AuthenticatedActor, input: UpdateOrganizationInput) => updateOrganization({ reads, commands }, actor, input),
    setOrganizationDomains: (actor: AuthenticatedActor, input: SetOrganizationDomainsInput) => setOrganizationDomains({ reads, commands }, actor, input),
    archiveOrganization: (actor: AuthenticatedActor, input: OrganizationIdInput) => archiveOrganization({ reads, commands }, actor, input),
    restoreOrganization: (actor: AuthenticatedActor, input: OrganizationIdInput) => restoreOrganization({ reads, commands }, actor, input)
  };
}

export type OrganizationsServices = ReturnType<typeof createOrganizationsServices>;
