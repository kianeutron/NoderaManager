import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageLoading } from "@/shared/ui/PageLoading";
import { renderWithTheme } from "@/test/render-with-theme";

describe("PageLoading", () => {
  it("tells assistive technology the page is loading", () => {
    renderWithTheme(<PageLoading />);
    expect(screen.getByRole("status", { name: "Loading page" })).toHaveAttribute("aria-busy", "true");
  });
});
