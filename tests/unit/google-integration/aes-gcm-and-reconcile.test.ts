import { describe, expect, it } from "vitest";
import {
  decryptAesGcm,
  encryptAesGcm,
  generateEncryptionKeyHex,
} from "@/lib/crypto/aes-gcm";
import { reconcileGoogleEvent } from "@/features/google-integration/reconcile";
import {
  isVirtualOnlyEvent,
  metersToMiles,
  ROUTE_TRUTH_TYPE_ESTIMATE,
} from "@/features/google-integration/routes-truth";
import { redactGoogleDiagnostics } from "@/features/google-integration/redact";

describe("AES-GCM token encryption", () => {
  it("round-trips refresh token material", () => {
    const key = generateEncryptionKeyHex();
    const blob = encryptAesGcm("refresh-token-value", key);
    expect(blob.encryptionVersion).toBe("v1");
    expect(decryptAesGcm(blob, key)).toBe("refresh-token-value");
  });

  it("does not embed plaintext in ciphertext", () => {
    const key = generateEncryptionKeyHex();
    const blob = encryptAesGcm("super-secret-refresh", key);
    expect(blob.ciphertext).not.toContain("super-secret");
    expect(JSON.stringify(blob)).not.toContain("super-secret-refresh");
  });
});

describe("Google reconcile", () => {
  const baseCandidates = [
    {
      eventId: "e1",
      eventNumber: "KCCC-2026-0001",
      iCalUid: "uid-1@google.com",
      externalEventId: "g1",
      title: "Fundraiser",
      startsAt: new Date("2026-08-02T21:00:00.000Z"),
    },
  ];

  it("auto-matches on Google event id", () => {
    const result = reconcileGoogleEvent(
      {
        id: "g1",
        summary: "Other title",
        start: { dateTime: "2026-08-02T21:00:00Z" },
      },
      baseCandidates,
    );
    expect(result.status).toBe("AUTO_MATCH_HIGH_CONFIDENCE");
    expect(result.matchedEventId).toBe("e1");
  });

  it("does not auto-merge ambiguous title/time pairs", () => {
    const result = reconcileGoogleEvent(
      {
        id: "g-new",
        summary: "Fundraiser",
        start: { dateTime: "2026-08-02T21:00:00Z" },
        location: "Somewhere",
      },
      [
        ...baseCandidates,
        {
          eventId: "e2",
          eventNumber: "KCCC-2026-0002",
          iCalUid: null,
          externalEventId: null,
          title: "Fundraiser",
          startsAt: new Date("2026-08-02T21:00:00.000Z"),
        },
      ],
    );
    expect(result.status).toBe("SOURCE_CONFLICT");
  });
});

describe("Routes truth model", () => {
  it("exposes estimate truth type constant", () => {
    expect(ROUTE_TRUTH_TYPE_ESTIMATE).toBe("GOOGLE_ROUTE_ESTIMATE");
  });

  it("excludes virtual-only events", () => {
    expect(
      isVirtualOnlyEvent({
        virtualMeetingUrl: "https://meet.google.com/abc",
        city: null,
        venueName: null,
      }),
    ).toBe(true);
    expect(
      isVirtualOnlyEvent({
        virtualMeetingUrl: "https://meet.google.com/abc",
        city: "El Dorado",
      }),
    ).toBe(false);
  });

  it("converts meters to miles", () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
  });
});

describe("diagnostics redaction", () => {
  it("redacts token-like keys", () => {
    const out = redactGoogleDiagnostics({
      refreshToken: "abc",
      client_secret: "xyz",
      calendarFeedConfigured: true,
    });
    expect(out.refreshToken).toBe("[REDACTED]");
    expect(out.client_secret).toBe("[REDACTED]");
    expect(out.calendarFeedConfigured).toBe(true);
  });
});
