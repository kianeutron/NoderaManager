import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RangeToggle } from "@/shared/ui/RangeToggle";
import { renderWithTheme } from "@/test/render-with-theme";

const options = ["a", "b"] as const;
const labels = { a: "Alpha", b: "Beta" } as const;

describe("RangeToggle", () => {
  it("marks the chosen option and reports a different choice", () => {
    const onChange = vi.fn();
    renderWithTheme(<RangeToggle label="Window" labels={labels} onChange={onChange} options={options} value="a" />);

    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("keeps the choice when the chosen option is pressed again, rather than clearing it", () => {
    const onChange = vi.fn();
    renderWithTheme(<RangeToggle label="Window" labels={labels} onChange={onChange} options={options} value="a" />);

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
