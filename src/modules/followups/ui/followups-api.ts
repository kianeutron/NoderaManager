import { hc } from "hono/client";
import type { FollowUpsRoutes } from "@/modules/followups/api/followups.routes";
import type { CreateFollowUpInput, FollowUpChanges, FollowUpSearchQuery } from "@/modules/followups/domain/followup.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const followUpsClient = () => hc<FollowUpsRoutes>(`${window.location.origin}/api/followups`);

export type FollowUpListFilters = Pick<FollowUpSearchQuery, "status" | "due" | "sort">;

export async function fetchFollowUpPage(filters: FollowUpListFilters, limit: number, cursor: string | undefined) {
  const { status, due, sort } = filters;
  const response = await followUpsClient().index.$get({ query: { limit: String(limit), status, sort, ...(due ? { due } : {}), ...(cursor ? { cursor } : {}) } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchFollowUp(id: string) {
  const response = await followUpsClient()[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchFollowUpSummary() {
  const response = await followUpsClient().summary.$get();
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function createFollowUp(input: CreateFollowUpInput) {
  const response = await followUpsClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateFollowUp(id: string, changes: FollowUpChanges) {
  const response = await followUpsClient()[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function completeFollowUp(id: string) {
  const response = await followUpsClient()[":id"].complete.$post({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function dismissFollowUp(id: string, reason: string) {
  const response = await followUpsClient()[":id"].dismiss.$post({ param: { id }, json: { reason } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
