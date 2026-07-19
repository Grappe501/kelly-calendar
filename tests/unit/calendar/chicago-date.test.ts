import { describe, expect, it } from "vitest";
import {
  displayCampaignWeekIndex,
  resolveCalendarDateKey,
  shiftChicagoDateKey,
  startOfWeekDateKey,
  weekDateKeys,
} from "@/lib/calendar/chicago-date";

describe("chicago-date helpers", () => {
  it("accepts YYYY-MM-DD and rejects other shapes", () => {
    expect(resolveCalendarDateKey("2026-07-19")).toBe("2026-07-19");
    expect(resolveCalendarDateKey("not-a-date", new Date("2026-07-19T12:00:00-05:00"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("shifts calendar date keys by whole days", () => {
    expect(shiftChicagoDateKey("2026-07-19", 1)).toBe("2026-07-20");
    expect(shiftChicagoDateKey("2026-07-19", -1)).toBe("2026-07-18");
    expect(shiftChicagoDateKey("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("builds Monday-start week keys", () => {
    // 2026-07-19 is Sunday → week starts 2026-07-13
    expect(startOfWeekDateKey("2026-07-19")).toBe("2026-07-13");
    expect(weekDateKeys("2026-07-19")).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
    ]);
  });

  it("computes display-only campaign week index", () => {
    expect(displayCampaignWeekIndex("2025-11-01", "2025-11-01")).toBe(1);
    expect(displayCampaignWeekIndex("2025-11-08", "2025-11-01")).toBe(2);
  });
});
