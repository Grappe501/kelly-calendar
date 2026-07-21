import "server-only";
import { prisma } from "@/server/db/prisma";

export async function findDispatchControl(campaignScopeKey = "KELLY") {
  return prisma.communicationDispatchControl.findUnique({
    where: { campaignScopeKey },
  });
}

export async function upsertDispatchControl(data: {
  campaignScopeKey?: string;
  globalKillSwitch: boolean;
  emailKillSwitch: boolean;
  smsKillSwitch: boolean;
  reason: string;
  actorUserId: string;
}) {
  const scope = data.campaignScopeKey ?? "KELLY";
  const existing = await findDispatchControl(scope);
  if (!existing) {
    return prisma.communicationDispatchControl.create({
      data: {
        campaignScopeKey: scope,
        version: 1,
        globalKillSwitch: data.globalKillSwitch,
        emailKillSwitch: data.emailKillSwitch,
        smsKillSwitch: data.smsKillSwitch,
        reason: data.reason,
        changedByUserId: data.actorUserId,
        changedAt: new Date(),
      },
    });
  }
  return prisma.communicationDispatchControl.update({
    where: { campaignScopeKey: scope },
    data: {
      version: existing.version + 1,
      globalKillSwitch: data.globalKillSwitch,
      emailKillSwitch: data.emailKillSwitch,
      smsKillSwitch: data.smsKillSwitch,
      reason: data.reason,
      changedByUserId: data.actorUserId,
      changedAt: new Date(),
    },
  });
}

export async function ensureDefaultDispatchControl(actorUserId?: string | null) {
  const existing = await findDispatchControl();
  if (existing) return existing;
  return prisma.communicationDispatchControl.create({
    data: {
      campaignScopeKey: "KELLY",
      version: 1,
      globalKillSwitch: true,
      emailKillSwitch: true,
      smsKillSwitch: true,
      reason: "D21 default — production dispatch disabled",
      changedByUserId: actorUserId ?? null,
    },
  });
}

export async function listProviderConnections() {
  return prisma.communicationProviderConnection.findMany({
    where: { isActive: true },
    orderBy: { providerKey: "asc" },
  });
}

export async function findProviderConnection(providerKey: string) {
  return prisma.communicationProviderConnection.findUnique({
    where: {
      campaignScopeKey_providerKey: {
        campaignScopeKey: "KELLY",
        providerKey,
      },
    },
  });
}

export async function upsertProviderConnection(data: {
  providerKey: string;
  mode: "DISABLED" | "SANDBOX" | "PRODUCTION";
  configurationState:
    | "NOT_CONFIGURED"
    | "PARTIAL"
    | "CONFIGURED"
    | "VERIFIED"
    | "DEGRADED"
    | "DISABLED";
  capabilitySnapshot: object;
  senderIdentitySummary?: string | null;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  webhooksEnabled?: boolean;
  applicationDispatchEnabled?: boolean;
  notes?: string | null;
  actorUserId: string;
  lastVerifiedAt?: Date | null;
  lastErrorCategory?: string | null;
  lastErrorSummaryRedacted?: string | null;
}) {
  return prisma.communicationProviderConnection.upsert({
    where: {
      campaignScopeKey_providerKey: {
        campaignScopeKey: "KELLY",
        providerKey: data.providerKey,
      },
    },
    create: {
      providerKey: data.providerKey,
      mode: data.mode,
      configurationState: data.configurationState,
      capabilitySnapshot: data.capabilitySnapshot,
      senderIdentitySummary: data.senderIdentitySummary ?? null,
      emailEnabled: data.emailEnabled ?? false,
      smsEnabled: data.smsEnabled ?? false,
      webhooksEnabled: data.webhooksEnabled ?? false,
      applicationDispatchEnabled: data.applicationDispatchEnabled ?? false,
      notes: data.notes ?? null,
      lastVerifiedAt: data.lastVerifiedAt ?? null,
      lastErrorCategory: data.lastErrorCategory ?? null,
      lastErrorSummaryRedacted: data.lastErrorSummaryRedacted ?? null,
      createdByUserId: data.actorUserId,
      updatedByUserId: data.actorUserId,
    },
    update: {
      mode: data.mode,
      configurationState: data.configurationState,
      capabilitySnapshot: data.capabilitySnapshot,
      senderIdentitySummary: data.senderIdentitySummary ?? null,
      emailEnabled: data.emailEnabled ?? false,
      smsEnabled: data.smsEnabled ?? false,
      webhooksEnabled: data.webhooksEnabled ?? false,
      applicationDispatchEnabled: data.applicationDispatchEnabled ?? false,
      notes: data.notes ?? null,
      lastVerifiedAt: data.lastVerifiedAt ?? undefined,
      lastErrorCategory: data.lastErrorCategory ?? undefined,
      lastErrorSummaryRedacted: data.lastErrorSummaryRedacted ?? undefined,
      updatedByUserId: data.actorUserId,
      isActive: true,
    },
  });
}

