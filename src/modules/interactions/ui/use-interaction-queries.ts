"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { fetchInteractions } from "@/modules/interactions/ui/interactions-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";

export const interactionKeys = {
  all: ["interactions"] as const,
  forProspect: (prospectId: string) => [...interactionKeys.all, "prospect", prospectId] as const
};

export function useInteractions(prospectId: string | null) {
  return useQuery({ queryKey: interactionKeys.forProspect(prospectId ?? ""), queryFn: prospectId === null ? skipToken : () => fetchInteractions(prospectId), retry: shouldRetryRequest });
}
