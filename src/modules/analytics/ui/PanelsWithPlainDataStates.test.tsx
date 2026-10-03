import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityCalendar } from "@/modules/analytics/ui/ActivityCalendar";
import { ChannelMix } from "@/modules/analytics/ui/ChannelMix";
import { overviewFixture } from "@/test/factories/overview";
import { PipelineFlow } from "@/modules/analytics/ui/PipelineFlow";
import { ResponseDepthLadder } from "@/modules/analytics/ui/ResponseDepthLadder";
import { renderWithApp } from "@/test/render-with-app";

describe("ActivityCalendar", () => {
  it("describes every day in words and summarises the half year", () => {
    renderWithApp(<ActivityCalendar calendar={overviewFixture().calendar} />);

    expect(screen.getByLabelText("Wed Sep 30: 4 sent, 1 reply")).toBeInTheDocument();
    expect(screen.getByLabelText("Thu Oct 1: 2 sent, 0 replies")).toBeInTheDocument();
    expect(screen.getByText("Sep 30 · 4")).toBeInTheDocument();
  });
});

describe("PipelineFlow", () => {
  it("counts each stage, keeps the ways out apart, and says how many are still open", () => {
    renderWithApp(<PipelineFlow pipeline={overviewFixture().pipeline} />);

    expect(screen.getByText("17 prospects in all, 14 still open")).toBeInTheDocument();
    expect(screen.getByText("Researched").previousSibling).toHaveTextContent("9");
    expect(screen.getByText("Lost").nextSibling).toHaveTextContent("2");
  });
});

describe("ResponseDepthLadder", () => {
  it("names each step and counts the prospects whose deepest reply reached it", () => {
    renderWithApp(<ResponseDepthLadder depth={overviewFixture().depth} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByText(/3 · /).closest("li")).toHaveTextContent("2");
  });

  it("explains how to fill it when nothing is classified", () => {
    renderWithApp(<ResponseDepthLadder depth={overviewFixture().depth.map((step) => ({ ...step, prospects: 0 }))} />);
    expect(screen.getByText(/No replies classified yet/)).toBeInTheDocument();
  });
});

describe("ChannelMix", () => {
  it("shows each channel's sends and replies with the counts the rate comes from", () => {
    renderWithApp(<ChannelMix channels={overviewFixture().channels} range="30d" />);
    expect(screen.getByText("8 sent · 2 replied (25%)")).toBeInTheDocument();
  });

  it("says so when nothing was sent in the window", () => {
    renderWithApp(<ChannelMix channels={overviewFixture().channels.map((channel) => ({ ...channel, sent: 0, replied: 0 }))} range="7d" />);
    expect(screen.getByText("Nothing sent in this window.")).toBeInTheDocument();
  });
});
