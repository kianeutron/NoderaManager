// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLibraryServices } from "@/modules/library/application/create-library-services";
import { createDocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import { addTextDocumentVersionInputSchema, createTextDocumentInputSchema, linkDocumentInputSchema, setDocumentTagsInputSchema, updateDocumentInputSchema } from "@/modules/library/domain/document-commands.schema";
import { documentListQuerySchema } from "@/modules/library/domain/document.schema";
import { createActor } from "@/test/factories/actors";
import { ensureOwnerUserId } from "@/shared/auth/owner-user.repository";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";
import { auditEvents, people, routes, users } from "@/shared/db/schema/core";
import { documentLinks, documents, documentSearchText, documentVersions, folders, tagLinks, tags } from "@/shared/db/schema/library";
import { campaigns } from "@/shared/db/schema/strategy";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("library write commands (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const storedBlobs = new Map<string, string>();
  const blobStore: DocumentBlobStore = { open: async () => null, save: async (key, body) => void storedBlobs.set(key, body), remove: async (key) => void storedBlobs.delete(key) };
  const ownerEmail = `owner-${suffix}@example.com`;
  const services = createLibraryServices({ database, blobStore, resolveOwnerUserId: () => ensureOwnerUserId(database, ownerEmail) });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}` });
  const routeId = uuidv7();
  const personId = uuidv7();
  const campaignId = uuidv7();

  const name = (label: string) => `${label} ${suffix}`;
  const create = (title: string, content: string, extra: Record<string, unknown> = {}) => services.createTextDocument(actor, createTextDocumentInputSchema.parse({ title: name(title), content, ...extra }));
  const auditFor = (entityId: string) => database.select({ action: auditEvents.action, actorType: auditEvents.actorType, actorId: auditEvents.actorId, requestId: auditEvents.requestId, source: auditEvents.source }).from(auditEvents).where(eq(auditEvents.entityId, entityId));
  const search = async (q: string) => (await services.listDocuments(documentListQuerySchema.parse({ q }))).items.map((item) => item.title);

  beforeAll(async () => {
    await database.insert(routes).values({ id: routeId, name: name("Route") });
    await database.insert(people).values({ id: personId, fullName: name("Marta"), normalizedName: name("marta").toLowerCase() });
    await database.insert(campaigns).values({ id: campaignId, name: name("Q4 agencies"), normalizedName: name("q4 agencies").toLowerCase() });
  });

  afterAll(async () => {
    const documentIds = (await database.select({ id: documents.id }).from(documents).where(like(documents.title, `%${suffix}%`))).map((row) => row.id);
    const folderRows = await database.select({ id: folders.id, depth: folders.depth }).from(folders).where(like(folders.normalizedName, `%${suffix}%`));
    await database.delete(auditEvents).where(or(eq(auditEvents.requestId, actor.requestId), inArray(auditEvents.entityId, [...documentIds, ...folderRows.map((row) => row.id)])));
    if (documentIds.length > 0) {
      await database.delete(documentLinks).where(inArray(documentLinks.documentId, documentIds));
      await database.delete(tagLinks).where(inArray(tagLinks.documentId, documentIds));
      await database.delete(documentSearchText).where(inArray(documentSearchText.documentId, documentIds));
      await database.update(documents).set({ currentVersionId: null }).where(inArray(documents.id, documentIds));
      await database.delete(documentVersions).where(inArray(documentVersions.documentId, documentIds));
      await database.delete(documents).where(inArray(documents.id, documentIds));
    }
    await database.delete(tags).where(like(tags.normalizedName, `%${suffix}%`));
    for (const depth of [...new Set(folderRows.map((row) => row.depth))].toSorted((left, right) => right - left)) {
      await database.delete(folders).where(inArray(folders.id, folderRows.filter((row) => row.depth === depth).map((row) => row.id)));
    }
    await database.delete(campaigns).where(eq(campaigns.id, campaignId));
    await database.delete(people).where(eq(people.id, personId));
    await database.delete(routes).where(eq(routes.id, routeId));
    await database.delete(users).where(eq(users.normalizedEmail, ownerEmail));
  });

  it("creates a document with its first version, tags, search text, private bytes and an audit event", async () => {
    const folder = await services.createFolder(actor, { name: name("Research") });
    const created = await create("Findings", `# zebra${suffix} habitats`, { category: "research", tags: [`Q3 ${suffix}`, `Agency ${suffix}`], folderId: folder.folderId });

    expect(created).toMatchObject({ created: true, versionNumber: 1, auditEventId: expect.any(String) });
    const detail = await services.getDocument(created.documentId);
    expect(detail).toMatchObject({ title: name("Findings"), category: "research", tags: [`Agency ${suffix}`, `Q3 ${suffix}`], folderPath: [{ name: name("Research") }], file: { mimeType: "text/markdown", versionNumber: 1, extractionStatus: "ready" } });
    expect(detail?.file?.originalFilename).toMatch(/^findings-[0-9a-f]+\.md$/);
    expect([...storedBlobs.values()]).toContain(`# zebra${suffix} habitats`);
    expect(await search(`zebra${suffix}`)).toEqual([name("Findings")]);
    expect(await auditFor(created.documentId)).toEqual([{ action: "document.created", actorType: "mcp", actorId: actor.id, requestId: actor.requestId, source: "mcp" }]);
  });

  it("is idempotent: repeating a create returns the same document and writes no second audit event", async () => {
    const first = await create("Idempotent", "same content");
    const second = await create("Idempotent", "same content");

    expect(second).toMatchObject({ created: false, documentId: first.documentId, versionId: first.versionId, auditEventId: null });
    expect(await auditFor(first.documentId)).toHaveLength(1);
  });

  it("adds versions, keeps history, and only searches the current version", async () => {
    const created = await create("Versioned", `old zebra${suffix}v1`);
    const added = await services.addTextDocumentVersion(actor, addTextDocumentVersionInputSchema.parse({ documentId: created.documentId, content: `new llama${suffix}v2`, changeNote: "Rewrote" }));

    expect(added).toMatchObject({ created: true, versionNumber: 2 });
    const detail = await services.getDocument(created.documentId);
    expect(detail?.versions.map((version) => [version.versionNumber, version.isCurrent, version.changeNote])).toEqual([[2, true, "Rewrote"], [1, false, null]]);
    expect(await search(`llama${suffix}v2`)).toEqual([name("Versioned")]);
    expect(await search(`zebra${suffix}v1`)).toEqual([]);

    const repeated = await services.addTextDocumentVersion(actor, addTextDocumentVersionInputSchema.parse({ documentId: created.documentId, content: `new llama${suffix}v2` }));
    expect(repeated).toMatchObject({ created: false, versionNumber: 2, auditEventId: null });
  });

  it("updates details, moves between folders and audits only real changes", async () => {
    const created = await create("Editable", "text");
    const folder = await services.createFolder(actor, { name: name("Moved") });

    const changed = await services.updateDocument(actor, updateDocumentInputSchema.parse({ documentId: created.documentId, title: name("Edited"), description: "  Summary  ", category: "report", folderId: folder.folderId }));
    expect(changed).toMatchObject({ changed: true });
    expect(await services.getDocument(created.documentId)).toMatchObject({ title: name("Edited"), description: "Summary", category: "report", folderPath: [{ name: name("Moved") }] });

    expect(await services.updateDocument(actor, updateDocumentInputSchema.parse({ documentId: created.documentId, title: name("Edited") }))).toMatchObject({ changed: false, auditEventId: null });
    expect((await auditFor(created.documentId)).map((event) => event.action).toSorted()).toEqual(["document.created", "document.updated"]);

    await services.updateDocument(actor, updateDocumentInputSchema.parse({ documentId: created.documentId, description: null, folderId: null }));
    expect(await services.getDocument(created.documentId)).toMatchObject({ description: null, folderPath: [] });
  });

  it("replaces tags, reusing existing ones case-insensitively", async () => {
    const first = await create("Tagged A", "a", { tags: [`Shared ${suffix}`] });
    const second = await create("Tagged B", "b");

    const result = await services.setDocumentTags(actor, setDocumentTagsInputSchema.parse({ documentId: second.documentId, tags: [`SHARED ${suffix}`, `Extra ${suffix}`] }));
    // The existing tag keeps the spelling that created it, and the result reports what is stored.
    expect(result.tags).toEqual([`Shared ${suffix}`, `Extra ${suffix}`]);
    expect((await services.getDocument(second.documentId))?.tags).toEqual([`Extra ${suffix}`, `Shared ${suffix}`]);
    expect(await database.select({ id: tags.id }).from(tags).where(eq(tags.normalizedName, `shared ${suffix}`))).toHaveLength(1);
    expect((await services.getDocument(first.documentId))?.tags).toEqual([`Shared ${suffix}`]);

    expect(await services.setDocumentTags(actor, setDocumentTagsInputSchema.parse({ documentId: second.documentId, tags: [`extra ${suffix}`, `shared ${suffix}`] }))).toMatchObject({ changed: false });
    await services.setDocumentTags(actor, setDocumentTagsInputSchema.parse({ documentId: second.documentId, tags: [] }));
    expect((await services.getDocument(second.documentId))?.tags).toEqual([]);
  });

  it("links to records idempotently and unlinks only the relationship", async () => {
    const created = await create("Linked", "l");
    const linked = await services.linkDocument(actor, linkDocumentInputSchema.parse({ documentId: created.documentId, targetType: "person", targetId: personId, relation: "sent", versionId: created.versionId }));
    await services.linkDocument(actor, linkDocumentInputSchema.parse({ documentId: created.documentId, targetType: "route", targetId: routeId }));
    await services.linkDocument(actor, linkDocumentInputSchema.parse({ documentId: created.documentId, targetType: "campaign", targetId: campaignId }));

    expect(linked.created).toBe(true);
    expect((await services.getDocument(created.documentId))?.links.map((link) => [link.targetType, link.label, link.relation])).toEqual([["person", name("Marta"), "sent"], ["route", name("Route"), "reference"], ["campaign", name("Q4 agencies"), "reference"]]);
    expect(await services.linkDocument(actor, linkDocumentInputSchema.parse({ documentId: created.documentId, targetType: "person", targetId: personId, relation: "sent" }))).toMatchObject({ linkId: linked.linkId, created: false, auditEventId: null });

    await services.unlinkDocument(actor, { linkId: linked.linkId });
    expect((await services.getDocument(created.documentId))?.links.map((link) => link.targetType)).toEqual(["route", "campaign"]);
    expect(await database.select({ id: people.id }).from(people).where(eq(people.id, personId))).toHaveLength(1);
    await expect(services.unlinkDocument(actor, { linkId: linked.linkId })).rejects.toMatchObject({ code: "not_found" });
    await expect(services.linkDocument(actor, linkDocumentInputSchema.parse({ documentId: created.documentId, targetType: "person", targetId: uuidv7() }))).rejects.toMatchObject({ code: "not_found" });
  });

  it("archives out of every view, restores, and unfiles when the folder was archived meanwhile", async () => {
    const folder = await services.createFolder(actor, { name: name("Temporary") });
    const created = await create("Archivable", "x", { folderId: folder.folderId });

    await services.archiveDocument(actor, { documentId: created.documentId });
    expect(await services.getDocument(created.documentId)).toBeNull();
    expect(await search(name("Archivable"))).toEqual([]);
    expect(await services.archiveDocument(actor, { documentId: created.documentId })).toMatchObject({ changed: false });

    await services.archiveFolder(actor, { folderId: folder.folderId });
    await services.restoreDocument(actor, { documentId: created.documentId });
    expect(await services.getDocument(created.documentId)).toMatchObject({ folderPath: [] });
    expect(await search(name("Archivable"))).toEqual([name("Archivable")]);
  });

  it("enforces folder rules: depth, sibling names and non-empty archive", async () => {
    let parentId: string | undefined;
    for (const level of [0, 1, 2, 3]) {
      const folder = await services.createFolder(actor, { name: name(`Level ${level}`), ...(parentId ? { parentId } : {}) });
      expect(folder.depth).toBe(level);
      parentId = folder.folderId;
    }
    await expect(services.createFolder(actor, { name: name("Level 4"), ...(parentId ? { parentId } : {}) })).rejects.toMatchObject({ code: "limit_exceeded" });

    const root = await services.createFolder(actor, { name: name("Siblings") });
    expect(await services.createFolder(actor, { name: name("SIBLINGS").toUpperCase() })).toMatchObject({ folderId: root.folderId, changed: false });
    const other = await services.createFolder(actor, { name: name("Other") });
    await expect(services.renameFolder(actor, { folderId: other.folderId, name: name("Siblings") })).rejects.toMatchObject({ code: "conflict" });

    await create("Occupant", "o", { folderId: root.folderId });
    await expect(services.archiveFolder(actor, { folderId: root.folderId })).rejects.toMatchObject({ code: "conflict" });
    expect(await services.archiveFolder(actor, { folderId: other.folderId })).toMatchObject({ changed: true });
  });

  it("commits a mutation and its audit event atomically: a failing batch leaves nothing behind", async () => {
    const existing = await create("Atomic base", "base");
    const existingVersion = (await database.select({ blobKey: documentVersions.blobKey }).from(documentVersions).where(eq(documentVersions.id, existing.versionId)))[0];
    const ownerUserId = await ensureOwnerUserId(database, ownerEmail);
    const documentId = uuidv7();

    await expect(createDocumentCommandsRepository(database).insertDocumentWithVersion({
      documentId,
      title: name("Atomic victim"),
      description: null,
      category: "other",
      folderId: null,
      tagIds: [],
      // Reusing an existing blob key violates a unique index on the second statement of the batch.
      version: { versionId: uuidv7(), blobKey: existingVersion?.blobKey ?? "", originalFilename: "x.md", mimeType: "text/markdown", sizeBytes: 1, checksumSha256: "x", extractedText: "x", createdBy: ownerUserId },
      audit: { actorType: "mcp", actorId: actor.id, requestId: actor.requestId, source: "mcp", action: "document.created", entityType: "document", entityId: documentId, summary: "should not persist", metadata: {} }
    })).rejects.toThrow();

    expect(await database.select({ id: documents.id }).from(documents).where(eq(documents.id, documentId))).toHaveLength(0);
    expect(await database.select({ id: auditEvents.id }).from(auditEvents).where(and(eq(auditEvents.entityId, documentId)))).toHaveLength(0);
  });
});
