import { hc } from "hono/client";
import type { PeopleRoutes } from "@/modules/people/api/people.routes";
import type { CreatePersonInput, PersonChanges, PersonIdentityInput, PersonSearchQuery, SetPersonLinksInput } from "@/modules/people/domain/person.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const peopleClient = () => hc<PeopleRoutes>(`${window.location.origin}/api/people`);

export type PeopleFilters = Pick<PersonSearchQuery, "q" | "persona" | "organizationId" | "sort" | "scope">;

export async function fetchPeoplePage(filters: PeopleFilters, limit: number, cursor: string | undefined) {
  const { q, persona, organizationId, sort, scope } = filters;
  const response = await peopleClient().index.$get({
    query: { limit: String(limit), sort, scope, ...(q ? { q } : {}), ...(persona ? { persona } : {}), ...(organizationId ? { organizationId } : {}), ...(cursor ? { cursor } : {}) }
  });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchPerson(id: string) {
  const response = await peopleClient()[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function checkPersonDuplicates(identity: PersonIdentityInput) {
  const response = await peopleClient()["duplicate-check"].$post({ json: identity });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).data.candidates;
}

export async function createPerson(input: CreatePersonInput) {
  const response = await peopleClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updatePerson(id: string, changes: PersonChanges) {
  const response = await peopleClient()[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setPersonEmails(id: string, emails: string[]) {
  const response = await peopleClient()[":id"].emails.$put({ param: { id }, json: { emails } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function markPersonDoNotContact(id: string, reason: string) {
  const response = await peopleClient()[":id"]["do-not-contact"].$put({ param: { id }, json: { reason } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function clearPersonDoNotContact(id: string) {
  const response = await peopleClient()[":id"]["do-not-contact"].$delete({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setPersonArchived(id: string, archive: boolean) {
  const person = peopleClient()[":id"];
  const response = await (archive ? person.archive.$post({ param: { id } }) : person.restore.$post({ param: { id } }));
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setPersonLinks(id: string, links: SetPersonLinksInput["links"]) {
  const response = await peopleClient()[":id"].links.$put({ param: { id }, json: { links } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
