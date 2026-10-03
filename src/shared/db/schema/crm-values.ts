// Dependency-free on purpose (see library-values.ts): UI, MCP schemas and Zod can import these
// lists without bundling Drizzle. Adding a value is a migration; the database enum and these
// lists are built from the same arrays, so they cannot drift.

/** docs/11-operations/00-status-taxonomy.md. Not every prospect passes through every state. */
export const prospectStatusValues = ["researched", "ready", "contacted", "replied", "warm", "opportunity", "proposal", "won", "lost", "dormant", "disqualified"] as const;

/** Channels are a separate dimension from routes (docs/11-operations/01-route-module-model.md). */
export const outreachChannelValues = ["email", "linkedin", "inmail", "other"] as const;

export const prospectTemperatureValues = ["cold", "warm", "hot"] as const;
export const prospectSourceValues = ["linkedin_search", "referral", "inbound", "community", "event", "research_document", "import", "other"] as const;

/** Persistent constraints behind a "no", stored apart from timing (status, follow-up "not before"). */
export const structuralReasonValues = ["language", "local_payroll", "residency", "clearance", "compliance", "other"] as const;

export const personaValues = ["recruiter", "fractional_cto", "agency_founder", "agency_delivery_lead", "engineering_leader", "founder", "consultant", "referral_partner", "other"] as const;
export const organizationTypeValues = ["company", "agency", "consultancy", "recruiter", "community", "other"] as const;
export const organizationSizeBandValues = ["solo", "2_10", "11_50", "51_200", "201_1000", "1001_plus"] as const;
export const personLinkTypeValues = ["linkedin", "website", "github", "portfolio", "other"] as const;

export const signalTypeValues = ["live_role", "client_win", "contractor_request", "funding", "leadership_change", "content_activity", "event", "other"] as const;
export const campaignStatusValues = ["draft", "active", "paused", "completed"] as const;
export const templateStatusValues = ["active", "archived"] as const;
export const draftStatusValues = ["draft", "scheduled", "sending", "sent", "cancelled"] as const;
export const sequenceStatusValues = ["draft", "active", "paused", "completed", "archived"] as const;
export const sequenceEnrollmentStatusValues = ["active", "paused", "completed", "cancelled"] as const;
export const providerAccountStatusValues = ["active", "reauthorization_required", "disconnected"] as const;
export const outreachTaskStatusValues = ["open", "in_progress", "completed", "dismissed"] as const;
export const outreachTaskTypeValues = ["follow_up", "review", "research", "reply", "other"] as const;

export const ctaTypeValues = ["reply", "call", "referral_intro", "share_cv", "portfolio_review", "other"] as const;
export const proofPointTypeValues = ["case_study", "portfolio", "tech_stack", "experience", "referral", "certification", "other"] as const;

/** `delivered` means provider-confirmed; without confirmation a message stays `sent` (analytics-definitions.md). */
export const deliveryStatusValues = ["sent", "delivered", "failed"] as const;
export const bounceStatusValues = ["none", "soft", "hard", "blocked"] as const;
export const replyStatusValues = ["none", "replied", "auto_reply"] as const;

export const interactionDirectionValues = ["inbound", "outbound"] as const;
export const interactionTypeValues = ["reply", "auto_reply", "bounce_notice", "follow_up_message", "call", "meeting", "other"] as const;
export const sentimentValues = ["positive", "neutral", "negative", "unclear"] as const;

/** `active` is the only status that may carry a due date (docs/02-data/01-database-schema.md). */
export const followUpStatusValues = ["active", "completed", "dismissed"] as const;

export const externalSourceValues = ["gmail", "linkedin", "import", "manual", "other"] as const;
export const externalRefTypeValues = ["message_id", "thread_id", "conversation_url", "profile_id", "import_record_id", "other"] as const;

/**
 * Response depth is stored as its 1-based position in this list, so "depth 5 or deeper" is a plain
 * number comparison and the ordering can never be scrambled by an enum edit.
 */
export const responseDepthLabels = [
  "acknowledgement",
  "evaluated_or_portfolio_viewed",
  "qualification_question",
  "asks_cv_rate_or_availability",
  "referral_or_introduction",
  "call_or_interview",
  "active_project_discussion",
  "proposal_or_commercial_step",
  "paid_work"
] as const;
export const maxResponseDepth = responseDepthLabels.length;
