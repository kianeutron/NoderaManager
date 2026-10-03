"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateFollowUpInput, FollowUpChanges } from "@/modules/followups/domain/followup.schema";
import { completeFollowUp, createFollowUp, dismissFollowUp, updateFollowUp } from "@/modules/followups/ui/followups-api";
import { followUpKeys } from "@/modules/followups/ui/use-followup-queries";

/** Every list and count of follow-ups changes with any of these, so they are all refreshed, even after a failure. */
function useInvalidateFollowUps() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: followUpKeys.all });
}

export function useCreateFollowUp() {
  const invalidate = useInvalidateFollowUps();
  return useMutation({ mutationFn: (input: CreateFollowUpInput) => createFollowUp(input), onSettled: invalidate });
}

export function useUpdateFollowUp() {
  const invalidate = useInvalidateFollowUps();
  return useMutation({ mutationFn: ({ followUpId, changes }: Readonly<{ followUpId: string; changes: FollowUpChanges }>) => updateFollowUp(followUpId, changes), onSettled: invalidate });
}

export function useCompleteFollowUp() {
  const invalidate = useInvalidateFollowUps();
  return useMutation({ mutationFn: (followUpId: string) => completeFollowUp(followUpId), onSettled: invalidate });
}

export function useDismissFollowUp() {
  const invalidate = useInvalidateFollowUps();
  return useMutation({ mutationFn: ({ followUpId, reason }: Readonly<{ followUpId: string; reason: string }>) => dismissFollowUp(followUpId, reason), onSettled: invalidate });
}
