import { hc } from "hono/client";
import type { InteractionsRoutes } from "@/modules/interactions/api/interactions.routes";
import { interactionTimelineLimit, type LogBounceInput, type LogInteractionInput } from "@/modules/interactions/domain/interaction.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const interactionsClient = () => hc<InteractionsRoutes>(`${window.location.origin}/api/interactions`);

export async function fetchInteractions(prospectId: string) {
  const response = await interactionsClient().index.$get({ query: { prospectId, limit: String(interactionTimelineLimit) } });
  if (!response.ok) throw await toApiRequestError(response);
  return (await response.json()).interactions;
}

export async function logInteraction(input: LogInteractionInput) {
  const response = await interactionsClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}

export async function logBounce(input: LogBounceInput) {
  const response = await interactionsClient().bounces.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
