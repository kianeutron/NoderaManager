"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LogBounceInput, LogInteractionInput } from "@/modules/interactions/domain/interaction.schema";
import { logBounce, logInteraction } from "@/modules/interactions/ui/interactions-api";
import { interactionKeys } from "@/modules/interactions/ui/use-interaction-queries";
import { organizationKeys } from "@/modules/organizations/ui/use-organization-queries";
import { outreachKeys } from "@/modules/outreach/ui/use-outreach-queries";
import { peopleKeys } from "@/modules/people/ui/use-people-queries";
import { prospectKeys } from "@/modules/prospects/ui/use-prospect-queries";

/** An interaction can change a message's reply or bounce state, a prospect's status and a person's last-contacted date, so all of those are refreshed, even after a failure. */
function useInvalidateAfterInteraction() {
  const queryClient = useQueryClient();
  return () => Promise.all([interactionKeys.all, outreachKeys.all, prospectKeys.all, peopleKeys.all, organizationKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useLogInteraction() {
  const invalidate = useInvalidateAfterInteraction();
  return useMutation({ mutationFn: (input: LogInteractionInput) => logInteraction(input), onSettled: invalidate });
}

export function useLogBounce() {
  const invalidate = useInvalidateAfterInteraction();
  return useMutation({ mutationFn: (input: LogBounceInput) => logBounce(input), onSettled: invalidate });
}
