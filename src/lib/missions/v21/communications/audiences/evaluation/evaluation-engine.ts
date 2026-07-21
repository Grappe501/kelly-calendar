import { createHash } from "node:crypto";
import type { AudienceCriteriaDocument } from "@/lib/missions/v21/communications/audiences/criteria/criteria-types";
import { evaluationLimitForType } from "@/lib/missions/v21/communications/audiences/criteria/criteria-validator";
import {
  detectDeduplicationConflicts,
  resolveContactDestination,
} from "@/lib/missions/v21/communications/audiences/resolution/recipient-resolver";
import {
  getFabricatedPool,
  type FabricatedAudiencePerson,
} from "@/lib/missions/v21/communications/audiences/previews/fabricated-audience-profiles";

export type EvaluatedCandidate = {
  localPersonId: string;
  channel: "EMAIL" | "SMS";
  candidateStatus:
    | "INCLUDED"
    | "EXCLUDED"
    | "BLOCKED"
    | "DUPLICATE_PERSON"
    | "DUPLICATE_DESTINATION"
    | "INVALID_DESTINATION"
    | "MISSING_DESTINATION"
    | "CONSENT_REQUIRED"
    | "SUPPRESSED";
  inclusionReasons: string[];
  exclusionReasons: string[];
  contactPointId: string | null;
  destinationFingerprint: string | null;
  destinationMasked: string | null;
  consentSnapshot: Record<string, unknown>;
  suppressionSnapshot: Record<string, unknown>;
  sourceFacts: Record<string, unknown>;
  deduplicationKey: string | null;
};

export type EvaluationEngineResult = {
  status: "COMPLETED" | "COMPLETED_WITH_WARNINGS" | "BLOCKED";
  candidates: EvaluatedCandidate[];
  includedCount: number;
  excludedCount: number;
  duplicatePersonCount: number;
  duplicateDestinationCount: number;
  invalidDestinationCount: number;
  consentBlockedCount: number;
  suppressedCount: number;
  limitApplied: boolean;
  sourceFingerprint: string;
  blockingErrors: string[];
  fabricatedBanner: "FABRICATED TEST DATA" | null;
};

function matchesCriteria(
  person: FabricatedAudiencePerson,
  doc: AudienceCriteriaDocument,
): { matched: boolean; reasons: string[] } {
  if (doc.conditions.length === 0 && doc.staticLocalPersonIds?.length) {
    const ok = doc.staticLocalPersonIds.includes(person.localPersonId);
    return {
      matched: ok,
      reasons: ok ? ["STATIC_AUDIENCE_MEMBER"] : ["CRITERIA_NOT_MATCHED"],
    };
  }

  const results = doc.conditions.map((c) => {
    switch (c.key) {
      case "volunteer.active": {
        const want =
          c.operator === "FALSE" ? false : c.value === false ? false : true;
        return person.volunteerActive === want;
      }
      case "person.county": {
        const counties = Array.isArray(c.value)
          ? c.value.map(String)
          : [String(c.value ?? "")];
        if (c.operator === "IN" || c.operator === "EQUALS") {
          return counties.map((x) => x.toLowerCase()).includes(person.county.toLowerCase());
        }
        if (c.operator === "NOT_IN" || c.operator === "NOT_EQUALS") {
          return !counties.map((x) => x.toLowerCase()).includes(person.county.toLowerCase());
        }
        return false;
      }
      case "has_valid_email":
        return Boolean(person.email);
      case "has_valid_mobile_phone":
        return person.phoneCapability === "MOBILE" && Boolean(person.phone);
      case "has_email_consent":
        return person.emailConsent;
      case "has_sms_consent":
        return person.smsConsent;
      case "not_suppressed":
        return !person.suppressed;
      case "static.member": {
        const ids = Array.isArray(c.value) ? c.value.map(String) : [String(c.value ?? "")];
        return ids.includes(person.localPersonId);
      }
      case "mission.id":
      case "event.id":
      case "volunteer.status":
      case "mission.participation_status":
        // Fabricated pools treat these as match-all when present for sandbox demos.
        return true;
      default:
        return false;
    }
  });

  const matched =
    doc.match === "ANY" ? results.some(Boolean) : results.every(Boolean);
  return {
    matched,
    reasons: matched
      ? ["MATCHED_APPROVED_CRITERIA", "FABRICATED_PREVIEW_MEMBER"]
      : ["CRITERIA_NOT_MATCHED"],
  };
}

/**
 * Synchronous bounded evaluation against fabricated pools (TEST/PREVIEW)
 * or static person id lists. Real CRM aggregation uses the same reason codes.
 */
