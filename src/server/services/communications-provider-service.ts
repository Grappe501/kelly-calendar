import "server-only";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications";
import {
  credentialVaultOperatorSummary,
  d22ProductionDispatchHardBlock,
  defaultProductionSafetyGates,
  evaluateProductionSafetyGates,
  getSandboxCertificationProvider,
  inspectCredentialVault,
  listProviderRegistry,
  MULTI_PROVIDER_ROUTING_ARCHITECTURE,
  resolveCanonicalProvider,
} from "@/lib/missions/v21/communications/providers";
import { maskDestination } from "@/lib/missions/v21/communications/content";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError, ValidationError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  createSandboxCertificationRun,
  createSandboxTestRun,
  ensureProductionGateState,
  listDomainVerifications,
  listProviderMetrics,
  listSandboxCertificationRuns,
  listSandboxTestRuns,
  recordProviderMetric,
  refreshProductionGateDerivedFlags,
  syncProviderCatalogFromRegistry,
  updateCatalogHealth,
  upsertDomainVerification,
} from "@/server/repositories/communications-provider-repository";
import { listWebhookReceipts } from "@/server/repositories/communications-dispatch-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Provider administration requires campaign leadership access.",
    );
  }
}

export async function getProviderHealthDashboard(actor: AuthenticatedActor) {
  assertLeadership(actor);
  await syncProviderCatalogFromRegistry();
  const registry = listProviderRegistry();
  const healthRows = [];
  for (const entry of registry) {
    const provider = resolveCanonicalProvider(entry.providerKey, {
      allowSandboxAdapters: true,
      nodeEnv: "development",
    });
    const health = await provider.health();
    await updateCatalogHealth(entry.providerKey, {
      healthSnapshotJson: health,
      averageLatencyMs: health.averageLatencyMs,
      lastSuccessAt: health.lastSuccessAt
        ? new Date(health.lastSuccessAt)
        : null,
      lastFailureAt: health.lastFailureAt
        ? new Date(health.lastFailureAt)
        : null,
      domainVerified: health.domainVerified,
      senderVerified: health.senderVerified,
      webhookVerified: health.webhookVerified,
      sandboxWorking: health.sandboxWorking,
      suppressionSyncAgeMinutes: health.suppressionSyncAgeMinutes,
      lifecycleStatus: health.currentStatus,
    });
    healthRows.push({
      ...entry,
      health,
      credentials: await provider.inspectCredentials(),
    });
  }
  const gates = await ensureProductionGateState(actor.userId);
  const hardBlock = d22ProductionDispatchHardBlock();
  const vault = credentialVaultOperatorSummary(inspectCredentialVault());
  return {
    notices: [
      OPERATOR_NOTICE,
      NO_INFERENCE_NOTICE,
      hardBlock.reason,
      "D22: Mission → Dispatch → Provider Interface → Adapter → Vendor API.",
    ],
    registry: healthRows,
    vault: {
      missing: vault.missing,
      malformed: vault.malformed,
      warnings: vault.warnings,
      // never include secret values
    },
    gates: {
      ...gates,
      allowed: false,
      hardBlocked: true,
      hardBlockReason: hardBlock.reason,
    },
    multiProviderRouting: MULTI_PROVIDER_ROUTING_ARCHITECTURE,
    productionDispatchEnabled: false,
  };
}

export async function runSandboxCertification(
  actor: AuthenticatedActor,
  providerKey: string,
) {
  assertLeadership(actor);
  const key = providerKey.trim().toLowerCase();
  if (key !== "kccc-sandbox" && key !== "resend") {
    throw new ValidationError(
      "Sandbox certification is limited to kccc-sandbox or resend in D22.",
    );
  }
  const provider =
    key === "kccc-sandbox"
      ? getSandboxCertificationProvider()
      : resolveCanonicalProvider("resend", {
          allowSandboxAdapters: true,
          nodeEnv: "development",
        });
  await provider.initialize();
  const startedAt = new Date();
  const checklist = await provider.runSandboxCertification();
  const passedCount = checklist.filter((c) => c.passed).length;
  const failedCount = checklist.length - passedCount;
  const latencies = checklist
    .map((c) => c.latencyMs)
    .filter((n): n is number => typeof n === "number");
  const averageLatencyMs =
    latencies.length === 0
      ? null
      : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const allRequiredPassed =
    key === "kccc-sandbox" ? failedCount === 0 : passedCount >= 1;
  const status = allRequiredPassed && key === "kccc-sandbox" ? "PASSED" : "FAILED";
  const run = await createSandboxCertificationRun({
    providerKey: provider.providerKey,
    status,
    checklistJson: checklist,
    evidenceJson: {
      averageLatencyMs,
      productionEnabled: false,
      note: "D22 sandbox certification — no production messages.",
    },
    passedCount,
    failedCount,
    averageLatencyMs,
    requestedByUserId: actor.userId,
    startedAt,
    completedAt: new Date(),
  });
  if (status === "PASSED") {
    await updateCatalogHealth(provider.providerKey, {
      sandboxWorking: true,
      lifecycleStatus: "SANDBOX_READY",
    });
    await refreshProductionGateDerivedFlags(
      { sandboxPassed: true, webhookVerified: true, senderVerified: true },
      actor.userId,
    );
  }
  await recordProviderMetric({
    providerKey: provider.providerKey,
    metricKey: "sandbox_success_rate",
    value: checklist.length === 0 ? 0 : passedCount / checklist.length,
    windowStart: startedAt,
    windowEnd: new Date(),
  });
  await writeAttributedAudit({
    actor,
    action: "communications.sandbox.certification",
    entityType: "CommunicationSandboxCertificationRun",
    entityId: run.id,
    reason: `Sandbox certification ${status} for ${provider.providerKey}`,
    metadata: { passedCount, failedCount, providerKey: provider.providerKey },
  });
  return {
    runId: run.id,
    providerKey: provider.providerKey,
    status,
    passedCount,
    failedCount,
    averageLatencyMs,
    checklist,
    productionDispatchEnabled: false,
  };
}

