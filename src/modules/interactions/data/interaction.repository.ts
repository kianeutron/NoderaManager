import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { InteractionType } from "@/modules/interactions/domain/interaction.types";
import type { getDatabase } from "@/shared/db/client";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";

type InteractionsDatabase = ReturnType<typeof getDatabase>;

const recentDuplicateWindowMinutes = 10;

export function createInteractionRepository(database: InteractionsDatabase) {
  return {
    /** A prospect's timeline, newest first. A prospect has a handful of these, so it is one bounded read, not a paged list. */
    listInteractions: (prospectId: string, limit: number) =>
      database.select({
        id: interactions.id, type: interactions.type, direction: interactions.direction, channel: interactions.channel, occurredAt: interactions.occurredAt, subject: interactions.subject,
        body: interactions.body, responseDepth: interactions.responseDepth, sentiment: interactions.sentiment, outreachMessageId: interactions.outreachMessageId
      }).from(interactions)
        .where(eq(interactions.prospectId, prospectId))
        .orderBy(desc(interactions.occurredAt), desc(interactions.id))
        .limit(limit),

    /** The message an interaction answers or a bounce is about. */
    findMessage: async (id: string) => {
      const [row] = await database.select({
        id: outreachMessages.id, prospectId: outreachMessages.prospectId, channel: outreachMessages.channel,
        replyStatus: outreachMessages.replyStatus, bounceStatus: outreachMessages.bounceStatus, deliveryStatus: outreachMessages.deliveryStatus
      }).from(outreachMessages).where(eq(outreachMessages.id, id)).limit(1);
      return row ?? null;
    },

    /** The same thing recorded moments ago on the same prospect is a double submit, not a second event. */
    findRecentDuplicate: async (draft: Readonly<{ prospectId: string; outreachMessageId: string | null; type: InteractionType; direction: string; body: string | null }>) => {
      const [row] = await database.select({ id: interactions.id }).from(interactions)
        .where(and(
          eq(interactions.prospectId, draft.prospectId),
          draft.outreachMessageId === null ? isNull(interactions.outreachMessageId) : eq(interactions.outreachMessageId, draft.outreachMessageId),
          eq(interactions.type, draft.type),
          sql`${interactions.direction} = ${draft.direction}`,
          draft.body === null ? isNull(interactions.body) : eq(interactions.body, draft.body),
          gt(interactions.createdAt, sql`now() - make_interval(mins => ${recentDuplicateWindowMinutes}::int)`)
        ))
        .orderBy(desc(interactions.createdAt))
        .limit(1);
      return row ?? null;
    }
  };
}

export type InteractionRepository = ReturnType<typeof createInteractionRepository>;
