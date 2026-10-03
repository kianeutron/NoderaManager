import { describe, expect, it } from "vitest";
import { toDocumentDetail, toDocumentLinkView, toDocumentSummary } from "@/modules/library/application/document-views";

const noLinkTargets = { personId: null, personName: null, organizationId: null, organizationName: null, routeId: null, routeName: null, campaignId: null, campaignName: null, prospectId: null, prospectPersonName: null, prospectOrganizationName: null };
const file = { versionNumber: 2, mimeType: "application/pdf", sizeBytes: 2048, originalFilename: "deck.pdf", extractionStatus: "ready" as const };
const summaryRow = { id: "d1", title: "Deck", category: "pitch_deck" as const, updatedAt: new Date("2026-09-20T12:00:00Z"), ...file };

describe("toDocumentSummary", () => {
  it("maps dates to ISO strings and attaches tags and file info", () => {
    expect(toDocumentSummary(summaryRow, ["Q3"])).toEqual({ id: "d1", title: "Deck", category: "pitch_deck", tags: ["Q3"], file: { ...file }, updatedAt: "2026-09-20T12:00:00.000Z" });
  });

  it("reports no file for a document without an uploaded version", () => {
    const row = { ...summaryRow, versionNumber: null, mimeType: null, sizeBytes: null, originalFilename: null, extractionStatus: null };
    expect(toDocumentSummary(row, []).file).toBeNull();
  });
});

describe("toDocumentLinkView", () => {
  const base = { id: "l1", relation: "sent" as const, ...noLinkTargets };

  it("resolves whichever single target is set", () => {
    expect(toDocumentLinkView({ ...base, personId: "p1", personName: "Marta Chen" })).toMatchObject({ targetType: "person", label: "Marta Chen" });
    expect(toDocumentLinkView({ ...base, organizationId: "o1", organizationName: "Bluewave" })).toMatchObject({ targetType: "organization", label: "Bluewave" });
    expect(toDocumentLinkView({ ...base, routeId: "r1", routeName: "Agency overflow" })).toMatchObject({ targetType: "route", label: "Agency overflow" });
    expect(toDocumentLinkView({ ...base, campaignId: "c1", campaignName: "Q4 agencies" })).toMatchObject({ targetType: "campaign", label: "Q4 agencies" });
  });

  it("labels a prospect by its person, then its organization, then a fallback", () => {
    expect(toDocumentLinkView({ ...base, prospectId: "x", prospectPersonName: "Julian Park", prospectOrganizationName: "Vellum" })?.label).toBe("Julian Park");
    expect(toDocumentLinkView({ ...base, prospectId: "x", prospectOrganizationName: "Vellum" })?.label).toBe("Vellum");
    expect(toDocumentLinkView({ ...base, prospectId: "x" })?.label).toBe("Prospect");
  });

  it("drops a link whose target can no longer be resolved", () => {
    expect(toDocumentLinkView(base)).toBeNull();
  });
});

describe("toDocumentDetail", () => {
  it("marks the current version, resolves the folder path and skips unresolvable links", () => {
    const detail = toDocumentDetail({
      row: { ...summaryRow, description: "About", folderId: "f2" },
      tagNames: [],
      versions: [
        { id: "v2", versionNumber: 2, originalFilename: "deck.pdf", mimeType: "application/pdf", sizeBytes: 2048, changeNote: null, createdAt: new Date("2026-09-20T12:00:00Z") },
        { id: "v1", versionNumber: 1, originalFilename: "deck.pdf", mimeType: "application/pdf", sizeBytes: 1024, changeNote: "First", createdAt: new Date("2026-09-10T12:00:00Z") }
      ],
      links: [{ id: "l1", relation: "reference", ...noLinkTargets }],
      folders: [{ id: "f1", parentId: null, name: "Sales", depth: 0 }, { id: "f2", parentId: "f1", name: "Decks", depth: 1 }]
    });

    expect(detail.versions.map((version) => [version.versionNumber, version.isCurrent])).toEqual([[2, true], [1, false]]);
    expect(detail.folderPath.map((folder) => folder.name)).toEqual(["Sales", "Decks"]);
    expect(detail.links).toEqual([]);
    expect(detail.description).toBe("About");
  });
});
