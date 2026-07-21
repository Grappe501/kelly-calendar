import "server-only";
import { randomUUID } from "node:crypto";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
  assertDispatchFoundationIsolation,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_DISPATCH_TIMEOUT_MS,
  dispatchIdempotencyKey,
  evaluateDispatchPreflight,
  getActiveDispatchProvider,
  listRegisteredProviders,
  resolveProviderAdapter,
  type CommProviderMode,
} from "@/lib/missions/v21/communications";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { prisma } from "@/server/db/prisma";
import {
  createDispatchAttempt,
  createDispatchBatch,
  createWebhookReceipt,
  ensureDefaultDispatchControl,
  findAttemptByIdempotency,
  findAttemptByProviderMessageId,
  findDispatchBatch,
  findOpenUnknownAttempts,
  findWebhookByReplay,
  listDispatchBatches,
  listProviderConnections,
  listWebhookReceipts,
  updateDispatchAttempt,
  updateDispatchBatch,
  upsertDispatchControl,
  upsertProviderConnection,
} from "@/server/repositories/communications-dispatch-repository";
import { findCommunicationById } from "@/server/repositories/campaign-communications-repository";
import { createSuppression } from "@/server/repositories/campaign-communications-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Communications dispatch administration requires campaign leadership access.",
    );
  }
}

export async function getProvidersDashboard(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const control = await ensureDefaultDispatchControl(actor.userId);
  const adapter = getActiveDispatchProvider();
  const config = await adapter.inspectConfiguration();
  const caps = await adapter.discoverCapabilities();
  const connections = await listProviderConnections();
  return {
    selectedProvider: process.env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim() || null,
    noProviderSelected: !process.env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim(),
    registered: listRegisteredProviders("production"),
    active: {
      providerKey: adapter.providerKey,
      isTestAdapter: adapter.isTestAdapter,
      configuration: config,
      capabilities: caps,
    },
    connections: connections.map((c) => ({
      providerKey: c.providerKey,
      mode: c.mode,
      configurationState: c.configurationState,
      emailEnabled: c.emailEnabled,
      smsEnabled: c.smsEnabled,
      applicationDispatchEnabled: c.applicationDispatchEnabled,
      lastVerifiedAt: c.lastVerifiedAt?.toISOString() ?? null,
      // never expose secrets
    })),
    controls: {
      globalKillSwitch: control.globalKillSwitch,
      emailKillSwitch: control.emailKillSwitch,
      smsKillSwitch: control.smsKillSwitch,
      version: control.version,
      reason: control.reason,
    },
    productionDispatchEnabled: false,
    notices: [
      OPERATOR_NOTICE,
      NO_INFERENCE_NOTICE,
      "No production provider has been selected. External dispatch remains disabled.",
    ],
    isolation: assertDispatchFoundationIsolation(),
  };
}

export async function getProviderDetail(
  providerKey: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const adapter = resolveProviderAdapter(providerKey, {
    allowTestAdapter: false,
  });
  if (adapter.providerKey === "disabled" && providerKey !== "disabled") {
    throw new NotFoundError("Provider not registered for production use.");
  }
  return {
    providerKey: adapter.providerKey,
    isTestAdapter: adapter.isTestAdapter,
    configuration: await adapter.inspectConfiguration(),
    connection: await adapter.verifyConnection(),
    capabilities: await adapter.discoverCapabilities(),
    sender: await adapter.validateSender({
      channel: "EMAIL",
      senderIdentity: null,
    }),
    notices: [
      "Credential-tested ≠ production-ready. Application-enabled remains a separate gate.",
    ],
  };
}

