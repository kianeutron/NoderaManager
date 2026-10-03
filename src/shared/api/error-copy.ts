import { ApiRequestError } from "@/shared/api/api-request-error";
import type { ApplicationReason } from "@/shared/errors/error-reasons";

/** Every reason the API can send, worded for the person using the screen. Adding a reason without copy fails the build. */
const reasonCopy = {
  already_exists: "That already exists.",
  invalid_reference: "Something this refers to was removed. Refresh the page and try again.",
  rule_violated: "That change isn't allowed by the data rules.",
  organization_not_found: "The selected company no longer exists. Choose another one.",
  person_duplicate_exact: "This person already exists.",
  person_duplicate_strong: "Someone with the same name and company already exists.",
  person_not_found: "That person no longer exists.",
  person_do_not_contact: "This person is marked do not contact.",
  prospect_closed: "This prospect is closed. Open a new prospect to contact them again.",
  contact_archived: "This person or company is archived. Restore it first.",
  route_name_taken: "Another route already has that name.",
  module_name_taken: "Another module in this route already has that name.",
  campaign_name_taken: "Another campaign already has that name.",
  campaign_not_found: "That campaign no longer exists.",
  campaign_needs_route: "Add at least one route before starting this campaign.",
  campaign_transition_invalid: "The campaign can't move to that status from where it is.",
  campaign_finished: "This campaign is finished and can't change.",
  prospect_outside_campaign_routes: "That prospect's route isn't one of this campaign's routes.",
  campaign_window_invalid: "The end cannot be before the start.",
  campaign_running: "Pause or complete the campaign before archiving it.",
  campaign_not_active: "That campaign isn't active, so outreach can't be logged under it.",
  prospect_not_in_campaign: "That prospect isn't part of the chosen campaign.",
  follow_up_dates_invalid: "The \"not before\" date cannot be after the due date.",
  follow_up_finished: "This follow-up is already finished.",
  interaction_not_found: "That interaction no longer exists.",
  outreach_message_not_found: "That message no longer exists.",
  idempotency_key_reused: "That request key was already used for a different message.",
  route_not_found: "That route no longer exists. Choose another.",
  module_not_in_route: "That module doesn't belong to the chosen route. Choose another.",
  structural_reason_required: "Choose why this prospect is disqualified.",
  structural_reason_not_applicable: "A reason applies only when a prospect is disqualified.",
  email_taken: "One of those email addresses already belongs to another person.",
  linkedin_taken: "That LinkedIn profile already belongs to another person.",
  domain_taken: "One of those domains already belongs to another company.",
  file_missing: "Choose a file to upload.",
  file_empty: "That file is empty.",
  file_too_large: "That file is too large.",
  file_type_unsupported: "That file type isn't supported. Use a PDF, Word document, text, Markdown, CSV or image.",
  file_content_mismatch: "The file doesn't match its file type. Check it and try again.",
  filename_invalid: "Rename the file and try again.",
  upload_invalid: "The upload could not be read. Try again.",
  storage_unavailable: "File storage is temporarily unavailable. Try again in a moment.",
  cross_origin: "This page is out of date. Refresh it and try again."
} as const satisfies Record<ApplicationReason, string>;

const generic = "Something went wrong. Try again.";

function copyForStatus(status: number, noun: string): string {
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You don't have access to do that.";
  if (status === 404) return `That ${noun} no longer exists.`;
  if (status === 409) return "That change conflicts with existing data. Refresh the page and try again.";
  if (status === 413) return "That is too large to send.";
  if (status === 429) return "You are doing that too quickly. Wait a moment and try again.";
  if (status === 503) return "The service is temporarily unavailable. Try again in a moment.";
  if (status >= 500) return "Something went wrong on our side. Nothing was lost. Try again in a moment.";
  return "Some details are not valid. Check the form and try again.";
}

/**
 * The one place a failure becomes text for a person. Raw error messages (ours, the network's, the database's) are never
 * shown. `noun` names what the screen is about ("person") for "no longer exists" style answers. Server faults carry the
 * request id, so a report can be matched to the logs.
 */
export function describeError(error: unknown, noun = "record"): string {
  if (!(error instanceof ApiRequestError)) {
    // fetch rejects with a TypeError when the request never got an answer.
    return error instanceof TypeError ? "Could not reach the server. Check your connection and try again." : generic;
  }

  const { reason, requestId } = error.details;
  const copy = reason && reason in reasonCopy ? reasonCopy[reason] : copyForStatus(error.status, noun);
  return error.status >= 500 && requestId ? `${copy} Reference: ${requestId}` : copy;
}

/** A session that ended is the same problem on every screen, so it is detected once rather than per request. */
export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}
