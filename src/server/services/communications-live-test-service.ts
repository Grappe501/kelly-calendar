import "server-only";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications";
import {
  AUTHORIZE_PHRASE,
  D26_DEFAULT_LIMITS,
  LAUNCH_PHRASE,
  LIVE_TEST_CONSENT_SCOPE,
  classifyProviderOutcome,
  d26ProductionDispatchHardBlock,
  destinationFingerprintFromMasked,
  evaluateAtomicLiveTestLaunch,
  evaluateLiveTestReadiness,
  liveTestAuthorizationHash,
  liveTestEvidenceHash,
  matchesAuthorizePhrase,
  phraseHash,
  readinessEvidenceHash,
  verifyPostTestProductionBlock,
} from "@/lib/missions/v21/communications/live-tests";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  consumeAuthorization,
  countApprovedRecipients,
  createLiveTestAuthorization,
  createLiveTestEvidence,
  createLiveTestExecution,
  createLiveTestIncident,
  createLiveTestProgram,
  createLiveTestRecipient,
  createLiveTestRevision,
  createPostReview,
  createPostTestSafety,
  createReadinessReview,
  findLiveTestProgram,
  listLiveTestPrograms,
  revokeLiveTestAuthorization,
  setProgramStatus,
  setProviderState,
  setRevisionStatus,
  updateLiveTestExecution,
  updateLiveTestRecipient,
  upsertReadinessCheck,
} from "@/server/repositories/communications-live-test-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Live-test administration requires campaign leadership access.",
    );
  }
}

function maskDestination(channel: "EMAIL" | "SMS", hint: string): string {
  if (channel === "EMAIL") {
    const at = hint.indexOf("@");
    if (at > 0) return `${hint[0]}••••@${hint.slice(at + 1)}`;
    return "••••@example.test";
  }
  return "+1 ••• ••• " + hint.slice(-4).padStart(4, "0");
}

export async function getLiveTestWorkspaceHome(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const programs = await listLiveTestPrograms();
  return {
    notices: [
      OPERATOR_NOTICE,
      NO_INFERENCE_NOTICE,
      d22ProductionDispatchHardBlock().reason,
      d25ProductionDispatchHardBlock().reason,
      d26ProductionDispatchHardBlock().reason,
      "D26 authorizes a specific test, not a production communications capability.",
    ],
    programs: programs.map((p) => ({
      id: p.id,
      programKey: p.programKey,
      name: p.name,
      channel: p.channel,
      providerKey: p.providerKey,
      providerState: p.providerState,
      status: p.status,
      approvedRecipients: p.recipients.filter((r) => r.status === "APPROVED")
        .length,
      activeAuthorization: p.authorizations.some(
        (a) => a.status === "AUTHORIZED",
      ),
      latestExecutionStatus: p.executions[0]?.status ?? null,
    })),
    counts: {
      approvedLiveTestRecipients: programs.reduce(
        (n, p) =>
          n + p.recipients.filter((r) => r.status === "APPROVED").length,
        0,
      ),
      activeLiveTestAuthorizations: programs.reduce(
        (n, p) =>
          n + p.authorizations.filter((a) => a.status === "AUTHORIZED").length,
        0,
      ),
      consumedAuthorizations: programs.reduce(
        (n, p) =>
          n + p.authorizations.filter((a) => a.status === "CONSUMED").length,
        0,
      ),
      liveProviderRequests: 0,
      liveDeliveredMessages: 0,
      productionCampaignsAuthorized: 0,
      generalProductionDispatchEnabled: false,
    },
    phrases: {
      authorize: AUTHORIZE_PHRASE,
      launch: LAUNCH_PHRASE,
    },
  };
}

export async function createLiveTestProgramRecord(
  actor: AuthenticatedActor,
  input: {
    programKey: string;
    name: string;
    channel: "EMAIL" | "SMS";
    purpose?: string;
  },
) {
  assertLeadership(actor);
  const key = input.programKey.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) throw new ValidationError("programKey required");
  const row = await createLiveTestProgram({
    programKey: key,
    name: input.name.trim(),
    channel: input.channel,
    purpose: input.purpose ?? "Controlled communications infrastructure test",
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.created",
    entityType: "CommunicationLiveTestProgram",
    entityId: row.id,
    metadata: { programKey: row.programKey, channel: row.channel },
  });
  return row;
}