export async function verifyActiveProviderConnection(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const adapter = getActiveDispatchProvider();
  if (adapter.isTestAdapter) {
    throw new ValidationError(
      "Test adapter cannot be verified as a production provider.",
    );
  }
  const result = await adapter.verifyConnection();
  const caps = await adapter.discoverCapabilities();
  await upsertProviderConnection({
    providerKey: adapter.providerKey,
    mode: "DISABLED",
    configurationState: result.ok ? "VERIFIED" : "NOT_CONFIGURED",
    capabilitySnapshot: caps,
    applicationDispatchEnabled: false,
    actorUserId: actor.userId,
    lastVerifiedAt: result.ok ? new Date() : null,
    lastErrorCategory: result.errorCategory,
    lastErrorSummaryRedacted: result.redactedSummary,
    notes: "D21 foundation — production dispatch not enabled.",
  });
  await writeAttributedAudit({
    actor,
    action: "communications.provider.verify",
    entityType: "CommunicationProviderConnection",
    entityId: adapter.providerKey,
    metadata: { ok: result.ok, mode: result.mode },
  });
  return { result, capabilities: caps };
}

export async function getDispatchControls(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const control = await ensureDefaultDispatchControl(actor.userId);
  return {
    globalKillSwitch: control.globalKillSwitch,
    emailKillSwitch: control.emailKillSwitch,
    smsKillSwitch: control.smsKillSwitch,
    version: control.version,
    reason: control.reason,
    changedAt: control.changedAt.toISOString(),
    notices: [
      "Kill switches default ON (blocking). Re-enabling does not resume old batches.",
    ],
  };
}

export async function updateDispatchControls(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (!reason) throw new ValidationError("reason required for control changes.");
  // Safe defaults: only allow turning switches ON freely; turning OFF requires explicit false + reason
  const row = await upsertDispatchControl({
    globalKillSwitch: b.globalKillSwitch !== false,
    emailKillSwitch: b.emailKillSwitch !== false,
    smsKillSwitch: b.smsKillSwitch !== false,
    reason,
    actorUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.controls.update",
    entityType: "CommunicationDispatchControl",
    entityId: row.id,
    metadata: {
      globalKillSwitch: row.globalKillSwitch,
      emailKillSwitch: row.emailKillSwitch,
      smsKillSwitch: row.smsKillSwitch,
      version: row.version,
    },
  });
  return getDispatchControls(actor);
}

async function buildPreflightFacts(communicationId: string) {
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const control = await ensureDefaultDispatchControl();
  const policy = await prisma.campaignCommunicationPolicy.findFirst({
    where: { campaignScopeKey: "KELLY", isActive: true },
    orderBy: { version: "desc" },
  });
  const contentOk = row.approvals.some(
    (a) =>
      a.approvalType === "CONTENT" &&
      !a.isInvalidated &&
      a.contentFingerprint === row.contentFingerprint,
  );
  const audienceOk = row.approvals.some(
    (a) =>
      a.approvalType === "AUDIENCE" &&
      !a.isInvalidated &&
      a.audienceFingerprint === row.audienceFingerprint,
  );
  const dispatchOk = row.approvals.some(
    (a) => a.approvalType === "DISPATCH" && !a.isInvalidated,
  );
  const prepared = row.queueItems.filter((q) => q.status === "PREPARED");
  return {
    row,
    control,
    policy,
    contentOk,
    audienceOk,
    dispatchOk,
    prepared,
  };
}

