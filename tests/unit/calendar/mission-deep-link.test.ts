import { describe, expect, it } from "vitest";
import {
  buildMissionCalendarHref,
  parseCalendarEventParam,
  sanitizeCalendarReturnTo,
} from "@/lib/calendar/mission-deep-link";

describe("mission deep-link contract (HL-039)", () => {
  it("builds a calendar href with view, date, and event", () => {
    const href = buildMissionCalendarHref({
      eventId: "evt_open_mission_1",
      startsAt: "2026-07-20T14:00:00.000Z",
      view: "day",
    });
    expect(href).toContain("/calendar?");
    expect(href).toContain("view=day");
    expect(href).toContain("event=evt_open_mission_1");
    expect(href).toMatch(/date=\d{4}-\d{2}-\d{2}/);
  });

  it("parses valid event ids and rejects unsafe values", () => {
    expect(parseCalendarEventParam("clxyz0123456789")).toBe("clxyz0123456789");
    expect(parseCalendarEventParam("evt_1")).toBe("evt_1");
    expect(parseCalendarEventParam("../etc/passwd")).toBeNull();
    expect(parseCalendarEventParam("https://evil.example")).toBeNull();
    expect(parseCalendarEventParam("a b")).toBeNull();
    expect(parseCalendarEventParam("")).toBeNull();
  });

  it("sanitizes returnTo to internal /calendar paths only", () => {
    expect(sanitizeCalendarReturnTo("/calendar?view=week&date=2026-07-19")).toBe(
      "/calendar?view=week&date=2026-07-19",
    );
    expect(sanitizeCalendarReturnTo("https://evil.example/phish")).toBeNull();
    expect(sanitizeCalendarReturnTo("//evil.example")).toBeNull();
    expect(sanitizeCalendarReturnTo("/login")).toBeNull();
    expect(sanitizeCalendarReturnTo(null)).toBeNull();
  });
});
