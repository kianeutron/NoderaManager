import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import type { DuplicateLookup, IdentityMatchRow } from "@/modules/people/domain/duplicate-candidates";
import type { PersonSearchQuery, PersonSort } from "@/modules/people/domain/person.schema";
import type { KeysetCursor } from "@/shared/api/keyset";
import type { getDatabase } from "@/shared/db/client";
import { escapeLikePattern } from "@/shared/db/escape-like";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { organizationDomains, organizations, people, personEmails, personLinks, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { normalizeText } from "@/shared/lib/normalize-text";

type PeopleDatabase = ReturnType<typeof getDatabase>;

export type PersonFilters = Pick<PersonSearchQuery, "q" | "organizationId" | "persona" | "countryCode" | "scope">;
export type PersonSearchCriteria = PersonFilters & Readonly<{ sort: PersonSort; limit: number; cursor?: KeysetCursor<PersonSort> }>;

// Each order matches a partial index (people_updated_sort_index, people_name_sort_index).
const sorts = {
  updated: { expression: sql`${people.updatedAt}`, direction: "desc", text: sql<string>`${people.updatedAt}::text`, cast: "timestamptz" },
  name: { expression: sql`${people.normalizedName}`, direction: "asc", text: sql<string>`${people.normalizedName}`, cast: "text" }
} as const satisfies Record<PersonSort, KeysetSort>;

const maxIdentityMatches = 25;

function conditionsFor({ q, organizationId, persona, countryCode, scope }: PersonFilters): SQL[] {
  const conditions: SQL[] = [scope === "archived" ? isNotNull(people.archivedAt) : isNull(people.archivedAt)];
  if (organizationId) conditions.push(eq(people.organizationId, organizationId));
  if (persona) conditions.push(eq(people.persona, persona));
  if (countryCode) conditions.push(eq(people.countryCode, countryCode));
  if (q) {
    const pattern = `%${escapeLikePattern(normalizeText(q))}%`;
    conditions.push(or(
      ilike(people.normalizedName, pattern),
      ilike(people.normalizedLinkedinUrl, pattern),
      sql`exists (select 1 from ${personEmails} where ${personEmails.personId} = ${people.id} and ${personEmails.normalizedEmail} ilike ${pattern})`
    ) ?? sql`false`);
  }
  return conditions;
}

async function findOnePerson(database: PeopleDatabase, id: string, includeArchived: boolean) {
  const [row] = await database.select({
    id: people.id, fullName: people.fullName, role: people.role, persona: people.persona, organizationId: people.organizationId, organizationName: organizations.name,
    linkedinUrl: people.linkedinUrl, countryCode: people.countryCode, city: people.city, languages: people.languages, lastContactedAt: people.lastContactedAt,
    doNotContactAt: people.doNotContactAt, doNotContactReason: people.doNotContactReason, archivedAt: people.archivedAt, updatedAt: people.updatedAt
  }).from(people)
    .leftJoin(organizations, eq(organizations.id, people.organizationId))
    .where(and(eq(people.id, id), includeArchived ? undefined : isNull(people.archivedAt)))
    .limit(1);
  return row ?? null;
}

export function createPersonRepository(database: PeopleDatabase) {
  return {
    searchPeople: (criteria: PersonSearchCriteria) =>
      database.select({
        id: people.id, fullName: people.fullName, role: people.role, persona: people.persona, organizationId: organizations.id, organizationName: organizations.name,
        countryCode: people.countryCode, city: people.city, lastContactedAt: people.lastContactedAt, doNotContactAt: people.doNotContactAt, updatedAt: people.updatedAt,
        sortKey: keysetSortKey(sorts[criteria.sort])
      }).from(people)
        .leftJoin(organizations, eq(organizations.id, people.organizationId))
        .where(and(...conditionsFor(criteria), criteria.cursor ? keysetAfter(sorts[criteria.cursor.sort], people.id, criteria.cursor) : undefined))
        .orderBy(...keysetOrderBy(sorts[criteria.sort], people.id))
        .limit(criteria.limit + 1),

    countPeople: async (filters: PersonFilters) => {
      const [row] = await database.select({ total: count() }).from(people).where(and(...conditionsFor(filters)));
      return row?.total ?? 0;
    },

    /** A live person, for anything that changes or links to them. */
    findPerson: (id: string) => findOnePerson(database, id, false),

    /** Live or archived, for showing a person and for restoring one. */
    findPersonIncludingArchived: (id: string) => findOnePerson(database, id, true),

    /** Primary first. */
    listEmails: (personId: string) =>
      database.select({ email: personEmails.email, normalizedEmail: personEmails.normalizedEmail, isPrimary: personEmails.isPrimary }).from(personEmails)
        .where(eq(personEmails.personId, personId))
        .orderBy(desc(personEmails.isPrimary), asc(personEmails.createdAt), asc(personEmails.normalizedEmail)),

    listLinks: (personId: string) =>
      database.select({ type: personLinks.type, url: personLinks.url, label: personLinks.label }).from(personLinks)
        .where(eq(personLinks.personId, personId))
        .orderBy(asc(personLinks.createdAt), asc(personLinks.id)),

    listProspects: (personId: string, limit: number) =>
      database.select({ id: prospects.id, status: prospects.status, routeName: routes.name, moduleName: routeModules.name }).from(prospects)
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .leftJoin(routeModules, eq(routeModules.id, prospects.routeModuleId))
        .where(and(eq(prospects.personId, personId), isNull(prospects.archivedAt)))
        .orderBy(desc(prospects.updatedAt), desc(prospects.id))
        .limit(limit),

    findPersonByLinkedin: async (normalizedLinkedinUrl: string) => {
      const [row] = await database.select({ id: people.id, fullName: people.fullName }).from(people).where(eq(people.normalizedLinkedinUrl, normalizedLinkedinUrl)).limit(1);
      return row ?? null;
    },

    /** Emails are unique across all people (archived included), so ownership is looked up without an archive filter. */
    findEmailOwners: (normalizedEmails: readonly string[]) =>
      normalizedEmails.length === 0
        ? Promise.resolve([])
        : database.select({ personId: people.id, fullName: people.fullName, normalizedEmail: personEmails.normalizedEmail }).from(personEmails)
          .innerJoin(people, eq(people.id, personEmails.personId))
          .where(inArray(personEmails.normalizedEmail, [...normalizedEmails])),

    /** Everyone who could be the same person as `lookup`, one row each, with what is needed to classify the match. */
    findIdentityMatches: async (lookup: DuplicateLookup): Promise<IdentityMatchRow[]> => {
      const byName = eq(people.normalizedName, lookup.normalizedName);
      const byLinkedIn = lookup.normalizedLinkedInUrl ? eq(people.normalizedLinkedinUrl, lookup.normalizedLinkedInUrl) : undefined;
      const byEmail = lookup.normalizedEmails.length > 0
        ? sql`exists (select 1 from ${personEmails} where ${personEmails.personId} = ${people.id} and ${personEmails.normalizedEmail} in (${sql.join(lookup.normalizedEmails.map((email) => sql`${email}`), sql`, `)}))`
        : undefined;

      const matches = await database.select({
        personId: people.id, fullName: people.fullName, normalizedName: people.normalizedName, normalizedLinkedinUrl: people.normalizedLinkedinUrl,
        organizationId: people.organizationId, organizationName: organizations.name
      }).from(people)
        .leftJoin(organizations, eq(organizations.id, people.organizationId))
        .where(and(isNull(people.archivedAt), or(byName, byLinkedIn, byEmail)))
        .limit(maxIdentityMatches);
      if (matches.length === 0) return [];

      const organizationIds = matches.flatMap((match) => match.organizationId ?? []);
      const [emails, domains] = await Promise.all([
        database.select({ personId: personEmails.personId, normalizedEmail: personEmails.normalizedEmail }).from(personEmails).where(inArray(personEmails.personId, matches.map((match) => match.personId))),
        organizationIds.length === 0 ? Promise.resolve([]) : database.select({ organizationId: organizationDomains.organizationId, domain: organizationDomains.domain }).from(organizationDomains).where(inArray(organizationDomains.organizationId, organizationIds))
      ]);

      const emailsByPerson = Map.groupBy(emails, (row) => row.personId);
      const domainsByOrganization = Map.groupBy(domains, (row) => row.organizationId);
      return matches.map((match) => ({
        ...match,
        normalizedEmails: (emailsByPerson.get(match.personId) ?? []).map((row) => row.normalizedEmail),
        organizationDomains: match.organizationId ? (domainsByOrganization.get(match.organizationId) ?? []).map((row) => row.domain) : []
      }));
    }
  };
}

export type PersonRepository = ReturnType<typeof createPersonRepository>;
