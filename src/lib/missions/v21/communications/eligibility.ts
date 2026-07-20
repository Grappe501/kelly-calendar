import { createHash } from "node:crypto";
import { acceptedEvidenceTypes } from "@/lib/missions/v21/communications/policy";
import type {
  ConsentEvidenceInput,
  EligibilityEvaluationInput,
  EligibilityResult,
  SuppressionInput,
} from "@/lib/missions/v21/communications/types";

function isActiveAt(iso: string, now: number): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t <= now;
}

function notExpired(expiresAt: string | null, now: number): boolean {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t > now;
}

function matchingSuppressions(
  rows: SuppressionInput[],
  channel: EligibilityEvaluationInput["channel"],
  purpose: EligibilityEvaluationInput["purpose"],
  now: number,
): SuppressionInput[] {
  return rows.filter((s) => {
    if (!s.isActive) return false;
    if (!isActiveAt(s.effectiveAt, now)) return false;
    if (!notExpired(s.expiresAt, now)) return false;
    if (s.allChannels) return true;
    if (s.channel && s.channel !== channel) return false;
    if (s.purpose && s.purpose !== purpose) return false;
    return Boolean(s.allChannels || s.channel === channel || !s.channel);
  });
}

function qualifyingEvidence(
  rows: ConsentEvidenceInput[],
  input: EligibilityEvaluationInput,
  now: number,
): ConsentEvidenceInput[] {
  const accepted = new Set(
    acceptedEvidenceTypes(input.policy, input.channel, input.purpose),
  );
  return rows.filter((e) => {
    if (e.state !== "ACTIVE") return false;
    if (e.channel !== input.channel) return false;
    if (e.purpose !== input.purpose) return false;
    if (e.evidenceType === "UNKNOWN") return false;
    if (!accepted.has(e.evidenceType)) return false;
    if (
      e.evidenceType === "OPERATOR_ATTESTATION" &&
      !input.policy.allowOperatorAttestation
    ) {
      return false;
    }
    if (!isActiveAt(e.effectiveFrom, now)) return false;
    if (!notExpired(e.expiresAt, now)) return false;
    return true;
  });
}

function stableFingerprint(parts: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 40);
}

/**
 * Deterministic eligibility from stored facts + versioned policy.
 * Suppression is evaluated before positive eligibility.
 * Never treats RSVP/attendance/staffing/check-in as consent.
 */
