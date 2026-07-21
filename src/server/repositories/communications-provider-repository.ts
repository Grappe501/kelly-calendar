import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  defaultProductionSafetyGates,
  evaluateProductionSafetyGates,
  listProviderRegistry,
  type ProductionSafetyGates,
} from "@/lib/missions/v21/communications/providers";

const SCOPE = "KELLY";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
export async function ensureProductionGateState(userId?: string | null) {
  const existing = await prisma.communicationProductionGateState.findUnique({
    where: { campaignScopeKey: SCOPE },
  });
  if (existing) return existing;
  const defaults = defaultProductionSafetyGates();
  const evaluated = evaluateProductionSafetyGates(defaults);
  return prisma.communicationProductionGateState.create({
    data: {
      campaignScopeKey: SCOPE,
      ...defaults,
      blockedReason:
        evaluated.blockReason ??
        "DISPATCH BLOCKED — D22 production gates incomplete",
      changedByUserId: userId ?? null,
    },
  });
}

export async function getProductionGateState() {
  return ensureProductionGateState();
}

export async function syncProviderCatalogFromRegistry() {
  const registry = listProviderRegistry();
  for (const entry of registry) {
    await prisma.communicationProviderCatalogEntry.upsert({
      where: {
        campaignScopeKey_providerKey: {
          campaignScopeKey: SCOPE,
          providerKey: entry.providerKey,
        },
      },
      create: {
        campaignScopeKey: SCOPE,
        providerKey: entry.providerKey,
        displayName: entry.displayName,
        lifecycleStatus: entry.status,
        capabilitiesJson: toJson(entry.capabilities),
        healthSnapshotJson: toJson({}),
        isOfficialAdapter: entry.isOfficialAdapter,
        isSandboxOnly: entry.isSandboxOnly,
        isStub: entry.isStub,
        productionEnabled: false,
        operatorNotes: entry.operatorNotes.join(" "),
      },
      update: {
        displayName: entry.displayName,
        lifecycleStatus: entry.status,
        capabilitiesJson: toJson(entry.capabilities),
        isOfficialAdapter: entry.isOfficialAdapter,
        isSandboxOnly: entry.isSandboxOnly,
        isStub: entry.isStub,
        productionEnabled: false,
        operatorNotes: entry.operatorNotes.join(" "),
      },
    });
  }
  return prisma.communicationProviderCatalogEntry.findMany({
    where: { campaignScopeKey: SCOPE },
    orderBy: { providerKey: "asc" },
  });
}

export async function updateCatalogHealth(
  providerKey: string,
  patch: {
    healthSnapshotJson?: unknown;
    averageLatencyMs?: number | null;
    lastSuccessAt?: Date | null;
    lastFailureAt?: Date | null;
    domainVerified?: boolean;
    senderVerified?: boolean;
    webhookVerified?: boolean;
    sandboxWorking?: boolean;
    suppressionSyncAgeMinutes?: number | null;
    lifecycleStatus?:
      | "AVAILABLE"
      | "INSTALLED"
      | "VERIFIED"
      | "SANDBOX_READY"
      | "PRODUCTION_READY"
      | "DISABLED"
      | "RETIRED";
  },
) {
  await syncProviderCatalogFromRegistry();
  return prisma.communicationProviderCatalogEntry.update({
    where: {
      campaignScopeKey_providerKey: {
        campaignScopeKey: SCOPE,
        providerKey,
      },
    },
    data: {
      ...patch,
      healthSnapshotJson:
        patch.healthSnapshotJson !== undefined
          ? toJson(patch.healthSnapshotJson)
          : undefined,
      productionEnabled: false,
    },
  });
}

export async function createSandboxCertificationRun(input: {
  providerKey: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "BLOCKED";
  checklistJson: unknown;
  evidenceJson: unknown;
  passedCount: number;
  failedCount: number;
  averageLatencyMs: number | null;
  requestedByUserId: string | null;
  startedAt: Date;
  completedAt: Date | null;
}) {
  return prisma.communicationSandboxCertificationRun.create({
    data: {
      campaignScopeKey: SCOPE,
      providerKey: input.providerKey,
      status: input.status,
      checklistJson: toJson(input.checklistJson),
      evidenceJson: toJson(input.evidenceJson),
      passedCount: input.passedCount,
      failedCount: input.failedCount,
      averageLatencyMs: input.averageLatencyMs,
      requestedByUserId: input.requestedByUserId,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
    },
  });
}

