import { describe, expect, it } from "vitest";
import {
  assertImportFloor,
  redactSourceUrl,
  validatePublicGoogleIcalSource,
} from "@/features/calendar-import/source-validation";

describe("Google iCal source validation", () => {
  it("accepts HTTPS Google Calendar iCal hosts", () => {
    const result = validatePublicGoogleIcalSource(
      "https://calendar.google.com/calendar/ical/example%40group.calendar.google.com/public/basic.ics",
    );
    expect(result.ok).toBe(true);
    expect(result.hostname).toBe("calendar.google.com");
    expect(result.sourceFingerprint).toHaveLength(16);
  });

  it("rejects non-Google hosts", () => {
    expect(() =>
      validatePublicGoogleIcalSource("https://evil.example/calendar.ics"),
    ).toThrow();
  });

  it("rejects HTTP sources", () => {
    expect(() =>
      validatePublicGoogleIcalSource(
        "http://calendar.google.com/calendar/ical/x/public/basic.ics",
      ),
    ).toThrow();
  });

  it("rejects localhost / private hosts", () => {
    expect(() =>
      validatePublicGoogleIcalSource("https://127.0.0.1/calendar.ics"),
    ).toThrow();
  });

  it("redacts query strings from display labels", () => {
    const redacted = redactSourceUrl(
      "https://calendar.google.com/calendar/ical/secret/public/basic.ics?token=abc",
    );
    expect(redacted).toContain("[redacted]");
    expect(redacted).not.toContain("token=abc");
  });

  it("enforces November 1, 2025 floor", () => {
    expect(() => assertImportFloor("2025-10-31T00:00:00-05:00")).toThrow();
    expect(() => assertImportFloor("2025-11-01T00:00:00-05:00")).not.toThrow();
  });
});
