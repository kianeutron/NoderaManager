import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import type { OrganizationSort, OrganizationSearchQuery } from "@/modules/organizations/domain/organization.schema";
import type { KeysetCursor } from "@/shared/api/keyset";
import { escapeLikePattern } from "@/shared/db/escape-like";
import type { getDatabase } from "@/shared/db/client";
import { organizationDomains, organizations, people, prospects, routes } from "@/shared/db/schema/core";
import { keysetAfter, keysetOrderBy, keysetSortKey, type KeysetSort } from "@/shared/db/keyset";
import { normalizeText } from "@/shared/lib/normalize-text";

type OrganizationsDatabase = ReturnType<typeof getDatabase>;

export type OrganizationFilters = Pick<OrganizationSearchQuery, "q" | "organizationType" | "countryCode" | "scope">;
export type OrganizationSearchCriteria = OrganizationFilters & Readonly<{ sort: OrganizationSort; limit: number; cursor?: KeysetCursor<OrganizationSort> }>;

// Each order matches a partial index (organizations_updated_sort_index, organizations_name_sort_index).
const sorts = {
  updated: { expression: sql`${organizations.updatedAt}`, direction: "desc", text: sql<string>`${organizations.updatedAt}::text`, cast: "timestamptz" },
  name: { expression: sql`${organizations.normalizedName}`, direction: "asc", text: sql<string>`${organizations.normalizedName}`, cast: "text" }
} as const satisfies Record<OrganizationSort, KeysetSort>;

function conditionsFor({ q, organizationType, countryCode, scope }: OrganizationFilters): SQL[] {
  const conditions: SQL[] = [scope === "archived" ? isNotNull(organizations.archivedAt) : isNull(organizations.archivedAt)];
  if (organizationType) conditions.push(eq(organizations.organizationType, organizationType));
  if (countryCode) conditions.push(eq(organizations.countryCode, countryCode));
  if (q) {
    const pattern = `%${escapeLikePattern(normalizeText(q))}%`;
    conditions.push(or(ilike(organizations.normalizedName, pattern), sql`exists (select 1 from ${organizationDomains} where ${organizationDomains.organizationId} = ${organizations.id} and ${organizationDomains.domain} ilike ${pattern})`) ?? sql`false`);
  }
  return conditions;
}

async function findOneOrganization(database: OrganizationsDatabase, id: string, includeArchived: boolean) {
  const [row] = await database.select({
    id: organizations.id, name: organizations.name, organizationType: organizations.organizationType, sizeBand: organizations.sizeBand, websiteUrl: organizations.websiteUrl,
    linkedinUrl: organizations.linkedinUrl, countryCode: organizations.countryCode, industry: organizations.industry, notes: organizations.notes, archivedAt: organizations.archivedAt,
    updatedAt: organizations.updatedAt, canonicalDomain: organizationDomains.domain
  }).from(organizations)
    .leftJoin(organizationDomains, and(eq(organizationDomains.organizationId, organizations.id), eq(organizationDomains.isCanonical, true)))
    .where(and(eq(organizations.id, id), includeArchived ? undefined : isNull(organizations.archivedAt)))
    .limit(1);
  return row ?? null;
}

export function createOrganizationRepository(database: OrganizationsDatabase) {
  return {
    searchOrganizations: (criteria: OrganizationSearchCriteria) =>
      database.select({
        id: organizations.id, name: organizations.name, organizationType: organizations.organizationType, sizeBand: organizations.sizeBand,
        countryCode: organizations.countryCode, industry: organizations.industry, updatedAt: organizations.updatedAt,
        canonicalDomain: organizationDomains.domain, sortKey: keysetSortKey(sorts[criteria.sort])
      }).from(organizations)
        .leftJoin(organizationDomains, and(eq(organizationDomains.organizationId, organizations.id), eq(organizationDomains.isCanonical, true)))
        .where(and(...conditionsFor(criteria), criteria.cursor ? keysetAfter(sorts[criteria.cursor.sort], organizations.id, criteria.cursor) : undefined))
        .orderBy(...keysetOrderBy(sorts[criteria.sort], organizations.id))
        .limit(criteria.limit + 1),

    countOrganizations: async (filters: OrganizationFilters) => {
      const [row] = await database.select({ total: count() }).from(organizations).where(and(...conditionsFor(filters)));
      return row?.total ?? 0;
    },

    /** A live organization, for anything that changes or links to it. */
    findOrganization: (id: string) => findOneOrganization(database, id, false),

    /** Live or archived, for showing an organization and for restoring one. */
    findOrganizationIncludingArchived: (id: string) => findOneOrganization(database, id, true),

    /** Canonical domain first, so the order is the one callers supplied. */
    listDomains: (organizationId: string) =>
      database.select({ domain: organizationDomains.domain, isCanonical: organizationDomains.isCanonical }).from(organizationDomains)
        .where(eq(organizationDomains.organizationId, organizationId))
        .orderBy(desc(organizationDomains.isCanonical), asc(organizationDomains.createdAt), asc(organizationDomains.domain)),

    listPeople: (organizationId: string, limit: number) =>
      database.select({ id: people.id, fullName: people.fullName, role: people.role }).from(people)
        .where(and(eq(people.organizationId, organizationId), isNull(people.archivedAt)))
        .orderBy(asc(people.normalizedName), asc(people.id))
        .limit(limit),

    listProspects: (organizationId: string, limit: number) =>
      database.select({ id: prospects.id, status: prospects.status, routeName: routes.name }).from(prospects)
        .innerJoin(routes, eq(routes.id, prospects.routeId))
        .where(and(eq(prospects.organizationId, organizationId), isNull(prospects.archivedAt)))
        .orderBy(desc(prospects.updatedAt), desc(prospects.id))
        .limit(limit),

    findOrganizationsByDomains: (domains: readonly string[]) =>
      domains.length === 0
        ? Promise.resolve([])
        : database.select({ organizationId: organizations.id, name: organizations.name, domain: organizationDomains.domain }).from(organizationDomains)
          .innerJoin(organizations, eq(organizations.id, organizationDomains.organizationId))
          .where(inArray(organizationDomains.domain, [...domains])),

    findOrganizationsByNormalizedName: (normalizedName: string) =>
      database.select({ organizationId: organizations.id, name: organizations.name }).from(organizations)
        .where(and(eq(organizations.normalizedName, normalizedName), isNull(organizations.archivedAt)))
        .limit(5)
  };
}

export type OrganizationRepository = ReturnType<typeof createOrganizationRepository>;