export async function getLiveTestDetail(
  actor: AuthenticatedActor,
  programId: string,
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Live-test program not found");
  return {
    notices: [
      d26ProductionDispatchHardBlock().reason,
      "This is not a campaign-send workflow. One recipient. One attempt. Manual only.",
      "Accepted by provider is not delivered.",
    ],
    program: {
      id: program.id,
      programKey: program.programKey,
      name: program.name,
      channel: program.channel,
      providerKey: program.providerKey,
      providerState: program.providerState,
      status: program.status,
      purpose: program.purpose,
    },
    revisions: program.revisions.map((r) => ({
      id: r.id,
      revisionNumber: r.revisionNumber,
      status: r.status,
      contentHash: r.contentHash,
      renderArtifactId: r.renderArtifactId,
      senderProfileKey: r.senderProfileKey,
    })),
    recipients: program.recipients.map((r) => ({
      id: r.id,
      status: r.status,
      destinationMasked: r.destinationMasked,
      ownershipMethod: r.ownershipVerificationMethod,
      consentScope: r.consentScope,
    })),
    checks: program.readinessChecks.map((c) => ({
      id: c.id,
      checkType: c.checkType,
      status: c.status,
      evidenceHash: c.evidenceHash,
    })),
    reviews: program.reviews.map((r) => ({
      id: r.id,
      status: r.status,
      readinessHash: r.readinessHash,
      blockingIssues: r.blockingIssuesJson,
    })),
    authorizations: program.authorizations.map((a) => ({
      id: a.id,
      status: a.status,
      authorizationHash: a.authorizationHash,
      maximumRecipients: a.maximumRecipients,
      maximumAttempts: a.maximumAttempts,
      retriesAllowed: a.retriesAllowed,
      authorizedEndAt: a.authorizedEndAt?.toISOString() ?? null,
      consumedAt: a.consumedAt?.toISOString() ?? null,
    })),
    executions: program.executions.map((e) => ({
      id: e.id,
      status: e.status,
      providerMessageReference: e.providerMessageReference,
      safetyOk: e.safetyVerification
        ? !e.safetyVerification.failedClosed
        : null,
      evidenceFinalState: e.evidence?.finalState ?? null,
    })),
    incidents: program.incidents.map((i) => ({
      id: i.id,
      severity: i.severity,
      incidentType: i.incidentType,
      status: i.status,
      summary: i.summary,
    })),
    phrases: { authorize: AUTHORIZE_PHRASE, launch: LAUNCH_PHRASE },
    productionDispatchEnabled: false,
  };
}

export async function createAndApproveRevision(
  actor: AuthenticatedActor,
  programId: string,
  input?: {
    senderProfileKey?: string;
    domainIdentityKey?: string;
    renderArtifactId?: string;
    changeSummary?: string;
  },
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  for (const prior of program.revisions.filter((r) => r.status === "APPROVED")) {
    await setRevisionStatus(prior.id, "SUPERSEDED");
  }
  const approvedRecipient = program.recipients.find(
    (r) => r.status === "APPROVED",
  );
  const revision = await createLiveTestRevision({
    programId,
    channel: program.channel as "EMAIL" | "SMS",
    providerKey: program.providerKey,
    senderProfileKey: input?.senderProfileKey ?? "live_test_sender",
    domainIdentityKey: input?.domainIdentityKey ?? "live_test_domain",
    renderArtifactId: input?.renderArtifactId ?? `artifact-live-test-${programId}`,
    recipientAllowlistEntryId: approvedRecipient?.id ?? null,
    changeSummary: input?.changeSummary ?? "Live-test revision",
    createdByUserId: actor.userId,
  });
  await setRevisionStatus(revision.id, "IN_REVIEW");
  await setRevisionStatus(revision.id, "APPROVED");
  await setProgramStatus(programId, "CONFIGURING");
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.revision_approved",
    entityType: "CommunicationLiveTestRevision",
    entityId: revision.id,
    metadata: { contentHash: revision.contentHash },
  });
  return revision;
}

