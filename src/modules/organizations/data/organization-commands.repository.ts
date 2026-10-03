import { and, eq, notInArray, sql } from "drizzle-orm";
import type { OrganizationSizeBand, OrganizationType } from "@/modules/organizations/domain/organization.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { organizationDomains, organizations } from "@/shared/db/schema/core";

type OrganizationsDatabase = ReturnType<typeof getDatabase>;

export type NewOrganizationDraft = Readonly<{
  organizationId: string;
  name: string;
  normalizedName: string;
  organizationType: OrganizationType;
  sizeBand: OrganizationSizeBand | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  countryCode: string | null;
  industry: string | null;
  notes: string | null;
  /** The first domain is canonical. */
  domains: readonly string[];
  audit: AuditEventInput;
}>;

export type OrganizationPatch = Readonly<{
  name?: string;
  normalizedName?: string;
  organizationType?: OrganizationType;
  sizeBand?: OrganizationSizeBand | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  countryCode?: string | null;
  industry?: string | null;
  notes?: string | null;
}>;

/** Each command is one `batch`, so the mutation and its audit event commit together or not at all. */
export function createOrganizationCommandsRepository(database: OrganizationsDatabase) {
  return {
    insertOrganization: async ({ audit: auditInput, organizationId, domains, ...values }: NewOrganizationDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.insert(organizations).values({ id: organizationId, ...values }),
        ...(domains.length > 0 ? [database.insert(organizationDomains).values(domains.map((domain, index) => ({ organizationId, domain, isCanonical: index === 0 })))] : []),
        audit.statement
      ]);
      return audit.id;
    },

    updateOrganization: async (organizationId: string, patch: OrganizationPatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(organizations).set({ ...patch, updatedAt: new Date() }).where(eq(organizations.id, organizationId)), audit.statement]);
      return audit.id;
    },

    /** `null` restores. Only hides the organization from lists: its people, prospects and history stay intact. */
    setArchived: async (organizationId: string, archivedAt: Date | null, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(organizations).set({ archivedAt, updatedAt: new Date() }).where(eq(organizations.id, organizationId)), audit.statement]);
      return audit.id;
    },

    /** Replaces the whole set. Canonical is cleared first because at most one domain per organization may be canonical. */
    replaceDomains: async (organizationId: string, domains: readonly string[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.delete(organizationDomains).where(and(eq(organizationDomains.organizationId, organizationId), domains.length > 0 ? notInArray(organizationDomains.domain, [...domains]) : undefined)),
        database.update(organizationDomains).set({ isCanonical: false }).where(eq(organizationDomains.organizationId, organizationId)),
        ...(domains.length > 0
          ? [database.insert(organizationDomains).values(domains.map((domain, index) => ({ organizationId, domain, isCanonical: index === 0 })))
            .onConflictDoUpdate({ target: organizationDomains.domain, set: { isCanonical: sql`excluded.is_canonical` }, setWhere: eq(organizationDomains.organizationId, organizationId) })]
          : []),
        database.update(organizations).set({ updatedAt: new Date() }).where(eq(organizations.id, organizationId)),
        audit.statement
      ]);
      return audit.id;
    }
  };
}

export type OrganizationCommandsRepository = ReturnType<typeof createOrganizationCommandsRepository>;