export function evaluateAudienceCandidates(input: {
  criteria: AudienceCriteriaDocument;
  channel: "EMAIL" | "SMS";
  evaluationType: "PREVIEW" | "REVIEW" | "MANIFEST" | "TEST";
  evaluationLimit: number;
  allowDuplicateDestinations?: boolean;
}): EvaluationEngineResult {
  const limit = evaluationLimitForType(input.evaluationType, input.evaluationLimit);
  const poolKey =
    input.criteria.fabricatedPoolKey ??
    (input.channel === "SMS" ? "sandbox_sms" : "sandbox_email");
  let pool = getFabricatedPool(poolKey);

  if (input.criteria.staticLocalPersonIds?.length) {
    pool = pool.filter((p) =>
      input.criteria.staticLocalPersonIds!.includes(p.localPersonId),
    );
  }

  const blockingErrors: string[] = [];
  const limitApplied = pool.length > limit;
  if (input.evaluationType === "MANIFEST" && pool.length > limit) {
    return {
      status: "BLOCKED",
      candidates: [],
      includedCount: 0,
      excludedCount: 0,
      duplicatePersonCount: 0,
      duplicateDestinationCount: 0,
      invalidDestinationCount: 0,
      consentBlockedCount: 0,
      suppressedCount: 0,
      limitApplied: true,
      sourceFingerprint: hashSource(poolKey, pool.length),
      blockingErrors: ["EVALUATION_LIMIT_EXCEEDED"],
      fabricatedBanner: "FABRICATED TEST DATA",
    };
  }

  const sliced = pool.slice(0, limit);
  const candidates: EvaluatedCandidate[] = [];

  for (const person of sliced) {
    const match = matchesCriteria(person, input.criteria);
    const inclusion: string[] = [];
    const exclusion: string[] = [];

    if (!match.matched) {
      exclusion.push(...match.reasons);
      candidates.push(baseCandidate(person, input.channel, "EXCLUDED", inclusion, exclusion));
      continue;
    }
    inclusion.push(...match.reasons);

    if (person.suppressed) {
      exclusion.push("GLOBAL_SUPPRESSION");
      candidates.push(
        baseCandidate(person, input.channel, "SUPPRESSED", inclusion, exclusion, {
          suppressed: true,
        }),
      );
      continue;
    }

    const consentOk =
      input.channel === "EMAIL" ? person.emailConsent : person.smsConsent;
    if (!consentOk) {
      exclusion.push("CONSENT_MISSING");
      candidates.push(
        baseCandidate(person, input.channel, "CONSENT_REQUIRED", inclusion, exclusion, {
          consent: false,
        }),
      );
      continue;
    }
    inclusion.push("CONSENT_VALID", "NOT_SUPPRESSED");

    const resolved = resolveContactDestination({
      channel: input.channel,
      localPersonId: person.localPersonId,
      contactPoints: [
        {
          id: `fab-cp-${person.localPersonId}-${input.channel}`,
          localPersonId: person.localPersonId,
          channel: input.channel,
          normalizedDestination:
            (input.channel === "EMAIL" ? person.email : person.phone) ?? "",
          verificationState: "VERIFIED",
          isActive: true,
          phoneCapability: person.phoneCapability,
        },
      ],
    });

    if (!resolved.ok) {
      const status =
        resolved.exclusionReason === "PHONE_CAPABILITY_UNKNOWN"
          ? "INVALID_DESTINATION"
          : resolved.exclusionReason?.startsWith("MISSING")
            ? "MISSING_DESTINATION"
            : "INVALID_DESTINATION";
      exclusion.push(resolved.exclusionReason ?? "INVALID_DESTINATION");
      candidates.push(
        baseCandidate(person, input.channel, status, inclusion, exclusion),
      );
      continue;
    }

    inclusion.push("VALID_CHANNEL_DESTINATION");
    candidates.push({
      localPersonId: person.localPersonId,
      channel: input.channel,
      candidateStatus: "INCLUDED",
      inclusionReasons: inclusion,
      exclusionReasons: [],
      contactPointId: resolved.contactPointId,
      destinationFingerprint: resolved.fingerprint,
      destinationMasked: resolved.masked,
      consentSnapshot: { channel: input.channel, valid: true, snapshotOnly: true },
      suppressionSnapshot: { suppressed: false, snapshotOnly: true },
      sourceFacts: {
        fabricatedBanner: person.fabricatedBanner,
        county: person.county,
        displayName: person.displayName,
      },
      deduplicationKey: resolved.fingerprint,
    });
  }

  const conflicts = detectDeduplicationConflicts(
    candidates.map((c) => ({
      localPersonId: c.localPersonId,
      destinationFingerprint: c.destinationFingerprint,
      included: c.candidateStatus === "INCLUDED",
    })),
  );

  let duplicatePersonCount = 0;
  let duplicateDestinationCount = 0;
  for (const conflict of conflicts) {
    if (conflict.type === "DUPLICATE_PERSON") {
      duplicatePersonCount += 1;
      for (const c of candidates) {
        if (
          c.localPersonId === conflict.key &&
          c.candidateStatus === "INCLUDED"
        ) {
          c.candidateStatus = "DUPLICATE_PERSON";
          c.exclusionReasons.push("DUPLICATE_PERSON");
        }
      }
    }
    if (conflict.type === "DUPLICATE_DESTINATION") {
      duplicateDestinationCount += 1;
      for (const c of candidates) {
        if (
          c.destinationFingerprint === conflict.key &&
          c.candidateStatus === "INCLUDED"
        ) {
          c.candidateStatus = "DUPLICATE_DESTINATION";
          c.exclusionReasons.push("DUPLICATE_DESTINATION");
        }
      }
      if (input.evaluationType === "MANIFEST" && !input.allowDuplicateDestinations) {
        blockingErrors.push("DUPLICATE_DESTINATION");
      }
    }
  }

  const includedCount = candidates.filter((c) => c.candidateStatus === "INCLUDED").length;
  const excludedCount = candidates.length - includedCount;
  const consentBlockedCount = candidates.filter(
    (c) => c.candidateStatus === "CONSENT_REQUIRED",
  ).length;
  const suppressedCount = candidates.filter(
    (c) => c.candidateStatus === "SUPPRESSED",
  ).length;
  const invalidDestinationCount = candidates.filter((c) =>
    ["INVALID_DESTINATION", "MISSING_DESTINATION"].includes(c.candidateStatus),
  ).length;

  const status =
    blockingErrors.length > 0
      ? "BLOCKED"
      : limitApplied || duplicateDestinationCount > 0
        ? "COMPLETED_WITH_WARNINGS"
        : "COMPLETED";

  return {
    status,
    candidates,
    includedCount,
    excludedCount,
    duplicatePersonCount,
    duplicateDestinationCount,
    invalidDestinationCount,
    consentBlockedCount,
    suppressedCount,
    limitApplied,
    sourceFingerprint: hashSource(poolKey, pool.length),
    blockingErrors,
    fabricatedBanner: "FABRICATED TEST DATA",
  };
}