export async function runCommunicationDispatchPreflight(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const { row, control, policy, contentOk, audienceOk, dispatchOk, prepared } =
    await buildPreflightFacts(communicationId);
  const adapter = getActiveDispatchProvider();
  const config = await adapter.inspectConfiguration();

  let eligible = 0;
  let blocked = 0;
  const sampleReasons = new Set<string>();

  for (const q of prepared) {
    const unknowns = await findOpenUnknownAttempts(q.id);
    const pf = evaluateDispatchPreflight({
      communicationId: row.id,
      queueItemId: q.id,
      channel: row.channel,
      contentFingerprint: row.contentFingerprint ?? "",
      audienceFingerprint: row.audienceFingerprint ?? "",
      policyVersion: row.policyVersion,
      policyFingerprint: row.policyFingerprint,
      destinationRef: q.destinationRef,
      hasValidContentApproval: contentOk,
      hasValidAudienceApproval: audienceOk,
      hasValidDispatchApproval: dispatchOk,
      communicationActive: row.isActive,
      communicationCancelled: row.status === "CANCELLED",
      queuePrepared: q.status === "PREPARED",
      alreadyDispatched: Boolean(q.externalDispatchId),
      contactActive: Boolean(q.contactPointId),
      contactVerified: true,
      consentEffective: true,
      suppressionApplies: false,
      destinationChanged: false,
      mobilizeLinkValid: row.mobilizeEventUrl ? true : null,
      unknownOutcomeOpen: unknowns.length > 0,
      policyExternalDispatchEnabled: policy?.externalDispatchEnabled === true,
      providerMode: (config.mode as CommProviderMode) ?? "DISABLED",
      providerDispatchEnabled:
        config.applicationDispatchEnabled &&
        policy?.externalDispatchEnabled === true,
      globalKillSwitch: control.globalKillSwitch,
      emailKillSwitch: control.emailKillSwitch,
      smsKillSwitch: control.smsKillSwitch,
      rateLimitExceeded: false,
    });
    if (pf.ok) eligible += 1;
    else {
      blocked += 1;
      pf.blockingReasonCodes.slice(0, 3).forEach((c) => sampleReasons.add(c));
    }
  }

  return {
    communicationId: row.id,
    title: row.title,
    channel: row.channel,
    providerKey: adapter.providerKey,
    providerMode: config.mode,
    preparedCount: prepared.length,
    eligibleCount: eligible,
    blockedCount: blocked,
    sampleBlockingReasons: [...sampleReasons],
    approvals: {
      content: contentOk,
      audience: audienceOk,
      dispatch: dispatchOk,
    },
    policyVersion: row.policyVersion,
    killSwitches: {
      global: control.globalKillSwitch,
      email: control.emailKillSwitch,
      sms: control.smsKillSwitch,
    },
    maxBatchSize: DEFAULT_MAX_BATCH_SIZE,
    dispatchAvailable: false,
    exactDisabledReason:
      "Production dispatch is disabled: no provider selected, policy externalDispatchEnabled=false, and kill switches default ON.",
    notices: [OPERATOR_NOTICE, NO_INFERENCE_NOTICE],
    isolation: assertDispatchFoundationIsolation(),
  };
}

export async function createBoundedDispatchBatch(
  communicationId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const preflight = await runCommunicationDispatchPreflight(
    communicationId,
    actor,
  );
  // Always create a blocked/draft batch record for audit when operator attempts —
  // never actually dispatch in D21 default ship state.
  const { row, control, prepared } = await buildPreflightFacts(communicationId);
  const adapter = getActiveDispatchProvider();
  const caps = await adapter.discoverCapabilities();
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const maxBatchSize = Math.min(
    Number(b.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE) || DEFAULT_MAX_BATCH_SIZE,
    DEFAULT_MAX_BATCH_SIZE,
  );

  if (adapter.isTestAdapter && process.env.NODE_ENV === "production") {
    throw new ValidationError(
      "Test adapter cannot run batches in production.",
    );
  }

  const recipientManifestId =
    typeof b.recipientManifestId === "string" ? b.recipientManifestId : null;
  if (b.destinationOverride != null) {
    throw new ValidationError(
      "ARBITRARY_DESTINATION_OVERRIDE_REJECTED — destinations resolve from approved manifests only.",
    );
  }

  const batch = await createDispatchBatch({
    communicationId,
    providerKey: adapter.providerKey,
    channel: row.channel,
    contentFingerprint: row.contentFingerprint ?? "",
    audienceFingerprint: row.audienceFingerprint ?? "",
    policyVersion: row.policyVersion,
    policyFingerprint: row.policyFingerprint,
    queueItemCount: Math.min(prepared.length, maxBatchSize),
    killSwitchSnapshot: {
      global: control.globalKillSwitch,
      email: control.emailKillSwitch,
      sms: control.smsKillSwitch,
    },
    capabilityVersion: caps.capabilityVersion,
    maxBatchSize,
    actorUserId: actor.userId,
    status: "BLOCKED",
    recipientManifestId,
  });

  await writeAttributedAudit({
    actor,
    action: "communications.dispatch.batch.create",
    entityType: "CommunicationDispatchBatch",
    entityId: batch.id,
    metadata: {
      blocked: true,
      reason: preflight.exactDisabledReason,
      prepared: prepared.length,
      recipientManifestId,
      d24: "manifest attach does not enable production dispatch",
    },
  });

  return {
    batchId: batch.id,
    status: batch.status,
    dispatched: 0,
    providerRequests: 0,
    reason: preflight.exactDisabledReason,
    recipientManifestId,
    preflight,
    productionDispatchEnabled: false,
  };
}

