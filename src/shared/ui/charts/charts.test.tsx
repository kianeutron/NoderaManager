import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedNumber } from "@/shared/ui/charts/AnimatedNumber";
import { DeltaChip } from "@/shared/ui/charts/DeltaChip";
import { RadialGauge } from "@/shared/ui/charts/RadialGauge";
import { Sparkline } from "@/shared/ui/charts/Sparkline";
import { renderWithTheme } from "@/test/render-with-theme";

describe("DeltaChip", () => {
  it("says in words how a figure moved, not only by color and arrow", () => {
    const { rerender } = renderWithTheme(<DeltaChip current={15} previous={10} />);
    expect(screen.getByLabelText("up 50% against the period before")).toHaveTextContent("50%");

    rerender(<DeltaChip current={5} previous={10} />);
    expect(screen.getByLabelText("down 50% against the period before")).toBeInTheDocument();

    rerender(<DeltaChip current={3} previous={0} />);
    expect(screen.getByLabelText("new against the period before")).toHaveTextContent("New");

    rerender(<DeltaChip current={2} previous={2} />);
    expect(screen.getByLabelText("unchanged against the period before")).toHaveTextContent("No change");
  });
});

describe("RadialGauge", () => {
  it("states its figure for assistive technology and fills the ring to the share", () => {
    renderWithTheme(<RadialGauge label="2 of 8 replied" share={0.25} size={80} thickness={8}>25%</RadialGauge>);

    expect(screen.getByRole("img", { name: "2 of 8 replied" })).toHaveTextContent("25%");
    const filled = document.querySelectorAll("circle")[1];
    const circumference = 2 * Math.PI * 36;
    expect(filled?.getAttribute("stroke-dasharray")).toBe(`${circumference * 0.25} ${circumference}`);
  });
});

describe("Sparkline", () => {
  it("draws a line and an area for a series, and nothing for an empty one", () => {
    const { unmount } = renderWithTheme(<Sparkline label="Sent per day" values={[1, 4, 2]} />);
    expect(screen.getByRole("img", { name: "Sent per day" }).querySelectorAll("path")).toHaveLength(2);
    unmount();

    renderWithTheme(<Sparkline label="Empty" values={[]} />);
    expect(screen.getByRole("img", { name: "Empty" }).querySelectorAll("path")).toHaveLength(0);
  });

  it("does not collapse a flat or single-point series to nothing", () => {
    renderWithTheme(<Sparkline label="One" values={[3]} />);
    expect(screen.getByRole("img", { name: "One" }).querySelectorAll("path")).toHaveLength(2);
  });
});

describe("AnimatedNumber", () => {
  const matchMedia = window.matchMedia;
  afterEach(() => { window.matchMedia = matchMedia; vi.restoreAllMocks(); });

  it("shows the value at once where there is no motion to show, and names the final value for screen readers", () => {
    render(<AnimatedNumber value={1234} />);
    expect(screen.getByLabelText("1,234")).toHaveTextContent("1,234");
  });

  it("shows the value at once for people who prefer reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<AnimatedNumber value={50} />);
    expect(screen.getByLabelText("50")).toHaveTextContent("50");
  });

  describe("with motion", () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
      vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    });
    afterEach(() => vi.useRealTimers());

    it("eases to a new value and lands exactly on it", () => {
      const { rerender } = render(<AnimatedNumber value={0} />);
      rerender(<AnimatedNumber value={100} />);

      act(() => { vi.advanceTimersByTime(300); });
      const midway = Number(screen.getByLabelText("100").textContent);
      expect(midway).toBeGreaterThan(0);
      expect(midway).toBeLessThan(100);

      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByLabelText("100")).toHaveTextContent("100");
    });
  });
});
