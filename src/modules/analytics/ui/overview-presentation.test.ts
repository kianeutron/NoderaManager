import { describe, expect, it } from "vitest";
import { briefingOf, daysSince, describeAge, formatDay, greetingFor, recipientName } from "@/modules/analytics/ui/overview-presentation";

const base = { followUps: { summary: { overdue: 0, next7Days: 0, later: 0, noDate: 0 }, overdue: [] }, awaitingReply: { total: 0, items: [] }, days: 30, totals: { sent: { current: 12, previous: 8 } } } as unknown as Parameters<typeof briefingOf>[0];

describe("greetingFor", () => {
  it("follows the hour of the day", () => {
    expect([2, 9, 14, 20].map(greetingFor)).toEqual(["Working late", "Good morning", "Good afternoon", "Good evening"]);
  });
});

describe("briefingOf", () => {
  it("leads with what is overdue and what is waiting, with singular and plural right", () => {
    expect(briefingOf({ ...base, followUps: { ...base.followUps, summary: { ...base.followUps.summary, overdue: 1 } }, awaitingReply: { total: 4, items: [] } })).toBe("1 follow-up overdue and 4 messages waiting on a reply.");
  });

  it("is calm when nothing needs doing, and suggests starting when nothing was ever sent", () => {
    expect(briefingOf(base)).toBe("Nothing is overdue. 12 messages sent in the last 30 days.");
    expect(briefingOf({ ...base, totals: { ...base.totals, sent: { current: 0, previous: 0 } } })).toBe("Nothing sent in the last 30 days. Log a message to start the picture.");
  });
});

describe("dates", () => {
  it("shows a UTC day without shifting it", () => expect(formatDay("2026-09-30")).toBe("Sep 30"));

  it("counts whole days since a moment and words them", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(daysSince("2026-09-26T13:00:00Z", now)).toBe(4);
    expect([0, 1, 5].map(describeAge)).toEqual(["today", "yesterday", "5 days ago"]);
  });
});

describe("recipientName", () => {
  it("prefers the person, then the company", () => {
    expect(recipientName("Marta", "Bluewave")).toBe("Marta");
    expect(recipientName(null, "Bluewave")).toBe("Bluewave");
    expect(recipientName(null, null)).toBe("Unknown recipient");
  });
});
