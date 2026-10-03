"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { fetchProspect } from "@/modules/prospects/ui/prospects-api";
import { shouldRetryRequest } from "@/shared/api/api-request-error";

export const prospectKeys = {
  all: ["prospects"] as const,
  detail: (id: string) => [...prospectKeys.all, "detail", id] as const
};

export function useProspect(id: string | null) {
  return useQuery({ queryKey: prospectKeys.detail(id ?? ""), queryFn: id === null ? skipToken : () => fetchProspect(id), retry: shouldRetryRequest });
}
