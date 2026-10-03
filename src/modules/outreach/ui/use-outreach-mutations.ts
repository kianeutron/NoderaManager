"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LogOutreachInput } from "@/modules/outreach/domain/outreach.schema";
import { logOutreach } from "@/modules/outreach/ui/outreach-api";
import { outreachKeys } from "@/modules/outreach/ui/use-outreach-queries";
import { organizationKeys } from "@/modules/organizations/ui/use-organization-queries";
import { peopleKeys } from "@/modules/people/ui/use-people-queries";
import { prospectKeys } from "@/modules/prospects/ui/use-prospect-queries";

/** Logging moves a prospect's status and a person's last-contacted date, so every list that shows them is refreshed, even after a failure. */
export function useLogOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogOutreachInput) => logOutreach(input),
    onSettled: () => Promise.all([outreachKeys.all, peopleKeys.all, organizationKeys.all, prospectKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}
