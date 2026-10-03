import { createInteractionCommandsRepository } from "@/modules/interactions/data/interaction-commands.repository";
import { createInteractionRepository } from "@/modules/interactions/data/interaction.repository";
import { listInteractions } from "@/modules/interactions/application/list-interactions.service";
import { logBounce } from "@/modules/interactions/application/log-bounce.service";
import { logInteraction } from "@/modules/interactions/application/log-interaction.service";
import type { ListInteractionsQuery, LogBounceInput, LogInteractionInput } from "@/modules/interactions/domain/interaction.schema";
import { createProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";
import { createIdempotencyRepository } from "@/shared/idempotency/idempotency.repository";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createInteractionsServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createInteractionRepository(database);
  const commands = createInteractionCommandsRepository(database);
  const prospects = createProspectRepository(database);
  const idempotency = createIdempotencyRepository(database);

  return {
    listInteractions: (query: ListInteractionsQuery) => listInteractions(reads, query),
    logInteraction: (actor: AuthenticatedActor, input: LogInteractionInput) => logInteraction({ reads, idempotency, prospects, commands }, actor, input),
    logBounce: (actor: AuthenticatedActor, input: LogBounceInput) => logBounce({ reads, commands }, actor, input)
  };
}

export type InteractionsServices = ReturnType<typeof createInteractionsServices>;
