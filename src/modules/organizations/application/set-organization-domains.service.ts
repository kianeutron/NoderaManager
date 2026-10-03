import type { OrganizationCommandsRepository } from "@/modules/organizations/data/organization-commands.repository";
import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { SetOrganizationDomainsInput } from "@/modules/organizations/domain/organization.schema";
import type { SetOrganizationDomainsResult } from "@/modules/organizations/domain/organization.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetOrganizationDomainsDependencies = Readonly<{
  reads: Pick<OrganizationRepository, "findOrganization" | "listDomains" | "findOrganizationsByDomains">;
  commands: Pick<OrganizationCommandsRepository, "replaceDomains">;
}>;

/** Replaces the whole set (first is canonical), which makes the command idempotent. A domain another organization owns is refused. */
export async function setOrganizationDomains({ reads, commands }: SetOrganizationDomainsDependencies, actor: AuthenticatedActor, input: SetOrganizationDomainsInput): Promise<SetOrganizationDomainsResult> {
  const organization = await reads.findOrganization(input.organizationId);
  if (!organization) throw new ApplicationError("not_found", "Organization not found");

  const owners = await reads.findOrganizationsByDomains(input.domains);
  const stolen = owners.find((owner) => owner.organizationId !== organization.id);
  if (stolen) throw new ApplicationError("conflict", `The domain ${stolen.domain} already belongs to "${stolen.name}" (organization ${stolen.organizationId}).`, "domain_taken");

  const current = (await reads.listDomains(organization.id)).map((row) => row.domain);
  if (current.length === input.domains.length && current.every((domain, index) => domain === input.domains[index])) {
    return { organizationId: organization.id, domains: current, changed: false, auditEventId: null };
  }

  const auditEventId = await commands.replaceDomains(organization.id, input.domains, toAuditEvent(actor, {
    action: "organization.domains_set",
    entityType: "organization",
    entityId: organization.id,
    summary: `Set ${input.domains.length} domain(s) on "${organization.name}"`,
    metadata: { before: current, after: input.domains }
  }));

  return { organizationId: organization.id, domains: input.domains, changed: true, auditEventId };
}