export async function getSandboxConsole(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const runs = await listSandboxTestRuns(20);
  const certs = await listSandboxCertificationRuns(10);
  return {
    notices: [
      "Sandbox test console — no production audiences or live campaign dispatch.",
      d22ProductionDispatchHardBlock().reason,
    ],
    providers: listProviderRegistry()
      .filter((p) => p.isOfficialAdapter)
      .map((p) => ({
        providerKey: p.providerKey,
        displayName: p.displayName,
        isSandboxOnly: p.isSandboxOnly,
      })),
    recentTests: runs.map((r) => ({
      id: r.id,
      providerKey: r.providerKey,
      status: r.status,
      recipientMasked: r.recipientMasked,
      subject: r.subject,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt.toISOString(),
    })),
    recentCertifications: certs.map((c) => ({
      id: c.id,
      providerKey: c.providerKey,
      status: c.status,
      passedCount: c.passedCount,
      failedCount: c.failedCount,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function runSandboxTestConsole(
  actor: AuthenticatedActor,
  input: {
    providerKey: string;
    recipient: string;
    subject: string;
    message: string;
    simulateOnly?: boolean;
  },
) {
  assertLeadership(actor);
  const key = input.providerKey.trim().toLowerCase();
  if (key !== "kccc-sandbox") {
    throw new ValidationError(
      "D22 sandbox console live dispatch is limited to kccc-sandbox (no commercial sends from console).",
    );
  }
  const provider = getSandboxCertificationProvider();
  await provider.initialize();
  const started = Date.now();
  if (input.simulateOnly) {
    const run = await createSandboxTestRun({
      providerKey: key,
      status: "PASSED",
      recipientMasked: maskDestination("EMAIL", input.recipient),
      subject: input.subject.slice(0, 120),
      expectedEventsJson: ["ACCEPTED", "DELIVERED"],
      resultsJson: { simulated: true },
      webhookTimelineJson: [],
      latencyMs: Date.now() - started,
      evidenceJson: { mode: "simulation" },
      requestedByUserId: actor.userId,
      completedAt: new Date(),
    });
    return { runId: run.id, status: "PASSED", simulated: true, latencyMs: run.latencyMs };
  }
  const send = await provider.send({
    idempotencyKey: `console-${actor.userId}-${Date.now()}`,
    correlationId: `console-${actor.userId}`,
    channel: "EMAIL",
    destination: input.recipient,
    subject: input.subject,
    bodyText: input.message,
    bodyHtml: null,
    fromIdentity: "sandbox@kccc.test",
    sandboxOnly: true,
    timeoutMs: 5000,
  });
  const latencyMs = send.latencyMs;
  const status = send.outcome === "ACCEPTED" ? "PASSED" : "FAILED";
  const run = await createSandboxTestRun({
    providerKey: key,
    status,
    recipientMasked: maskDestination("EMAIL", input.recipient),
    subject: input.subject.slice(0, 120),
    expectedEventsJson: ["ACCEPTED"],
    resultsJson: {
      outcome: send.outcome,
      providerMessageId:
        send.outcome === "ACCEPTED" ? send.providerMessageId : null,
      errorCategory: send.outcome === "ACCEPTED" ? null : send.errorCategory,
    },
    webhookTimelineJson: [],
    latencyMs,
    evidenceJson: { sandboxOnly: true },
    requestedByUserId: actor.userId,
    completedAt: new Date(),
  });
  await writeAttributedAudit({
    actor,
    action: "communications.sandbox.console_test",
    entityType: "CommunicationSandboxTestRun",
    entityId: run.id,
    reason: `Sandbox console ${status} via ${key}`,
    metadata: { status, providerKey: key },
  });
  return {
    runId: run.id,
    status,
    simulated: false,
    latencyMs,
    outcome: send.outcome,
    providerMessageId:
      send.outcome === "ACCEPTED" ? send.providerMessageId : null,
  };
}

export async function getDomainVerificationCenter(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const rows = await listDomainVerifications();
  return {
    notices: [
      "Domain Verification Center — SPF / DKIM / DMARC surfaced for operators.",
      "BIMI is future. Automatic DNS recheck schedules nextCheckAt only.",
    ],
    domains: rows.map((r) => ({
      id: r.id,
      providerKey: r.providerKey,
      domain: r.domain,
      spfStatus: r.spfStatus,
      dkimStatus: r.dkimStatus,
      dmarcStatus: r.dmarcStatus,
      senderVerified: r.senderVerified,
      returnPathOk: r.returnPathOk,
      trackingDomainOk: r.trackingDomainOk,
      bimiStatus: r.bimiStatus,
      lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
      nextCheckAt: r.nextCheckAt?.toISOString() ?? null,
    })),
  };
}

export async function recordDomainVerificationCheck(
  actor: AuthenticatedActor,
  input: {
    providerKey: string;
    domain: string;
    spfStatus: "UNKNOWN" | "PASS" | "FAIL" | "PENDING" | "NOT_APPLICABLE";
    dkimStatus: "UNKNOWN" | "PASS" | "FAIL" | "PENDING" | "NOT_APPLICABLE";
    dmarcStatus: "UNKNOWN" | "PASS" | "FAIL" | "PENDING" | "NOT_APPLICABLE";
    senderVerified: boolean;
    returnPathOk?: boolean;
    trackingDomainOk?: boolean;
  },
) {
  assertLeadership(actor);
  const row = await upsertDomainVerification({
    providerKey: input.providerKey.trim().toLowerCase(),
    domain: input.domain.trim().toLowerCase(),
    spfStatus: input.spfStatus,
    dkimStatus: input.dkimStatus,
    dmarcStatus: input.dmarcStatus,
    senderVerified: input.senderVerified,
    returnPathOk: input.returnPathOk ?? false,
    trackingDomainOk: input.trackingDomainOk ?? false,
    detailsJson: { source: "operator-check", d22: true },
  });
  const domainOk =
    input.spfStatus === "PASS" &&
    input.dkimStatus === "PASS" &&
    input.dmarcStatus === "PASS";
  await updateCatalogHealth(input.providerKey.trim().toLowerCase(), {
    domainVerified: domainOk,
    senderVerified: input.senderVerified,
  });
  await refreshProductionGateDerivedFlags(
    {
      domainVerified: domainOk,
      senderVerified: input.senderVerified,
    },
    actor.userId,
  );
  await writeAttributedAudit({
    actor,
    action: "communications.domain.verification_check",
    entityType: "CommunicationDomainVerification",
    entityId: row.id,
    reason: `Domain check recorded for ${row.domain}`,
    metadata: { providerKey: row.providerKey, domainOk },
  });
  return {
    id: row.id,
    domainOk,
    productionDispatchEnabled: false,
  };
}

export async function getWebhookInspector(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const receipts = await listWebhookReceipts(50);
  return {
    notices: [
      "Webhook Inspector — signatures, replay fingerprints, normalized events.",
      "Raw payloads are not retained in this projection.",
    ],
    receipts: receipts.map((r) => ({
      id: r.id,
      providerKey: r.providerKey,
      providerEventId: r.providerEventId,
      signatureValid: r.signatureValid,
      receivedAt: r.receivedAt.toISOString(),
      providerEventAt: r.providerEventAt?.toISOString() ?? null,
      replayFingerprint: r.replayFingerprint.slice(0, 16) + "…",
      processingStatus: r.processingStatus,
      matchedAttemptId: r.matchedAttemptId,
      normalizedEventCount: r.normalizedEventCount,
      errorCategory: r.errorCategory,
    })),
  };
}

export async function getProviderMetricsPanel(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const metrics = await listProviderMetrics(50);
  const gates = await ensureProductionGateState(actor.userId);
  const evaluated = evaluateProductionSafetyGates({
    productionProviderSelected: gates.productionProviderSelected,
    sandboxPassed: gates.sandboxPassed,
    senderVerified: gates.senderVerified,
    domainVerified: gates.domainVerified,
    webhookVerified: gates.webhookVerified,
    killSwitchOff: gates.killSwitchOff,
    operatorApproval: gates.operatorApproval,
    campaignApproval: gates.campaignApproval,
    finalConfirmation: gates.finalConfirmation,
    controlledLiveTestApproved: gates.controlledLiveTestApproved,
  });
  return {
    notices: [
      d22ProductionDispatchHardBlock().reason,
      "Operational metrics are sandbox-oriented in D22.",
    ],
    metrics: metrics.map((m) => ({
      id: m.id,
      providerKey: m.providerKey,
      metricKey: m.metricKey,
      value: m.value,
      windowStart: m.windowStart.toISOString(),
      windowEnd: m.windowEnd.toISOString(),
    })),
    gates: {
      ...evaluated,
      hardBlocked: true,
      defaults: defaultProductionSafetyGates(),
    },
    failureRecoveryGuidance: [
      "Provider unavailable → keep kill switches ON; use health dashboard.",
      "Authentication failure → rotate env credentials; never store in DB.",
      "Webhook invalid / clock skew → validate secret + NTP.",
      "Rate limited → backoff; do not widen volume.",
      "Duplicate webhook → idempotent replay fingerprint.",
    ],
  };
}
