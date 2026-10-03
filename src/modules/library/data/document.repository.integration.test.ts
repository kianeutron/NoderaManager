// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDocument } from "@/modules/library/application/get-document.service";
import { getLibraryFacets } from "@/modules/library/application/get-library-facets.service";
import { listDocuments } from "@/modules/library/application/list-documents.service";
import { createDocumentRepository } from "@/modules/library/data/document.repository";
import { documentListQuerySchema, type DocumentListQuery } from "@/modules/library/domain/document.schema";
import type { DocumentPage } from "@/modules/library/domain/document.types";
import { organizations, people, prospects, routes, users } from "@/shared/db/schema/core";
import { documentLinks, documents, documentSearchText, documentVersions, folders, tagLinks, tags } from "@/shared/db/schema/library";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("document repository (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const repository = createDocumentRepository(database);
  const ids = {
    user: uuidv7(), route: uuidv7(), person: uuidv7(), organization: uuidv7(), prospect: uuidv7(), rootFolder: uuidv7(), childFolder: uuidv7(),
    proposal: uuidv7(), contract: uuidv7(), archived: uuidv7(), proposalV1: uuidv7(), proposalV2: uuidv7(), contractV1: uuidv7(), archivedV1: uuidv7(),
    tagPitch: uuidv7(), tagQ3: uuidv7(), linkPerson: uuidv7(), linkProspect: uuidv7(), linkRoute: uuidv7()
  };
  const query = (overrides: Partial<DocumentListQuery> = {}) => documentListQuerySchema.parse(overrides);

  beforeAll(async () => {
    const created = new Date("2026-09-01T10:00:00Z");
    await database.insert(users).values({ id: ids.user, email: `t-${suffix}@example.com`, normalizedEmail: `t-${suffix}@example.com`, displayName: "Test" });
    await database.insert(routes).values({ id: ids.route, name: `Route ${suffix}` });
    await database.insert(organizations).values({ id: ids.organization, name: "Bluewave", normalizedName: `bluewave ${suffix}` });
    await database.insert(people).values({ id: ids.person, fullName: "Marta Chen", normalizedName: `marta ${suffix}` });
    await database.insert(prospects).values({ id: ids.prospect, personId: ids.person, routeId: ids.route });
    await database.insert(folders).values({ id: ids.rootFolder, name: "Sales", normalizedName: `sales ${suffix}`, depth: 0 });
    await database.insert(folders).values({ id: ids.childFolder, parentId: ids.rootFolder, name: "Decks", normalizedName: "decks", depth: 1 });
    await database.insert(documents).values([
      { id: ids.proposal, title: "Bluewave proposal", description: "Fixed-scope 100% delivery plan", category: "proposal", folderId: ids.childFolder, createdBy: ids.user, updatedAt: new Date("2026-09-20T10:00:00Z"), createdAt: created },
      { id: ids.contract, title: "Alpha contract", category: "contract", createdBy: ids.user, updatedAt: new Date("2026-09-25T10:00:00Z"), createdAt: created },
      { id: ids.archived, title: "Old archived proposal", category: "proposal", createdBy: ids.user, archivedAt: created }
    ]);
    const version = (id: string, documentId: string, versionNumber: number, filename: string, mimeType: string) => ({ id, documentId, versionNumber, blobKey: `test/${suffix}/${id}`, originalFilename: filename, mimeType, sizeBytes: 1024, checksumSha256: id, uploadStatus: "uploaded" as const, uploadedAt: created, extractionStatus: "ready" as const, createdBy: ids.user });
    await database.insert(documentVersions).values([
      version(ids.proposalV1, ids.proposal, 1, "proposal-v1.pdf", "application/pdf"),
      version(ids.proposalV2, ids.proposal, 2, "proposal-v2.pdf", "application/pdf"),
      version(ids.contractV1, ids.contract, 1, "contract.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      version(ids.archivedV1, ids.archived, 1, "old.pdf", "application/pdf")
    ]);
    await database.update(documents).set({ currentVersionId: ids.proposalV2 }).where(inArray(documents.id, [ids.proposal]));
    await database.update(documents).set({ currentVersionId: ids.contractV1 }).where(inArray(documents.id, [ids.contract]));
    await database.insert(documentSearchText).values([
      { documentVersionId: ids.proposalV1, documentId: ids.proposal, extractedText: "obsolete zebra clause" },
      { documentVersionId: ids.proposalV2, documentId: ids.proposal, extractedText: "milestone payment schedule" }
    ]);
    await database.insert(tags).values([{ id: ids.tagPitch, name: `Pitch ${suffix}`, normalizedName: `pitch ${suffix}` }, { id: ids.tagQ3, name: `Q3 ${suffix}`, normalizedName: `q3 ${suffix}` }]);
    await database.insert(tagLinks).values([{ tagId: ids.tagPitch, documentId: ids.proposal }, { tagId: ids.tagQ3, documentId: ids.proposal }, { tagId: ids.tagQ3, documentId: ids.contract }]);
    await database.insert(documentLinks).values([
      { id: ids.linkPerson, documentId: ids.proposal, personId: ids.person, relation: "sent", createdBy: ids.user },
      { id: ids.linkProspect, documentId: ids.proposal, prospectId: ids.prospect, createdBy: ids.user },
      { id: ids.linkRoute, documentId: ids.proposal, routeId: ids.route, createdBy: ids.user }
    ]);
  });

  afterAll(async () => {
    await database.delete(documentLinks).where(inArray(documentLinks.id, [ids.linkPerson, ids.linkProspect, ids.linkRoute]));
    await database.delete(tagLinks).where(inArray(tagLinks.tagId, [ids.tagPitch, ids.tagQ3]));
    await database.delete(tags).where(inArray(tags.id, [ids.tagPitch, ids.tagQ3]));
    await database.delete(documentSearchText).where(inArray(documentSearchText.documentVersionId, [ids.proposalV1, ids.proposalV2]));
    await database.update(documents).set({ currentVersionId: null }).where(inArray(documents.id, [ids.proposal, ids.contract]));
    await database.delete(documentVersions).where(inArray(documentVersions.id, [ids.proposalV1, ids.proposalV2, ids.contractV1, ids.archivedV1]));
    await database.delete(documents).where(inArray(documents.id, [ids.proposal, ids.contract, ids.archived]));
    await database.delete(folders).where(inArray(folders.id, [ids.childFolder]));
    await database.delete(folders).where(inArray(folders.id, [ids.rootFolder]));
    await database.delete(prospects).where(inArray(prospects.id, [ids.prospect]));
    await database.delete(people).where(inArray(people.id, [ids.person]));
    await database.delete(organizations).where(inArray(organizations.id, [ids.organization]));
    await database.delete(routes).where(inArray(routes.id, [ids.route]));
    await database.delete(users).where(inArray(users.id, [ids.user]));
  });

  const titles = async (overrides: Partial<DocumentListQuery> = {}) => (await listDocuments(repository, query(overrides))).items.map((item) => item.title);

  it("lists non-archived documents newest first with tags and current file info", async () => {
    const page = await listDocuments(repository, query());
    expect(page.items.map((item) => item.title)).toEqual(["Alpha contract", "Bluewave proposal"]);
    expect(page.total).toBe(2);
    expect(page.nextCursor).toBeNull();
    expect(page.items[1]?.file).toMatchObject({ versionNumber: 2, originalFilename: "proposal-v2.pdf", mimeType: "application/pdf" });
    expect(page.items[1]?.tags).toEqual([`Pitch ${suffix}`, `Q3 ${suffix}`]);
  });

  it("sorts by title", async () => {
    expect(await titles({ sort: "title" })).toEqual(["Alpha contract", "Bluewave proposal"]);
  });

  it("filters by category, folder and tag", async () => {
    expect(await titles({ category: "contract" })).toEqual(["Alpha contract"]);
    expect(await titles({ folderId: ids.childFolder })).toEqual(["Bluewave proposal"]);
    expect(await titles({ tagId: ids.tagQ3 })).toEqual(["Alpha contract", "Bluewave proposal"]);
    expect(await titles({ tagId: ids.tagPitch })).toEqual(["Bluewave proposal"]);
  });

  it("searches title, description, tag names and only the current version's text", async () => {
    expect(await titles({ q: "alpha" })).toEqual(["Alpha contract"]);
    expect(await titles({ q: "fixed-scope" })).toEqual(["Bluewave proposal"]);
    expect(await titles({ q: `pitch ${suffix}` })).toEqual(["Bluewave proposal"]);
    expect(await titles({ q: "milestone" })).toEqual(["Bluewave proposal"]);
    expect(await titles({ q: "zebra" })).toEqual([]);
  });

  it("treats LIKE wildcards in search input literally", async () => {
    expect(await titles({ q: "100%" })).toEqual(["Bluewave proposal"]);
    expect(await titles({ q: "%" })).toEqual(["Bluewave proposal"]);
    expect(await titles({ q: "_" })).toEqual([]);
  });

  it("returns document detail with versions, resolved links and folder path", async () => {
    const detail = await getDocument(repository, ids.proposal);
    expect(detail?.description).toBe("Fixed-scope 100% delivery plan");
    expect(detail?.folderPath.map((item) => item.name)).toEqual(["Sales", "Decks"]);
    expect(detail?.versions.map((version) => [version.versionNumber, version.isCurrent])).toEqual([[2, true], [1, false]]);
    expect(detail?.links.map((link) => [link.targetType, link.label, link.relation])).toEqual([["person", "Marta Chen", "sent"], ["prospect", "Marta Chen", "reference"], ["route", `Route ${suffix}`, "reference"]]);
  });

  it("hides archived documents from detail and file access", async () => {
    expect(await getDocument(repository, ids.archived)).toBeNull();
    expect(await repository.findCurrentFile(ids.archived)).toBeNull();
    expect(await repository.findCurrentFile(ids.proposal)).toMatchObject({ originalFilename: "proposal-v2.pdf" });
  });

  it("reports facets for active documents only", async () => {
    const facets = await getLibraryFacets(repository);
    expect(facets.categories).toEqual(expect.arrayContaining([{ category: "proposal", count: 1 }, { category: "contract", count: 1 }]));
    expect(facets.tags.find((tag) => tag.id === ids.tagQ3)?.count).toBe(2);
    expect(facets.folders.filter((folder) => [ids.rootFolder, ids.childFolder].includes(folder.id)).map((folder) => folder.depth)).toEqual([0, 1]);
  });

  describe("keyset paging", () => {
    const microsecondTimes = ["2026-09-15 10:00:00.123001+00", "2026-09-15 10:00:00.123002+00", "2026-09-15 10:00:00.123003+00"];
    const extras = [
      { id: uuidv7(), title: "micro-1" }, { id: uuidv7(), title: "micro-2" }, { id: uuidv7(), title: "micro-3" },
      { id: uuidv7(), title: "tie-a" }, { id: uuidv7(), title: "tie-b" }, { id: uuidv7(), title: "tie-c" }
    ];
    const newcomerId = uuidv7();

    beforeAll(async () => {
      const tiedAt = new Date("2026-09-10T10:00:00Z");
      await database.insert(documents).values(extras.map(({ id, title }) => ({ id, title, category: "other" as const, createdBy: ids.user, updatedAt: tiedAt })));
      // JavaScript dates stop at milliseconds; Postgres does not. These three differ only in microseconds.
      for (const [index, { id }] of extras.slice(0, microsecondTimes.length).entries()) {
        await database.update(documents).set({ updatedAt: sql`${microsecondTimes[index]}::timestamptz` }).where(inArray(documents.id, [id]));
      }
    });

    afterAll(async () => {
      await database.delete(documents).where(inArray(documents.id, [...extras.map(({ id }) => id), newcomerId]));
    });

    const firstPage = (overrides: Partial<DocumentListQuery> = {}) => listDocuments(repository, query({ category: "other", limit: 2, ...overrides }));
    const nextPage = (previous: DocumentPage) => firstPage(previous.nextCursor ? { cursor: previous.nextCursor } : {});

    async function walk(overrides: Partial<DocumentListQuery> = {}) {
      const pages: DocumentPage[] = [];
      let cursor: string | undefined;
      do {
        const page = await firstPage({ ...overrides, ...(cursor ? { cursor } : {}) });
        pages.push(page);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return pages;
    }

    it("visits every document exactly once, newest first, across timestamp ties and microsecond differences", async () => {
      const pages = await walk();

      expect(pages.map((page) => page.items.length)).toEqual([2, 2, 2]);
      expect(pages.flatMap((page) => page.items.map((item) => item.title))).toEqual(["micro-3", "micro-2", "micro-1", "tie-c", "tie-b", "tie-a"]);
    });

    it("visits every document exactly once in title order", async () => {
      const pages = await walk({ sort: "title" });

      expect(pages.flatMap((page) => page.items.map((item) => item.title))).toEqual(["micro-1", "micro-2", "micro-3", "tie-a", "tie-b", "tie-c"]);
    });

    it("counts once: the first page carries the total and later pages do not", async () => {
      const first = await firstPage();
      const second = await nextPage(first);

      expect(first.total).toBe(6);
      expect(second.total).toBeNull();
    });

    it("does not repeat or skip anything when a newer document appears between pages", async () => {
      const first = await firstPage();
      await database.insert(documents).values({ id: newcomerId, title: "newcomer", category: "other", createdBy: ids.user, updatedAt: new Date("2026-10-01T10:00:00Z") });
      const second = await nextPage(first);

      expect(first.items.map((item) => item.title)).toEqual(["micro-3", "micro-2"]);
      expect(second.items.map((item) => item.title)).toEqual(["micro-1", "tie-c"]);
    });
  });
});
