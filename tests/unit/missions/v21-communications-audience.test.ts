import { describe, expect, it } from "vitest";
import {
  assertManifestAttachable,
  buildManifestHash,
  criteriaContentHash,
  destinationFingerprint,
  detectDeduplicationConflicts,
  evaluateAudienceCandidates,
  explainRecipientReason,
  isProhibitedCriteriaKey,
  listCriteriaRegistry,
  normalizeEmailDestination,
  normalizePhoneDestination,
  personalizationIntegrityFingerprint,
  resolveContactDestination,
  validateAudienceCriteria,
} from "@/lib/missions/v21/communications/audiences";
import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

const basePreflight = {
  communicationId: "c1",
  queueItemId: "q1",
  channel: "EMAIL" as const,
  contentFingerprint: "cf",
  audienceFingerprint: "af",
  policyVersion: 1,
  policyFingerprint: "pf",
  destinationRef: "ref",
  hasValidContentApproval: true,
  hasValidAudienceApproval: true,
  hasValidDispatchApproval: true,
  communicationActive: true,
  communicationCancelled: false,
  queuePrepared: true,
  alreadyDispatched: false,
  contactActive: true,
  contactVerified: true,
  consentEffective: true,
  suppressionApplies: false,
  destinationChanged: false,
  mobilizeLinkValid: null,
  unknownOutcomeOpen: false,
  policyExternalDispatchEnabled: false,
  providerMode: "DISABLED" as const,
  providerDispatchEnabled: false,
  globalKillSwitch: true,
  emailKillSwitch: true,
  smsKillSwitch: true,
  rateLimitExceeded: false,
};

