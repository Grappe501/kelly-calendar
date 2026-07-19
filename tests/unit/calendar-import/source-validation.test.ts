import { describe, expect, it } from "vitest";
import {
  assertImportFloor,
  redactPrivateIcalLabel,
  redactSourceUrl,
  validatePrivateGoogleIcalSource,
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

describe("Google private iCal source validation", () => {
  const fakePrivate =
    "https://calendar.google.com/calendar/ical/example%40gmail.com/private-UNITTESTTOKEN123456/basic.ics";

  it("accepts private iCal path shapes", () => {
    const result = validatePrivateGoogleIcalSource(fakePrivate);
    expect(result.ok).toBe(true);
    expect(result.sourceType).toBe("PRIVATE_ICAL_ENV");
    expect(result.redactedLabel).toBe(redactPrivateIcalLabel(result.sourceFingerprint));
    expect(result.redactedLabel).toMatch(/^google-private-ical#fp:[a-f0-9]{16}$/);
    expect(result.redactedLabel).not.toContain("UNITTESTTOKEN");
    expect(result.redactedLabel).not.toContain("gmail.com");
    expect(result.redactedLabel).not.toContain("basic.ics");
  });

  it("redacts private path tokens from display labels", () => {
    const redacted = redactSourceUrl(fakePrivate);
    expect(redacted).toContain("[redacted]");
    expect(redacted).not.toContain("UNITTESTTOKEN");
    expect(redacted).not.toContain("private-UNITTEST");
  });

  it("rejects embed URLs as private iCal sources", () => {
    expect(() =>
      validatePrivateGoogleIcalSource(
        "https://calendar.google.com/calendar/embed?src=example%40gmail.com",
      ),
    ).toThrow();
  });

  it("rejects public iCal paths when private validation is required", () => {
    expect(() =>
      validatePrivateGoogleIcalSource(
        "https://calendar.google.com/calendar/ical/example%40group.calendar.google.com/public/basic.ics",
      ),
    ).toThrow();
  });
});