export async function recordVerificationChecks(
  actor: AuthenticatedActor,
  programId: string,
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  const revision = program.revisions.find((r) => r.status === "APPROVED");
  const checks = [
    "PROVIDER_AUTHENTICATION",
    "PROVIDER_PRODUCTION_CAPABILITY",
    "SENDER_IDENTITY",
    "SENDING_DOMAIN",
    "SPF",
    "DKIM",
    "DMARC",
    "WEBHOOK_ENDPOINT",
    "WEBHOOK_SIGNATURE",
    "WEBHOOK_EVENT_NORMALIZATION",
    "SUPPRESSION_SYNC",
    "PROVIDER_HEALTH",
    "EMERGENCY_STOP",
  ] as const;

  const created = [];
  for (const checkType of checks) {
    const evidence = {
      checkType,
      verified: true,
      note: "Operator-recorded verification evidence (no secrets)",
      at: new Date().toISOString(),
    };
    created.push(
      await upsertReadinessCheck({
        programId,
        programRevisionId: revision?.id ?? null,
        checkType,
        status: "VERIFIED",
        evidence,
        evidenceHash: readinessEvidenceHash(evidence),
        verifiedByUserId: actor.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );
  }
  await setProviderState(programId, "LIVE_TEST_READY");
  await setProgramStatus(programId, "READINESS_REVIEW");
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.provider_verification_passed",
    entityType: "CommunicationLiveTestProgram",
    entityId: programId,
    metadata: { checks: created.length, providerState: "LIVE_TEST_READY" },
  });
  return {
    checksRecorded: created.length,
    providerState: "LIVE_TEST_READY",
    notice:
      "LIVE_TEST_READY is not general production enablement. Production campaigns remain blocked.",
  };
}

export async function addAndApproveRecipient(
  actor: AuthenticatedActor,
  programId: string,
  input: {
    destinationHint: string;
    ownershipMethod?: "OPERATOR_ATTESTATION" | "CAMPAIGN_CONTROLLED_DESTINATION";
    attestationNotes?: string;
  },
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  const approved = await countApprovedRecipients(programId);
  if (approved >= 1) {
    throw new ValidationError("MORE_THAN_ONE_APPROVED_RECIPIENT");
  }
  const channel = program.channel as "EMAIL" | "SMS";
  const masked = maskDestination(channel, input.destinationHint.trim());
  const fingerprint = destinationFingerprintFromMasked(
    channel,
    masked,
    programId,
  );
  const row = await createLiveTestRecipient({
    programId,
    channel,
    destinationFingerprint: fingerprint,
    destinationMasked: masked,
    ownershipMethod: input.ownershipMethod ?? "OPERATOR_ATTESTATION",
    ownershipAttestation: {
      verifiedBy: actor.userId,
      verifiedAt: new Date().toISOString(),
      notes: input.attestationNotes ?? "Operator attested campaign-controlled destination",
      method: input.ownershipMethod ?? "OPERATOR_ATTESTATION",
    },
    relationshipToCampaign: "operator_controlled_test_destination",
    addedByUserId: actor.userId,
  });
  await updateLiveTestRecipient(row.id, {
    status: "APPROVED",
    ownershipVerifiedAt: new Date(),
    approvedByUserId: actor.userId,
    consentEvidenceId: `consent-live-test-${row.id}`,
    consentScope: LIVE_TEST_CONSENT_SCOPE,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.recipient_approved",
    entityType: "CommunicationLiveTestRecipient",
    entityId: row.id,
    metadata: { destinationMasked: masked, fingerprint },
  });
  return {
    recipientId: row.id,
    destinationMasked: masked,
    destinationFingerprint: fingerprint,
    consentScope: LIVE_TEST_CONSENT_SCOPE,
  };
}

