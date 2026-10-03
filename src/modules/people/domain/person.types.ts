import type { NoteView } from "@/modules/notes/domain/note.types";
import type { KeysetPage } from "@/shared/api/keyset";
import type { personaValues, personLinkTypeValues, prospectStatusValues } from "@/shared/db/schema/crm-values";

export type Persona = (typeof personaValues)[number];
export type PersonLinkType = (typeof personLinkTypeValues)[number];

export type PersonSummary = Readonly<{
  id: string;
  fullName: string;
  role: string | null;
  persona: Persona | null;
  organization: Readonly<{ id: string; name: string }> | null;
  countryCode: string | null;
  city: string | null;
  lastContactedAt: string | null;
  doNotContact: boolean;
  updatedAt: string;
}>;

export type PersonPage = KeysetPage<PersonSummary>;

export type PersonDetail = PersonSummary & Readonly<{
  languages: readonly string[];
  linkedinUrl: string | null;
  emails: readonly Readonly<{ email: string; isPrimary: boolean }>[];
  links: readonly Readonly<{ type: PersonLinkType; url: string; label: string | null }>[];
  doNotContactAt: string | null;
  doNotContactReason: string | null;
  archivedAt: string | null;
  prospects: readonly Readonly<{ id: string; status: (typeof prospectStatusValues)[number]; routeName: string; moduleName: string | null }>[];
  recentNotes: readonly NoteView[];
}>;

export type DuplicateMatchLevel = "exact" | "strong" | "weak";

export type DuplicateCandidate = Readonly<{
  personId: string;
  fullName: string;
  organizationName: string | null;
  matchLevel: DuplicateMatchLevel;
  reason: string;
}>;

type Audited = Readonly<{ auditEventId: string | null }>;

/** Weak (and reviewed strong) matches are returned so the caller can double-check; only exact or unconfirmed strong ones block creation. */
export type CreatePersonResult = Audited & Readonly<{ personId: string; created: true; possibleDuplicates: readonly DuplicateCandidate[] }>;
export type UpdatePersonResult = Audited & Readonly<{ personId: string; changed: boolean }>;
export type SetPersonEmailsResult = Audited & Readonly<{ personId: string; emails: readonly string[]; changed: boolean }>;
export type DoNotContactResult = Audited & Readonly<{ personId: string; doNotContact: boolean; changed: boolean }>;
export type SetPersonLinksResult = Audited & Readonly<{ personId: string; count: number; changed: boolean }>;
export type ArchivePersonResult = Audited & Readonly<{ personId: string; archived: boolean; changed: boolean }>;
