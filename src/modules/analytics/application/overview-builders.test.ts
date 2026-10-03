import { describe, expect, it } from "vitest";
import { toAwaitingReply, toChannels, toDepthSteps, toPipeline } from "@/modules/analytics/application/overview-builders";

describe("overview builders", () => {
  it("lists every prospect status in lifecycle order, empty ones as zero", () => {
    const pipeline = toPipeline([{ status: "warm", prospects: 3 }, { status: "researched", prospects: 9 }]);

    expect(pipeline.map((stage) => stage.status).slice(0, 5)).toEqual(["researched", "ready", "contacted", "replied", "warm"]);
    expect(pipeline.find((stage) => stage.status === "warm")?.prospects).toBe(3);
    expect(pipeline.find((stage) => stage.status === "won")?.prospects).toBe(0);
  });

  it("lists every channel, quiet ones as zero, from the channel breakdown", () => {
    expect(toChannels([{ key: "email", sent: 4, repliedMessages: 1 }])).toEqual([
      { channel: "email", sent: 4, replied: 1 }, { channel: "linkedin", sent: 0, replied: 0 }, { channel: "inmail", sent: 0, replied: 0 }, { channel: "other", sent: 0, replied: 0 }
    ]);
  });

  it("lists all nine response steps, ones nobody reached as zero", () => {
    const steps = toDepthSteps([{ depth: 3, prospects: 2 }]);

    expect(steps).toHaveLength(9);
    expect(steps[2]).toEqual({ depth: 3, prospects: 2 });
    expect(steps[8]).toEqual({ depth: 9, prospects: 0 });
  });

  it("sends a message's time over the wire as an ISO string", () => {
    const row = { messageId: "m", prospectId: "p", channel: "email" as const, sentAt: new Date("2026-09-20T10:00:00Z"), personName: "Marta", organizationName: null };
    expect(toAwaitingReply(row).sentAt).toBe("2026-09-20T10:00:00.000Z");
  });
});
