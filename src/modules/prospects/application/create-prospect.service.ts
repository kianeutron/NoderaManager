import { v7 as uuidv7 } from "uuid";
import { requireRouting } from "@/modules/prospects/application/require-routing";
import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import type { ProspectCommandsRepository } from "@/modules/prospects/data/prospect-commands.repository";
import type { ProspectRepository } from "@/modules/prospects/data/prospect.repository";
import type { CreateProspectInput } from "@/modules/prospects/domain/prospect.schema";
import type { CreateProspectResult } from "@/modules/prospects/domain/prospect.types";
import type { RouteRepository } from "@/modules/routes/data/route.repository";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type CreateProspectDependencies = Readonly<{
  reads: Pick<ProspectRepository, "findOpenProspect">;
  people: Pick<PersonRepository, "findPerson">;
  organizations: Pick<OrganizationRepository, "findOrganization">;
  routes: Pick<RouteRepository, "findRoute" | "findModule">;
  commands: Pick<ProspectCommandsRepository, "insertProspect">;
}>;

/**
 * Idempotent: an open prospect for the same person/organization and route (and module) is returned instead of a second one.
 * A person marked do-not-contact cannot become a prospect.
 */
export async function createProspect({ reads, people, organizations, routes, commands }: CreateProspectDependencies, actor: AuthenticatedActor, input: CreateProspectInput): Promise<CreateProspectResult> {
  const routeModuleId = input.routeModuleId ?? null;
  await requireRouting(routes, input.routeId, routeModuleId);

  const person = input.personId ? await people.findPerson(input.personId) : null;
  if (input.personId && !person) throw new ApplicationError("not_found", "Person not found", "person_not_found");
  if (person?.doNotContactAt) throw new ApplicationError("conflict", `"${person.fullName}" is marked do-not-contact${person.doNotContactReason ? ` (${person.doNotContactReason})` : ""}, so no prospect can be created for them.`, "person_do_not_contact");
  if (input.organizationId && !(await organizations.findOrganization(input.organizationId))) throw new ApplicationError("not_found", "Organization not found", "organization_not_found");

  const target = { personId: input.personId ?? null, organizationId: input.organizationId ?? null, routeId: input.routeId, routeModuleId };
  const existing = await reads.findOpenProspect(target);
  if (existing) return { prospectId: existing.id, created: false, auditEventId: null };

  const prospectId = uuidv7();
  const auditEventId = await commands.insertProspect({
    prospectId,
    ...target,
    status: input.status,
    temperature: input.temperature ?? null,
    source: input.source ?? null,
    whyTargeted: input.whyTargeted ?? null,
    currentTrigger: input.currentTrigger ?? null,
    nextAction: input.nextAction ?? null,
    audit: toAuditEvent(actor, {
      action: "prospect.created",
      entityType: "prospect",
      entityId: prospectId,
      summary: `Created ${input.status} prospect`,
      metadata: { ...target, status: input.status, source: input.source ?? null }
    })
  });

  return { prospectId, created: true, auditEventId };
}
