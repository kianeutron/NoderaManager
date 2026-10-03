import { createCampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { createProspectRepository } from "@/modules/prospects/data/prospect.repository";
import { createOutreachCommandsRepository } from "@/modules/outreach/data/outreach-commands.repository";
import { createOutreachRepository } from "@/modules/outreach/data/outreach.repository";
import { getOutreachMessage } from "@/modules/outreach/application/get-outreach-message.service";
import { logOutreach } from "@/modules/outreach/application/log-outreach.service";
import { searchOutreach } from "@/modules/outreach/application/search-outreach.service";
import { createIdempotencyRepository } from "@/shared/idempotency/idempotency.repository";
import type { LogOutreachInput, OutreachSearchQuery, OutreachTargetQuery } from "@/modules/outreach/domain/outreach.schema";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createOutreachServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createOutreachRepository(database);
  const prospects = createProspectRepository(database);
  const campaigns = createCampaignRepository(database);
  const idempotency = createIdempotencyRepository(database);
  const commands = createOutreachCommandsRepository(database);

  return {
    searchOutreach: (query: OutreachSearchQuery) => searchOutreach(reads, query),
    getOutreachMessage: (messageId: string) => getOutreachMessage(reads, messageId),
    getOutreachSummary: () => reads.summarize(),
    listOutreachTargets: (query: OutreachTargetQuery) => reads.listTargets(query),
    logOutreach: (actor: AuthenticatedActor, input: LogOutreachInput) => logOutreach({ reads, idempotency, prospects, campaigns, commands }, actor, input)
  };
}

export type OutreachServices = ReturnType<typeof createOutreachServices>;
