import { addSignal } from "@/modules/prospects/application/add-signal.service";
import { createProspect } from "@/modules/prospects/application/create-prospect.service";
import { getProspect } from "@/modules/prospects/application/get-prospect.service";
import { searchProspects } from "@/modules/prospects/application/search-prospects.service";
import { updateProspectStatus } from "@/modules/prospects/application/update-prospect-status.service";
import { updateProspect } from "@/modules/prospects/application/update-prospect.service";
import { createNoteRepository } from "@/modules/notes/data/note.repository";
import { createOrganizationRepository } from "@/modules/organizations/data/organization.repository";
import { createPersonRepository } from "@/modules/people/data/person.repository";
import { createProspectCommandsRepository } from "@/modules/prospects/data/prospect-commands.repository";
import { createProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { AddSignalInput, CreateProspectInput, ProspectSearchQuery, UpdateProspectInput, UpdateProspectStatusInput } from "@/modules/prospects/domain/prospect.schema";
import { createRouteRepository } from "@/modules/routes/data/route.repository";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createProspectsServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createProspectRepository(database);
  const commands = createProspectCommandsRepository(database);
  const people = createPersonRepository(database);
  const organizations = createOrganizationRepository(database);
  const routes = createRouteRepository(database);
  const notes = createNoteRepository(database);

  return {
    searchProspects: (query: ProspectSearchQuery) => searchProspects(reads, query),
    getProspect: (prospectId: string) => getProspect({ reads, notes }, prospectId),
    createProspect: (actor: AuthenticatedActor, input: CreateProspectInput) => createProspect({ reads, people, organizations, routes, commands }, actor, input),
    updateProspect: (actor: AuthenticatedActor, input: UpdateProspectInput) => updateProspect({ reads, routes, commands }, actor, input),
    updateProspectStatus: (actor: AuthenticatedActor, input: UpdateProspectStatusInput) => updateProspectStatus({ reads, commands }, actor, input),
    addSignal: (actor: AuthenticatedActor, input: AddSignalInput) => addSignal({ reads, commands }, actor, input)
  };
}

export type ProspectsServices = ReturnType<typeof createProspectsServices>;
