import type { NoteView } from "@/modules/notes/domain/note.types";
import type { KeysetPage } from "@/shared/api/keyset";
import type { organizationSizeBandValues, organizationTypeValues, prospectStatusValues } from "@/shared/db/schema/crm-values";

export type OrganizationType = (typeof organizationTypeValues)[number];
export type OrganizationSizeBand = (typeof organizationSizeBandValues)[number];

export type OrganizationSummary = Readonly<{
  id: string;
  name: string;
  organizationType: OrganizationType;
  sizeBand: OrganizationSizeBand | null;
  countryCode: string | null;
  industry: string | null;
  canonicalDomain: string | null;
  updatedAt: string;
}>;

export type OrganizationPage = KeysetPage<OrganizationSummary>;

export type OrganizationDetail = OrganizationSummary & Readonly<{
  websiteUrl: string | null;
  linkedinUrl: string | null;
  /** The organization's own free-text notes field (not the linked notes below). */
  notes: string | null;
  archivedAt: string | null;
  domains: readonly Readonly<{ domain: string; isCanonical: boolean }>[];
  people: readonly Readonly<{ id: string; fullName: string; role: string | null }>[];
  prospects: readonly Readonly<{ id: string; status: (typeof prospectStatusValues)[number]; routeName: string }>[];
  recentNotes: readonly NoteView[];
}>;

/** Name-only matches are advisory: a company is never merged on its name (docs/02-data/04-deduplication.md). */
export type SimilarOrganization = Readonly<{ organizationId: string; name: string }>;

type Audited = Readonly<{ auditEventId: string | null }>;

export type CreateOrganizationResult = Audited & Readonly<{ organizationId: string; created: true; similarOrganizations: readonly SimilarOrganization[] }>;
export type UpdateOrganizationResult = Audited & Readonly<{ organizationId: string; changed: boolean }>;
export type ArchiveOrganizationResult = Audited & Readonly<{ organizationId: string; archived: boolean; changed: boolean }>;
export type SetOrganizationDomainsResult = Audited & Readonly<{ organizationId: string; domains: readonly string[]; changed: boolean }>;
