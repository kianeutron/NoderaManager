import { hc } from "hono/client";
import type { OutreachRoutes } from "@/modules/outreach/api/outreach.routes";
import type { LogOutreachInput, OutreachSearchQuery } from "@/modules/outreach/domain/outreach.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const outreachClient = () => hc<OutreachRoutes>(`${window.location.origin}/api/outreach`);

export type OutreachListFilters = Pick<OutreachSearchQuery, "q" | "channel" | "replyStatus" | "sort">;

export async function fetchOutreachPage(filters: OutreachListFilters, limit: number, cursor: string | undefined) {
  const { q, channel, replyStatus, sort } = filters;
  const response = await outreachClient().messages.$get({
    query: { limit: String(limit), sort, ...(q ? { q } : {}), ...(channel ? { channel } : {}), ...(replyStatus ? { replyStatus } : {}), ...(cursor ? { cursor } : {}) }
  });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchOutreachMessage(id: string) {
  const response = await outreachClient().messages[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchOutreachSummary() {
  const response = await outreachClient().summary.$get();
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchOutreachTargets(q: string | undefined) {
  const response = await outreachClient().targets.$get({ query: q ? { q } : {} });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).targets;
}

export async function logOutreach(input: LogOutreachInput) {
  const response = await outreachClient().messages.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
