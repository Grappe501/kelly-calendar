import "server-only";
import { prisma } from "@/server/db/prisma";
import {
  REDDIRT_CAMPAIGN_SCOPE,
  REDDIRT_PROVIDER,
} from "@/features/reddirt-integration/docs-revision";

export async function findRedDirtConnection(
  campaignScopeKey = REDDIRT_CAMPAIGN_SCOPE,
) {
  return prisma.externalIntegrationConnection.findFirst({
    where: { campaignScopeKey, provider: REDDIRT_PROVIDER },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertRedDirtConnection(input: {
  campaignScopeKey?: string;
  externalOrganizationId: string;
  organizationName?: string | null;
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
  const campaignScopeKey = input.campaignScopeKey ?? REDDIRT_CAMPAIGN_SCOPE;
  const existing = await prisma.externalIntegrationConnection.findUnique({
    where: {
      campaignScopeKey_provider_externalOrganizationId: {
        campaignScopeKey,
        provider: REDDIRT_PROVIDER,
        externalOrganizationId: input.externalOrganizationId,
      },
    },
  });
  const data = {
    organizationName: input.organizationName ?? null,
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
      provider: REDDIRT_PROVIDER,
      externalOrganizationId: input.externalOrganizationId,
      createdByUserId: input.actorUserId ?? null,
      ...data,
    },
  });
}

export async function createRedDirtSyncRun(input: {
  connectionId?: string | null;
  objectScope: string;
  mode: "DRY_RUN" | "APPLY";
  requestedByUserId?: string | null;
  documentationRevision?: string | null;
  adapterVersion?: string | null;
}) {
  return prisma.externalSyncRun.create({
    data: {
      campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
      provider: REDDIRT_PROVIDER,
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

export async function completeRedDirtSyncRun(
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

export async function createRedDirtSyncCandidates(
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
      provider: REDDIRT_PROVIDER,
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

export async function listRedDirtSyncRuns(limit = 20) {
  return prisma.externalSyncRun.findMany({
    where: {
      campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
      provider: REDDIRT_PROVIDER,
    },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function getRedDirtSyncRun(runId: string) {
  return prisma.externalSyncRun.findFirst({
    where: {
      id: runId,
      campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
      provider: REDDIRT_PROVIDER,
    },
    include: { candidates: true },
  });
}

export async function listStrategicFactsForCounty(arkansasCountyId: string) {
  try {
    return await prisma.strategicGeographyFact.findMany({
      where: {
        campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
        provider: REDDIRT_PROVIDER,
        arkansasCountyId,
        sourceStatus: "ACTIVE",
      },
      orderBy: { appliedAt: "desc" },
      take: 20,
    });
  } catch {
    // Table may not exist until migration is applied.
    return [];
  }
}

export async function listActiveStrategicFacts(limit = 100) {
  try {
    return await prisma.strategicGeographyFact.findMany({
      where: {
        campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
        provider: REDDIRT_PROVIDER,
        sourceStatus: "ACTIVE",
      },
      orderBy: { appliedAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function countStrategicFacts() {
  try {
    return await prisma.strategicGeographyFact.count({
      where: {
        campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
        provider: REDDIRT_PROVIDER,
      },
    });
  } catch {
    return 0;
  }
}

export async function findRedDirtFactFingerprints() {
  try {
    const rows = await prisma.strategicGeographyFact.findMany({
      where: {
        campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
        provider: REDDIRT_PROVIDER,
        sourceStatus: "ACTIVE",
      },
      select: {
        externalObjectId: true,
        contentFingerprint: true,
      },
    });
    return new Map(rows.map((r) => [r.externalObjectId, r.contentFingerprint]));
  } catch {
    return new Map<string, string>();
  }
}

export async function updateRedDirtCandidateDisposition(input: {
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

export async function upsertRedDirtObjectReference(input: {
  externalObjectId: string;
  objectType: string;
  contentFingerprint: string;
  localObjectType?: string | null;
  localObjectId?: string | null;
  remoteUpdatedAt?: string | null;
  actorUserId?: string | null;
  now: Date;
}) {
  const existing = await prisma.externalObjectReference.findUnique({
    where: {
      campaignScopeKey_provider_objectType_externalObjectId: {
        campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
        provider: REDDIRT_PROVIDER,
        objectType: input.objectType as never,
        externalObjectId: input.externalObjectId,
      },
    },
  });
  const data = {
    contentFingerprint: input.contentFingerprint,
    remoteUpdatedAt: input.remoteUpdatedAt
      ? new Date(input.remoteUpdatedAt)
      : null,
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
      campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
      provider: REDDIRT_PROVIDER,
      objectType: input.objectType as never,
      externalObjectId: input.externalObjectId,
      createdByUserId: input.actorUserId ?? null,
      ...data,
    },
  });
}

export async function createStrategicObservation(input: {
  externalObjectType: string;
  externalObjectId: string;
  normalizedFingerprint: string;
  allowedFieldsJson: object;
  privacyClassification: string;
  remoteUpdatedAt?: Date | null;
  payloadHash?: string | null;
  syncRunId?: string | null;
}) {
  return prisma.strategicSourceObservation.upsert({
    where: {
      campaignScopeKey_provider_externalObjectType_externalObjectId_normalizedFingerprint:
        {
          campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
          provider: REDDIRT_PROVIDER,
          externalObjectType: input.externalObjectType as never,
          externalObjectId: input.externalObjectId,
          normalizedFingerprint: input.normalizedFingerprint,
        },
    },
    create: {
      campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
      provider: REDDIRT_PROVIDER,
      externalObjectType: input.externalObjectType as never,
      externalObjectId: input.externalObjectId,
      normalizedFingerprint: input.normalizedFingerprint,
      allowedFieldsJson: input.allowedFieldsJson,
      privacyClassification: input.privacyClassification,
      remoteUpdatedAt: input.remoteUpdatedAt ?? null,
      payloadHash: input.payloadHash ?? null,
      syncRunId: input.syncRunId ?? null,
      provenance: "IMPORT",
    },
    update: {
      allowedFieldsJson: input.allowedFieldsJson,
      privacyClassification: input.privacyClassification,
      remoteUpdatedAt: input.remoteUpdatedAt ?? null,
      syncRunId: input.syncRunId ?? null,
      observedAt: new Date(),
    },
  });
}

/**
 * Idempotent apply: unique on fingerprint — reapply returns existing (0 duplicates).
 */
export async function applyStrategicGeographyFact(input: {
  externalObjectType: string;
  externalObjectId: string;
  factKind: string;
  factValue: string;
  factUnits?: string | null;
  contentFingerprint: string;
  arkansasCountyId?: string | null;
  geographyPlaceAuthorityId?: string | null;
  observationId?: string | null;
  externalObjectReferenceId?: string | null;
  providerTimestamp?: Date | null;
  observedAt: Date;
  appliedByUserId: string;
  syncRunId?: string | null;
}) {
  const existing = await prisma.strategicGeographyFact.findUnique({
    where: {
      campaignScopeKey_provider_externalObjectId_factKind_contentFingerprint: {
        campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
        provider: REDDIRT_PROVIDER,
        externalObjectId: input.externalObjectId,
        factKind: input.factKind,
        contentFingerprint: input.contentFingerprint,
      },
    },
  });
  if (existing) {
    return { fact: existing, created: false as const };
  }
  const fact = await prisma.strategicGeographyFact.create({
    data: {
      campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
      provider: REDDIRT_PROVIDER,
      externalObjectType: input.externalObjectType as never,
      externalObjectId: input.externalObjectId,
      factKind: input.factKind,
      factValue: input.factValue,
      factUnits: input.factUnits ?? null,
      contentFingerprint: input.contentFingerprint,
      arkansasCountyId: input.arkansasCountyId ?? null,
      geographyPlaceAuthorityId: input.geographyPlaceAuthorityId ?? null,
      observationId: input.observationId ?? null,
      externalObjectReferenceId: input.externalObjectReferenceId ?? null,
      providerTimestamp: input.providerTimestamp ?? null,
      observedAt: input.observedAt,
      appliedByUserId: input.appliedByUserId,
      appliedAt: input.observedAt,
      syncRunId: input.syncRunId ?? null,
      sourceAttributionLabel: "RedDirt-sourced",
      sourceStatus: "ACTIVE",
      reviewStatus: "APPLIED",
      provenance: "IMPORT",
    },
  });
  return { fact, created: true as const };
}
