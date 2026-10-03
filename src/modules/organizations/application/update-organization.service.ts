import type { OrganizationCommandsRepository, OrganizationPatch } from "@/modules/organizations/data/organization-commands.repository";
import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { UpdateOrganizationInput } from "@/modules/organizations/domain/organization.schema";
import type { UpdateOrganizationResult } from "@/modules/organizations/domain/organization.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import { toChangeMetadata } from "@/shared/audit/change-metadata";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { pickChangedFields } from "@/shared/lib/changed-fields";
import { normalizeText } from "@/shared/lib/normalize-text";

type UpdateOrganizationDependencies = Readonly<{
  reads: Pick<OrganizationRepository, "findOrganization">;
  commands: Pick<OrganizationCommandsRepository, "updateOrganization">;
}>;

const editableFields = ["name", "organizationType", "sizeBand", "websiteUrl", "linkedinUrl", "countryCode", "industry", "notes"] as const;

/** Only real differences are written and audited; the free-text notes are named as changed but never copied. */
export async function updateOrganization({ reads, commands }: UpdateOrganizationDependencies, actor: AuthenticatedActor, input: UpdateOrganizationInput): Promise<UpdateOrganizationResult> {
  const current = await reads.findOrganization(input.organizationId);
  if (!current) throw new ApplicationError("not_found", "Organization not found");

  const changes = pickChangedFields(current, input, editableFields);
  if (Object.keys(changes).length === 0) return { organizationId: current.id, changed: false, auditEventId: null };

  const patch: OrganizationPatch = { ...changes, ...(changes.name === undefined ? {} : { normalizedName: normalizeText(changes.name) }) };
  const auditEventId = await commands.updateOrganization(current.id, patch, toAuditEvent(actor, {
    action: "organization.updated",
    entityType: "organization",
    entityId: current.id,
    summary: `Updated ${Object.keys(changes).join(", ")} of "${current.name}"`,
    metadata: toChangeMetadata(current, changes, ["notes"])
  }));

  return { organizationId: current.id, changed: true, auditEventId };
}
