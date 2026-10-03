import { closedProspectStatuses } from "@/modules/prospects/domain/prospect-status";
import type { ProspectStatus } from "@/modules/prospects/domain/prospect.types";
import { ApplicationError } from "@/shared/errors/application-error";

/** Everything the rules need to know about who a message would go to. */
export type OutreachContact = Readonly<{
  prospect: Readonly<{ status: ProspectStatus; archivedAt: Date | null }>;
  person: Readonly<{ archivedAt: Date | null; doNotContactAt: Date | null }> | null;
  organization: Readonly<{ archivedAt: Date | null }> | null;
}>;

/**
 * Whether a message may be logged for this prospect. A person marked do-not-contact is a safety flag and is never
 * overridden; a closed or archived prospect, or an archived contact, must be reopened or restored first.
 */
export function assertCanLogOutreach({ prospect, person, organization }: OutreachContact): void {
  if (prospect.archivedAt !== null) throw new ApplicationError("not_found", "Prospect not found");
  if ((closedProspectStatuses as readonly ProspectStatus[]).includes(prospect.status)) throw new ApplicationError("conflict", `The prospect is ${prospect.status}. Open a new prospect to contact them again.`, "prospect_closed");
  if (person?.doNotContactAt) throw new ApplicationError("conflict", "This person is marked do-not-contact, so outreach cannot be logged for them.", "person_do_not_contact");
  const contactArchived = person ? person.archivedAt !== null : organization !== null && organization.archivedAt !== null;
  if (contactArchived) throw new ApplicationError("conflict", "The person or organization is archived. Restore it before logging outreach.", "contact_archived");
}

/** First contact moves a prospect to `contacted`; every later status already means contact happened, so it stays. */
export function statusAfterOutreach(status: ProspectStatus): ProspectStatus {
  return status === "researched" || status === "ready" ? "contacted" : status;
}
