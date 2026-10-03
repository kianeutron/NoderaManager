import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { overviewFixture } from "@/test/factories/overview";
import { KpiStrip } from "@/modules/analytics/ui/KpiStrip";
import { renderWithApp } from "@/test/render-with-app";

describe("KpiStrip", () => {
  it("shows each headline figure with how it moved against the period before", () => {
    renderWithApp(<KpiStrip overview={overviewFixture()} />);

    expect(screen.getByLabelText("12")).toBeInTheDocument();
    // Messages (12 vs 8) and prospects reached (6 vs 4) both grew by half.
    expect(screen.getAllByLabelText("up 50% against the period before")).toHaveLength(2);
    expect(screen.getByText("Messages sent")).toBeInTheDocument();
    expect(screen.getByLabelText("unchanged against the period before")).toBeInTheDocument();
  });

  it("states what the reply rate is a rate of, and warns when the sample is small", () => {
    renderWithApp(<KpiStrip overview={overviewFixture()} />);

    expect(screen.getByLabelText("33%")).toBeInTheDocument();
    expect(screen.getByText(/2 of 6 prospects replied/)).toBeInTheDocument();
    expect(screen.getByText(/small sample/)).toBeInTheDocument();
  });

  it("does not warn about a rate with a decent sample, or when no one was messaged", () => {
    const { unmount } = renderWithApp(<KpiStrip overview={overviewFixture({ totals: { ...overviewFixture().totals, replyRate: { current: { part: 5, whole: 20 }, previous: { part: 0, whole: 0 } } } })} />);
    expect(screen.queryByText(/small sample/)).toBeNull();
    unmount();

    renderWithApp(<KpiStrip overview={overviewFixture({ totals: { sent: { current: 0, previous: 0 }, reached: { current: 0, previous: 0 }, replies: { current: 0, previous: 0 }, replyRate: { current: { part: 0, whole: 0 }, previous: { part: 0, whole: 0 } } } })} />);
    expect(screen.getByText("No one messaged yet in this window")).toBeInTheDocument();
    expect(screen.queryByText(/small sample/)).toBeNull();
  });
});
