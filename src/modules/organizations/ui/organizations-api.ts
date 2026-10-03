import { hc } from "hono/client";
import type { OrganizationsRoutes } from "@/modules/organizations/api/organizations.routes";
import type { CreateOrganizationInput, OrganizationChanges, OrganizationSearchQuery } from "@/modules/organizations/domain/organization.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const organizationsClient = () => hc<OrganizationsRoutes>(`${window.location.origin}/api/organizations`);

export type OrganizationFilters = Pick<OrganizationSearchQuery, "q" | "organizationType" | "sort" | "scope">;

export async function fetchOrganizationsPage(filters: OrganizationFilters, limit: number, cursor: string | undefined) {
  const { q, organizationType, sort, scope } = filters;
  const response = await organizationsClient().index.$get({
    query: { limit: String(limit), sort, scope, ...(q ? { q } : {}), ...(organizationType ? { organizationType } : {}), ...(cursor ? { cursor } : {}) }
  });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchOrganization(id: string) {
  const response = await organizationsClient()[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function createOrganization(input: CreateOrganizationInput) {
  const response = await organizationsClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateOrganization(id: string, changes: OrganizationChanges) {
  const response = await organizationsClient()[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setOrganizationDomains(id: string, domains: string[]) {
  const response = await organizationsClient()[":id"].domains.$put({ param: { id }, json: { domains } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setOrganizationArchived(id: string, archive: boolean) {
  const organization = organizationsClient()[":id"];
  const response = await (archive ? organization.archive.$post({ param: { id } }) : organization.restore.$post({ param: { id } }));
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function checkSimilarOrganizations(name: string) {
  const response = await organizationsClient()["similar-check"].$post({ json: { name } });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).data.similar;
}
