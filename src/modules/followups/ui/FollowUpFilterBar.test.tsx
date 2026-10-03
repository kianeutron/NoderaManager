import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FollowUpFilterBar } from "@/modules/followups/ui/FollowUpFilterBar";
import { renderWithTheme } from "@/test/render-with-theme";

const choose = (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option }));
};

describe("FollowUpFilterBar", () => {
  it("offers the due filter only for active follow-ups", () => {
    const { rerender } = renderWithTheme(<FollowUpFilterBar due={undefined} onChange={vi.fn()} status="active" />);
    expect(screen.getByRole("combobox", { name: "Due" })).toBeInTheDocument();

    rerender(<FollowUpFilterBar due={undefined} onChange={vi.fn()} status="completed" />);
    expect(screen.queryByRole("combobox", { name: "Due" })).toBeNull();
  });

  it("clears the due filter when the status changes, since it means nothing for a finished list", () => {
    const onChange = vi.fn();
    renderWithTheme(<FollowUpFilterBar due="overdue" onChange={onChange} status="active" />);
    choose("Show", "Completed");

    expect(onChange).toHaveBeenCalledWith({ followUpStatus: "completed", followUpDue: undefined });
  });

  it("sets and clears a due bucket", () => {
    const onChange = vi.fn();
    renderWithTheme(<FollowUpFilterBar due={undefined} onChange={onChange} status="active" />);
    choose("Due", "Overdue");
    expect(onChange).toHaveBeenCalledWith({ followUpDue: "overdue" });
  });
});
