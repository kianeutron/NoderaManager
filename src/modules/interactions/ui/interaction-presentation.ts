import type { BounceStatus, InteractionChannel, InteractionDirection, InteractionType, Sentiment } from "@/modules/interactions/domain/interaction.types";
import { responseDepthLabels } from "@/shared/db/schema/crm-values";

export const interactionTypeLabel = {
  reply: "Reply",
  auto_reply: "Auto-reply",
  bounce_notice: "Bounce",
  follow_up_message: "Follow-up message",
  call: "Call",
  meeting: "Meeting",
  other: "Other"
} as const satisfies Record<InteractionType, string>;

export const directionLabel = { inbound: "Received", outbound: "Sent" } as const satisfies Record<InteractionDirection, string>;

export const sentimentLabel = { positive: "Positive", neutral: "Neutral", negative: "Negative", unclear: "Unclear" } as const satisfies Record<Sentiment, string>;

export const bounceKindLabel = { none: "No bounce", soft: "Soft bounce", hard: "Hard bounce", blocked: "Blocked" } as const satisfies Record<BounceStatus, string>;

export const interactionChannelLabel = { email: "Email", linkedin: "LinkedIn", inmail: "LinkedIn InMail", other: "Other" } as const satisfies Record<InteractionChannel, string>;

const responseDepthText = {
  acknowledgement: "Acknowledgement",
  evaluated_or_portfolio_viewed: "Evaluated, or viewed portfolio",
  qualification_question: "Qualification question",
  asks_cv_rate_or_availability: "Asked for CV, rate or availability",
  referral_or_introduction: "Referral or introduction",
  call_or_interview: "Call or interview",
  active_project_discussion: "Active project discussion",
  proposal_or_commercial_step: "Proposal or commercial step",
  paid_work: "Paid work"
} as const satisfies Record<(typeof responseDepthLabels)[number], string>;

/** The depth is stored as its 1-based position in the list; people read it by name. */
export const describeResponseDepth = (depth: number): string => {
  const label = responseDepthLabels[depth - 1];
  return label ? `${depth} · ${responseDepthText[label]}` : String(depth);
};

export const responseDepthOptions = responseDepthLabels.map((_label, index) => ({ value: String(index + 1), label: describeResponseDepth(index + 1) }));