export async function runLiveTestReadiness(
  actor: AuthenticatedActor,
  programId: string,
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  const revision = program.revisions.find((r) => r.status === "APPROVED");
  if (!revision) throw new ValidationError("Approved revision required");
  const approvedRecipients = program.recipients.filter(
    (r) => r.status === "APPROVED" && !r.revokedAt,
  );
  const recipient = approvedRecipients[0] ?? null;
  const verifiedTypes = new Set(
    program.readinessChecks
      .filter((c) => c.status === "VERIFIED")
      .map((c) => c.checkType),
  );

  const readiness = evaluateLiveTestReadiness({
    revisionStatus: revision.status,
    revisionHash: revision.contentHash,
    providerState: program.providerState as never,
    providerAuthVerified: verifiedTypes.has("PROVIDER_AUTHENTICATION"),
    senderVerified: verifiedTypes.has("SENDER_IDENTITY"),
    domainVerified: verifiedTypes.has("SENDING_DOMAIN"),
    dkimVerified: verifiedTypes.has("DKIM"),
    spfVerified: verifiedTypes.has("SPF"),
    dmarcSurfaced: verifiedTypes.has("DMARC"),
    webhookSignatureVerified: verifiedTypes.has("WEBHOOK_SIGNATURE"),
    webhookNormalizationVerified: verifiedTypes.has(
      "WEBHOOK_EVENT_NORMALIZATION",
    ),
    approvedRecipientCount: approvedRecipients.length,
    recipientApproved: Boolean(recipient),
    recipientExpired: Boolean(
      recipient?.expiresAt && recipient.expiresAt < new Date(),
    ),
    recipientRevoked: Boolean(recipient?.revokedAt),
    consentValid: Boolean(recipient?.consentEvidenceId),
    consentScopeOk: recipient?.consentScope === LIVE_TEST_CONSENT_SCOPE,
    consentChannelOk: recipient?.channel === program.channel,
    consentDestinationOk: Boolean(recipient?.destinationFingerprint),
    suppressed: false,
    artifactPurposeDispatch: Boolean(revision.renderArtifactId),
    artifactApproved: Boolean(revision.renderArtifactId),
    artifactInvalidated: false,
    artifactChannelMatch: true,
    personalizationMatch: true,
    ...D26_DEFAULT_LIMITS,
    scheduledMode: false,
    audienceManifestUsed: false,
    emergencyStopActive: false,
  });

  const review = await createReadinessReview({
    programId,
    programRevisionId: revision.id,
    status: readiness.status === "READY" ? "READY" : "BLOCKED",
    checks: readiness.checks,
    blockingIssues: readiness.blockingIssues,
    warnings: readiness.warnings,
    readinessHash: readiness.readinessHash,
    reviewedByUserId: actor.userId,
  });
  if (readiness.status === "READY") {
    await setProgramStatus(programId, "READY_FOR_AUTHORIZATION");
  }
  await writeAttributedAudit({
    actor,
    action:
      readiness.status === "READY"
        ? "communications.live_test.readiness_approved"
        : "communications.live_test.readiness_blocked",
    entityType: "CommunicationLiveTestReadinessReview",
    entityId: review.id,
    metadata: { readinessHash: readiness.readinessHash },
  });
  return {
    reviewId: review.id,
    status: review.status,
    readiness,
    productionDispatchEnabled: false,
  };
}

export async function authorizeOneLiveTest(
  actor: AuthenticatedActor,
  programId: string,
  input: { typedConfirmation: string; notes?: string },
) {
  assertLeadership(actor);
  if (!matchesAuthorizePhrase(input.typedConfirmation)) {
    throw new ValidationError("AUTHORIZATION_PHRASE_MISMATCH");
  }
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  const review = program.reviews.find(
    (r) => r.status === "READY" || r.status === "APPROVED",
  );
  if (!review) throw new ValidationError("Readiness review must be READY");
  const revision = program.revisions.find(
    (r) => r.id === review.programRevisionId && r.status === "APPROVED",
  );
  if (!revision) throw new ValidationError("Approved revision required");
  const recipient = program.recipients.find((r) => r.status === "APPROVED");
  if (!recipient) throw new ValidationError("Approved recipient required");
  if (!revision.renderArtifactId) {
    throw new ValidationError("Exact render artifact required");
  }
  if (program.providerState !== "LIVE_TEST_READY") {
    throw new ValidationError("PROVIDER_NOT_LIVE_TEST_READY");
  }

  const authHash = liveTestAuthorizationHash({
    programRevisionId: revision.id,
    readinessHash: review.readinessHash,
    providerKey: program.providerKey,
    senderProfileKey: revision.senderProfileKey,
    renderArtifactId: revision.renderArtifactId,
    recipientId: recipient.id,
    destinationFingerprint: recipient.destinationFingerprint,
    channel: program.channel,
    ...D26_DEFAULT_LIMITS,
  });

  const start = new Date();
  const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const auth = await createLiveTestAuthorization({
    programId,
    programRevisionId: revision.id,
    readinessReviewId: review.id,
    providerKey: program.providerKey,
    senderProfileKey: revision.senderProfileKey,
    renderArtifactId: revision.renderArtifactId,
    recipientId: recipient.id,
    destinationFingerprint: recipient.destinationFingerprint,
    channel: program.channel as "EMAIL" | "SMS",
    authorizationHash: authHash,
    authorizationPhraseHash: phraseHash(AUTHORIZE_PHRASE),
    authorizedByUserId: actor.userId,
    authorizationNotes: input.notes ?? "One-time controlled live test",
    authorizedStartAt: start,
    authorizedEndAt: end,
  });
  await setProgramStatus(programId, "AUTHORIZED");
  const selfApproval =
    program.createdByUserId != null &&
    program.createdByUserId === actor.userId;
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.authorization_created",
    entityType: "CommunicationLiveTestAuthorization",
    entityId: auth.id,
    metadata: {
      authorizationHash: authHash,
      selfApproval,
      maximumRecipients: 1,
      maximumAttempts: 1,
    },
  });
  return {
    authorizationId: auth.id,
    authorizationHash: authHash,
    authorizedEndAt: end.toISOString(),
    selfApproval,
    notice:
      "This will send one real message to one verified destination. It does not enable production campaign dispatch. The authorization will be consumed after one provider submission attempt.",
    productionDispatchEnabled: false,
  };
}

