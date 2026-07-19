import { describe, expect, it } from "vitest";
import {
  resolveCalendarDateKey,
  shiftChicagoDateKey,
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
});
