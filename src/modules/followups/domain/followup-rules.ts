import type { FollowUpStatus } from "@/modules/followups/domain/followup.types";
import { ApplicationError } from "@/shared/errors/application-error";

/** A follow-up is a plan to contact someone, so it follows the same rules as contacting them (the caller applies `assertCanLogOutreach`). */

/** The "not before" date cannot come after the due date. The schema checks it when both are sent; this checks it against what is stored. */
export function assertDatesInOrder(notBeforeAt: Date | null, dueAt: Date | null): void {
  if (notBeforeAt && dueAt && notBeforeAt.getTime() > dueAt.getTime()) throw new ApplicationError("conflict", "The not-before date cannot be after the due date.", "follow_up_dates_invalid");
}

/** Only an active follow-up can change. A finished one is a record of what was decided. */
export function assertActive(status: FollowUpStatus): void {
  if (status !== "active") throw new ApplicationError("conflict", `This follow-up is already ${status}.`, "follow_up_finished");
}