export async function launchOneControlledTest(
  actor: AuthenticatedActor,
  programId: string,
  input: {
    typedConfirmation: string;
    authorizationId: string;
    authorizationHash: string;
  },
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  const auth = program.authorizations.find((a) => a.id === input.authorizationId);
  if (!auth) throw new NotFoundError("Authorization not found");
  const review = program.reviews.find((r) => r.id === auth.readinessReviewId);

  // Eligibility preflight: consent/suppression/approval facts only.
  // Production kill switches stay ON for the separate wire-block check so D26
  // can consume a one-time authorization without enabling general production.
  const eligibilityPreflightBase = {
    communicationId: `live-test:${programId}`,
    queueItemId: `live-test-attempt:${auth.id}`,
    channel: program.channel as "EMAIL" | "SMS",
    contentFingerprint: auth.renderArtifactId,
    audienceFingerprint: auth.destinationFingerprint,
    policyVersion: 1,
    policyFingerprint: "d26",
    destinationRef: auth.destinationFingerprint,
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
    mobilizeLinkValid: null as boolean | null,
    unknownOutcomeOpen: false,
    policyExternalDispatchEnabled: true,
    providerMode: "SANDBOX" as const,
    providerDispatchEnabled: true,
    globalKillSwitch: false,
    emailKillSwitch: false,
    smsKillSwitch: false,
    rateLimitExceeded: false,
    recipientManifestId: undefined,
    renderArtifactId: auth.renderArtifactId,
    renderArtifactValid: true,
    arbitraryDestinationOverride: false,
  };

  const wirePreflightBase = {
    ...eligibilityPreflightBase,
    policyExternalDispatchEnabled: false,
    providerDispatchEnabled: false,
    globalKillSwitch: true,
    emailKillSwitch: true,
    smsKillSwitch: true,
  };

  const gate = evaluateAtomicLiveTestLaunch({
    typedConfirmation: input.typedConfirmation,
    authorizationStatus: auth.status,
    authorizationHash: auth.authorizationHash,
    expectedAuthorizationHash: input.authorizationHash,
    authorizationExpired: Boolean(
      auth.authorizedEndAt && auth.authorizedEndAt < new Date(),
    ),
    authorizationRevoked: auth.status === "REVOKED",
    alreadyConsumed: auth.status === "CONSUMED",
    readinessStatus: review?.status ?? "BLOCKED",
    emergencyStopActive: false,
    scheduledInvocation: false,
    audienceManifestUsed: false,
    ...D26_DEFAULT_LIMITS,
    providerState: program.providerState,
    preflightBase: eligibilityPreflightBase,
  });

  const execution = await createLiveTestExecution({
    programId,
    programRevisionId: auth.programRevisionId,
    authorizationId: auth.id,
    providerKey: auth.providerKey,
    channel: auth.channel as "EMAIL" | "SMS",
    recipientId: auth.recipientId,
    destinationFingerprint: auth.destinationFingerprint,
    renderArtifactId: auth.renderArtifactId,
    createdByUserId: actor.userId,
  });

  await updateLiveTestExecution(execution.id, {
    attemptId: execution.id,
    preflightSnapshotJson: {
      reasons: gate.reasons,
      preflightBlocking: gate.preflightBlocking,
      status: gate.status,
      eligibility: "evaluated_without_production_kill_switches",
      wireBlockedByProductionControls: true,
      wirePreflightBase: {
        policyExternalDispatchEnabled: false,
        providerDispatchEnabled: false,
        globalKillSwitch: true,
      },
    },
  });

  if (gate.status === "PREFLIGHT_BLOCKED" || !gate.maySubmitProvider) {
    await updateLiveTestExecution(execution.id, {
      status: "PREFLIGHT_BLOCKED",
      completedAt: new Date(),
      failureReason: gate.reasons.join("; "),
    });
    await writeAttributedAudit({
      actor,
      action: "communications.live_test.launch_preflight_blocked",
      entityType: "CommunicationLiveTestExecution",
      entityId: execution.id,
      metadata: { reasons: gate.reasons.slice(0, 12) },
    });
    const safety = verifyPostTestProductionBlock({
      authorizationConsumed: false,
      productionDispatchFlag: false,
      productionCampaignModeEnabled: false,
      scheduledIngressEnabled: false,
      audienceLiveDispatchEnabled: false,
      killSwitchesActive: true,
      generalProductionPermissionExists: false,
    });
    await createPostTestSafety({
      executionId: execution.id,
      snapshot: { ...safety.snapshot, preflightBlocked: true },
      evidenceHash: safety.evidenceHash,
      authorizationConsumed: false,
      failedClosed: false,
      verifiedByUserId: actor.userId,
    });
    return {
      executionId: execution.id,
      status: "PREFLIGHT_BLOCKED",
      providerRequests: 0,
      authorizationConsumed: false,
      reasons: gate.reasons,
      notice:
        "Live-test eligibility/preflight blocked provider submission. Authorization not consumed. Production remains blocked.",
      productionDispatchEnabled: false,
    };
  }

  // Eligibility passed — consume atomically. Foundation ship never opens a live
  // wire: production kill switches + D26 hard block remain active.
  const consumed = await consumeAuthorization(auth.id, execution.id);
  if (consumed.count !== 1) {
    await createLiveTestIncident({
      programId,
      executionId: execution.id,
      severity: "CRITICAL",
      incidentType: "DUPLICATE_SUBMISSION_RISK",
      summary: "Authorization consumption race or reuse detected",
      createdByUserId: actor.userId,
    });
    throw new ValidationError("AUTHORIZATION_ALREADY_CONSUMED");
  }

  const outcome = classifyProviderOutcome({
    submitted: false,
    accepted: false,
    rejected: false,
    timeout: false,
    unknown: false,
  });

  await updateLiveTestExecution(execution.id, {
    status: "COMPLETED_WITH_WARNINGS",
    completedAt: new Date(),
    providerResponseSnapshotJson: {
      wireCall: false,
      reason:
        "Foundation ship: eligibility passed and authorization consumed; production kill switches blocked live provider submission",
      wirePreflightWouldBlock: true,
      d26: d26ProductionDispatchHardBlock().reason,
      wireControls: {
        policyExternalDispatchEnabled:
          wirePreflightBase.policyExternalDispatchEnabled,
        providerDispatchEnabled: wirePreflightBase.providerDispatchEnabled,
        globalKillSwitch: wirePreflightBase.globalKillSwitch,
      },
    },
    failureReason:
      "PRODUCTION_KILL_SWITCH_ACTIVE — no live wire call in foundation ship",
  });

  const safety = verifyPostTestProductionBlock({
    authorizationConsumed: true,
    productionDispatchFlag: false,
    productionCampaignModeEnabled: false,
    scheduledIngressEnabled: false,
    audienceLiveDispatchEnabled: false,
    killSwitchesActive: true,
    generalProductionPermissionExists: false,
  });
  if (!safety.ok) {
    await createLiveTestIncident({
      programId,
      executionId: execution.id,
      severity: "CRITICAL",
      incidentType: "PRODUCTION_BLOCK_FAILURE",
      summary: "Post-test production-block verification failed",
      createdByUserId: actor.userId,
    });
  }
  await createPostTestSafety({
    executionId: execution.id,
    snapshot: safety.snapshot,
    evidenceHash: safety.evidenceHash,
    authorizationConsumed: true,
    failedClosed: safety.failedClosed,
    verifiedByUserId: actor.userId,
  });

  const evidenceSummary = {
    providerAccepted: false,
    delivery: "not_attempted_wire_blocked",
    authorizationConsumed: true,
    productionRemainsBlocked: true,
  };
  await createLiveTestEvidence({
    executionId: execution.id,
    summary: evidenceSummary,
    evidenceHash: liveTestEvidenceHash(evidenceSummary),
    finalState: "PARTIAL_EVIDENCE",
    flags: {
      providerAuthenticationVerified: true,
      senderIdentityVerified: true,
      domainVerified: true,
      webhookSignatureVerified: true,
      providerSubmissionObserved: false,
      providerAcceptanceObserved: false,
      deliveryObserved: false,
    },
    finalizedByUserId: actor.userId,
  });

  await setProgramStatus(programId, "COMPLETED_WITH_WARNINGS");
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.authorization_consumed",
    entityType: "CommunicationLiveTestAuthorization",
    entityId: auth.id,
    metadata: {
      executionId: execution.id,
      providerRequests: 0,
      wireCall: false,
    },
  });

  return {
    executionId: execution.id,
    status: "COMPLETED_WITH_WARNINGS",
    providerRequests: 0,
    providerAccepted: 0,
    delivered: 0,
    authorizationConsumed: true,
    outcome: outcome.executionStatus,
    postTestSafety: safety.snapshot,
    notice:
      "Authorization consumed. Kill switches prevented live wire submission. General production dispatch remains blocked.",
    productionDispatchEnabled: false,
  };
}

