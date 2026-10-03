import { and, eq, notInArray, sql } from "drizzle-orm";
import type { Persona, PersonLinkType } from "@/modules/people/domain/person.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { people, personEmails, personLinks } from "@/shared/db/schema/core";

type PeopleDatabase = ReturnType<typeof getDatabase>;

export type PersonEmailDraft = Readonly<{ email: string; normalizedEmail: string; isPrimary: boolean }>;

export type NewPersonDraft = Readonly<{
  personId: string;
  organizationId: string | null;
  fullName: string;
  normalizedName: string;
  linkedinUrl: string | null;
  normalizedLinkedinUrl: string | null;
  role: string | null;
  persona: Persona | null;
  countryCode: string | null;
  city: string | null;
  languages: readonly string[];
  emails: readonly PersonEmailDraft[];
  audit: AuditEventInput;
}>;

export type PersonLinkDraft = Readonly<{ type: PersonLinkType; url: string; normalizedUrl: string; label: string | null }>;

export type PersonPatch = Readonly<{
  fullName?: string;
  normalizedName?: string;
  role?: string | null;
  persona?: Persona | null;
  organizationId?: string | null;
  countryCode?: string | null;
  city?: string | null;
  languages?: readonly string[];
  linkedinUrl?: string | null;
  normalizedLinkedinUrl?: string | null;
}>;

/** Each command is one `batch`, so the mutation and its audit event commit together or not at all. */
export function createPersonCommandsRepository(database: PeopleDatabase) {
  return {
    insertPerson: async ({ audit: auditInput, personId, emails, languages, ...values }: NewPersonDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.insert(people).values({ id: personId, languages: [...languages], ...values }),
        ...(emails.length > 0 ? [database.insert(personEmails).values(emails.map((email) => ({ personId, ...email })))] : []),
        audit.statement
      ]);
      return audit.id;
    },

    updatePerson: async (personId: string, { languages, ...patch }: PersonPatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(people).set({ ...patch, ...(languages ? { languages: [...languages] } : {}), updatedAt: new Date() }).where(eq(people.id, personId)), audit.statement]);
      return audit.id;
    },

    /** Replaces the whole set. Primary is cleared first because at most one email per person may be primary. */
    replaceEmails: async (personId: string, emails: readonly PersonEmailDraft[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.delete(personEmails).where(and(eq(personEmails.personId, personId), emails.length > 0 ? notInArray(personEmails.normalizedEmail, emails.map((email) => email.normalizedEmail)) : undefined)),
        database.update(personEmails).set({ isPrimary: false }).where(eq(personEmails.personId, personId)),
        ...(emails.length > 0
          ? [database.insert(personEmails).values(emails.map((email) => ({ personId, ...email })))
            .onConflictDoUpdate({ target: personEmails.normalizedEmail, set: { email: sql`excluded.email`, isPrimary: sql`excluded.is_primary` }, setWhere: eq(personEmails.personId, personId) })]
          : []),
        database.update(people).set({ updatedAt: new Date() }).where(eq(people.id, personId)),
        audit.statement
      ]);
      return audit.id;
    },

    /** Replaces the whole set; a link is identified by its normalized URL, so keeping one keeps its row. */
    replaceLinks: async (personId: string, links: readonly PersonLinkDraft[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.delete(personLinks).where(and(eq(personLinks.personId, personId), links.length > 0 ? notInArray(personLinks.normalizedUrl, links.map((link) => link.normalizedUrl)) : undefined)),
        ...(links.length > 0
          ? [database.insert(personLinks).values(links.map((link) => ({ personId, ...link })))
            .onConflictDoUpdate({ target: [personLinks.personId, personLinks.normalizedUrl], set: { type: sql`excluded.type`, url: sql`excluded.url`, label: sql`excluded.label` } })]
          : []),
        database.update(people).set({ updatedAt: new Date() }).where(eq(people.id, personId)),
        audit.statement
      ]);
      return audit.id;
    },

    /** `null` restores. Only hides the person from lists: prospects, notes and history stay intact. */
    setArchived: async (personId: string, archivedAt: Date | null, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(people).set({ archivedAt, updatedAt: new Date() }).where(eq(people.id, personId)), audit.statement]);
      return audit.id;
    },

    /** `null` for both clears the flag. */
    setDoNotContact: async (personId: string, flag: Readonly<{ at: Date | null; reason: string | null }>, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(people).set({ doNotContactAt: flag.at, doNotContactReason: flag.reason, updatedAt: new Date() }).where(eq(people.id, personId)), audit.statement]);
      return audit.id;
    }
  };
}

export type PersonCommandsRepository = ReturnType<typeof createPersonCommandsRepository>;
