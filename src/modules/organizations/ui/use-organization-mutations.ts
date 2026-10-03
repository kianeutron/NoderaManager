"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateOrganizationInput, OrganizationChanges } from "@/modules/organizations/domain/organization.schema";
import { checkSimilarOrganizations, createOrganization, setOrganizationArchived, setOrganizationDomains, updateOrganization } from "@/modules/organizations/ui/organizations-api";
import { organizationKeys } from "@/modules/organizations/ui/use-organization-queries";
import { peopleKeys } from "@/modules/people/ui/use-people-queries";

/** People show their company's name, so both caches are refreshed. Runs after failures too, because an edit can be partly applied. */
function useInvalidateOrganizations() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: organizationKeys.all }), queryClient.invalidateQueries({ queryKey: peopleKeys.all })]);
}

export function useCreateOrganization() {
  const invalidate = useInvalidateOrganizations();
  return useMutation({ mutationFn: (input: CreateOrganizationInput) => createOrganization(input), onSettled: invalidate });
}

export type OrganizationEdit = Readonly<{ organizationId: string; changes: OrganizationChanges | null; domains: string[] | null }>;

/** Fields and domains are separate commands, so they run in turn; each is skipped when nothing changed. */
export function useUpdateOrganization() {
  const invalidate = useInvalidateOrganizations();
  return useMutation({
    mutationFn: async ({ organizationId, changes, domains }: OrganizationEdit) => {
      if (changes) await updateOrganization(organizationId, changes);
      if (domains) await setOrganizationDomains(organizationId, domains);
    },
    onSettled: invalidate
  });
}

export function useSetOrganizationArchived() {
  const invalidate = useInvalidateOrganizations();
  return useMutation({ mutationFn: ({ organizationId, archive }: Readonly<{ organizationId: string; archive: boolean }>) => setOrganizationArchived(organizationId, archive), onSettled: invalidate });
}

/** Read-only, so it needs no invalidation; a mutation only so its pending and failed states are tracked like the saves around it. */
export function useCheckSimilarOrganizations() {
  return useMutation({ mutationFn: (name: string) => checkSimilarOrganizations(name) });
}
