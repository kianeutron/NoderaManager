"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "@/modules/organizations/ui/use-organization-queries";
import { peopleKeys } from "@/modules/people/ui/use-people-queries";
import type { CreateProspectInput, ProspectChanges } from "@/modules/prospects/domain/prospect.schema";
import type { ProspectStatus, StructuralReason } from "@/modules/prospects/domain/prospect.types";
import { createProspect, updateProspect, updateProspectStatus } from "@/modules/prospects/ui/prospects-api";
import { prospectKeys } from "@/modules/prospects/ui/use-prospect-queries";

/** A prospect appears in its person's and organization's previews, so all three caches are refreshed, even after a failure. */
function useInvalidateProspects() {
  const queryClient = useQueryClient();
  return () => Promise.all([prospectKeys.all, peopleKeys.all, organizationKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useCreateProspect() {
  const invalidate = useInvalidateProspects();
  return useMutation({ mutationFn: (input: CreateProspectInput) => createProspect(input), onSettled: invalidate });
}

export function useUpdateProspect() {
  const invalidate = useInvalidateProspects();
  return useMutation({ mutationFn: ({ prospectId, changes }: Readonly<{ prospectId: string; changes: ProspectChanges }>) => updateProspect(prospectId, changes), onSettled: invalidate });
}

export function useUpdateProspectStatus() {
  const invalidate = useInvalidateProspects();
  return useMutation({
    mutationFn: ({ prospectId, status, structuralReason }: Readonly<{ prospectId: string; status: ProspectStatus; structuralReason?: StructuralReason }>) => updateProspectStatus(prospectId, status, structuralReason),
    onSettled: invalidate
  });
}
