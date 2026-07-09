import { describe, it, expect } from "vitest";
import { buildDailySeries, clampDays } from "../lib/analytics";

const TODAY = new Date("2026-07-09T12:00:00Z");

describe("buildDailySeries", () => {
  it("returns exactly `days` entries, oldest first, ending today", () => {
    const s = buildDailySeries([], 30, TODAY);
    expect(s).toHaveLength(30);
    expect(s[0].date).toBe("2026-06-10");
    expect(s[29].date).toBe("2026-07-09");
  });

  it("zero-fills days with no data", () => {
    const s = buildDailySeries([{ day: "2026-07-09", count: 5 }], 3, TODAY);
    expect(s).toEqual([
      { date: "2026-07-07", count: 0 },
      { date: "2026-07-08", count: 0 },
      { date: "2026-07-09", count: 5 },
    ]);
  });

  it("accepts Date objects and string counts and normalizes them", () => {
    const s = buildDailySeries([{ day: new Date("2026-07-08T00:00:00Z"), count: "4" }], 2, TODAY);
    expect(s).toEqual([
      { date: "2026-07-08", count: 4 },
      { date: "2026-07-09", count: 0 },
    ]);
  });
});

describe("clampDays", () => {
  it("uses the fallback for non-numeric input", () => {
    expect(clampDays(undefined)).toBe(30);
    expect(clampDays("abc")).toBe(30);
  });
  it("clamps to the [min,max] range", () => {
    expect(clampDays("1")).toBe(7);
    expect(clampDays("500")).toBe(90);
    expect(clampDays("45")).toBe(45);
  });
});