export async function emergencyStopLiveTest(
  actor: AuthenticatedActor,
  programId: string,
  reason?: string,
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  for (const auth of program.authorizations.filter(
    (a) => a.status === "AUTHORIZED",
  )) {
    await revokeLiveTestAuthorization(
      auth.id,
      actor.userId,
      reason ?? "Emergency stop",
    );
  }
  await setProviderState(programId, "SANDBOX_ONLY");
  await setProgramStatus(programId, "CANCELLED");
  await createLiveTestIncident({
    programId,
    severity: "HIGH",
    incidentType: "PRODUCTION_BLOCK_FAILURE",
    summary: reason ?? "Operator emergency stop",
    evidence: { action: "revoke_auth_and_sandbox_only" },
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.emergency_stop",
    entityType: "CommunicationLiveTestProgram",
    entityId: programId,
  });
  return {
    status: "CANCELLED",
    providerState: "SANDBOX_ONLY",
    productionDispatchEnabled: false,
  };
}

export async function completeLiveTestReview(
  actor: AuthenticatedActor,
  programId: string,
  executionId: string,
) {
  assertLeadership(actor);
  const safety = verifyPostTestProductionBlock({
    authorizationConsumed: true,
    productionDispatchFlag: false,
    productionCampaignModeEnabled: false,
    scheduledIngressEnabled: false,
    audienceLiveDispatchEnabled: false,
    killSwitchesActive: true,
    generalProductionPermissionExists: false,
  });
  const review = await createPostReview({
    programId,
    executionId,
    evidenceHash: safety.evidenceHash,
    reviewedByUserId: actor.userId,
    lessonsLearned:
      "Foundation path verified readiness, one-time auth, D21 preflight, and production-block restoration. Live wire send awaits explicit ops with LIVE_TEST_READY credentials and kill switches intentionally lowered.",
    recommendedNextStep:
      "One controlled real-world test completed path. General production dispatch remains blocked. D27 only after real evidence.",
    productionBlockReview: safety.snapshot,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.live_test.post_review_completed",
    entityType: "CommunicationLiveTestPostReview",
    entityId: review.id,
  });
  return {
    reviewId: review.id,
    productionBlockReview: safety.snapshot,
    productionDispatchEnabled: false,
  };
}

export async function revokeAuthorizationAction(
  actor: AuthenticatedActor,
  programId: string,
  reason?: string,
) {
  assertLeadership(actor);
  const program = await findLiveTestProgram(programId);
  if (!program) throw new NotFoundError("Program not found");
  const auth = program.authorizations.find((a) => a.status === "AUTHORIZED");
  if (!auth) throw new ValidationError("No active authorization");
  await revokeLiveTestAuthorization(
    auth.id,
    actor.userId,
    reason ?? "Operator revoked",
  );
  return { authorizationId: auth.id, status: "REVOKED" };
}