export async function createDispatchBatch(data: {
  communicationId: string;
  providerKey: string;
  channel: string;
  contentFingerprint: string;
  audienceFingerprint: string;
  policyVersion?: number | null;
  policyFingerprint?: string | null;
  queueItemCount: number;
  killSwitchSnapshot: object;
  capabilityVersion?: string | null;
  maxBatchSize?: number;
  actorUserId: string;
  status?: string;
}) {
  return prisma.communicationDispatchBatch.create({
    data: {
      communicationId: data.communicationId,
      providerKey: data.providerKey,
      channel: data.channel as never,
      contentFingerprint: data.contentFingerprint,
      audienceFingerprint: data.audienceFingerprint,
      policyVersion: data.policyVersion ?? null,
      policyFingerprint: data.policyFingerprint ?? null,
      queueItemCount: data.queueItemCount,
      killSwitchSnapshot: data.killSwitchSnapshot,
      capabilityVersion: data.capabilityVersion ?? null,
      maxBatchSize: data.maxBatchSize ?? 25,
      requestedByUserId: data.actorUserId,
      status: (data.status as never) ?? "DRAFT",
    },
  });
}

export async function updateDispatchBatch(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.communicationDispatchBatch.update({
    where: { id },
    data: data as never,
  });
}

export async function findDispatchBatch(id: string) {
  return prisma.communicationDispatchBatch.findUnique({
    where: { id },
    include: {
      attempts: { orderBy: { createdAt: "asc" } },
      communication: {
        select: { id: true, title: true, channel: true, status: true },
      },
    },
  });
}

export async function listDispatchBatches(limit = 50) {
  return prisma.communicationDispatchBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      communication: {
        select: { id: true, title: true, channel: true, status: true },
      },
    },
  });
}

export async function findAttemptByIdempotency(idempotencyKey: string) {
  return prisma.communicationDispatchAttempt.findUnique({
    where: { idempotencyKey },
  });
}

export async function createDispatchAttempt(data: {
  batchId: string;
  queueItemId: string;
  attemptNumber: number;
  idempotencyKey: string;
  requestCorrelationId: string;
  providerKey: string;
  status: string;
  providerMessageId?: string | null;
  errorCategory?: string | null;
  unknownOutcome?: boolean;
  reconciliationState?: string;
  completedAt?: Date | null;
}) {
  return prisma.communicationDispatchAttempt.create({
    data: {
      batchId: data.batchId,
      queueItemId: data.queueItemId,
      attemptNumber: data.attemptNumber,
      idempotencyKey: data.idempotencyKey,
      requestCorrelationId: data.requestCorrelationId,
      providerKey: data.providerKey,
      status: data.status as never,
      providerMessageId: data.providerMessageId ?? null,
      errorCategory: data.errorCategory ?? null,
      unknownOutcome: data.unknownOutcome ?? false,
      reconciliationState: data.reconciliationState ?? "NONE",
      completedAt: data.completedAt ?? null,
    },
  });
}

export async function updateDispatchAttempt(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.communicationDispatchAttempt.update({
    where: { id },
    data: data as never,
  });
}

export async function findOpenUnknownAttempts(queueItemId: string) {
  return prisma.communicationDispatchAttempt.findMany({
    where: {
      queueItemId,
      unknownOutcome: true,
      reconciliationState: { not: "RESOLVED" },
    },
  });
}

export async function findAttemptByProviderMessageId(providerMessageId: string) {
  return prisma.communicationDispatchAttempt.findFirst({
    where: { providerMessageId },
  });
}

export async function findWebhookByReplay(replayFingerprint: string) {
  return prisma.communicationWebhookReceipt.findUnique({
    where: { replayFingerprint },
  });
}

export async function createWebhookReceipt(data: {
  providerKey: string;
  providerEventId?: string | null;
  signatureValid: boolean;
  providerEventAt?: Date | null;
  replayFingerprint: string;
  processingStatus: string;
  matchedAttemptId?: string | null;
  normalizedEventCount?: number;
  errorCategory?: string | null;
  purgeAfter?: Date | null;
}) {
  return prisma.communicationWebhookReceipt.create({
    data: {
      providerKey: data.providerKey,
      providerEventId: data.providerEventId ?? null,
      signatureValid: data.signatureValid,
      providerEventAt: data.providerEventAt ?? null,
      replayFingerprint: data.replayFingerprint,
      processingStatus: data.processingStatus as never,
      matchedAttemptId: data.matchedAttemptId ?? null,
      normalizedEventCount: data.normalizedEventCount ?? 0,
      errorCategory: data.errorCategory ?? null,
      purgeAfter: data.purgeAfter ?? null,
    },
  });
}

export async function listWebhookReceipts(limit = 50) {
  return prisma.communicationWebhookReceipt.findMany({
    orderBy: { receivedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}
