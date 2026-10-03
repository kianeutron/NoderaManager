import { createFollowUpCommandsRepository } from "@/modules/followups/data/followup-commands.repository";
import { createFollowUpRepository } from "@/modules/followups/data/followup.repository";
import { createFollowUp } from "@/modules/followups/application/create-followup.service";
import { completeFollowUp, dismissFollowUp } from "@/modules/followups/application/finish-followup.service";
import { toFollowUpView } from "@/modules/followups/application/followup-views";
import { searchFollowUps } from "@/modules/followups/application/search-followups.service";
import { updateFollowUp } from "@/modules/followups/application/update-followup.service";
import type { CreateFollowUpInput, DismissFollowUpInput, FollowUpIdInput, FollowUpSearchQuery, UpdateFollowUpInput } from "@/modules/followups/domain/followup.schema";
import { createProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createFollowUpsServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createFollowUpRepository(database);
  const commands = createFollowUpCommandsRepository(database);
  const prospects = createProspectRepository(database);

  return {
    searchFollowUps: (query: FollowUpSearchQuery) => searchFollowUps(reads, query),
    getFollowUp: async (followUpId: string) => {
      const row = await reads.findFollowUp(followUpId);
      return row ? toFollowUpView(row) : null;
    },
    getFollowUpSummary: () => reads.summarize(),
    createFollowUp: (actor: AuthenticatedActor, input: CreateFollowUpInput) => createFollowUp({ reads, prospects, commands }, actor, input),
    updateFollowUp: (actor: AuthenticatedActor, input: UpdateFollowUpInput) => updateFollowUp({ reads, commands }, actor, input),
    completeFollowUp: (actor: AuthenticatedActor, input: FollowUpIdInput) => completeFollowUp({ reads, commands }, actor, input),
    dismissFollowUp: (actor: AuthenticatedActor, input: DismissFollowUpInput) => dismissFollowUp({ reads, commands }, actor, input)
  };
}

export type FollowUpsServices = ReturnType<typeof createFollowUpsServices>;
