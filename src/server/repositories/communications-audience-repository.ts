import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { criteriaContentHash } from "@/lib/missions/v21/communications/audiences";
import type { AudienceCriteriaDocument } from "@/lib/missions/v21/communications/audiences";

const SCOPE = "KELLY";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function listAudiences() {
  return prisma.communicationAudience.findMany({
    where: { campaignScopeKey: SCOPE },
    include: {
      definitions: { orderBy: { versionNumber: "desc" }, take: 3 },
      manifests: { orderBy: { createdAt: "desc" }, take: 3 },
      evaluations: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createAudience(data: {
  audienceKey: string;
  name: string;
  description?: string | null;
  audienceType:
    | "STATIC"
    | "DYNAMIC"
    | "MISSION"
    | "EVENT"
    | "RELATIONSHIP"
    | "INTERNAL"
    | "TEST_ONLY";
  channelScope: "EMAIL" | "SMS" | "MULTI_CHANNEL";
  purpose?: string | null;
  missionId?: string | null;
  eventId?: string | null;
  createdByUserId: string | null;
}) {
  return prisma.communicationAudience.create({
    data: {
      campaignScopeKey: SCOPE,
      audienceKey: data.audienceKey,
      name: data.name,
      description: data.description ?? null,
      audienceType: data.audienceType,
      channelScope: data.channelScope,
      purpose: data.purpose ?? null,
      missionId: data.missionId ?? null,
      eventId: data.eventId ?? null,
      status: "DRAFT",
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findAudience(id: string) {
  return prisma.communicationAudience.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: {
      definitions: { orderBy: { versionNumber: "desc" } },
      staticMembers: true,
      evaluations: { orderBy: { createdAt: "desc" }, take: 10 },
      manifests: { orderBy: { createdAt: "desc" }, take: 10 },
      approvals: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function addStaticMember(data: {
  audienceId: string;
  localPersonId: string;
  inclusionReason?: string | null;
  addedByUserId: string | null;
}) {
  if (data.localPersonId.includes("@") || data.localPersonId.includes("+")) {
    throw new Error("STATIC_MEMBER_MUST_BE_PERSON_ID_NOT_DESTINATION");
  }
  return prisma.communicationAudienceStaticMember.upsert({
    where: {
      audienceId_localPersonId: {
        audienceId: data.audienceId,
        localPersonId: data.localPersonId,
      },
    },
    create: {
      audienceId: data.audienceId,
      localPersonId: data.localPersonId,
      inclusionReason: data.inclusionReason ?? null,
      addedByUserId: data.addedByUserId,
    },
    update: {
      inclusionReason: data.inclusionReason ?? null,
    },
  });
}

export async function createSegmentDefinition(data: {
  audienceId: string;
  channel: "EMAIL" | "SMS";
  criteria: AudienceCriteriaDocument;
  evaluationLimit?: number;
  changeSummary?: string | null;
  createdByUserId: string | null;
}) {
  const latest = await prisma.communicationSegmentDefinition.findFirst({
    where: { audienceId: data.audienceId },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (latest?.versionNumber ?? 0) + 1;
  const contentHash = criteriaContentHash(data.criteria);
  return prisma.communicationSegmentDefinition.create({
    data: {
      audienceId: data.audienceId,
      versionNumber,
      status: "DRAFT",
      criteriaJson: toJson(data.criteria),
      channel: data.channel,
      evaluationLimit: data.evaluationLimit ?? 500,
      contentHash,
      changeSummary: data.changeSummary ?? null,
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findSegmentDefinition(id: string) {
  return prisma.communicationSegmentDefinition.findUnique({
    where: { id },
    include: { audience: true },
  });
}

export async function setSegmentDefinitionStatus(
  id: string,
  status: "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED",
  approvedByUserId?: string | null,
) {
  return prisma.communicationSegmentDefinition.update({
    where: { id },
    data: {
      status,
      approvedByUserId:
        status === "APPROVED" ? approvedByUserId ?? null : undefined,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      supersededAt: status === "SUPERSEDED" ? new Date() : undefined,
    },
  });
}

export async function createEvaluationRecord(data: {
  audienceId: string;
  segmentDefinitionId: string;
  evaluationType: "PREVIEW" | "REVIEW" | "MANIFEST" | "TEST";
  status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "COMPLETED_WITH_WARNINGS"
    | "BLOCKED"
    | "FAILED"
    | "CANCELLED";
  criteriaHash: string;
  sourceFingerprint: string;
  candidateCount: number;
  includedCount: number;
  excludedCount: number;
  duplicatePersonCount: number;
  duplicateDestinationCount: number;
  invalidDestinationCount: number;
  consentBlockedCount: number;
  suppressedCount: number;
  limitApplied: boolean;
  createdByUserId: string | null;
  startedAt: Date;
  completedAt: Date | null;
}) {
  return prisma.communicationAudienceEvaluation.create({
    data: {
      audienceId: data.audienceId,
      segmentDefinitionId: data.segmentDefinitionId,
      evaluationType: data.evaluationType,
      status: data.status,
      criteriaHash: data.criteriaHash,
      sourceFingerprint: data.sourceFingerprint,
      candidateCount: data.candidateCount,
      includedCount: data.includedCount,
      excludedCount: data.excludedCount,
      duplicatePersonCount: data.duplicatePersonCount,
      duplicateDestinationCount: data.duplicateDestinationCount,
      invalidDestinationCount: data.invalidDestinationCount,
      consentBlockedCount: data.consentBlockedCount,
      suppressedCount: data.suppressedCount,
      limitApplied: data.limitApplied,
      createdByUserId: data.createdByUserId,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      sourceAsOf: data.startedAt,
    },
  });
}

export async function createCandidates(
  evaluationId: string,
  rows: Array<{
    localPersonId: string | null;
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
    sourceFacts: unknown;
    resolvedContactPointId: string | null;
    destinationFingerprint: string | null;
    destinationMasked: string | null;
    consentSnapshot: unknown;
    suppressionSnapshot: unknown;
    deduplicationKey: string | null;
  }>,
) {
  if (rows.length === 0) return { count: 0 };
  await prisma.communicationAudienceCandidate.createMany({
    data: rows.map((r) => ({
      evaluationId,
      localPersonId: r.localPersonId,
      channel: r.channel,
      candidateStatus: r.candidateStatus,
      inclusionReasonsJson: toJson(r.inclusionReasons),
      exclusionReasonsJson: toJson(r.exclusionReasons),
      sourceFactsJson: toJson(r.sourceFacts),
      resolvedContactPointId: r.resolvedContactPointId,
      destinationFingerprint: r.destinationFingerprint,
      destinationMasked: r.destinationMasked,
      consentSnapshotJson: toJson(r.consentSnapshot),
      suppressionSnapshotJson: toJson(r.suppressionSnapshot),
      deduplicationKey: r.deduplicationKey,
    })),
  });
  return { count: rows.length };
}

export async function findEvaluation(id: string) {
  return prisma.communicationAudienceEvaluation.findUnique({
    where: { id },
    include: {
      audience: true,
      segmentDefinition: true,
      candidates: { orderBy: { createdAt: "asc" }, take: 500 },
      manifests: true,
    },
  });
}

export async function createManifest(data: {
  audienceId: string;
  evaluationId: string;
  segmentDefinitionId: string;
  channel: "EMAIL" | "SMS";
  recipientCount: number;
  manifestHash: string;
  criteriaHash: string;
  sourceFingerprint: string;
  createdByUserId: string | null;
  entries: Array<{
    localPersonId: string | null;
    contactPointId: string | null;
    channel: "EMAIL" | "SMS";
    destinationFingerprint: string;
    destinationMasked: string;
    recipientKey: string;
    personalizationSourceFingerprint: string;
    consentSnapshot: unknown;
    suppressionSnapshot: unknown;
    eligibilityReasons: string[];
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const manifest = await tx.communicationRecipientManifest.create({
      data: {
        campaignScopeKey: SCOPE,
        audienceId: data.audienceId,
        evaluationId: data.evaluationId,
        segmentDefinitionId: data.segmentDefinitionId,
        channel: data.channel,
        status: "DRAFT",
        recipientCount: data.recipientCount,
        manifestHash: data.manifestHash,
        criteriaHash: data.criteriaHash,
        sourceFingerprint: data.sourceFingerprint,
        consentPolicyVersion: "d20",
        suppressionPolicyVersion: "d20",
        createdByUserId: data.createdByUserId,
      },
    });
    if (data.entries.length > 0) {
      await tx.communicationRecipientManifestEntry.createMany({
        data: data.entries.map((e) => ({
          manifestId: manifest.id,
          localPersonId: e.localPersonId,
          contactPointId: e.contactPointId,
          channel: e.channel,
          destinationFingerprint: e.destinationFingerprint,
          destinationMasked: e.destinationMasked,
          recipientKey: e.recipientKey,
          personalizationSourceFingerprint: e.personalizationSourceFingerprint,
          consentSnapshotJson: toJson(e.consentSnapshot),
          suppressionSnapshotJson: toJson(e.suppressionSnapshot),
          eligibilityReasonsJson: toJson(e.eligibilityReasons),
        })),
      });
    }
    return tx.communicationRecipientManifest.findUniqueOrThrow({
      where: { id: manifest.id },
      include: { entries: true },
    });
  });
}

export async function findManifest(id: string) {
  return prisma.communicationRecipientManifest.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: {
      entries: true,
      audience: true,
      evaluation: true,
      segmentDefinition: true,
    },
  });
}

export async function setManifestStatus(
  id: string,
  status: "READY_FOR_REVIEW" | "APPROVED" | "REVOKED" | "EXPIRED",
  opts?: {
    approvedByUserId?: string | null;
    revocationReason?: string | null;
  },
) {
  return prisma.communicationRecipientManifest.update({
    where: { id },
    data: {
      status,
      approvedByUserId:
        status === "APPROVED" ? opts?.approvedByUserId ?? null : undefined,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      revokedAt: status === "REVOKED" ? new Date() : undefined,
      revocationReason:
        status === "REVOKED" ? opts?.revocationReason ?? null : undefined,
    },
  });
}

export async function createAudienceApproval(data: {
  audienceId: string;
  segmentDefinitionId?: string | null;
  evaluationId?: string | null;
  manifestId?: string | null;
  decision: "APPROVED" | "CHANGES_REQUESTED" | "REVOKED";
  reviewerUserId: string | null;
  reviewNotes?: string | null;
  criteriaHash?: string | null;
  manifestHash?: string | null;
  summarySnapshot?: unknown;
}) {
  return prisma.communicationAudienceApproval.create({
    data: {
      audienceId: data.audienceId,
      segmentDefinitionId: data.segmentDefinitionId ?? null,
      evaluationId: data.evaluationId ?? null,
      manifestId: data.manifestId ?? null,
      decision: data.decision,
      reviewerUserId: data.reviewerUserId,
      reviewNotes: data.reviewNotes ?? null,
      criteriaHash: data.criteriaHash ?? null,
      manifestHash: data.manifestHash ?? null,
      summarySnapshotJson: toJson(data.summarySnapshot ?? {}),
    },
  });
}
