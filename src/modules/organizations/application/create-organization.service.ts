import { v7 as uuidv7 } from "uuid";
import type { OrganizationCommandsRepository } from "@/modules/organizations/data/organization-commands.repository";
import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { CreateOrganizationInput } from "@/modules/organizations/domain/organization.schema";
import type { CreateOrganizationResult } from "@/modules/organizations/domain/organization.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { normalizeText } from "@/shared/lib/normalize-text";

type CreateOrganizationDependencies = Readonly<{
  reads: Pick<OrganizationRepository, "findOrganizationsByDomains" | "findOrganizationsByNormalizedName">;
  commands: Pick<OrganizationCommandsRepository, "insertOrganization">;
}>;

/**
 * A domain is the strongest identity signal, so one that already belongs to an organization blocks creation.
 * A matching name alone is only reported back as advisory: companies are never merged on their name.
 */
export async function createOrganization({ reads, commands }: CreateOrganizationDependencies, actor: AuthenticatedActor, input: CreateOrganizationInput): Promise<CreateOrganizationResult> {
  const [taken] = await reads.findOrganizationsByDomains(input.domains);
  if (taken) throw new ApplicationError("conflict", `The domain ${taken.domain} already belongs to "${taken.name}" (organization ${taken.organizationId}). Use that organization instead of creating a duplicate.`, "domain_taken");

  const normalizedName = normalizeText(input.name);
  const similarOrganizations = await reads.findOrganizationsByNormalizedName(normalizedName);

  const organizationId = uuidv7();
  const auditEventId = await commands.insertOrganization({
    organizationId,
    name: input.name,
    normalizedName,
    organizationType: input.organizationType,
    sizeBand: input.sizeBand ?? null,
    websiteUrl: input.websiteUrl ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
    countryCode: input.countryCode ?? null,
    industry: input.industry ?? null,
    notes: input.notes ?? null,
    domains: input.domains,
    audit: toAuditEvent(actor, {
      action: "organization.created",
      entityType: "organization",
      entityId: organizationId,
      summary: `Created ${input.organizationType} "${input.name}"`,
      metadata: { organizationType: input.organizationType, countryCode: input.countryCode ?? null, domains: input.domains }
    })
  });

  return { organizationId, created: true, auditEventId, similarOrganizations };
}
