import { hc } from "hono/client";
import type { CampaignsRoutes } from "@/modules/campaigns/api/campaigns.routes";
import type { CampaignChanges, CampaignRouteInput, CampaignSearchQuery, CreateCampaignInput } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const campaignsClient = () => hc<CampaignsRoutes>(`${window.location.origin}/api/campaigns`);

export type CampaignListFilters = Pick<CampaignSearchQuery, "q" | "status" | "scope" | "sort">;

export async function fetchCampaignPage(filters: CampaignListFilters, limit: number, cursor: string | undefined) {
  const { q, status, scope, sort } = filters;
  const response = await campaignsClient().index.$get({ query: { limit: String(limit), scope, sort, ...(q ? { q } : {}), ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

/** The active campaigns a prospect belongs to, for choosing one when logging outreach. */
export async function fetchProspectCampaigns(prospectId: string) {
  const response = await campaignsClient().index.$get({ query: { prospectId, status: "active", scope: "active", sort: "updated", limit: "50" } });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).items;
}

export async function fetchCampaign(id: string) {
  const response = await campaignsClient()[":id"].$get({ param: { id } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchCampaignMembersPage(id: string, limit: number, cursor: string | undefined) {
  const response = await campaignsClient()[":id"].members.$get({ param: { id }, query: { limit: String(limit), sort: "added", ...(cursor ? { cursor } : {}) } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function fetchCampaignSuggestions(id: string, q: string | undefined) {
  const response = await campaignsClient()[":id"].suggestions.$get({ param: { id }, query: { limit: "25", ...(q ? { q } : {}) } });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).suggestions;
}

export async function createCampaign(input: CreateCampaignInput) {
  const response = await campaignsClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function updateCampaign(id: string, changes: CampaignChanges) {
  const response = await campaignsClient()[":id"].$patch({ param: { id }, json: changes });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setCampaignRoutes(id: string, routes: CampaignRouteInput[]) {
  const response = await campaignsClient()[":id"].routes.$put({ param: { id }, json: { routes } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setCampaignStatus(id: string, status: CampaignStatus) {
  const response = await campaignsClient()[":id"].status.$put({ param: { id }, json: { status } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function setCampaignArchived(id: string, archive: boolean) {
  const campaign = campaignsClient()[":id"];
  const response = await (archive ? campaign.archive.$post({ param: { id } }) : campaign.restore.$post({ param: { id } }));
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function addCampaignProspects(id: string, prospectIds: string[]) {
  const response = await campaignsClient()[":id"].prospects.$post({ param: { id }, json: { prospectIds } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function removeCampaignProspects(id: string, prospectIds: string[]) {
  const response = await campaignsClient()[":id"].prospects.remove.$post({ param: { id }, json: { prospectIds } });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
