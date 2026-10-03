import type { InteractionRepository } from "@/modules/interactions/data/interaction.repository";
import type { ListInteractionsQuery } from "@/modules/interactions/domain/interaction.schema";
import type { InteractionView } from "@/modules/interactions/domain/interaction.types";

export async function listInteractions(reads: Pick<InteractionRepository, "listInteractions">, { prospectId, limit }: ListInteractionsQuery): Promise<readonly InteractionView[]> {
  const rows = await reads.listInteractions(prospectId, limit);
  return rows.map(({ occurredAt, ...row }) => ({ ...row, occurredAt: occurredAt.toISOString() }));
}
