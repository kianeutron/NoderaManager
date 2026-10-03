import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryChips } from "@/modules/library/ui/CategoryChips";
import { renderWithTheme } from "@/test/render-with-theme";

const facets = { total: 7, categories: [{ category: "proposal" as const, count: 5 }, { category: "contract" as const, count: 2 }] };

describe("CategoryChips", () => {
  it("shows All plus each category with its count and reports the chosen one", () => {
    const onChange = vi.fn();
    renderWithTheme(<CategoryChips facets={facets} onChange={onChange} value={undefined} />);

    expect(screen.getByRole("button", { name: "All · 7" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Contract · 2" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("contract");
  });

  it("returns to All when All is chosen", () => {
    const onChange = vi.fn();
    renderWithTheme(<CategoryChips facets={facets} onChange={onChange} value="proposal" />);

    fireEvent.click(screen.getByRole("button", { name: "All · 7" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("keeps a category from the URL visible even when it is empty", () => {
    renderWithTheme(<CategoryChips facets={facets} onChange={vi.fn()} value="research" />);

    expect(screen.getByRole("button", { name: "Research · 0" })).toHaveAttribute("aria-pressed", "true");
  });
});
