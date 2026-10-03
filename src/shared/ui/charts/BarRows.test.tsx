import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarRows } from "@/shared/ui/charts/BarRows";
import { renderWithTheme } from "@/test/render-with-theme";

describe("BarRows", () => {
  it("lists each row with its label and exact figure, as a labelled list", () => {
    renderWithTheme(<BarRows label="Replies by speed" rows={[{ key: "a", label: "Fast", value: 4 }, { key: "b", label: "Slow", value: 1200 }]} />);

    const list = screen.getByRole("list", { name: "Replies by speed" });
    expect(list.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText("Slow").closest("li")).toHaveTextContent("1,200");
  });

  it("shows custom trailing content instead of the plain figure", () => {
    renderWithTheme(<BarRows label="Steps" rows={[{ key: "a", label: "Step", value: 3, trailing: <span>3 (50%)</span> }]} />);
    expect(screen.getByText("3 (50%)")).toBeInTheDocument();
  });

  it("copes with an empty list and all-zero rows", () => {
    const { unmount } = renderWithTheme(<BarRows label="None" rows={[]} />);
    expect(screen.getByRole("list", { name: "None" }).children).toHaveLength(0);
    unmount();
    renderWithTheme(<BarRows label="Zeros" rows={[{ key: "a", label: "A", value: 0 }]} />);
    expect(screen.getByText("A").closest("li")).toHaveTextContent("0");
  });
});
