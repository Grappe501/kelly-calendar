import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { campaignRevisionContentHash } from "@/lib/missions/v21/communications/campaigns";

const SCOPE = "KELLY";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function listCampaigns() {
  return prisma.communicationCampaign.findMany({
    where: { campaignScopeKey: SCOPE },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" }, take: 3 },
      runs: { orderBy: { runNumber: "desc" }, take: 3 },
      authorizations: { orderBy: { createdAt: "desc" }, take: 2 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createCampaign(data: {
  campaignKey: string;
  name: string;
  description?: string | null;
  purpose?: string | null;
  channel: "EMAIL" | "SMS";
  campaignType:
    | "MISSION"
    | "EVENT"
    | "FOLLOW_UP"
    | "VOLUNTEER"
    | "RELATIONSHIP"
    | "INTERNAL"
    | "TEST_ONLY"
    | "GENERAL_OUTREACH";
  compositionId?: string | null;
  approvedCompositionRevisionId?: string | null;
  recipientManifestId?: string | null;
  providerKey?: string;
  providerMode?: string;
  timezone?: string;
  missionId?: string | null;
  eventId?: string | null;
  createdByUserId: string | null;
}) {
  return prisma.communicationCampaign.create({
    data: {
      campaignScopeKey: SCOPE,
      campaignKey: data.campaignKey,
      name: data.name,
      description: data.description ?? null,
      purpose: data.purpose ?? null,
      channel: data.channel,
      campaignType: data.campaignType,
      compositionId: data.compositionId ?? null,
      approvedCompositionRevisionId: data.approvedCompositionRevisionId ?? null,
      recipientManifestId: data.recipientManifestId ?? null,
      providerKey: data.providerKey ?? "kccc-sandbox",
      providerMode: data.providerMode ?? "SANDBOX",
      timezone: data.timezone ?? "America/Chicago",
      missionId: data.missionId ?? null,
      eventId: data.eventId ?? null,
      status: "DRAFT",
      createdByUserId: data.createdByUserId,
      ownerUserId: data.createdByUserId,
    },
  });
}

export async function findCampaign(id: string) {
  return prisma.communicationCampaign.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" } },
      executionPlans: { orderBy: { createdAt: "desc" }, take: 5 },
      scheduleExceptions: { orderBy: { createdAt: "desc" }, take: 10 },
      launchReviews: { orderBy: { createdAt: "desc" }, take: 5 },
      authorizations: { orderBy: { createdAt: "desc" }, take: 5 },
      runs: {
        orderBy: { runNumber: "desc" },
        take: 10,
        include: { batches: { orderBy: { batchNumber: "asc" } } },
      },
      completionReports: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
}

export async function createCampaignRevision(data: {
  campaignId: string;
  compositionRevisionId: string | null;
  recipientManifestId: string | null;
  providerKey: string;
  providerMode: string;
  channel: "EMAIL" | "SMS";
  timezone: string;
  purpose: string | null;
  compositionId: string | null;
  changeSummary?: string | null;
  createdByUserId: string | null;
  scheduleSnapshot?: unknown;
  ratePolicySnapshot?: unknown;
  retryPolicySnapshot?: unknown;
}) {
  const latest = await prisma.communicationCampaignRevision.findFirst({
    where: { campaignId: data.campaignId },
    orderBy: { revisionNumber: "desc" },
  });
  const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
  const contentHash = campaignRevisionContentHash({
    channel: data.channel,
    compositionId: data.compositionId,
    compositionRevisionId: data.compositionRevisionId,
    recipientManifestId: data.recipientManifestId,
    providerKey: data.providerKey,
    providerMode: data.providerMode,
    timezone: data.timezone,
    purpose: data.purpose,
  });
  return prisma.communicationCampaignRevision.create({
    data: {
      campaignId: data.campaignId,
      revisionNumber,
      status: "DRAFT",
      compositionRevisionId: data.compositionRevisionId,
      recipientManifestId: data.recipientManifestId,
      providerKey: data.providerKey,
      providerMode: data.providerMode,
      contentHash,
      changeSummary: data.changeSummary ?? null,
      createdByUserId: data.createdByUserId,
      configurationSnapshotJson: toJson({
        channel: data.channel,
        compositionId: data.compositionId,
        compositionRevisionId: data.compositionRevisionId,
        recipientManifestId: data.recipientManifestId,
        providerKey: data.providerKey,
        providerMode: data.providerMode,
        timezone: data.timezone,
        purpose: data.purpose,
      }),
      scheduleSnapshotJson: toJson(data.scheduleSnapshot ?? {}),
      ratePolicySnapshotJson: toJson(data.ratePolicySnapshot ?? {}),
      retryPolicySnapshotJson: toJson(data.retryPolicySnapshot ?? {}),
    },
  });
}

export async function setCampaignRevisionStatus(
  id: string,
  status: "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED",
) {
  return prisma.communicationCampaignRevision.update({
    where: { id },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      supersededAt: status === "SUPERSEDED" ? new Date() : undefined,
    },
  });
}

export async function createExecutionPlan(data: {
  campaignId: string;
  campaignRevisionId: string;
  executionMode: "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX";
  timezone: string;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
  maximumRecipients?: number;
  maximumBatchSize?: number;
  maximumAttemptsPerRun?: number;
  maximumAttemptsPerHour?: number;
  minimumDelayBetweenBatchesSeconds?: number;
  createdByUserId: string | null;
}) {
  return prisma.communicationExecutionPlan.create({
    data: {
      campaignId: data.campaignId,
      campaignRevisionId: data.campaignRevisionId,
      status: "DRAFT",
      executionMode: data.executionMode,
      timezone: data.timezone,
      scheduledStartAt: data.scheduledStartAt ?? null,
      scheduledEndAt: data.scheduledEndAt ?? null,
      maximumRecipients: data.maximumRecipients ?? 25,
      maximumBatchSize: data.maximumBatchSize ?? 5,
      maximumAttemptsPerRun: data.maximumAttemptsPerRun ?? 25,
      maximumAttemptsPerHour: data.maximumAttemptsPerHour ?? 25,
      minimumDelayBetweenBatchesSeconds:
        data.minimumDelayBetweenBatchesSeconds ?? 30,
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function setExecutionPlanStatus(
  id: string,
  status: "READY_FOR_REVIEW" | "APPROVED" | "REVOKED" | "SUPERSEDED",
) {
  return prisma.communicationExecutionPlan.update({
    where: { id },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
    },
  });
}

export async function createLaunchReview(data: {
  campaignId: string;
  campaignRevisionId: string;
  executionPlanId: string;
  status: "BLOCKED" | "READY" | "APPROVED";
  checks: Record<string, unknown>;
  blockingIssues: string[];
  warnings: string[];
  readinessHash: string;
  reviewedByUserId: string | null;
}) {
  return prisma.communicationLaunchReview.create({
    data: {
      campaignId: data.campaignId,
      campaignRevisionId: data.campaignRevisionId,
      executionPlanId: data.executionPlanId,
      status: data.status,
      compositionCheckJson: toJson(data.checks.composition ?? {}),
      audienceCheckJson: toJson(data.checks.audience ?? {}),
      consentCheckJson: toJson(data.checks.consent ?? {}),
      suppressionCheckJson: toJson(data.checks.suppression ?? {}),
      providerCheckJson: toJson(data.checks.provider ?? {}),
      scheduleCheckJson: toJson(data.checks.schedule ?? {}),
      volumeCheckJson: toJson(data.checks.volume ?? {}),
      complianceCheckJson: toJson(data.checks.compliance ?? {}),
      securityCheckJson: toJson(data.checks.security ?? {}),
      operatorChecklistJson: toJson(data.checks.operator ?? {}),
      blockingIssuesJson: toJson(data.blockingIssues),
      warningsJson: toJson(data.warnings),
      readinessHash: data.readinessHash,
      reviewedByUserId: data.reviewedByUserId,
      reviewedAt: new Date(),
      approvedAt: data.status === "APPROVED" ? new Date() : null,
    },
  });
}

export async function createLaunchAuthorization(data: {
  campaignId: string;
  campaignRevisionId: string;
  launchReviewId: string;
  authorizedMode: "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX";
  authorizedRecipientLimit: number;
  authorizedBatchLimit: number;
  authorizedStartAt: Date | null;
  authorizedEndAt: Date | null;
  authorizationHash: string;
  authorizedByUserId: string | null;
  authorizationNotes?: string | null;
}) {
  return prisma.communicationLaunchAuthorization.create({
    data: {
      campaignId: data.campaignId,
      campaignRevisionId: data.campaignRevisionId,
      launchReviewId: data.launchReviewId,
      decision: "AUTHORIZED",
      authorizedMode: data.authorizedMode,
      authorizedRecipientLimit: data.authorizedRecipientLimit,
      authorizedBatchLimit: data.authorizedBatchLimit,
      authorizedStartAt: data.authorizedStartAt,
      authorizedEndAt: data.authorizedEndAt,
      authorizationHash: data.authorizationHash,
      authorizedByUserId: data.authorizedByUserId,
      authorizationNotes: data.authorizationNotes ?? null,
    },
  });
}

export async function revokeLaunchAuthorization(
  id: string,
  revokedByUserId: string | null,
  reason: string,
) {
  return prisma.communicationLaunchAuthorization.update({
    where: { id },
    data: {
      decision: "REVOKED",
      revokedAt: new Date(),
      revokedByUserId,
      revocationReason: reason,
    },
  });
}

export async function createExecutionRun(data: {
  campaignId: string;
  campaignRevisionId: string;
  executionPlanId: string;
  launchAuthorizationId: string;
  mode: "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX";
  recipientTargetCount: number;
  createdByUserId: string | null;
}) {
  const latest = await prisma.communicationExecutionRun.findFirst({
    where: { campaignId: data.campaignId },
    orderBy: { runNumber: "desc" },
  });
  return prisma.communicationExecutionRun.create({
    data: {
      campaignId: data.campaignId,
      campaignRevisionId: data.campaignRevisionId,
      executionPlanId: data.executionPlanId,
      launchAuthorizationId: data.launchAuthorizationId,
      runNumber: (latest?.runNumber ?? 0) + 1,
      mode: data.mode,
      status: "PLANNED",
      recipientTargetCount: data.recipientTargetCount,
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findExecutionRun(id: string) {
  return prisma.communicationExecutionRun.findUnique({
    where: { id },
    include: {
      campaign: true,
      campaignRevision: true,
      executionPlan: true,
      launchAuthorization: true,
      batches: { orderBy: { batchNumber: "asc" } },
      completionReports: true,
    },
  });
}

export async function updateExecutionRun(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.communicationExecutionRun.update({
    where: { id },
    data: data as never,
  });
}

export async function createExecutionBatch(data: {
  runId: string;
  batchNumber: number;
  recipientStartIndex: number;
  recipientEndIndex: number;
  plannedCount: number;
  contentHash: string;
}) {
  return prisma.communicationExecutionBatch.create({
    data: {
      runId: data.runId,
      batchNumber: data.batchNumber,
      status: "PLANNED",
      recipientStartIndex: data.recipientStartIndex,
      recipientEndIndex: data.recipientEndIndex,
      plannedCount: data.plannedCount,
      contentHash: data.contentHash,
    },
  });
}

export async function findExecutionBatch(id: string) {
  return prisma.communicationExecutionBatch.findUnique({
    where: { id },
    include: {
      run: {
        include: {
          campaign: true,
          campaignRevision: true,
          executionPlan: true,
          launchAuthorization: true,
        },
      },
    },
  });
}

export async function updateExecutionBatch(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.communicationExecutionBatch.update({
    where: { id },
    data: data as never,
  });
}

export async function createCompletionReport(data: {
  campaignId: string;
  executionRunId: string;
  counts: Record<string, number>;
  summary: unknown;
  warnings: string[];
  blockingIssues: string[];
  evidenceHash: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdByUserId: string | null;
}) {
  return prisma.communicationCampaignCompletionReport.create({
    data: {
      campaignId: data.campaignId,
      executionRunId: data.executionRunId,
      status: "FINALIZED",
      manifestCount: data.counts.manifestCount ?? 0,
      attemptCount: data.counts.attemptCount ?? 0,
      preflightPassedCount: data.counts.preflightPassedCount ?? 0,
      preflightBlockedCount: data.counts.preflightBlockedCount ?? 0,
      providerAcceptedCount: data.counts.providerAcceptedCount ?? 0,
      deliveredCount: data.counts.deliveredCount ?? 0,
      bouncedCount: data.counts.bouncedCount ?? 0,
      complaintCount: data.counts.complaintCount ?? 0,
      failedCount: data.counts.failedCount ?? 0,
      unknownCount: data.counts.unknownCount ?? 0,
      suppressedDuringRunCount: data.counts.suppressedDuringRunCount ?? 0,
      consentChangedDuringRunCount:
        data.counts.consentChangedDuringRunCount ?? 0,
      retryCount: data.counts.retryCount ?? 0,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      durationSeconds:
        data.startedAt && data.completedAt
          ? Math.max(
              0,
              Math.round(
                (data.completedAt.getTime() - data.startedAt.getTime()) / 1000,
              ),
            )
          : null,
      summaryJson: toJson(data.summary),
      warningsJson: toJson(data.warnings),
      blockingIssuesJson: toJson(data.blockingIssues),
      evidenceHash: data.evidenceHash,
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function setCampaignStatus(
  id: string,
  status:
    | "DRAFT"
    | "CONFIGURING"
    | "READY_FOR_REVIEW"
    | "APPROVED"
    | "SCHEDULED"
    | "READY_TO_LAUNCH"
    | "RUNNING"
    | "PAUSED"
    | "COMPLETED"
    | "COMPLETED_WITH_WARNINGS"
    | "CANCELLED"
    | "FAILED"
    | "ARCHIVED",
) {
  return prisma.communicationCampaign.update({
    where: { id },
    data: { status },
  });
}

export async function findManifestForCampaign(manifestId: string) {
  return prisma.communicationRecipientManifest.findFirst({
    where: { id: manifestId, campaignScopeKey: SCOPE },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
}

export async function findCompositionRevision(id: string) {
  return prisma.communicationCompositionRevision.findUnique({
    where: { id },
    include: { composition: true },
  });
}
