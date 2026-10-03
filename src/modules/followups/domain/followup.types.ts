import type { KeysetPage } from "@/shared/api/keyset";
import type { followUpStatusValues, outreachChannelValues, prospectStatusValues } from "@/shared/db/schema/crm-values";

export type FollowUpStatus = (typeof followUpStatusValues)[number];
export type FollowUpChannel = (typeof outreachChannelValues)[number];
type ProspectStatus = (typeof prospectStatusValues)[number];

export type FollowUpView = Readonly<{
  id: string;
  status: FollowUpStatus;
  reason: string;
  dueAt: string | null;
  notBeforeAt: string | null;
  suggestedChannel: FollowUpChannel | null;
  completedAt: string | null;
  dismissedReason: string | null;
  createdAt: string;
  prospect: Readonly<{ id: string; status: ProspectStatus; routeName: string }>;
  person: Readonly<{ id: string; fullName: string }> | null;
  organization: Readonly<{ id: string; name: string }> | null;
}>;

export type FollowUpPage = KeysetPage<FollowUpView>;

/** Active follow-ups by when they are due, counted over all of them. */
export type FollowUpSummary = Readonly<{ overdue: number; next7Days: number; later: number; noDate: number }>;

type Audited = Readonly<{ auditEventId: string | null }>;

/** `created: false` means an open follow-up for the same reason already existed and was returned instead. */
export type CreateFollowUpResult = Audited & Readonly<{ followUpId: string; created: boolean }>;
export type UpdateFollowUpResult = Audited & Readonly<{ followUpId: string; changed: boolean }>;
export type FinishFollowUpResult = Audited & Readonly<{ followUpId: string; status: FollowUpStatus; changed: boolean }>;