describe("D24 communications audience recipient resolution", () => {
  it("registers governed criteria and rejects prohibited keys", () => {
    expect(listCriteriaRegistry().length).toBeGreaterThan(5);
    expect(isProhibitedCriteriaKey("inferred.race")).toBe(true);
    expect(isProhibitedCriteriaKey("persuasion_score")).toBe(true);
    expect(isProhibitedCriteriaKey("volunteer.active")).toBe(false);
  });

  it("rejects arbitrary SQL, Prisma filters, unknown and prohibited criteria", () => {
    expect(
      validateAudienceCriteria({
        match: "ALL",
        conditions: [],
        sql: "SELECT * FROM people",
      }).errors,
    ).toContain("ARBITRARY_SQL_OR_FILTER_REJECTED");

    expect(
      validateAudienceCriteria({
        match: "ALL",
        conditions: [{ key: "where:", operator: "EQUALS", value: "x" }],
        prisma: { where: { id: 1 } },
      }).ok,
    ).toBe(false);

    expect(
      validateAudienceCriteria({
        match: "ALL",
        conditions: [{ key: "unknown.field", operator: "EQUALS", value: "x" }],
      }).errors[0],
    ).toMatch(/UNKNOWN_CRITERION/);

    expect(
      validateAudienceCriteria({
        match: "ALL",
        conditions: [
          { key: "inferred.ethnicity", operator: "EQUALS", value: "x" },
        ],
      }).errors[0],
    ).toMatch(/PROHIBITED_CRITERION/);

    expect(
      validateAudienceCriteria({
        match: "ALL",
        conditions: [{ key: "volunteer.active", operator: "REGEX", value: "x" }],
      }).errors[0],
    ).toMatch(/INVALID_OPERATOR/);
  });

  it("rejects static members that look like destinations", () => {
    const bad = validateAudienceCriteria({
      match: "ALL",
      conditions: [],
      staticLocalPersonIds: ["someone@example.com"],
    });
    expect(bad.errors).toContain("STATIC_MEMBER_MUST_BE_PERSON_ID_NOT_DESTINATION");
  });

  it("hashes criteria deterministically and explains them", () => {
    const a = validateAudienceCriteria({
      match: "ALL",
      conditions: [{ key: "volunteer.active", operator: "TRUE" }],
      fabricatedPoolKey: "sandbox_email_clean",
    });
    expect(a.ok).toBe(true);
    const h1 = criteriaContentHash(a.normalized!);
    const h2 = criteriaContentHash(a.normalized!);
    expect(h1).toBe(h2);
  });

  it("evaluates fabricated pool with inclusion/exclusion reasons", () => {
    const criteria = validateAudienceCriteria({
      match: "ALL",
      fabricatedPoolKey: "sandbox_email",
      conditions: [
        { key: "volunteer.active", operator: "TRUE" },
        { key: "has_valid_email", operator: "TRUE" },
        { key: "has_email_consent", operator: "TRUE" },
        { key: "not_suppressed", operator: "TRUE" },
      ],
    }).normalized!;

    const result = evaluateAudienceCandidates({
      criteria,
      channel: "EMAIL",
      evaluationType: "PREVIEW",
      evaluationLimit: 50,
    });

    expect(result.fabricatedBanner).toBe("FABRICATED TEST DATA");
    expect(result.includedCount).toBeGreaterThan(0);
    expect(result.duplicateDestinationCount).toBeGreaterThan(0);
    expect(result.excludedCount).toBeGreaterThan(0);
    const included = result.candidates.find((c) => c.candidateStatus === "INCLUDED");
    expect(included?.inclusionReasons).toContain("CONSENT_VALID");
    expect(included?.destinationMasked).toMatch(/•|@/);
    expect(explainRecipientReason("CONSENT_MISSING")).toMatch(/consent/i);

    const consentEval = evaluateAudienceCandidates({
      criteria: validateAudienceCriteria({
        match: "ALL",
        fabricatedPoolKey: "sandbox_email",
        conditions: [
          { key: "volunteer.active", operator: "TRUE" },
          { key: "has_valid_email", operator: "TRUE" },
        ],
      }).normalized!,
      channel: "EMAIL",
      evaluationType: "PREVIEW",
      evaluationLimit: 50,
    });
    expect(
      consentEval.consentBlockedCount + consentEval.suppressedCount,
    ).toBeGreaterThan(0);
  });

  it("blocks manifest evaluation when duplicate destinations remain", () => {
    const criteria = validateAudienceCriteria({
      match: "ALL",
      fabricatedPoolKey: "sandbox_email",
      conditions: [
        { key: "volunteer.active", operator: "TRUE" },
        { key: "has_valid_email", operator: "TRUE" },
        { key: "has_email_consent", operator: "TRUE" },
        { key: "not_suppressed", operator: "TRUE" },
      ],
    }).normalized!;

    const result = evaluateAudienceCandidates({
      criteria,
      channel: "EMAIL",
      evaluationType: "MANIFEST",
      evaluationLimit: 50,
    });
    expect(result.blockingErrors).toContain("DUPLICATE_DESTINATION");
    expect(result.status).toBe("BLOCKED");
  });

  it("creates clean evaluation without duplicate destinations", () => {
    const criteria = validateAudienceCriteria({
      match: "ALL",
      fabricatedPoolKey: "sandbox_email_clean",
      conditions: [
        { key: "volunteer.active", operator: "TRUE" },
        { key: "has_valid_email", operator: "TRUE" },
        { key: "has_email_consent", operator: "TRUE" },
        { key: "not_suppressed", operator: "TRUE" },
      ],
    }).normalized!;

    const result = evaluateAudienceCandidates({
      criteria,
      channel: "EMAIL",
      evaluationType: "REVIEW",
      evaluationLimit: 50,
    });
    expect(result.status).toBe("COMPLETED");
    expect(result.duplicateDestinationCount).toBe(0);
    expect(result.includedCount).toBe(2);
  });

  it("enforces evaluation limits on manifest runs", () => {
    const criteria = validateAudienceCriteria({
      match: "ALL",
      fabricatedPoolKey: "sandbox_email",
      conditions: [{ key: "has_valid_email", operator: "TRUE" }],
    }).normalized!;

    const result = evaluateAudienceCandidates({
      criteria,
      channel: "EMAIL",
      evaluationType: "MANIFEST",
      evaluationLimit: 1,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingErrors).toContain("EVALUATION_LIMIT_EXCEEDED");
  });

  it("normalizes destinations and fingerprints deterministically", () => {
    const email = normalizeEmailDestination("  Alex@Example.TEST  ");
    expect(email.ok).toBe(true);
    const fp1 = destinationFingerprint("EMAIL", email.normalized!);
    const fp2 = destinationFingerprint("EMAIL", email.normalized!);
    expect(fp1).toBe(fp2);

    const phone = normalizePhoneDestination("(918) 555-0194");
    expect(phone.ok).toBe(true);
    expect(phone.normalized).toMatch(/^\+1/);

    expect(normalizeEmailDestination("bad\nheader@x.com").ok).toBe(false);
  });

  it("prefers verified primary email and blocks unknown SMS capability", () => {
    const email = resolveContactDestination({
      channel: "EMAIL",
      localPersonId: "p1",
      contactPoints: [
        {
          id: "alt",
          localPersonId: "p1",
          channel: "EMAIL",
          normalizedDestination: "alt@example.test",
          verificationState: "UNVERIFIED",
          isActive: true,
        },
        {
          id: "pri",
          localPersonId: "p1",
          channel: "EMAIL",
          normalizedDestination: "pri@example.test",
          verificationState: "VERIFIED",
          isActive: true,
        },
      ],
    });
    expect(email.ok).toBe(true);
    expect(email.contactPointId).toBe("pri");

    const sms = resolveContactDestination({
      channel: "SMS",
      localPersonId: "p1",
      contactPoints: [
        {
          id: "ph",
          localPersonId: "p1",
          channel: "SMS",
          normalizedDestination: "+14055550122",
          verificationState: "VERIFIED",
          isActive: true,
          phoneCapability: "UNKNOWN",
        },
      ],
    });
    expect(sms.ok).toBe(false);
    expect(sms.exclusionReason).toBe("PHONE_CAPABILITY_UNKNOWN");
  });

  it("detects person and destination duplicates", () => {
    const conflicts = detectDeduplicationConflicts([
      { localPersonId: "a", destinationFingerprint: "fp1", included: true },
      { localPersonId: "a", destinationFingerprint: "fp2", included: true },
      { localPersonId: "b", destinationFingerprint: "fp3", included: true },
      { localPersonId: "c", destinationFingerprint: "fp3", included: true },
    ]);
    expect(conflicts.some((c) => c.type === "DUPLICATE_PERSON")).toBe(true);
    expect(conflicts.some((c) => c.type === "DUPLICATE_DESTINATION")).toBe(true);
  });

  it("builds immutable manifest hash and always blocks production attach", () => {
    const hash = buildManifestHash({
      criteriaHash: "c",
      sourceFingerprint: "s",
      entries: [
        {
          localPersonId: "p1",
          contactPointId: "cp1",
          destinationFingerprint: "df",
          channel: "EMAIL",
        },
      ],
    });
    expect(hash).toHaveLength(64);

    const attach = assertManifestAttachable({
      status: "APPROVED",
      revokedAt: null,
      channel: "EMAIL",
      artifactChannel: "EMAIL",
      manifestHash: hash,
      expectedManifestHash: hash,
    });
    expect(attach.ok).toBe(false);
    expect(attach.reasons).toContain("PRODUCTION_DISPATCH_BLOCKED");
  });

  it("binds personalization integrity to the same person", () => {
    const a = personalizationIntegrityFingerprint({
      localPersonId: "p1",
      contactPointId: "cp1",
      channel: "EMAIL",
      renderArtifactId: "art1",
    });
    const b = personalizationIntegrityFingerprint({
      localPersonId: "p2",
      contactPointId: "cp1",
      channel: "EMAIL",
      renderArtifactId: "art1",
    });
    expect(a).not.toBe(b);
  });

  it("D21 preflight rejects arbitrary override and requires approved manifest", () => {
    const override = evaluateDispatchPreflight({
      ...basePreflight,
      arbitraryDestinationOverride: true,
      recipientManifestId: "m1",
      recipientManifestApproved: true,
      recipientManifestEntryId: "e1",
      recipientManifestEntryMatches: true,
      destinationFingerprintMatches: true,
      channelMatchesManifest: true,
      personalizationIntegrityOk: true,
      renderArtifactId: "r1",
      renderArtifactValid: true,
    });
    expect(override.blockingReasonCodes).toContain(
      "ARBITRARY_DESTINATION_OVERRIDE_REJECTED",
    );

    const revoked = evaluateDispatchPreflight({
      ...basePreflight,
      recipientManifestId: "m1",
      recipientManifestApproved: true,
      recipientManifestRevoked: true,
      recipientManifestEntryId: "e1",
      recipientManifestEntryMatches: true,
      destinationFingerprintMatches: true,
      channelMatchesManifest: true,
      personalizationIntegrityOk: true,
      renderArtifactId: "r1",
      renderArtifactValid: true,
    });
    expect(revoked.blockingReasonCodes).toContain("RECIPIENT_MANIFEST_REVOKED");

    const mismatch = evaluateDispatchPreflight({
      ...basePreflight,
      recipientManifestId: "m1",
      recipientManifestApproved: true,
      recipientManifestEntryId: "e1",
      recipientManifestEntryMatches: true,
      destinationFingerprintMatches: false,
      channelMatchesManifest: false,
      personalizationIntegrityOk: false,
      renderArtifactId: "r1",
      renderArtifactValid: true,
      consentEffective: false,
      suppressionApplies: true,
    });
    expect(mismatch.blockingReasonCodes).toContain("DESTINATION_FINGERPRINT_MISMATCH");
    expect(mismatch.blockingReasonCodes).toContain("MANIFEST_ARTIFACT_CHANNEL_MISMATCH");
    expect(mismatch.blockingReasonCodes).toContain("PERSONALIZATION_INTEGRITY_MISMATCH");
    expect(mismatch.blockingReasonCodes).toContain("CONSENT_INEFFECTIVE");
    expect(mismatch.blockingReasonCodes).toContain("SUPPRESSION_ACTIVE");
  });

  it("keeps production dispatch hard-blocked", () => {
    expect(d22ProductionDispatchHardBlock().blocked).toBe(true);
  });
});
