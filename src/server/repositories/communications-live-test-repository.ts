import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { liveTestRevisionHash } from "@/lib/missions/v21/communications/live-tests";

const SCOPE = "KELLY";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function listLiveTestPrograms() {
  return prisma.communicationLiveTestProgram.findMany({
    where: { campaignScopeKey: SCOPE },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" }, take: 2 },
      authorizations: { orderBy: { createdAt: "desc" }, take: 2 },
      executions: { orderBy: { createdAt: "desc" }, take: 2 },
      recipients: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createLiveTestProgram(data: {
  programKey: string;
  name: string;
  channel: "EMAIL" | "SMS";
  providerKey?: string;
  purpose?: string | null;
  description?: string | null;
  createdByUserId: string | null;
}) {
  return prisma.communicationLiveTestProgram.create({
    data: {
      campaignScopeKey: SCOPE,
      programKey: data.programKey,
      name: data.name,
      channel: data.channel,
      providerKey: data.providerKey ?? "kccc-sandbox",
      providerState: "SANDBOX_ONLY",
      status: "DRAFT",
      purpose: data.purpose ?? null,
      description: data.description ?? null,
      createdByUserId: data.createdByUserId,
      ownerUserId: data.createdByUserId,
    },
  });
}

export async function findLiveTestProgram(id: string) {
  return prisma.communicationLiveTestProgram.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" } },
      readinessChecks: { orderBy: { createdAt: "desc" }, take: 30 },
      recipients: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, take: 5 },
      authorizations: { orderBy: { createdAt: "desc" }, take: 5 },
      executions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { evidence: true, safetyVerification: true },
      },
      postReviews: { orderBy: { createdAt: "desc" }, take: 3 },
      incidents: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function setProgramStatus(
  id: string,
  status:
    | "DRAFT"
    | "CONFIGURING"
    | "READINESS_REVIEW"
    | "READY_FOR_AUTHORIZATION"
    | "AUTHORIZED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "COMPLETED_WITH_WARNINGS"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "ARCHIVED",
) {
  return prisma.communicationLiveTestProgram.update({
    where: { id },
    data: { status },
  });
}

export async function setProviderState(
  id: string,
  providerState:
    | "DISABLED"
    | "SANDBOX_ONLY"
    | "LIVE_TEST_READY"
    | "PRODUCTION_READY_FUTURE"
    | "REVOKED",
) {
  return prisma.communicationLiveTestProgram.update({
    where: { id },
    data: { providerState },
  });
}

export async function createLiveTestRevision(data: {
  programId: string;
  channel: "EMAIL" | "SMS";
  providerKey: string;
  senderProfileKey?: string | null;
  domainIdentityKey?: string | null;
  compositionId?: string | null;
  compositionRevisionId?: string | null;
  renderArtifactId?: string | null;
  recipientAllowlistEntryId?: string | null;
  changeSummary?: string | null;
  createdByUserId: string | null;
}) {
  const latest = await prisma.communicationLiveTestRevision.findFirst({
    where: { programId: data.programId },
    orderBy: { revisionNumber: "desc" },
  });
  const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
  const contentHash = liveTestRevisionHash({
    channel: data.channel,
    providerKey: data.providerKey,
    senderProfileKey: data.senderProfileKey ?? null,
    domainIdentityKey: data.domainIdentityKey ?? null,
    compositionRevisionId: data.compositionRevisionId ?? null,
    renderArtifactId: data.renderArtifactId ?? null,
    recipientAllowlistEntryId: data.recipientAllowlistEntryId ?? null,
  });
  return prisma.communicationLiveTestRevision.create({
    data: {
      programId: data.programId,
      revisionNumber,
      status: "DRAFT",
      channel: data.channel,
      providerKey: data.providerKey,
      senderProfileKey: data.senderProfileKey ?? null,
      domainIdentityKey: data.domainIdentityKey ?? null,
      compositionId: data.compositionId ?? null,
      compositionRevisionId: data.compositionRevisionId ?? null,
      renderArtifactId: data.renderArtifactId ?? null,
      recipientAllowlistEntryId: data.recipientAllowlistEntryId ?? null,
      contentHash,
      changeSummary: data.changeSummary ?? null,
      createdByUserId: data.createdByUserId,
      configurationSnapshotJson: toJson({
        channel: data.channel,
        providerKey: data.providerKey,
        senderProfileKey: data.senderProfileKey ?? null,
        domainIdentityKey: data.domainIdentityKey ?? null,
        renderArtifactId: data.renderArtifactId ?? null,
        recipientAllowlistEntryId: data.recipientAllowlistEntryId ?? null,
      }),
    },
  });
}

export async function setRevisionStatus(
  id: string,
  status: "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED",
) {
  return prisma.communicationLiveTestRevision.update({
    where: { id },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      supersededAt: status === "SUPERSEDED" ? new Date() : undefined,
    },
  });
}

export async function upsertReadinessCheck(data: {
  programId: string;
  programRevisionId?: string | null;
  checkType:
    | "PROVIDER_AUTHENTICATION"
    | "PROVIDER_PRODUCTION_CAPABILITY"
    | "SENDER_IDENTITY"
    | "SENDING_DOMAIN"
    | "SPF"
    | "DKIM"
    | "DMARC"
    | "WEBHOOK_ENDPOINT"
    | "WEBHOOK_SIGNATURE"
    | "WEBHOOK_EVENT_NORMALIZATION"
    | "SUPPRESSION_SYNC"
    | "PROVIDER_HEALTH"
    | "EMERGENCY_STOP";
  status: "VERIFIED" | "WARNING" | "BLOCKED" | "EXPIRED" | "PENDING";
  evidence: unknown;
  evidenceHash: string;
  verifiedByUserId: string | null;
  failureReason?: string | null;
  expiresAt?: Date | null;
}) {
  return prisma.communicationProductionReadinessCheck.create({
    data: {
      programId: data.programId,
      programRevisionId: data.programRevisionId ?? null,
      checkType: data.checkType,
      status: data.status,
      evidenceJson: toJson(data.evidence),
      evidenceHash: data.evidenceHash,
      verifiedAt: data.status === "VERIFIED" ? new Date() : null,
      expiresAt: data.expiresAt ?? null,
      verifiedByUserId: data.verifiedByUserId,
      failureReason: data.failureReason ?? null,
    },
  });
}

export async function createLiveTestRecipient(data: {
  programId: string;
  channel: "EMAIL" | "SMS";
  destinationFingerprint: string;
  destinationMasked: string;
  localPersonId?: string | null;
  relationshipToCampaign?: string | null;
  ownershipMethod?:
    | "OPERATOR_ATTESTATION"
    | "CAMPAIGN_CONTROLLED_DESTINATION"
    | null;
  ownershipAttestation?: unknown;
  addedByUserId: string | null;
}) {
  return prisma.communicationLiveTestRecipient.create({
    data: {
      programId: data.programId,
      channel: data.channel,
      destinationFingerprint: data.destinationFingerprint,
      destinationMasked: data.destinationMasked,
      localPersonId: data.localPersonId ?? null,
      relationshipToCampaign: data.relationshipToCampaign ?? null,
      status: "DRAFT",
      ownershipVerificationMethod: data.ownershipMethod ?? null,
      ownershipAttestationJson: toJson(data.ownershipAttestation ?? {}),
      addedByUserId: data.addedByUserId,
    },
  });
}

export async function updateLiveTestRecipient(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.communicationLiveTestRecipient.update({
    where: { id },
    data: data as never,
  });
}

export async function countApprovedRecipients(programId: string) {
  return prisma.communicationLiveTestRecipient.count({
    where: { programId, status: "APPROVED", revokedAt: null },
  });
}

export async function createReadinessReview(data: {
  programId: string;
  programRevisionId: string;
  status: "BLOCKED" | "READY" | "APPROVED";
  checks: Record<string, unknown>;
  blockingIssues: string[];
  warnings: string[];
  readinessHash: string;
  reviewedByUserId: string | null;
}) {
  return prisma.communicationLiveTestReadinessReview.create({
    data: {
      programId: data.programId,
      programRevisionId: data.programRevisionId,
      status: data.status,
      providerChecksJson: toJson(data.checks.provider ?? {}),
      senderChecksJson: toJson(data.checks.sender ?? {}),
      domainChecksJson: toJson(data.checks.domain ?? {}),
      webhookChecksJson: toJson(data.checks.webhook ?? {}),
      recipientChecksJson: toJson(data.checks.recipient ?? {}),
      consentChecksJson: toJson(data.checks.consent ?? {}),
      artifactChecksJson: toJson(data.checks.artifact ?? {}),
      dispatchChecksJson: toJson(data.checks.dispatch ?? {}),
      securityChecksJson: toJson(data.checks.security ?? {}),
      operatorChecklistJson: toJson(data.checks.operator ?? {}),
      blockingIssuesJson: toJson(data.blockingIssues),
      warningsJson: toJson(data.warnings),
      readinessHash: data.readinessHash,
      reviewedByUserId: data.reviewedByUserId,
      reviewedAt: new Date(),
      approvedAt: data.status === "APPROVED" ? new Date() : null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

export async function createLiveTestAuthorization(data: {
  programId: string;
  programRevisionId: string;
  readinessReviewId: string;
  providerKey: string;
  senderProfileKey: string | null;
  renderArtifactId: string;
  recipientId: string;
  destinationFingerprint: string;
  channel: "EMAIL" | "SMS";
  authorizationHash: string;
  authorizationPhraseHash: string;
  authorizedByUserId: string | null;
  authorizationNotes?: string | null;
  authorizedStartAt: Date;
  authorizedEndAt: Date;
}) {
  return prisma.communicationLiveTestAuthorization.create({
    data: {
      programId: data.programId,
      programRevisionId: data.programRevisionId,
      readinessReviewId: data.readinessReviewId,
      status: "AUTHORIZED",
      providerKey: data.providerKey,
      senderProfileKey: data.senderProfileKey,
      renderArtifactId: data.renderArtifactId,
      recipientId: data.recipientId,
      destinationFingerprint: data.destinationFingerprint,
      channel: data.channel,
      maximumRecipients: 1,
      maximumAttempts: 1,
      maximumProviderRequests: 1,
      manualLaunchOnly: true,
      retriesAllowed: false,
      authorizationHash: data.authorizationHash,
      authorizationPhraseHash: data.authorizationPhraseHash,
      authorizedByUserId: data.authorizedByUserId,
      authorizationNotes: data.authorizationNotes ?? null,
      authorizedStartAt: data.authorizedStartAt,
      authorizedEndAt: data.authorizedEndAt,
    },
  });
}

export async function consumeAuthorization(
  id: string,
  attemptId: string,
) {
  return prisma.communicationLiveTestAuthorization.updateMany({
    where: { id, status: "AUTHORIZED", consumedAt: null },
    data: {
      status: "CONSUMED",
      consumedAt: new Date(),
      consumedByAttemptId: attemptId,
    },
  });
}

export async function revokeLiveTestAuthorization(
  id: string,
  revokedByUserId: string | null,
  reason: string,
) {
  return prisma.communicationLiveTestAuthorization.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByUserId,
      revocationReason: reason,
    },
  });
}

export async function createLiveTestExecution(data: {
  programId: string;
  programRevisionId: string;
  authorizationId: string;
  providerKey: string;
  channel: "EMAIL" | "SMS";
  recipientId: string;
  destinationFingerprint: string;
  renderArtifactId: string;
  createdByUserId: string | null;
}) {
  return prisma.communicationLiveTestExecution.create({
    data: {
      programId: data.programId,
      programRevisionId: data.programRevisionId,
      authorizationId: data.authorizationId,
      status: "READY",
      providerKey: data.providerKey,
      channel: data.channel,
      recipientId: data.recipientId,
      destinationFingerprint: data.destinationFingerprint,
      renderArtifactId: data.renderArtifactId,
      createdByUserId: data.createdByUserId,
      startedAt: new Date(),
    },
  });
}

export async function updateLiveTestExecution(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.communicationLiveTestExecution.update({
    where: { id },
    data: data as never,
  });
}

export async function createPostTestSafety(data: {
  executionId: string;
  snapshot: Record<string, unknown>;
  evidenceHash: string;
  authorizationConsumed: boolean;
  failedClosed: boolean;
  verifiedByUserId: string | null;
}) {
  return prisma.communicationPostTestSafetyVerification.create({
    data: {
      executionId: data.executionId,
      productionDispatchFlagBlocked: true,
      productionCampaignModeBlocked: true,
      authorizationConsumed: data.authorizationConsumed,
      scheduledIngressBlocked: true,
      audienceDispatchBlocked: true,
      killSwitchesActive: true,
      verificationSnapshotJson: toJson(data.snapshot),
      evidenceHash: data.evidenceHash,
      failedClosed: data.failedClosed,
      verifiedByUserId: data.verifiedByUserId,
    },
  });
}

export async function createLiveTestEvidence(data: {
  executionId: string;
  summary: unknown;
  evidenceHash: string;
  finalState:
    | "DELIVERED"
    | "FAILED"
    | "BOUNCED"
    | "COMPLAINT"
    | "SUPPRESSED"
    | "UNKNOWN"
    | "PARTIAL_EVIDENCE";
  flags: Partial<{
    providerAuthenticationVerified: boolean;
    senderIdentityVerified: boolean;
    domainVerified: boolean;
    webhookSignatureVerified: boolean;
    providerSubmissionObserved: boolean;
    providerAcceptanceObserved: boolean;
    deliveryObserved: boolean;
  }>;
  finalizedByUserId: string | null;
}) {
  return prisma.communicationLiveTestEvidence.create({
    data: {
      executionId: data.executionId,
      ...data.flags,
      finalState: data.finalState,
      evidenceSummaryJson: toJson(data.summary),
      evidenceHash: data.evidenceHash,
      finalizedAt: new Date(),
      finalizedByUserId: data.finalizedByUserId,
    },
  });
}

export async function createLiveTestIncident(data: {
  programId: string;
  executionId?: string | null;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  incidentType: string;
  summary: string;
  evidence?: unknown;
  createdByUserId: string | null;
}) {
  return prisma.communicationLiveTestIncident.create({
    data: {
      programId: data.programId,
      executionId: data.executionId ?? null,
      severity: data.severity,
      incidentType: data.incidentType,
      summary: data.summary,
      evidenceJson: toJson(data.evidence ?? {}),
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function createPostReview(data: {
  programId: string;
  executionId: string;
  evidenceHash: string;
  reviewedByUserId: string | null;
  lessonsLearned?: string | null;
  recommendedNextStep?: string | null;
  productionBlockReview: unknown;
}) {
  return prisma.communicationLiveTestPostReview.create({
    data: {
      programId: data.programId,
      executionId: data.executionId,
      status: "COMPLETED",
      productionBlockReviewJson: toJson(data.productionBlockReview),
      lessonsLearned: data.lessonsLearned ?? null,
      recommendedNextStep:
        data.recommendedNextStep ??
        "Remain at Level 0/1 — general production dispatch blocked. Consider D27 only after evidence review.",
      reviewedByUserId: data.reviewedByUserId,
      approvedByUserId: data.reviewedByUserId,
      completedAt: new Date(),
      evidenceHash: data.evidenceHash,
    },
  });
}