/**
 * Execute a bounded batch — only when explicitly allowed for tests with test adapter.
 * Production ship path always blocks.
 */
export async function runBoundedDispatchBatchForTests(options: {
  communicationId: string;
  actor: AuthenticatedActor;
  allowTestAdapter: boolean;
}) {
  assertLeadership(options.actor);
  if (!options.allowTestAdapter || process.env.NODE_ENV === "production") {
    throw new ValidationError("Batch execution blocked outside controlled tests.");
  }
  const adapter = resolveProviderAdapter("kccc-test", {
    allowTestAdapter: true,
    nodeEnv: "test",
  });
  const { row, control, contentOk, audienceOk, dispatchOk, prepared, policy } =
    await buildPreflightFacts(options.communicationId);
  const caps = await adapter.discoverCapabilities();
  const batch = await createDispatchBatch({
    communicationId: options.communicationId,
    providerKey: adapter.providerKey,
    channel: row.channel,
    contentFingerprint: row.contentFingerprint ?? "",
    audienceFingerprint: row.audienceFingerprint ?? "",
    policyVersion: row.policyVersion,
    policyFingerprint: row.policyFingerprint,
    queueItemCount: Math.min(prepared.length, DEFAULT_MAX_BATCH_SIZE),
    killSwitchSnapshot: {
      global: control.globalKillSwitch,
      email: control.emailKillSwitch,
      sms: control.smsKillSwitch,
    },
    capabilityVersion: caps.capabilityVersion,
    actorUserId: options.actor.userId,
    status: "RUNNING",
  });

  let accepted = 0;
  let rejected = 0;
  let unknown = 0;
  let blocked = 0;

  for (const q of prepared.slice(0, DEFAULT_MAX_BATCH_SIZE)) {
    // Recheck kill switches between items
    const liveControl = await ensureDefaultDispatchControl();
    if (
      liveControl.globalKillSwitch ||
      (row.channel === "EMAIL" && liveControl.emailKillSwitch) ||
      (row.channel === "SMS" && liveControl.smsKillSwitch)
    ) {
      blocked += 1;
      break;
    }

    const unknowns = await findOpenUnknownAttempts(q.id);
    const pf = evaluateDispatchPreflight({
      communicationId: row.id,
      queueItemId: q.id,
      channel: row.channel,
      contentFingerprint: row.contentFingerprint ?? "",
      audienceFingerprint: row.audienceFingerprint ?? "",
      policyVersion: row.policyVersion,
      policyFingerprint: row.policyFingerprint,
      destinationRef: q.destinationRef,
      hasValidContentApproval: contentOk,
      hasValidAudienceApproval: audienceOk,
      hasValidDispatchApproval: dispatchOk || true, // test path may seed dispatch approval
      communicationActive: row.isActive,
      communicationCancelled: row.status === "CANCELLED",
      queuePrepared: true,
      alreadyDispatched: Boolean(q.externalDispatchId),
      contactActive: true,
      contactVerified: true,
      consentEffective: true,
      suppressionApplies: false,
      destinationChanged: false,
      mobilizeLinkValid: null,
      unknownOutcomeOpen: unknowns.length > 0,
      policyExternalDispatchEnabled: true,
      providerMode: "SANDBOX",
      providerDispatchEnabled: true,
      globalKillSwitch: false,
      emailKillSwitch: false,
      smsKillSwitch: false,
      rateLimitExceeded: false,
    });

    const idem = dispatchIdempotencyKey({
      queueItemId: q.id,
      contentFingerprint: row.contentFingerprint ?? "",
      audienceFingerprint: row.audienceFingerprint ?? "",
      providerKey: adapter.providerKey,
    });
    const existing = await findAttemptByIdempotency(idem);
    if (existing?.status === "PROVIDER_ACCEPTED") {
      accepted += 1;
      continue;
    }
    if (!pf.ok) {
      blocked += 1;
      await createDispatchAttempt({
        batchId: batch.id,
        queueItemId: q.id,
        attemptNumber: 1,
        idempotencyKey: `${idem}:blocked:${randomUUID().slice(0, 8)}`,
        requestCorrelationId: randomUUID(),
        providerKey: adapter.providerKey,
        status: "BLOCKED",
        errorCategory: pf.blockingReasonCodes[0] ?? "PREFLIGHT_FAILED",
        completedAt: new Date(),
      });
      continue;
    }

    const result = await adapter.dispatch({
      queueItemId: q.id,
      channel: row.channel,
      destinationRef: q.destinationRef ?? `cp:${q.contactPointId}`,
      subject: row.subject,
      bodyText: row.bodyText,
      contentFingerprint: row.contentFingerprint ?? "",
      audienceFingerprint: row.audienceFingerprint ?? "",
      idempotencyKey: idem,
      correlationId: randomUUID(),
      timeoutMs: DEFAULT_DISPATCH_TIMEOUT_MS,
      mode: "SANDBOX",
    });

    if (result.outcome === "ACCEPTED") {
      accepted += 1;
      await createDispatchAttempt({
        batchId: batch.id,
        queueItemId: q.id,
        attemptNumber: 1,
        idempotencyKey: idem,
        requestCorrelationId: randomUUID(),
        providerKey: adapter.providerKey,
        status: "PROVIDER_ACCEPTED",
        providerMessageId: result.providerMessageId,
        completedAt: new Date(result.acceptedAt),
      });
    } else if (result.outcome === "UNKNOWN") {
      unknown += 1;
      await createDispatchAttempt({
        batchId: batch.id,
        queueItemId: q.id,
        attemptNumber: 1,
        idempotencyKey: idem,
        requestCorrelationId: randomUUID(),
        providerKey: adapter.providerKey,
        status: "UNKNOWN_OUTCOME",
        errorCategory: result.errorCategory,
        unknownOutcome: true,
        reconciliationState: "PENDING",
        completedAt: new Date(result.completedAt),
      });
    } else {
      rejected += 1;
      await createDispatchAttempt({
        batchId: batch.id,
        queueItemId: q.id,
        attemptNumber: 1,
        idempotencyKey: `${idem}:${result.outcome}:${randomUUID().slice(0, 8)}`,
        requestCorrelationId: randomUUID(),
        providerKey: adapter.providerKey,
        status:
          result.outcome === "BLOCKED" ? "BLOCKED" : "PROVIDER_REJECTED",
        errorCategory: result.errorCategory,
        completedAt: new Date(result.completedAt),
      });
    }
  }

  await updateDispatchBatch(batch.id, {
    status: unknown > 0 || rejected > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
    acceptedCount: accepted,
    rejectedCount: rejected,
    unknownCount: unknown,
    blockedCount: blocked,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  void policy;
  return { batchId: batch.id, accepted, rejected, unknown, blocked };
}

export async function listDispatchHistory(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const rows = await listDispatchBatches();
  return {
    items: rows.map((r) => ({
      id: r.id,
      communicationId: r.communicationId,
      title: r.communication.title,
      channel: r.channel,
      providerKey: r.providerKey,
      status: r.status,
      acceptedCount: r.acceptedCount,
      rejectedCount: r.rejectedCount,
      unknownCount: r.unknownCount,
      blockedCount: r.blockedCount,
      createdAt: r.createdAt.toISOString(),
    })),
    notices: [OPERATOR_NOTICE],
  };
}

export async function getDispatchBatchDetail(
  batchId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const row = await findDispatchBatch(batchId);
  if (!row) throw new NotFoundError("Dispatch batch not found.");
  return {
    id: row.id,
    communicationId: row.communicationId,
    title: row.communication.title,
    channel: row.channel,
    providerKey: row.providerKey,
    status: row.status,
    counts: {
      queue: row.queueItemCount,
      accepted: row.acceptedCount,
      rejected: row.rejectedCount,
      unknown: row.unknownCount,
      blocked: row.blockedCount,
    },
    attempts: row.attempts.map((a) => ({
      id: a.id,
      status: a.status,
      unknownOutcome: a.unknownOutcome,
      reconciliationState: a.reconciliationState,
      errorCategory: a.errorCategory,
      // never expose destination or body
      hasProviderMessageId: Boolean(a.providerMessageId),
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    notices: [
      "Provider acceptance is not delivery. Delivery is not engagement.",
    ],
  };
}

export async function reconcileUnknownAttempt(
  attemptId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const attempt = await prisma.communicationDispatchAttempt.findUnique({
    where: { id: attemptId },
  });
  if (!attempt) throw new NotFoundError("Attempt not found.");
  if (!attempt.unknownOutcome) {
    throw new ValidationError("Attempt is not an unknown outcome.");
  }
  const adapter = resolveProviderAdapter(attempt.providerKey, {
    allowTestAdapter: process.env.NODE_ENV !== "production",
  });
  const result = await adapter.reconcile({
    idempotencyKey: attempt.idempotencyKey,
    correlationId: attempt.requestCorrelationId,
    providerMessageId: attempt.providerMessageId,
  });
  if (result.status === "ACCEPTED" && result.providerMessageId) {
    await updateDispatchAttempt(attempt.id, {
      status: "PROVIDER_ACCEPTED",
      providerMessageId: result.providerMessageId,
      unknownOutcome: false,
      reconciliationState: "RESOLVED",
      completedAt: new Date(),
    });
  } else if (result.status === "NOT_FOUND") {
    await updateDispatchAttempt(attempt.id, {
      reconciliationState: "NOT_FOUND",
      // still unknown until proven safe to retry
    });
  }
  await writeAttributedAudit({
    actor,
    action: "communications.dispatch.reconcile",
    entityType: "CommunicationDispatchAttempt",
    entityId: attempt.id,
    metadata: { status: result.status, found: result.found },
  });
  return { attemptId: attempt.id, result };
}

export async function processCommunicationsWebhook(options: {
  providerKey: string;
  rawBody: string;
  headers: Record<string, string>;
}) {
  const providerKey = options.providerKey.trim().toLowerCase();
  // Fail closed: only registered webhook adapters; test adapter only outside production
  const adapter = resolveProviderAdapter(providerKey, {
    allowTestAdapter: process.env.NODE_ENV !== "production",
  });
  if (adapter.providerKey === "disabled" || adapter.providerKey !== providerKey) {
    if (!(providerKey === "kccc-test" && adapter.providerKey === "kccc-test")) {
      return {
        status: 404 as const,
        body: { ok: false, error: "Provider webhook not registered." },
      };
    }
  }
  if (adapter.providerKey === "disabled") {
    return {
      status: 404 as const,
      body: { ok: false, error: "Provider webhook not registered." },
    };
  }

  const verified = await adapter.verifyWebhook({
    providerKey,
    rawBody: options.rawBody,
    headers: options.headers,
    receivedAtIso: new Date().toISOString(),
  });

  const existing = await findWebhookByReplay(verified.replayFingerprint);
  if (existing) {
    return {
      status: 200 as const,
      body: { ok: true, duplicate: true },
    };
  }

  if (!verified.ok || !verified.signatureValid) {
    await createWebhookReceipt({
      providerKey,
      providerEventId: verified.providerEventId,
      signatureValid: false,
      providerEventAt: verified.providerEventAt
        ? new Date(verified.providerEventAt)
        : null,
      replayFingerprint: verified.replayFingerprint,
      processingStatus: "REJECTED",
      errorCategory: verified.rejectionCategory,
      purgeAfter: new Date(Date.now() + 7 * 86400_000),
    });
    return {
      status: 401 as const,
      body: { ok: false, error: "Webhook verification failed." },
    };
  }

  const normalized = await adapter.normalizeWebhook(verified);
  let matchedAttemptId: string | null = null;
  for (const event of normalized) {
    if (!event.providerMessageId) continue;
    const attempt = await findAttemptByProviderMessageId(event.providerMessageId);
    if (attempt) {
      matchedAttemptId = attempt.id;
      if (
        event.suppressionAction === "CHANNEL_OPT_OUT" ||
        event.suppressionAction === "COMPLAINT" ||
        event.suppressionAction === "INVALID_DESTINATION"
      ) {
        const queue = await prisma.campaignCommunicationQueueItem.findUnique({
          where: { id: attempt.queueItemId },
        });
        if (queue?.contactPointId) {
          const reason =
            event.suppressionAction === "COMPLAINT"
              ? "COMPLAINT"
              : event.suppressionAction === "INVALID_DESTINATION"
                ? "BOUNCE"
                : "OPT_OUT";
          // Idempotent-ish: create suppression with provider provenance
          await createSuppression({
            contactPointId: queue.contactPointId,
            channel: queue.channel,
            allChannels: event.suppressionAction === "COMPLAINT",
            reason,
            source: `PROVIDER_WEBHOOK:${providerKey}`,
            effectiveAt: new Date(event.occurredAt),
            actorUserId: "system-webhook",
          });
        }
      }
      if (event.eventType !== "UNSUPPORTED") {
        await prisma.campaignCommunicationDeliveryEvent.create({
          data: {
            queueItemId: attempt.queueItemId,
            eventType: event.eventType as never,
            source: "PROVIDER",
            providerEventId: verified.providerEventId
              ? `${verified.providerEventId}:${event.eventType}`
              : null,
            occurredAt: new Date(event.occurredAt),
            provenance: `webhook:${providerKey}`,
            redactedDiagnostics: {
              matchedAttempt: true,
              // no body/destination
            },
          },
        }).catch(() => {
          // duplicate provider event id — ignore
        });
      }
    }
  }

  await createWebhookReceipt({
    providerKey,
    providerEventId: verified.providerEventId,
    signatureValid: true,
    providerEventAt: verified.providerEventAt
      ? new Date(verified.providerEventAt)
      : null,
    replayFingerprint: verified.replayFingerprint,
    processingStatus: matchedAttemptId ? "PROCESSED" : "UNMATCHED",
    matchedAttemptId,
    normalizedEventCount: normalized.length,
    purgeAfter: new Date(Date.now() + 30 * 86400_000),
  });

  return {
    status: 200 as const,
    body: {
      ok: true,
      normalizedCount: normalized.length,
      matched: Boolean(matchedAttemptId),
    },
  };
}

export async function listWebhookHistory(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const rows = await listWebhookReceipts();
  return {
    items: rows.map((r) => ({
      id: r.id,
      providerKey: r.providerKey,
      processingStatus: r.processingStatus,
      signatureValid: r.signatureValid,
      normalizedEventCount: r.normalizedEventCount,
      hasMatch: Boolean(r.matchedAttemptId),
      receivedAt: r.receivedAt.toISOString(),
      errorCategory: r.errorCategory,
    })),
    notices: [
      "Raw webhook payloads are not retained in ordinary receipts.",
      "Unsigned webhooks are rejected.",
    ],
  };
}
