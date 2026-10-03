import { and, asc, count, eq, gte, isNull, lt, notInArray, sql } from "drizzle-orm";
import { deepestResponse, type AnalyticsDatabase } from "@/modules/analytics/data/sql-fragments";
import { closedProspectStatuses } from "@/modules/prospects/domain/prospect-status";
import { organizations, people, prospects } from "@/shared/db/schema/core";
import { outreachMessages } from "@/shared/db/schema/engagement";

const awaitingReplyLimit = 6;

/** What only the overview reads: the pipeline as it stands, how deep replies went, and who is waiting on an answer. */
export function createOverviewRepository(database: AnalyticsDatabase) {
  /** The newest message per prospect, so a prospect that was messaged twice is waiting on one answer, not two. */
  const newestMessagePerProspect = (since: Date) => database.selectDistinctOn([outreachMessages.prospectId], {
    messageId: outreachMessages.id, prospectId: outreachMessages.prospectId, personId: outreachMessages.personId, organizationId: outreachMessages.organizationId,
    channel: outreachMessages.channel, sentAt: outreachMessages.sentAt, replyStatus: outreachMessages.replyStatus, bounceStatus: outreachMessages.bounceStatus
  }).from(outreachMessages).where(gte(outreachMessages.sentAt, since)).orderBy(outreachMessages.prospectId, sql`${outreachMessages.sentAt} desc`).as("newest_message");

  return {
    /** Prospects by status, archived ones left out. */
    prospectsByStatus: () => database.select({ status: prospects.status, prospects: count() }).from(prospects).where(isNull(prospects.archivedAt)).groupBy(prospects.status),

    /** How many prospects' deepest classified reply reached each step. */
    depthReached: () => {
      const deepest = deepestResponse(database);
      return database.select({ depth: deepest.depth, prospects: count() }).from(deepest).groupBy(deepest.depth);
    },

    /** Open prospects whose newest message, sent between `since` and `before`, has had no reply and did not bounce. Oldest first. */
    awaitingReply: async ({ since, before }: Readonly<{ since: Date; before: Date }>) => {
      const newest = newestMessagePerProspect(since);
      const waiting = and(
        lt(newest.sentAt, before), eq(newest.replyStatus, "none"), eq(newest.bounceStatus, "none"),
        isNull(prospects.archivedAt), notInArray(prospects.status, [...closedProspectStatuses, "dormant"])
      );
      const [items, [totals]] = await Promise.all([
        database.select({ messageId: newest.messageId, prospectId: newest.prospectId, channel: newest.channel, sentAt: newest.sentAt, personName: people.fullName, organizationName: organizations.name })
          .from(newest).innerJoin(prospects, eq(prospects.id, newest.prospectId))
          .leftJoin(people, eq(people.id, newest.personId)).leftJoin(organizations, eq(organizations.id, newest.organizationId))
          .where(waiting).orderBy(asc(newest.sentAt)).limit(awaitingReplyLimit),
        database.select({ total: count() }).from(newest).innerJoin(prospects, eq(prospects.id, newest.prospectId)).where(waiting)
      ]);
      return { total: totals?.total ?? 0, items };
    }
  };
}

export type OverviewRepository = ReturnType<typeof createOverviewRepository>;
