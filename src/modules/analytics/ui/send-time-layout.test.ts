import { describe, expect, it } from "vitest";
import { layoutSendTimes } from "@/modules/analytics/ui/send-time-layout";

const cells = [
  { weekday: 2, hour: 9, sent: 10, replied: 5 },
  { weekday: 3, hour: 14, sent: 4, replied: 1 },
  { weekday: 5, hour: 8, sent: 1, replied: 1 }
];

describe("layoutSendTimes", () => {
  it("lays out a full week of seven days by 24 hours, empty where nothing was sent", () => {
    const { rows, total } = layoutSendTimes(cells, "volume");

    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.length === 24)).toBe(true);
    expect(rows[1]?.[9]).toMatchObject({ weekday: 2, hour: 9, sent: 10, level: 4 });
    expect(rows[0]?.[0]).toMatchObject({ sent: 0, level: 0 });
    expect(total).toBe(15);
  });

  it("shades by reply rate only where there are enough messages for it to mean something", () => {
    const { rows } = layoutSendTimes(cells, "replyRate");

    expect(rows[1]?.[9]).toMatchObject({ rated: true, level: 4 });
    expect(rows[2]?.[14]).toMatchObject({ rated: true, level: 2 });
    // One message, one reply is a 100% rate on nothing: it stays unshaded.
    expect(rows[4]?.[8]).toMatchObject({ rated: false, level: 0 });
  });

  it("names the best times from rated cells, best rate first", () => {
    const { best } = layoutSendTimes(cells, "volume");
    expect(best.map((slot) => `${slot.weekday}-${slot.hour}`)).toEqual(["2-9", "3-14"]);
  });

  it("has no best times when nothing was answered", () => {
    expect(layoutSendTimes([{ weekday: 1, hour: 1, sent: 9, replied: 0 }], "volume").best).toEqual([]);
    expect(layoutSendTimes([], "volume").total).toBe(0);
  });
});
