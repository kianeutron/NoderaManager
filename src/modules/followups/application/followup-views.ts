import type { FollowUpRepository } from "@/modules/followups/data/followup.repository";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";

type FollowUpRow = NonNullable<Awaited<ReturnType<FollowUpRepository["findFollowUp"]>>>;

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

export function toFollowUpView(row: FollowUpRow): FollowUpView {
  return {
    id: row.id, status: row.status, reason: row.reason, dueAt: iso(row.dueAt), notBeforeAt: iso(row.notBeforeAt), suggestedChannel: row.suggestedChannel,
    completedAt: iso(row.completedAt), dismissedReason: row.dismissedReason, createdAt: row.createdAt.toISOString(),
    prospect: { id: row.prospectId, status: row.prospectStatus, routeName: row.routeName },
    person: row.personId && row.personName ? { id: row.personId, fullName: row.personName } : null,
    organization: row.organizationId && row.organizationName ? { id: row.organizationId, name: row.organizationName } : null
  };
}
