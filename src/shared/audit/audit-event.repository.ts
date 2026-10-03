import { v7 as uuidv7 } from "uuid";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { auditEvents } from "@/shared/db/schema/core";

type AuditDatabase = ReturnType<typeof getDatabase>;

/**
 * Builds (does not run) the insert for an audit event. Repositories append `statement` to the same
 * `database.batch([...])` as the mutation it describes, so both commit or neither does. The id is
 * generated here so callers can hand an event reference back to the client.
 */
export function prepareAuditEvent(database: AuditDatabase, input: AuditEventInput) {
  const id = uuidv7();
  return { id, statement: database.insert(auditEvents).values({ ...input, id }) };
}
