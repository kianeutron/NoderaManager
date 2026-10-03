import { describe, expect, it } from "vitest";
import type { LibraryFolder } from "@/modules/library/domain/document.types";
import { buildFolderPath, flattenFolderTree } from "@/modules/library/domain/folder-path";

const sales: LibraryFolder = { id: "sales", parentId: null, name: "Sales", depth: 0 };
const decks: LibraryFolder = { id: "decks", parentId: "sales", name: "Decks", depth: 1 };
const archive: LibraryFolder = { id: "archive", parentId: "sales", name: "Archive", depth: 1 };
const research: LibraryFolder = { id: "research", parentId: null, name: "Research", depth: 0 };

describe("folder paths", () => {
  it("builds the path from the root down to the folder", () => {
    expect(buildFolderPath([sales, decks], "decks")).toEqual([{ id: "sales", name: "Sales" }, { id: "decks", name: "Decks" }]);
  });

  it("returns an empty path for unfiled documents and unknown folders", () => {
    expect(buildFolderPath([sales], null)).toEqual([]);
    expect(buildFolderPath([sales], "missing")).toEqual([]);
  });

  it("terminates on corrupt cyclic data", () => {
    const a: LibraryFolder = { id: "a", parentId: "b", name: "A", depth: 0 };
    const b: LibraryFolder = { id: "b", parentId: "a", name: "B", depth: 1 };
    expect(buildFolderPath([a, b], "a").length).toBeLessThanOrEqual(3);
  });

  it("flattens depth-first with alphabetical siblings", () => {
    expect(flattenFolderTree([decks, research, archive, sales]).map((folder) => folder.id)).toEqual(["research", "sales", "archive", "decks"]);
  });
});