function baseCandidate(
  person: FabricatedAudiencePerson,
  channel: "EMAIL" | "SMS",
  status: EvaluatedCandidate["candidateStatus"],
  inclusion: string[],
  exclusion: string[],
  extra?: { consent?: boolean; suppressed?: boolean },
): EvaluatedCandidate {
  return {
    localPersonId: person.localPersonId,
    channel,
    candidateStatus: status,
    inclusionReasons: inclusion,
    exclusionReasons: exclusion,
    contactPointId: null,
    destinationFingerprint: null,
    destinationMasked: null,
    consentSnapshot: {
      channel,
      valid: extra?.consent ?? false,
      snapshotOnly: true,
    },
    suppressionSnapshot: {
      suppressed: extra?.suppressed ?? false,
      snapshotOnly: true,
    },
    sourceFacts: {
      fabricatedBanner: person.fabricatedBanner,
      county: person.county,
      displayName: person.displayName,
    },
    deduplicationKey: null,
  };
}

function hashSource(poolKey: string, size: number): string {
  return createHash("sha256")
    .update(`fab|${poolKey}|${size}|${new Date().toISOString().slice(0, 10)}`)
    .digest("hex");
}

export function buildManifestHash(input: {
  criteriaHash: string;
  sourceFingerprint: string;
  entries: Array<{
    localPersonId: string | null;
    contactPointId: string | null;
    destinationFingerprint: string;
    channel: string;
  }>;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        criteriaHash: input.criteriaHash,
        sourceFingerprint: input.sourceFingerprint,
        entries: input.entries,
      }),
    )
    .digest("hex");
}

export function assertManifestAttachable(input: {
  status: string;
  revokedAt: Date | null;
  channel: string;
  artifactChannel: string;
  manifestHash: string;
  expectedManifestHash: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.status !== "APPROVED") reasons.push("MANIFEST_NOT_APPROVED");
  if (input.revokedAt) reasons.push("MANIFEST_REVOKED");
  if (input.channel !== input.artifactChannel) reasons.push("CHANNEL_MISMATCH");
  if (input.manifestHash !== input.expectedManifestHash) {
    reasons.push("MANIFEST_HASH_MISMATCH");
  }
  reasons.push("PRODUCTION_DISPATCH_BLOCKED");
  return { ok: false, reasons };
}
