import type { OrganizationCommandsRepository } from "@/modules/organizations/data/organization-commands.repository";
import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { OrganizationIdInput } from "@/modules/organizations/domain/organization.schema";
import type { ArchiveOrganizationResult } from "@/modules/organizations/domain/organization.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetOrganizationArchivedDependencies = Readonly<{
  reads: Pick<OrganizationRepository, "findOrganizationIncludingArchived">;
  commands: Pick<OrganizationCommandsRepository, "setArchived">;
}>;

async function setArchived({ reads, commands }: SetOrganizationArchivedDependencies, actor: AuthenticatedActor, input: OrganizationIdInput, archive: boolean): Promise<ArchiveOrganizationResult> {
  const organization = await reads.findOrganizationIncludingArchived(input.organizationId);
  if (!organization) throw new ApplicationError("not_found", "Organization not found");
  if ((organization.archivedAt !== null) === archive) return { organizationId: organization.id, archived: archive, changed: false, auditEventId: null };

  const auditEventId = await commands.setArchived(organization.id, archive ? new Date() : null, toAuditEvent(actor, {
    action: archive ? "organization.archived" : "organization.restored",
    entityType: "organization",
    entityId: organization.id,
    summary: `${archive ? "Archived" : "Restored"} "${organization.name}"`,
    metadata: {}
  }));

  return { organizationId: organization.id, archived: archive, changed: true, auditEventId };
}

/** Hides an organization from lists and searches; its people, prospects and history stay. Idempotent. */
export const archiveOrganization = (dependencies: SetOrganizationArchivedDependencies, actor: AuthenticatedActor, input: OrganizationIdInput) => setArchived(dependencies, actor, input, true);

export const restoreOrganization = (dependencies: SetOrganizationArchivedDependencies, actor: AuthenticatedActor, input: OrganizationIdInput) => setArchived(dependencies, actor, input, false);