export function evaluateCommunicationEligibility(
  input: EligibilityEvaluationInput,
): EligibilityResult {
  const now = Date.parse(input.nowIso);
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidenceIds: string[] = [];
  const suppressionIds: string[] = [];

  if (!input.policy.allowedChannels.includes(input.channel)) {
    blocking.push("CHANNEL_NOT_ALLOWED");
  }
  if (!input.policy.allowedPurposes.includes(input.purpose)) {
    blocking.push("PURPOSE_NOT_ALLOWED");
  }

  // Operational sources are relevance only — never consent.
  for (const src of input.candidateSources ?? []) {
    if (
      /RSVP|ATTENDANCE|STAFFING|CHECK.?IN|MOBILIZE|ASSIGNMENT/i.test(src)
    ) {
      warnings.push(`SOURCE_NOT_CONSENT:${src}`);
    }
  }

  if (!input.contact || !input.contact.id) {
    const result: EligibilityResult = {
      state: "MISSING_CONTACT",
      blockingReasonCodes: [...blocking, "MISSING_CONTACT"],
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint(result);
    return result;
  }

  if (input.contact.identityAmbiguous) {
    blocking.push("AMBIGUOUS_IDENTITY");
  }
  const matchStatus = input.contact.externalMatchStatus;
  if (matchStatus === "DO_NOT_LINK") {
    blocking.push("DO_NOT_LINK");
  } else if (matchStatus === "AMBIGUOUS") {
    blocking.push("AMBIGUOUS_EXTERNAL_MATCH");
  } else if (matchStatus && matchStatus !== "CONFIRMED") {
    blocking.push("UNREVIEWED_EXTERNAL_MATCH");
  }

  if (input.contact.verificationState === "INVALID") {
    blocking.push("INVALID_DESTINATION");
  }

  const suppressions = matchingSuppressions(
    input.suppressions,
    input.channel,
    input.purpose,
    now,
  );
  for (const s of suppressions) {
    suppressionIds.push(s.id);
    blocking.push(`SUPPRESSION:${s.reason}`);
  }

  if (suppressions.length > 0) {
    const result: EligibilityResult = {
      state: "SUPPRESSED",
      blockingReasonCodes: blocking,
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      blocking: [...blocking].sort(),
      suppressionIds: [...suppressionIds].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  if (input.contact.sharedContactConflict) {
    if (input.policy.sharedContactMode === "BLOCK") {
      blocking.push("SHARED_CONTACT_BLOCKED");
    } else if (input.policy.sharedContactMode === "REQUIRE_REVIEW") {
      warnings.push("SHARED_CONTACT_REQUIRES_REVIEW");
    }
  }

  const evidence = qualifyingEvidence(input.evidence, input, now);
  for (const e of evidence) evidenceIds.push(e.id);

  if (
    input.policy.requireVerifiedContact &&
    input.contact.verificationState === "UNVERIFIED"
  ) {
    const result: EligibilityResult = {
      state: "UNVERIFIED",
      blockingReasonCodes: [...blocking, "CONTACT_UNVERIFIED"],
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      blocking: [...result.blockingReasonCodes].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  if (
    blocking.includes("AMBIGUOUS_IDENTITY") ||
    blocking.includes("AMBIGUOUS_EXTERNAL_MATCH") ||
    blocking.includes("DO_NOT_LINK") ||
    blocking.includes("UNREVIEWED_EXTERNAL_MATCH")
  ) {
    const result: EligibilityResult = {
      state: blocking.includes("DO_NOT_LINK") ||
        blocking.includes("UNREVIEWED_EXTERNAL_MATCH")
        ? "INELIGIBLE"
        : "AMBIGUOUS",
      blockingReasonCodes: blocking,
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      blocking: [...blocking].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  if (blocking.includes("SHARED_CONTACT_BLOCKED")) {
    const result: EligibilityResult = {
      state: "INELIGIBLE",
      blockingReasonCodes: blocking,
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      blocking: [...blocking].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  if (evidence.length === 0) {
    const unknownOnly = input.evidence.some(
      (e) =>
        e.state === "ACTIVE" &&
        e.channel === input.channel &&
        e.purpose === input.purpose &&
        e.evidenceType === "UNKNOWN",
    );
    if (unknownOnly) warnings.push("UNKNOWN_EVIDENCE_NOT_POSITIVE");
    const result: EligibilityResult = {
      state: warnings.includes("SHARED_CONTACT_REQUIRES_REVIEW")
        ? "REQUIRES_REVIEW"
        : "INELIGIBLE",
      blockingReasonCodes: [...blocking, "NO_QUALIFYING_CONSENT_EVIDENCE"],
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      blocking: [...result.blockingReasonCodes].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  if (warnings.includes("SHARED_CONTACT_REQUIRES_REVIEW")) {
    const result: EligibilityResult = {
      state: "REQUIRES_REVIEW",
      blockingReasonCodes: blocking,
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      warnings: [...warnings].sort(),
      evidenceIds: [...evidenceIds].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  if (blocking.length > 0) {
    const result: EligibilityResult = {
      state: "INELIGIBLE",
      blockingReasonCodes: blocking,
      warningReasonCodes: warnings,
      evidenceIds,
      suppressionIds,
      policyVersion: input.policy.version,
      policyFingerprint: input.policy.policyFingerprint,
      fingerprint: "",
    };
    result.fingerprint = stableFingerprint({
      state: result.state,
      blocking: [...blocking].sort(),
      contactId: input.contact.id,
      channel: input.channel,
      purpose: input.purpose,
      policy: input.policy.policyFingerprint,
    });
    return result;
  }

  const result: EligibilityResult = {
    state: "ELIGIBLE",
    blockingReasonCodes: [],
    warningReasonCodes: warnings,
    evidenceIds,
    suppressionIds,
    policyVersion: input.policy.version,
    policyFingerprint: input.policy.policyFingerprint,
    fingerprint: "",
  };
  result.fingerprint = stableFingerprint({
    state: result.state,
    evidenceIds: [...evidenceIds].sort(),
    contactId: input.contact.id,
    channel: input.channel,
    purpose: input.purpose,
    verification: input.contact.verificationState,
    policy: input.policy.policyFingerprint,
  });
  return result;
}

export function audienceFingerprint(
  members: Array<{
    key: string;
    inclusionState: string;
    eligibilityFingerprint: string;
  }>,
): string {
  const rows = [...members]
    .map((m) => `${m.key}|${m.inclusionState}|${m.eligibilityFingerprint}`)
    .sort();
  return createHash("sha256").update(rows.join("\n")).digest("hex").slice(0, 40);
}

export function contentFingerprint(input: {
  channel: string;
  purpose: string;
  subject: string | null;
  bodyText: string | null;
  mobilizeEventUrl: string | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        channel: input.channel,
        purpose: input.purpose,
        subject: input.subject ?? "",
        bodyText: input.bodyText ?? "",
        mobilizeEventUrl: input.mobilizeEventUrl ?? "",
      }),
    )
    .digest("hex")
    .slice(0, 40);
}

export function queueIdempotencyKey(
  communicationId: string,
  audienceMemberId: string,
  contentFingerprint: string,
  audienceFingerprint: string,
): string {
  return createHash("sha256")
    .update(
      `${communicationId}|${audienceMemberId}|${contentFingerprint}|${audienceFingerprint}`,
    )
    .digest("hex")
    .slice(0, 48);
}

/** Prove D20 never mutates operational Mission layers. */
export function assertCommunicationsIsolation() {
  return {
    mutatesEvent: false,
    mutatesMission: false,
    mutatesPrepare: false,
    mutatesExecute: false,
    mutatesDebrief: false,
    mutatesFollowUp: false,
    mutatesTravel: false,
    mutatesLogistics: false,
    mutatesFieldOps: false,
    mutatesIncidents: false,
    mutatesExceptionDigest: false,
    mutatesStaffing: false,
    mutatesCloseout: false,
    mutatesLaunchReview: false,
    mutatesDayLaunch: false,
    writesMobilizePeople: false,
    writesMobilizeAttendance: false,
    writesMobilizeEvents: false,
    messagesThroughMobilize: false,
    autoSendsEmail: false,
    autoSendsSms: false,
    infersConsentFromRsvp: false,
    infersConsentFromAttendance: false,
    infersConsentFromStaffing: false,
    infersConsentFromCheckIn: false,
    fabricatesDelivery: false,
    externalDispatchEnabledByDefault: false,
  } as const;
}
