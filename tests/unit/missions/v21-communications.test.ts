import { describe, expect, it } from "vitest";
import {
  assertCommunicationsIsolation,
  audienceFingerprint,
  buildDefaultCommunicationPolicy,
  contentFingerprint,
  evaluateCommunicationEligibility,
  getDefaultCommunicationProviderAdapter,
  queueIdempotencyKey,
  sanitizeExportCell,
  sanitizeMessagePreviewHtml,
  type CommunicationPolicySnapshot,
  type ConsentEvidenceInput,
  type SuppressionInput,
} from "@/lib/missions/v21/communications";

const NOW = "2026-07-20T18:00:00.000Z";

function policy(
  overrides: Partial<CommunicationPolicySnapshot> = {},
): CommunicationPolicySnapshot {
  return buildDefaultCommunicationPolicy(overrides);
}

function evidence(
  overrides: Partial<ConsentEvidenceInput> = {},
): ConsentEvidenceInput {
  return {
    id: "ev1",
    channel: "EMAIL",
    purpose: "EVENT_REMINDER",
    evidenceType: "EXPLICIT_OPT_IN",
    state: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    expiresAt: null,
    ...overrides,
  };
}

describe("D20 campaign communications", () => {
  it("defaults external dispatch off and isolates operational layers", () => {
    const p = policy();
    expect(p.externalDispatchEnabled).toBe(false);
    expect(p.allowOperatorAttestation).toBe(false);
    const iso = assertCommunicationsIsolation();
    expect(iso.autoSendsEmail).toBe(false);
    expect(iso.infersConsentFromRsvp).toBe(false);
    expect(iso.infersConsentFromStaffing).toBe(false);
    expect(iso.fabricatesDelivery).toBe(false);
    expect(iso.messagesThroughMobilize).toBe(false);
  });

  it("requires channel- and purpose-specific explicit consent", () => {
    const result = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
      },
      evidence: [
        evidence({ channel: "SMS" }),
        evidence({ purpose: "FOLLOW_UP" }),
      ],
      suppressions: [],
      policy: policy(),
    });
    expect(result.state).toBe("INELIGIBLE");
    expect(result.blockingReasonCodes).toContain("NO_QUALIFYING_CONSENT_EVIDENCE");
  });

  it("treats UNKNOWN evidence as non-positive", () => {
    const result = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
      },
      evidence: [evidence({ evidenceType: "UNKNOWN" })],
      suppressions: [],
      policy: policy(),
    });
    expect(result.state).toBe("INELIGIBLE");
    expect(result.warningReasonCodes).toContain("UNKNOWN_EVIDENCE_NOT_POSITIVE");
  });

  it("applies suppression before positive eligibility", () => {
    const suppression: SuppressionInput = {
      id: "sup1",
      channel: "EMAIL",
      allChannels: false,
      purpose: null,
      reason: "OPT_OUT",
      isActive: true,
      effectiveAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    };
    const result = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
      },
      evidence: [evidence()],
      suppressions: [suppression],
      policy: policy(),
    });
    expect(result.state).toBe("SUPPRESSED");
    expect(result.suppressionIds).toContain("sup1");
  });

  it("does not treat staffing/RSVP/attendance/check-in as consent", () => {
    const result = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "MISSION_STAFFING",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
      },
      evidence: [],
      suppressions: [],
      policy: policy(),
      candidateSources: [
        "STAFFING_ASSIGNMENT",
        "MOBILIZE_RSVP",
        "ATTENDANCE",
        "CHECK_IN",
      ],
    });
    expect(result.state).toBe("INELIGIBLE");
    expect(
      result.warningReasonCodes.some((c) => c.startsWith("SOURCE_NOT_CONSENT:")),
    ).toBe(true);
  });

  it("blocks ambiguous and DO_NOT_LINK external matches", () => {
    const ambiguous = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
        externalMatchStatus: "AMBIGUOUS",
      },
      evidence: [evidence()],
      suppressions: [],
      policy: policy(),
    });
    expect(ambiguous.state).toBe("AMBIGUOUS");

    const denied = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
        externalMatchStatus: "DO_NOT_LINK",
      },
      evidence: [evidence()],
      suppressions: [],
      policy: policy(),
    });
    expect(denied.state).toBe("INELIGIBLE");
  });

  it("marks missing and unverified contacts distinctly", () => {
    expect(
      evaluateCommunicationEligibility({
        campaignScopeKey: "KELLY",
        channel: "EMAIL",
        purpose: "EVENT_REMINDER",
        nowIso: NOW,
        contact: null,
        evidence: [],
        suppressions: [],
        policy: policy(),
      }).state,
    ).toBe("MISSING_CONTACT");

    expect(
      evaluateCommunicationEligibility({
        campaignScopeKey: "KELLY",
        channel: "EMAIL",
        purpose: "EVENT_REMINDER",
        nowIso: NOW,
        contact: {
          id: "cp1",
          channel: "EMAIL",
          verificationState: "UNVERIFIED",
          maskedDisplay: "a***z@example.com",
        },
        evidence: [evidence()],
        suppressions: [],
        policy: policy({ requireVerifiedContact: true }),
      }).state,
    ).toBe("UNVERIFIED");
  });

  it("returns ELIGIBLE only with qualifying verified evidence", () => {
    const result = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      nowIso: NOW,
      contact: {
        id: "cp1",
        channel: "EMAIL",
        verificationState: "OPERATOR_VERIFIED",
        maskedDisplay: "a***z@example.com",
      },
      evidence: [evidence()],
      suppressions: [],
      policy: policy(),
    });
    expect(result.state).toBe("ELIGIBLE");
    expect(result.fingerprint.length).toBeGreaterThan(10);
  });

  it("fingerprints content and audience; queue keys are idempotent", () => {
    const c1 = contentFingerprint({
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      subject: "Hi",
      bodyText: "Body",
      mobilizeEventUrl: "https://example.com/e/1",
    });
    const c2 = contentFingerprint({
      channel: "EMAIL",
      purpose: "EVENT_REMINDER",
      subject: "Hi",
      bodyText: "Body changed",
      mobilizeEventUrl: "https://example.com/e/1",
    });
    expect(c1).not.toBe(c2);
    const a = audienceFingerprint([
      { key: "m1", inclusionState: "INCLUDED", eligibilityFingerprint: "x" },
    ]);
    const k1 = queueIdempotencyKey("comm1", "m1", c1, a);
    const k2 = queueIdempotencyKey("comm1", "m1", c1, a);
    expect(k1).toBe(k2);
  });

  it("sanitizes HTML previews and export formula injection", () => {
    expect(sanitizeMessagePreviewHtml("<script>alert(1)</script>")).toContain(
      "&lt;script&gt;",
    );
    expect(sanitizeExportCell("=cmd()")).toBe("'=cmd()");
  });

  it("provider adapter refuses dispatch in D20", async () => {
    const adapter = getDefaultCommunicationProviderAdapter();
    const caps = adapter.listCapabilities();
    expect(
      caps.find((c) => c.capability === "EMAIL_SEND")?.applicationEnabled,
    ).toBe(false);
    const result = await adapter.dispatch({
      queueItemId: "q1",
      channel: "EMAIL",
      destinationRef: "cp:1",
      contentFingerprint: "x",
      idempotencyKey: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DISABLED");
  });
});
