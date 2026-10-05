import { v7 as uuidv7 } from "uuid";
import type { CampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import type { InteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import type { OrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import type { PeopleServices } from "@/modules/people/application/create-people-services";
import type { ProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { bulkOutreachImportInputSchema, type BulkOutreachImportInput, type BulkOutreachRecord, type CommitBulkOutreachImportInput } from "@/modules/outreach/domain/bulk-import.schema";
import type { OutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { ApplicationError } from "@/shared/errors/application-error";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { ExternalRefRepository } from "@/shared/integrations/external-ref.repository";
import type { BulkImportRepository } from "@/modules/outreach/data/bulk-import.repository";
import type { getDatabase } from "@/shared/db/client";
import { fingerprintOf } from "@/shared/idempotency/fingerprint";
import { toAuditEvent } from "@/shared/audit/audit-actor";

const previewLifetimeMilliseconds = 60 * 60 * 1000;
const source = "mcp";

type Services = Readonly<{
  people: Pick<PeopleServices, "getPerson" | "findDuplicateCandidates" | "createPerson">;
  organizations: Pick<OrganizationsServices, "getOrganization" | "findOrganizationsByDomains" | "createOrganization">;
  prospects: Pick<ProspectsServices, "getProspect" | "searchProspects" | "createProspect">;
  campaigns: Pick<CampaignsServices, "getCampaign" | "addCampaignProspects">;
  outreach: Pick<OutreachServices, "logOutreach">;
  interactions: Pick<InteractionsServices, "logInteraction" | "logBounce">;
  imports: BulkImportRepository;
  externalRefs: ExternalRefRepository;
}>;

type PlannedRecord = Readonly<{
  recordKey: string;
  organizationId: string | null;
  personId: string | null;
  prospectId: string | null;
  organizationAction: "create" | "reuse" | "skip";
  personAction: "create" | "reuse" | "skip";
  prospectAction: "create" | "reuse" | "skip";
  messageCount: number;
  interactionCount: number;
  errors: string[];
}>;

type BulkPlan = Readonly<{ records: PlannedRecord[]; counts: Record<string, number> }>;

function errorMessage(error: unknown): string {
  return error instanceof ApplicationError ? error.message : "The record could not be imported.";
}

function summarize(records: readonly PlannedRecord[]) {
  const counts = { create: 0, reuse: 0, skip: 0, failed: 0, messages: 0, interactions: 0 };
  for (const record of records) {
    counts.create += [record.organizationAction, record.personAction, record.prospectAction].filter((action) => action === "create").length;
    counts.reuse += [record.organizationAction, record.personAction, record.prospectAction].filter((action) => action === "reuse").length;
    counts.skip += [record.organizationAction, record.personAction, record.prospectAction].filter((action) => action === "skip").length;
    counts.messages += record.messageCount;
    counts.interactions += record.interactionCount;
    if (record.errors.length > 0) counts.failed += 1;
  }
  return counts;
}

async function planRecord(services: Services, record: BulkOutreachRecord): Promise<PlannedRecord> {
  const errors: string[] = [];
  let organizationId = record.organizationId ?? null;
  let organizationAction: PlannedRecord["organizationAction"] = organizationId ? "reuse" : "skip";
  let personId = record.personId ?? null;
  let personAction: PlannedRecord["personAction"] = personId ? "reuse" : "skip";
  let prospectId = record.prospectId ?? null;
  let prospectAction: PlannedRecord["prospectAction"] = prospectId ? "reuse" : "skip";

  if (organizationId) {
    if (!(await services.organizations.getOrganization(organizationId))) errors.push("Organization not found.");
  } else if (record.organization) {
    const matches = record.organization.domains.length > 0 ? await services.organizations.findOrganizationsByDomains(record.organization.domains) : [];
    const distinct = [...new Set(matches.map((match) => match.organizationId))];
    if (distinct.length > 1) errors.push("The supplied domains belong to different organizations.");
    else if (distinct[0]) { organizationId = distinct[0]; organizationAction = "reuse"; }
    else organizationAction = "create";
  }

  if (personId) {
    if (!(await services.people.getPerson(personId))) errors.push("Person not found.");
  } else if (record.person) {
    const candidates = await services.people.findDuplicateCandidates({
      fullName: record.person.fullName,
      emails: record.person.emails,
      linkedInUrl: record.person.linkedinUrl,
      ...(organizationId ? { organizationId } : {})
    });
    const exact = candidates.filter((candidate) => candidate.matchLevel === "exact");
    const strong = candidates.filter((candidate) => candidate.matchLevel === "strong");
    if (exact.length === 1) { personId = exact.at(0)?.personId ?? null; personAction = "reuse"; }
    else if (exact.length > 1) errors.push("The person identity matches more than one existing person.");
    else if (strong.length === 1) { personId = strong.at(0)?.personId ?? null; personAction = "reuse"; }
    else personAction = "create";
  }

  if (!prospectId) {
    const page = await services.prospects.searchProspects({ routeId: record.routeId, ...(record.routeModuleId ? { routeModuleId: record.routeModuleId } : {}), ...(personId ? { personId } : {}), ...(organizationId ? { organizationId } : {}), sort: "updated", limit: 2 });
    const existing = page.items[0];
    if (existing) { prospectId = existing.id; prospectAction = "reuse"; }
    else prospectAction = "create";
  } else if (!(await services.prospects.getProspect(prospectId))) errors.push("Prospect not found.");

  if (record.campaignId && !(await services.campaigns.getCampaign(record.campaignId))) errors.push("Campaign not found.");
  return { recordKey: record.recordKey, organizationId, personId, prospectId, organizationAction, personAction, prospectAction, messageCount: record.messages.length, interactionCount: record.interactions.length, errors };
}

export function createBulkOutreachImportService(services: Services) {
  return {
    async preview(actor: AuthenticatedActor, input: BulkOutreachImportInput) {
      // The MCP adapter owns runtime validation and passes the schema's normalized
      // Dates here. Re-parsing would reject those Dates and would also duplicate
      // the adapter's boundary validation.
      const fingerprint = fingerprintOf([input]);
      const existing = await services.imports.findForActorByFingerprint?.(actor.id, source, fingerprint);
      if (existing) return { importId: existing.id, expiresAt: existing.expiresAt.toISOString(), plan: existing.plan };
      const records = await Promise.all(input.records.map(async (record) => {
        try { return await planRecord(services, record); }
        catch (error) { return { recordKey: record.recordKey, organizationId: record.organizationId ?? null, personId: record.personId ?? null, prospectId: record.prospectId ?? null, organizationAction: "skip" as const, personAction: "skip" as const, prospectAction: "skip" as const, messageCount: record.messages.length, interactionCount: record.interactions.length, errors: [errorMessage(error)] }; }
      }));
      const plan: BulkPlan = { records, counts: summarize(records) };
      const importId = uuidv7();
      const expiresAt = new Date(Date.now() + previewLifetimeMilliseconds);
      await services.imports.create({ id: importId, actorId: actor.id, source, requestFingerprint: fingerprint, payload: input, plan, expiresAt });
      return { importId, expiresAt: expiresAt.toISOString(), plan };
    },

    async commit(actor: AuthenticatedActor, input: CommitBulkOutreachImportInput) {
      const stored = await services.imports.findForActor(input.importId, actor.id, source);
      if (!stored) throw new ApplicationError("not_found", "Import preview not found or it belongs to another connection.");
      if (stored.expiresAt.getTime() < Date.now()) throw new ApplicationError("conflict", "Import preview expired. Create a new preview before committing.");
      if (stored.commitIdempotencyKey && stored.commitIdempotencyKey !== input.idempotencyKey) throw new ApplicationError("conflict", "This import was already committed with a different idempotency key.");
      if (stored.status === "committed" && stored.commitIdempotencyKey === input.idempotencyKey) return stored.result as Record<string, unknown>;

      const payload = bulkOutreachImportInputSchema.parse(stored.payload);
      const results: Array<Record<string, unknown>> = [];
      for (const record of payload.records) {
        try { results.push(await commitRecord(services, actor, input.importId, record)); }
        catch (error) { results.push({ recordKey: record.recordKey, status: "failed", error: errorMessage(error) }); }
      }
      const counts = { created: results.filter((result) => result.status === "created").length, reused: results.filter((result) => result.status === "reused").length, skipped: results.filter((result) => result.status === "skipped").length, failed: results.filter((result) => result.status === "failed").length };
      const result = { importId: input.importId, status: counts.failed > 0 ? "partial" : "committed", counts, records: results };
      await services.imports.updateResult(input.importId, result.status, result, input.idempotencyKey);
      return result;
    }
  };
}

async function commitRecord(services: Services, actor: AuthenticatedActor, importId: string, record: BulkOutreachRecord): Promise<Record<string, unknown>> {
  let organizationId = record.organizationId;
  if (!organizationId && record.organization) {
    const matches = record.organization.domains.length > 0 ? await services.organizations.findOrganizationsByDomains(record.organization.domains) : [];
    organizationId = matches[0]?.organizationId;
    if (!organizationId) organizationId = (await services.organizations.createOrganization(actor, record.organization)).organizationId;
  }
  let personId = record.personId;
  if (!personId && record.person) {
    const candidates = await services.people.findDuplicateCandidates({ fullName: record.person.fullName, emails: record.person.emails, linkedInUrl: record.person.linkedinUrl, ...(organizationId ? { organizationId } : {}) });
    personId = candidates.find((candidate) => candidate.matchLevel === "exact" || candidate.matchLevel === "strong")?.personId;
    if (!personId) personId = (await services.people.createPerson(actor, { ...record.person, ...(organizationId ? { organizationId } : {}), languages: [], confirmNewIdentity: false })).personId;
  }
  let prospectId = record.prospectId;
  if (!prospectId) {
    const page = await services.prospects.searchProspects({ routeId: record.routeId, ...(record.routeModuleId ? { routeModuleId: record.routeModuleId } : {}), ...(personId ? { personId } : {}), ...(organizationId ? { organizationId } : {}), sort: "updated", limit: 2 });
    prospectId = page.items[0]?.id;
    if (!prospectId) prospectId = (await services.prospects.createProspect(actor, { personId, organizationId, routeId: record.routeId, ...(record.routeModuleId ? { routeModuleId: record.routeModuleId } : {}), status: "researched", source: "import" })).prospectId;
  }
  if (!prospectId) throw new ApplicationError("conflict", "The record has no usable prospect target.");
  if (record.campaignId) await services.campaigns.addCampaignProspects(actor, { campaignId: record.campaignId, prospectIds: [prospectId] });
  for (const ref of record.customExternalRefs) {
    await services.externalRefs.link({ source: ref.source, refType: ref.refType, externalId: ref.externalId, target: { prospectId }, audit: toAuditEvent(actor, { action: "external_ref.linked", entityType: "prospect", entityId: prospectId, summary: "Linked imported provider reference", metadata: { source: ref.source, refType: ref.refType } }) });
  }

  const messageIds = new Map<string, string>();
  let createdMessages = 0;
  for (const message of record.messages) {
    let messageId: string | undefined;
    if (message.external?.messageId) {
      const existing = await services.externalRefs.find(message.external.source, "message_id", message.external.messageId);
      if (existing?.outreachMessageId) messageId = existing.outreachMessageId;
      else if (existing) throw new ApplicationError("conflict", `Provider message ${message.external.messageId} is linked to a different record.`);
    }
    if (!messageId) {
      const result = await services.outreach.logOutreach(actor, { prospectId, campaignId: record.campaignId, channel: message.channel, subject: message.subject, body: message.body, sentAt: message.sentAt, idempotencyKey: `bulk:${importId}:${record.recordKey}:${message.key}` });
      messageId = result.messageId;
      if (result.created) createdMessages += 1;
      if (message.external?.messageId) await services.externalRefs.link({ source: message.external.source, refType: "message_id", externalId: message.external.messageId, target: { outreachMessageId: messageId }, audit: toAuditEvent(actor, { action: "external_ref.linked", entityType: "outreach_message", entityId: messageId, summary: "Linked imported provider message", metadata: { source: message.external.source, refType: "message_id" } }) });
      if (message.external?.threadId) await services.externalRefs.link({ source: message.external.source, refType: "thread_id", externalId: message.external.threadId, target: { outreachMessageId: messageId }, audit: toAuditEvent(actor, { action: "external_ref.linked", entityType: "outreach_message", entityId: messageId, summary: "Linked imported provider thread", metadata: { source: message.external.source, refType: "thread_id" } }) });
    }
    messageIds.set(message.key, messageId);
    if (message.bounceStatus) await services.interactions.logBounce(actor, { outreachMessageId: messageId, bounceStatus: message.bounceStatus, occurredAt: message.sentAt });
  }

  let createdInteractions = 0;
  for (const interaction of record.interactions) {
    let existingInteraction: string | undefined;
    if (interaction.external?.messageId) {
      const ref = await services.externalRefs.find(interaction.external.source, "message_id", interaction.external.messageId);
      if (ref?.interactionId) existingInteraction = ref.interactionId;
      else if (ref?.outreachMessageId) throw new ApplicationError("conflict", `Provider message ${interaction.external.messageId} is already linked to outreach.`);
    }
    if (existingInteraction) continue;
    const logged = await services.interactions.logInteraction(actor, { prospectId, outreachMessageId: interaction.answersMessageKey ? messageIds.get(interaction.answersMessageKey) : undefined, direction: interaction.direction, channel: interaction.channel, type: interaction.type, subject: interaction.subject, body: interaction.body, occurredAt: interaction.occurredAt, responseDepth: interaction.responseDepth, sentiment: interaction.sentiment, idempotencyKey: `bulk:${importId}:${record.recordKey}:interaction:${interaction.key}` });
    if (logged.created) createdInteractions += 1;
    if (interaction.external?.messageId) await services.externalRefs.link({ source: interaction.external.source, refType: "message_id", externalId: interaction.external.messageId, target: { interactionId: logged.interactionId }, audit: toAuditEvent(actor, { action: "external_ref.linked", entityType: "interaction", entityId: logged.interactionId, summary: "Linked imported provider interaction", metadata: { source: interaction.external.source, refType: "message_id" } }) });
    if (interaction.external?.threadId) await services.externalRefs.link({ source: interaction.external.source, refType: "thread_id", externalId: interaction.external.threadId, target: { interactionId: logged.interactionId }, audit: toAuditEvent(actor, { action: "external_ref.linked", entityType: "interaction", entityId: logged.interactionId, summary: "Linked imported provider thread", metadata: { source: interaction.external.source, refType: "thread_id" } }) });
  }
  return { recordKey: record.recordKey, status: createdMessages + createdInteractions > 0 ? "created" : "reused", organizationId: organizationId ?? null, personId: personId ?? null, prospectId, messages: createdMessages, interactions: createdInteractions };
}
