import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsKpis } from "@/modules/analytics/ui/AnalyticsKpis";
import { ConversionFunnel } from "@/modules/analytics/ui/ConversionFunnel";
import { DeliverabilityPanel } from "@/modules/analytics/ui/DeliverabilityPanel";
import { ResponseTimePanel } from "@/modules/analytics/ui/ResponseTimePanel";
import { SendTimeHeatmap } from "@/modules/analytics/ui/SendTimeHeatmap";
import { insightsFixture } from "@/test/factories/insights";
import { renderWithApp } from "@/test/render-with-app";

describe("AnalyticsKpis", () => {
  it("shows the five headline figures, rates with their counts, and how fast replies come", () => {
    renderWithApp(<AnalyticsKpis insights={insightsFixture()} />);

    expect(screen.getByText("Messages sent")).toBeInTheDocument();
    expect(screen.getByText("5 of 25 prospects replied")).toBeInTheDocument();
    expect(screen.getByText("2 of 30 emails bounced")).toBeInTheDocument();
    expect(screen.getByLabelText("1.3 days")).toBeInTheDocument();
    expect(screen.getByText("Median of 5 first replies")).toBeInTheDocument();
  });

  it("treats a bounce rate going up as bad news and a reply rate going up as good", () => {
    renderWithApp(<AnalyticsKpis insights={insightsFixture({ totals: { ...insightsFixture().totals, replyRate: { current: { part: 10, whole: 20 }, previous: { part: 2, whole: 20 } }, bounceRate: { current: { part: 6, whole: 20 }, previous: { part: 2, whole: 20 } } } })} />);

    const chips = screen.getAllByRole("img", { name: /against the period before/ });
    const byLabel = (text: RegExp) => chips.find((chip) => text.test(chip.getAttribute("aria-label") ?? ""));
    expect(byLabel(/up 400%/)).toBeDefined();
  });

  it("shows a dash, not a made-up time, when no reply has been timed", () => {
    renderWithApp(<AnalyticsKpis insights={insightsFixture({ responseTime: { sample: 0, medianHours: null, buckets: [] } })} />);

    expect(screen.getByText("No replies to time yet")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ConversionFunnel", () => {
  it("shows each step's count and share of everyone messaged, with won apart", () => {
    renderWithApp(<ConversionFunnel funnel={insightsFixture().funnel} />);

    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(5);
    expect(within(steps[0]!).getByText("Messaged")).toBeInTheDocument();
    expect(steps[1]).toHaveTextContent("Replied");
    expect(steps[1]).toHaveTextContent("20%");
    expect(screen.getByText(/Won: 1 of 25 prospects messaged \(4%\)/)).toBeInTheDocument();
    expect(screen.getByText(/undercount until you classify replies/)).toBeInTheDocument();
  });

  it("says so when no one was messaged", () => {
    renderWithApp(<ConversionFunnel funnel={{ steps: insightsFixture().funnel.steps.map((step) => ({ ...step, prospects: 0 })), won: 0 }} />);
    expect(screen.getByText("No one was messaged in this window.")).toBeInTheDocument();
  });
});

describe("ResponseTimePanel", () => {
  it("shows the median in words, the sample it comes from, and how many replies fell in each band", () => {
    renderWithApp(<ResponseTimePanel responseTime={insightsFixture().responseTime} />);

    expect(screen.getByText("1.3 days")).toBeInTheDocument();
    expect(screen.getByText("median, from 5 replies")).toBeInTheDocument();
    expect(screen.getByText("Within 3 days").closest("li")).toHaveTextContent("2");
    expect(screen.getByText("Small sample")).toBeInTheDocument();
  });

  it("says so when nothing has been answered", () => {
    renderWithApp(<ResponseTimePanel responseTime={{ sample: 0, medianHours: null, buckets: [] }} />);
    expect(screen.getByText(/No replies to messages sent in this window yet/)).toBeInTheDocument();
  });
});

describe("DeliverabilityPanel", () => {
  it("separates confirmed, unconfirmed and failed, and states the bounce rate with its counts", () => {
    const { deliverability, totals } = insightsFixture();
    renderWithApp(<DeliverabilityPanel bounceRate={totals.bounceRate} deliverability={deliverability} />);

    expect(screen.getByText("Confirmed delivered 10")).toBeInTheDocument();
    expect(screen.getByText("Unconfirmed 29")).toBeInTheDocument();
    expect(screen.getByText("Failed 1")).toBeInTheDocument();
    expect(screen.getByText("Bounces: 2 of 30 emails")).toBeInTheDocument();
    expect(screen.getByText("Hard").closest("li")).toHaveTextContent("1");
  });

  it("says so when nothing was sent", () => {
    const { deliverability, totals } = insightsFixture();
    renderWithApp(<DeliverabilityPanel bounceRate={totals.bounceRate} deliverability={{ ...deliverability, sent: 0 }} />);
    expect(screen.getByText("Nothing was sent in this window.")).toBeInTheDocument();
  });
});

describe("SendTimeHeatmap", () => {
  it("describes every hour in words, in UTC, and names the best answered times", () => {
    renderWithApp(<SendTimeHeatmap sendTimes={insightsFixture().sendTimes} />);

    expect(screen.getByLabelText("Tue 09:00 UTC: 10 sent, 5 replied (50%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Fri 08:00 UTC: 1 sent, 1 replied (100%), too few to rate")).toBeInTheDocument();
    expect(screen.getByText(/Best answered:/).parentElement).toHaveTextContent("Tue 09:00, Wed 14:00 UTC");
  });

  it("can shade by reply rate instead of volume", () => {
    renderWithApp(<SendTimeHeatmap sendTimes={insightsFixture().sendTimes} />);

    expect(screen.getByRole("button", { name: "Messages sent" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Reply rate" }));
    expect(screen.getByRole("button", { name: "Reply rate" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says so when nothing was sent", () => {
    renderWithApp(<SendTimeHeatmap sendTimes={[]} />);
    expect(screen.getByText("Nothing was sent in this window.")).toBeInTheDocument();
  });
});
