import { describe, expect, it } from "vitest";
import { buildContentDisposition, isInlineViewable, resolveContentDisposition, resolveServedContentType } from "@/modules/library/domain/file-delivery";

describe("file delivery rules", () => {
  it("serves only browser-safe types inline", () => {
    expect(isInlineViewable("application/pdf")).toBe(true);
    expect(isInlineViewable("image/png")).toBe(true);
    expect(isInlineViewable("text/html")).toBe(false);
    expect(isInlineViewable("image/svg+xml")).toBe(false);
    expect(isInlineViewable("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
  });

  it("forces attachment for unsafe types even when inline is requested", () => {
    expect(resolveContentDisposition("application/pdf", "inline")).toBe("inline");
    expect(resolveContentDisposition("application/pdf", "attachment")).toBe("attachment");
    expect(resolveContentDisposition("text/csv", "inline")).toBe("attachment");
  });

  it("serves markdown as plain text so it is never interpreted as markup", () => {
    expect(resolveServedContentType("text/markdown")).toBe("text/plain; charset=utf-8");
    expect(resolveServedContentType("application/pdf")).toBe("application/pdf");
  });

  it("builds a header-safe Content-Disposition for unicode and quoted filenames", () => {
    const header = buildContentDisposition("attachment", 'Mårta "final" (v2).pdf');
    expect(header).toBe(`attachment; filename="M_rta _final_ (v2).pdf"; filename*=UTF-8''M%C3%A5rta%20%22final%22%20%28v2%29.pdf`);
    expect(header).not.toMatch(/[\r\n]/);
  });
});
