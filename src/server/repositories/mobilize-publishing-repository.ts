import "server-only";
import { prisma } from "@/server/db/prisma";
import {
  MOBILIZE_CAMPAIGN_SCOPE,
  MOBILIZE_PROVIDER,
} from "@/features/mobilize-integration/docs-revision";

export async function findPublicationByEventId(eventId: string) {
  return prisma.externalPublication.findUnique({
    where: {
      campaignScopeKey_provider_localObjectType_localObjectId: {
        campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
        provider: MOBILIZE_PROVIDER,
        localObjectType: "Event",
        localObjectId: eventId,
      },
    },
    include: {
      approvals: { orderBy: { createdAt: "desc" }, take: 10 },
      attempts: { orderBy: { startedAt: "desc" }, take: 20 },
    },
  });
}

export async function listPublications(limit = 50) {
  return prisma.externalPublication.findMany({
    where: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function listConflictPublications() {
  return prisma.externalPublication.findMany({
    where: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      OR: [
        { status: "CONFLICT" },
        { status: "UNKNOWN_REMOTE_OUTCOME" },
        { conflictState: { not: "NONE" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertPublicationDraft(input: {
  eventId: string;
  mappingVersion: string;
  localFingerprint: string;
  proposedPayloadFingerprint: string | null;
  targetOrganizationId: string | null;
  status:
    | "DRAFT"
    | "PREVIEWED"
    | "AWAITING_APPROVAL"
    | "APPROVED"
    | "PUBLISHING"
    | "PUBLISHED"
    | "LOCALLY_CHANGED"
    | "REMOTELY_CHANGED"
    | "CONFLICT"
    | "REMOTE_DELETED"
    | "UNKNOWN_REMOTE_OUTCOME"
    | "FAILED"
    | "RECONCILED"
    | "CANCELLED_LOCAL";
  actorUserId?: string | null;
  conflictState?:
    | "NONE"
    | "DETECTED"
    | "RESOLVED_LOCAL"
    | "RESOLVED_REMOTE"
    | "MANUAL_REQUIRED";
  remoteOutcome?: "NONE" | "SUCCESS" | "FAILED" | "UNKNOWN" | "RECONCILED";
  externalObjectReferenceId?: string | null;
  lastSyncedBaseFingerprint?: string | null;
  remoteFingerprint?: string | null;
  mobilizeBrowserUrl?: string | null;
  lastPublishedAt?: Date | null;
}) {
  const existing = await prisma.externalPublication.findUnique({
    where: {
      campaignScopeKey_provider_localObjectType_localObjectId: {
        campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
        provider: MOBILIZE_PROVIDER,
        localObjectType: "Event",
        localObjectId: input.eventId,
      },
    },
  });
  const data = {
    mappingVersion: input.mappingVersion,
    localFingerprint: input.localFingerprint,
    proposedPayloadFingerprint: input.proposedPayloadFingerprint,
    targetOrganizationId: input.targetOrganizationId,
    status: input.status,
    conflictState: input.conflictState ?? "NONE",
    remoteOutcome: input.remoteOutcome ?? "NONE",
    externalObjectReferenceId: input.externalObjectReferenceId,
    lastSyncedBaseFingerprint: input.lastSyncedBaseFingerprint,
    remoteFingerprint: input.remoteFingerprint,
    mobilizeBrowserUrl: input.mobilizeBrowserUrl,
    lastPublishedAt: input.lastPublishedAt,
    updatedByUserId: input.actorUserId ?? null,
  };
  if (existing) {
    return prisma.externalPublication.update({
      where: { id: existing.id },
      data: data as never,
    });
  }
  return prisma.externalPublication.create({
    data: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      localObjectType: "Event",
      localObjectId: input.eventId,
      createdByUserId: input.actorUserId ?? null,
      ...(data as object),
    } as never,
  });
}

export async function createPublicationApproval(input: {
  publicationId: string;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "REFRESH";
  localFingerprint: string;
  payloadFingerprint: string;
  mappingVersion: string;
  targetOrganizationId: string;
  approvedByUserId: string;
  expiresAt?: Date | null;
  reason?: string | null;
}) {
  await prisma.externalPublicationApproval.updateMany({
    where: {
      publicationId: input.publicationId,
      state: "ACTIVE",
      actionType: input.actionType,
    },
    data: { state: "SUPERSEDED" },
  });
  return prisma.externalPublicationApproval.create({
    data: {
      publicationId: input.publicationId,
      actionType: input.actionType,
      localFingerprint: input.localFingerprint,
      payloadFingerprint: input.payloadFingerprint,
      mappingVersion: input.mappingVersion,
      targetOrganizationId: input.targetOrganizationId,
      approvedByUserId: input.approvedByUserId,
      expiresAt: input.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      reason: input.reason ?? null,
      state: "ACTIVE",
    },
  });
}

export async function findActiveApproval(publicationId: string, actionType: "CREATE" | "UPDATE") {
  return prisma.externalPublicationApproval.findFirst({
    where: {
      publicationId,
      actionType,
      state: "ACTIVE",
    },
    orderBy: { approvedAt: "desc" },
  });
}

export async function consumeApproval(approvalId: string) {
  return prisma.externalPublicationApproval.update({
    where: { id: approvalId },
    data: { state: "CONSUMED" },
  });
}

export async function findAttemptByIdempotencyKey(idempotencyKey: string) {
  return prisma.externalPublicationAttempt.findUnique({
    where: { idempotencyKey },
  });
}

export async function createPublicationAttempt(input: {
  publicationId: string;
  syncRunId?: string | null;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "REFRESH";
  idempotencyKey: string;
  actorUserId?: string | null;
  mappingVersion: string;
  requestCorrelationId?: string | null;
}) {
  return prisma.externalPublicationAttempt.create({
    data: {
      publicationId: input.publicationId,
      syncRunId: input.syncRunId ?? null,
      actionType: input.actionType,
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId ?? null,
      mappingVersion: input.mappingVersion,
      requestCorrelationId: input.requestCorrelationId ?? null,
      status: "STARTED",
    },
  });
}

export async function completePublicationAttempt(
  attemptId: string,
  patch: {
    status: "SUCCEEDED" | "FAILED" | "UNKNOWN_OUTCOME" | "CANCELLED";
    responseClass?: string | null;
    remoteObjectId?: string | null;
    errorCategory?: string | null;
    unknownOutcome?: boolean;
    redactedSummary?: string | null;
  },
) {
  return prisma.externalPublicationAttempt.update({
    where: { id: attemptId },
    data: {
      status: patch.status,
      responseClass: patch.responseClass ?? null,
      remoteObjectId: patch.remoteObjectId ?? null,
      errorCategory: patch.errorCategory ?? null,
      unknownOutcome: patch.unknownOutcome ?? false,
      redactedSummary: patch.redactedSummary ?? null,
      completedAt: new Date(),
    },
  });
}

export async function loadEventForPublish(eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId },
  });
}

export async function findMobilizeEventReference(eventId: string) {
  return prisma.externalObjectReference.findFirst({
    where: {
      provider: MOBILIZE_PROVIDER,
      objectType: "EVENT",
      localObjectType: "Event",
      localObjectId: eventId,
      remoteDeletedAt: null,
      archivedAt: null,
    },
  });
}
