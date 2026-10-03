import { clearPersonDoNotContact, markPersonDoNotContact } from "@/modules/people/application/do-not-contact.service";
import { createOrganizationRepository } from "@/modules/organizations/data/organization.repository";
import { createPerson } from "@/modules/people/application/create-person.service";
import { findDuplicateCandidates } from "@/modules/people/application/duplicate-candidate.service";
import { getPerson } from "@/modules/people/application/get-person.service";
import { archivePerson, restorePerson } from "@/modules/people/application/set-person-archived.service";
import { searchPeople } from "@/modules/people/application/search-people.service";
import { setPersonLinks } from "@/modules/people/application/set-person-links.service";
import { setPersonEmails } from "@/modules/people/application/set-person-emails.service";
import { updatePerson } from "@/modules/people/application/update-person.service";
import { createNoteRepository } from "@/modules/notes/data/note.repository";
import { createPersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import { createPersonRepository } from "@/modules/people/data/person.repository";
import type { IdentityFields } from "@/modules/people/domain/duplicate-candidates";
import type { CreatePersonInput, MarkDoNotContactInput, PersonIdInput, PersonSearchQuery, SetPersonEmailsInput, SetPersonLinksInput, UpdatePersonInput } from "@/modules/people/domain/person.schema";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createPeopleServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createPersonRepository(database);
  const commands = createPersonCommandsRepository(database);
  const organizations = createOrganizationRepository(database);
  const notes = createNoteRepository(database);

  return {
    findDuplicateCandidates: (identity: IdentityFields) => findDuplicateCandidates(reads, identity),
    searchPeople: (query: PersonSearchQuery) => searchPeople(reads, query),
    getPerson: (personId: string) => getPerson({ reads, notes }, personId),
    createPerson: (actor: AuthenticatedActor, input: CreatePersonInput) => createPerson({ reads, organizations, commands }, actor, input),
    updatePerson: (actor: AuthenticatedActor, input: UpdatePersonInput) => updatePerson({ reads, organizations, commands }, actor, input),
    setPersonEmails: (actor: AuthenticatedActor, input: SetPersonEmailsInput) => setPersonEmails({ reads, commands }, actor, input),
    setPersonLinks: (actor: AuthenticatedActor, input: SetPersonLinksInput) => setPersonLinks({ reads, commands }, actor, input),
    markPersonDoNotContact: (actor: AuthenticatedActor, input: MarkDoNotContactInput) => markPersonDoNotContact({ reads, commands }, actor, input),
    clearPersonDoNotContact: (actor: AuthenticatedActor, input: PersonIdInput) => clearPersonDoNotContact({ reads, commands }, actor, input),
    archivePerson: (actor: AuthenticatedActor, input: PersonIdInput) => archivePerson({ reads, commands }, actor, input),
    restorePerson: (actor: AuthenticatedActor, input: PersonIdInput) => restorePerson({ reads, commands }, actor, input)
  };
}

export type PeopleServices = ReturnType<typeof createPeopleServices>;
