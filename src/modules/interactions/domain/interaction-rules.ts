import { assertCanLogOutreach, statusAfterOutreach, type OutreachContact } from "@/modules/outreach/domain/outreach-rules";
import type { InteractionDirection, InteractionType } from "@/modules/interactions/domain/interaction.types";
import type { ProspectStatus } from "@/modules/prospects/domain/prospect.types";
import { ApplicationError } from "@/shared/errors/application-error";

type ReplyStatus = "none" | "replied" | "auto_reply";

/**
 * What may be recorded. Anything we send follows the outreach rules (never to a do-not-contact person, never to a closed
 * prospect or an archived contact). Something they sent is a fact that already happened, so it is always recorded, even
 * from a person since marked do-not-contact or on a prospect since closed; only an archived prospect is out of reach.
 */
export function assertCanLogInteraction(contact: OutreachContact, direction: InteractionDirection): void {
  if (direction === "outbound") {
    assertCanLogOutreach(contact);
    return;
  }
  if (contact.prospect.archivedAt !== null) throw new ApplicationError("not_found", "Prospect not found");
}

/** Their reply moves a prospect we had contacted (or were about to) to `replied`; an automatic answer proves nothing, and later statuses are the owner's to set. */
export function statusAfterInteraction(status: ProspectStatus, type: InteractionType, direction: InteractionDirection): ProspectStatus {
  if (direction === "outbound") return statusAfterOutreach(status);
  return type === "reply" && (status === "researched" || status === "ready" || status === "contacted") ? "replied" : status;
}

/** The reply state of the message being answered, or null when this interaction says nothing about it. A real reply beats an auto-reply. */
export function replyStatusAfter(type: InteractionType, current: ReplyStatus): ReplyStatus | null {
  if (type === "reply") return current === "replied" ? null : "replied";
  if (type === "auto_reply") return current === "none" ? "auto_reply" : null;
  return null;
}
