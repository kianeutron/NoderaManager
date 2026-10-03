import { describe, expect, it } from "vitest";
import { documentCategoryValues } from "@/shared/db/schema/library-values";
import { categoryMeta, formatBytes, getFileKind } from "@/modules/library/ui/document-presentation";

describe("document presentation", () => {
  it("formats byte sizes with sensible precision", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1_258_291)).toBe("1.2 MB");
    expect(formatBytes(25 * 1024 * 1024)).toBe("25 MB");
  });

  it.each([
    ["application/pdf", "pdf"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "word"],
    ["text/markdown", "text"],
    ["text/csv", "spreadsheet"],
    ["image/webp", "image"],
    ["application/zip", "file"],
    [null, "file"]
  ] as const)("classifies %s as %s", (mimeType, kind) => {
    expect(getFileKind(mimeType)).toBe(kind);
  });

  it("has a label for every category the database allows", () => {
    expect(Object.keys(categoryMeta).toSorted()).toEqual([...documentCategoryValues].toSorted());
  });
});
