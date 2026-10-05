import { and, eq } from "drizzle-orm";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { externalRefs } from "@/shared/db/schema/integration";

type ExternalRefDatabase = ReturnType<typeof getDatabase>;
type ExternalRefTarget = Readonly<{
  personId?: string;
  organizationId?: string;
  prospectId?: string;
  outreachMessageId?: string;
  interactionId?: string;
}>;

export function createExternalRefRepository(database: ExternalRefDatabase) {
  return {
    find: async (source: string, refType: string, externalId: string) => {
      const [row] = await database.select({
        id: externalRefs.id,
        personId: externalRefs.personId,
        organizationId: externalRefs.organizationId,
        prospectId: externalRefs.prospectId,
        outreachMessageId: externalRefs.outreachMessageId,
        interactionId: externalRefs.interactionId
      }).from(externalRefs).where(and(eq(externalRefs.source, source as never), eq(externalRefs.refType, refType as never), eq(externalRefs.externalId, externalId))).limit(1);
      return row ?? null;
    },

    link: async ({ source, refType, externalId, target, audit }: Readonly<{ source: string; refType: string; externalId: string; target: ExternalRefTarget; audit: AuditEventInput }>) => {
      const existing = await database.select({ id: externalRefs.id }).from(externalRefs).where(and(eq(externalRefs.source, source as never), eq(externalRefs.refType, refType as never), eq(externalRefs.externalId, externalId))).limit(1);
      if (existing[0]) return { created: false, id: existing[0].id };
      const auditEvent = prepareAuditEvent(database, audit);
      await database.batch([
        database.insert(externalRefs).values({ source: source as never, refType: refType as never, externalId, ...target }),
        auditEvent.statement
      ]);
      return { created: true, id: null };
    }
  };
}

export type ExternalRefRepository = ReturnType<typeof createExternalRefRepository>;