export async function listSandboxCertificationRuns(limit = 20) {
  return prisma.communicationSandboxCertificationRun.findMany({
    where: { campaignScopeKey: SCOPE },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function upsertDomainVerification(input: {
  providerKey: string;
  domain: string;
  spfStatus: "UNKNOWN" | "PASS" | "FAIL" | "PENDING" | "NOT_APPLICABLE";
  dkimStatus: "UNKNOWN" | "PASS" | "FAIL" | "PENDING" | "NOT_APPLICABLE";
  dmarcStatus: "UNKNOWN" | "PASS" | "FAIL" | "PENDING" | "NOT_APPLICABLE";
  senderVerified: boolean;
  returnPathOk: boolean;
  trackingDomainOk: boolean;
  detailsJson?: unknown;
}) {
  const now = new Date();
  return prisma.communicationDomainVerification.upsert({
    where: {
      campaignScopeKey_providerKey_domain: {
        campaignScopeKey: SCOPE,
        providerKey: input.providerKey,
        domain: input.domain,
      },
    },
    create: {
      campaignScopeKey: SCOPE,
      providerKey: input.providerKey,
      domain: input.domain,
      spfStatus: input.spfStatus,
      dkimStatus: input.dkimStatus,
      dmarcStatus: input.dmarcStatus,
      senderVerified: input.senderVerified,
      returnPathOk: input.returnPathOk,
      trackingDomainOk: input.trackingDomainOk,
      detailsJson: toJson(input.detailsJson ?? {}),
      lastCheckedAt: now,
      nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    update: {
      spfStatus: input.spfStatus,
      dkimStatus: input.dkimStatus,
      dmarcStatus: input.dmarcStatus,
      senderVerified: input.senderVerified,
      returnPathOk: input.returnPathOk,
      trackingDomainOk: input.trackingDomainOk,
      detailsJson: toJson(input.detailsJson ?? {}),
      lastCheckedAt: now,
      nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  });
}

export async function listDomainVerifications() {
  return prisma.communicationDomainVerification.findMany({
    where: { campaignScopeKey: SCOPE },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createSandboxTestRun(input: {
  providerKey: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "BLOCKED";
  recipientMasked: string | null;
  subject: string | null;
  expectedEventsJson: unknown;
  resultsJson: unknown;
  webhookTimelineJson: unknown;
  latencyMs: number | null;
  evidenceJson: unknown;
  requestedByUserId: string | null;
  completedAt: Date | null;
}) {
  return prisma.communicationSandboxTestRun.create({
    data: {
      campaignScopeKey: SCOPE,
      providerKey: input.providerKey,
      status: input.status,
      recipientMasked: input.recipientMasked,
      subject: input.subject,
      expectedEventsJson: toJson(input.expectedEventsJson),
      resultsJson: toJson(input.resultsJson),
      webhookTimelineJson: toJson(input.webhookTimelineJson),
      latencyMs: input.latencyMs,
      evidenceJson: toJson(input.evidenceJson),
      requestedByUserId: input.requestedByUserId,
      completedAt: input.completedAt,
    },
  });
}

export async function listSandboxTestRuns(limit = 20) {
  return prisma.communicationSandboxTestRun.findMany({
    where: { campaignScopeKey: SCOPE },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function recordProviderMetric(input: {
  providerKey: string;
  metricKey: string;
  value: number;
  windowStart: Date;
  windowEnd: Date;
}) {
  return prisma.communicationProviderMetricSample.create({
    data: {
      campaignScopeKey: SCOPE,
      ...input,
    },
  });
}

export async function listProviderMetrics(limit = 50) {
  return prisma.communicationProviderMetricSample.findMany({
    where: { campaignScopeKey: SCOPE },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function refreshProductionGateDerivedFlags(
  gates: Partial<ProductionSafetyGates>,
  userId?: string | null,
) {
  const current = await ensureProductionGateState(userId);
  const merged: ProductionSafetyGates = {
    productionProviderSelected:
      gates.productionProviderSelected ?? current.productionProviderSelected,
    sandboxPassed: gates.sandboxPassed ?? current.sandboxPassed,
    senderVerified: gates.senderVerified ?? current.senderVerified,
    domainVerified: gates.domainVerified ?? current.domainVerified,
    webhookVerified: gates.webhookVerified ?? current.webhookVerified,
    killSwitchOff: gates.killSwitchOff ?? current.killSwitchOff,
    operatorApproval: gates.operatorApproval ?? current.operatorApproval,
    campaignApproval: gates.campaignApproval ?? current.campaignApproval,
    finalConfirmation: gates.finalConfirmation ?? current.finalConfirmation,
    controlledLiveTestApproved:
      gates.controlledLiveTestApproved ?? current.controlledLiveTestApproved,
  };
  // D22 hard rule: never auto-open approval gates.
  merged.operatorApproval = false;
  merged.campaignApproval = false;
  merged.finalConfirmation = false;
  merged.controlledLiveTestApproved = false;
  merged.killSwitchOff = false;
  merged.productionProviderSelected = false;
  const evaluated = evaluateProductionSafetyGates(merged);
  return prisma.communicationProductionGateState.update({
    where: { campaignScopeKey: SCOPE },
    data: {
      ...merged,
      blockedReason:
        evaluated.blockReason ??
        "DISPATCH BLOCKED — D22 production gates incomplete",
      changedByUserId: userId ?? null,
      changedAt: new Date(),
    },
  });
}
