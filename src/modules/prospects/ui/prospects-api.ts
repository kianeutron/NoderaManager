import { hc } from "hono/client";
import type { ProspectsRoutes } from "@/modules/prospects/api/prospects.routes";
import type { CreateProspectInput, ProspectChanges } from "@/modules/prospects/domain/prospect.schema";
import type { ProspectStatus, StructuralReason } from "@/modules/prospects/domain/prospect.types";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const prospectsClient = () => hc<ProspectsRoutes>(`${window.location.origin}/api/prospects`);

export async function fetchProspect(id: string) {
  const response = await prospectsClient()[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function createProspect(input: CreateProspectInput) {
  const response = await prospectsClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateProspect(id: string, changes: ProspectChanges) {
  const response = await prospectsClient()[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateProspectStatus(id: string, status: ProspectStatus, structuralReason?: StructuralReason) {
  const response = await prospectsClient()[":id"].status.$put({ param: { id }, json: { status, ...(structuralReason ? { structuralReason } : {}) } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
