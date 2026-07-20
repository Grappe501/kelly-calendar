import "server-only";
import { prisma } from "@/server/db/prisma";
import { MOBILIZE_CAMPAIGN_SCOPE, MOBILIZE_PROVIDER } from "@/features/mobilize-integration/docs-revision";

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

export async function findMobilizeConnection(campaignScopeKey = MOBILIZE_CAMPAIGN_SCOPE) {
  return prisma.externalIntegrationConnection.findFirst({
    where: { campaignScopeKey, provider: MOBILIZE_PROVIDER },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertMobilizeConnection(input: {
  campaignScopeKey?: string;
  externalOrganizationId: string;
  organizationName?: string | null;
  organizationSlug?: string | null;
  status: string;
  lastVerifiedAt?: Date | null;
  lastSuccessfulConnectionAt?: Date | null;
  lastErrorCode?: string | null;
  lastErrorCategory?: string | null;
  lastErrorSummary?: string | null;
  capabilityJson?: unknown;
  enabledImportScopesJson?: unknown;
  actorUserId?: string | null;
}) {
  const campaignScopeKey = input.campaignScopeKey ?? MOBILIZE_CAMPAIGN_SCOPE;
  const existing = await prisma.externalIntegrationConnection.findUnique({
    where: {
      campaignScopeKey_provider_externalOrganizationId: {
        campaignScopeKey,
        provider: MOBILIZE_PROVIDER,
        externalOrganizationId: input.externalOrganizationId,
      },
    },
  });
  const data = {
    organizationName: input.organizationName ?? null,
    organizationSlug: input.organizationSlug ?? null,
    status: input.status as never,
    lastVerifiedAt: input.lastVerifiedAt ?? undefined,
    lastSuccessfulConnectionAt: input.lastSuccessfulConnectionAt ?? undefined,
    lastErrorCode: input.lastErrorCode ?? null,
    lastErrorCategory: input.lastErrorCategory ?? null,
    lastErrorSummary: input.lastErrorSummary ?? null,
    capabilityJson: (input.capabilityJson ?? {}) as object,
    enabledImportScopesJson: (input.enabledImportScopesJson ?? []) as object,
    outboundWritesEnabled: false,
    updatedByUserId: input.actorUserId ?? null,
  };
  if (existing) {
    return prisma.externalIntegrationConnection.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.externalIntegrationConnection.create({
    data: {
      campaignScopeKey,
      provider: MOBILIZE_PROVIDER,
      externalOrganizationId: input.externalOrganizationId,
      createdByUserId: input.actorUserId ?? null,
      ...data,
    },
  });
}

export async function createSyncRun(input: {
  connectionId?: string | null;
  objectScope: string;
  mode: "DRY_RUN" | "APPLY";
  requestedByUserId?: string | null;
  documentationRevision?: string | null;
  adapterVersion?: string | null;
}) {
  return prisma.externalSyncRun.create({
    data: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      connectionId: input.connectionId ?? null,
      direction: "IMPORT_ONLY",
      objectScope: input.objectScope,
      mode: input.mode,
      status: "RUNNING",
      requestedByUserId: input.requestedByUserId ?? null,
      documentationRevision: input.documentationRevision ?? null,
      adapterVersion: input.adapterVersion ?? null,
    },
  });
}

export async function completeSyncRun(
  runId: string,
  patch: Record<string, unknown>,
) {
  return prisma.externalSyncRun.update({
    where: { id: runId },
    data: {
      ...patch,
      completedAt: new Date(),
      status: (patch.status as never) ?? "COMPLETED",
    },
  });
}

export async function createSyncCandidates(
  runId: string,
  candidates: Array<{
    externalObjectType: string;
    externalObjectId: string;
    proposedLocalObjectType?: string | null;
    proposedLocalObjectId?: string | null;
    action: string;
    conflictState?: string;
    comparisonFingerprint?: string | null;
    changeSummary?: string | null;
  }>,
) {
  if (!candidates.length) return [];
  await prisma.externalSyncCandidate.createMany({
    data: candidates.map((c) => ({
      syncRunId: runId,
      provider: MOBILIZE_PROVIDER,
      externalObjectType: c.externalObjectType as never,
      externalObjectId: c.externalObjectId,
      proposedLocalObjectType: c.proposedLocalObjectType ?? null,
      proposedLocalObjectId: c.proposedLocalObjectId ?? null,
      action: c.action as never,
      conflictState: (c.conflictState as never) ?? "NONE",
      comparisonFingerprint: c.comparisonFingerprint ?? null,
      changeSummary: c.changeSummary ?? null,
    })),
  });
  return prisma.externalSyncCandidate.findMany({ where: { syncRunId: runId } });
}

export async function listSyncRuns(limit = 20) {
  return prisma.externalSyncRun.findMany({
    where: { campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE, provider: MOBILIZE_PROVIDER },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function getSyncRun(runId: string) {
  return prisma.externalSyncRun.findFirst({
    where: {
      id: runId,
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
    },
    include: { candidates: true },
  });
}

export async function findMobilizeExternalRefs() {
  const rows = await prisma.externalObjectReference.findMany({
    where: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      objectType: "EVENT",
    },
  });
  return rows.map((r) => ({
    externalObjectId: r.externalObjectId,
    localObjectType: r.localObjectType,
    localObjectId: r.localObjectId,
    contentFingerprint: r.contentFingerprint,
    remoteDeletedAt: iso(r.remoteDeletedAt),
  }));
}

export async function upsertExternalEventReference(input: {
  externalObjectId: string;
  contentFingerprint: string;
  remoteCreatedAt?: string | null;
  remoteUpdatedAt?: string | null;
  remoteDeletedAt?: string | null;
  localObjectType?: string | null;
  localObjectId?: string | null;
  actorUserId?: string | null;
  now: Date;
}) {
  const existing = await prisma.externalObjectReference.findUnique({
    where: {
      campaignScopeKey_provider_objectType_externalObjectId: {
        campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
        provider: MOBILIZE_PROVIDER,
        objectType: "EVENT",
        externalObjectId: input.externalObjectId,
      },
    },
  });
  const data = {
    contentFingerprint: input.contentFingerprint,
    remoteCreatedAt: input.remoteCreatedAt ? new Date(input.remoteCreatedAt) : null,
    remoteUpdatedAt: input.remoteUpdatedAt ? new Date(input.remoteUpdatedAt) : null,
    remoteDeletedAt: input.remoteDeletedAt ? new Date(input.remoteDeletedAt) : null,
    localObjectType: input.localObjectType ?? existing?.localObjectType ?? null,
    localObjectId: input.localObjectId ?? existing?.localObjectId ?? null,
    lastObservedAt: input.now,
    lastSuccessfulSyncAt: input.now,
    lastAttemptAt: input.now,
    syncDirection: "IMPORT_ONLY" as const,
    syncStatus: "ACTIVE" as const,
    provenance: "IMPORT" as const,
    updatedByUserId: input.actorUserId ?? null,
  };
  if (existing) {
    return prisma.externalObjectReference.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.externalObjectReference.create({
    data: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      objectType: "EVENT",
      externalObjectId: input.externalObjectId,
      createdByUserId: input.actorUserId ?? null,
      ...data,
    },
  });
}

export async function updateCandidateDisposition(input: {
  candidateId: string;
  disposition: string;
  actorUserId: string;
  now: Date;
  errorCode?: string | null;
  errorSummary?: string | null;
}) {
  return prisma.externalSyncCandidate.update({
    where: { id: input.candidateId },
    data: {
      disposition: input.disposition as never,
      reviewedByUserId: input.actorUserId,
      reviewedAt: input.now,
      appliedAt: input.disposition === "APPLIED" ? input.now : undefined,
      errorCode: input.errorCode ?? null,
      errorSummary: input.errorSummary ?? null,
    },
  });
}
