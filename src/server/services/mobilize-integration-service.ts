import "server-only";
import { MobilizeAdapter } from "@/features/mobilize-integration/adapter";
import {
  buildBaseCapabilityReport,
  discoverMobilizeCapabilities,
} from "@/features/mobilize-integration/capability";
import {
  getMobilizeIntegrationEnv,
  mobilizeConfigStatus,
} from "@/features/mobilize-integration/config";
import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import { safeErrorSummary } from "@/features/mobilize-integration/redact";
import {
  assertMobilizeDoesNotMutateMissions,
  countByAction,
  reconcileMobilizeEvents,
} from "@/features/mobilize-integration/reconcile";
import { MobilizeTransportError } from "@/features/mobilize-integration/transport";
import type { MobilizeCapabilityReport } from "@/features/mobilize-integration/types";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assertMobilizeIntegrationAdmin } from "@/features/mobilize-integration/require-mobilize-admin";
import { ValidationError } from "@/lib/security/safe-error";
import {
  completeSyncRun,
  createSyncCandidates,
  createSyncRun,
  findMobilizeConnection,
  findMobilizeExternalRefs,
  getSyncRun,
  listSyncRuns,
  updateCandidateDisposition,
  upsertExternalEventReference,
  upsertMobilizeConnection,
} from "@/server/repositories/mobilize-integration-repository";
import { writeAttributedAudit } from "@/server/services/audit-write";

function isolation() {
  return assertMobilizeDoesNotMutateMissions();
}

export async function getMobilizeIntegrationStatus(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  const config = mobilizeConfigStatus(env);
  const connection = await findMobilizeConnection();
  const capability =
    (connection?.capabilityJson as MobilizeCapabilityReport | null) ??
    buildBaseCapabilityReport(
      config.fullyConfigured ? "CONFIGURED_UNVERIFIED" : "NOT_CONFIGURED",
    );
  return {
    config,
    connection: connection
      ? {
          id: connection.id,
          status: connection.status,
          organizationId: connection.externalOrganizationId,
          organizationName: connection.organizationName,
          organizationSlug: connection.organizationSlug,
          lastVerifiedAt: connection.lastVerifiedAt?.toISOString() ?? null,
          lastSuccessfulConnectionAt:
            connection.lastSuccessfulConnectionAt?.toISOString() ?? null,
          lastErrorCode: connection.lastErrorCode,
          lastErrorCategory: connection.lastErrorCategory,
          lastErrorSummary: connection.lastErrorSummary,
          outboundWritesEnabled: config.outboundWritesEnabled,
          publishingEnabled: config.publishingEnabled,
          updatesEnabled: config.updatesEnabled,
          deleteEnabled: config.deleteEnabled,
          enabledImportScopes: connection.enabledImportScopesJson,
        }
      : null,
    capability,
    documentation: {
      revision: MOBILIZE_DOCS.documentationRevisionShort,
      inspectionDate: MOBILIZE_DOCS.inspectionDate,
      apiBaseUrl: MOBILIZE_DOCS.apiBaseUrl,
      rateLimits: {
        readPerSecond: MOBILIZE_DOCS.rateLimitReadPerSecond,
        writePerSecond: MOBILIZE_DOCS.rateLimitWritePerSecond,
        note: MOBILIZE_DOCS.rateLimitNote,
      },
    },
    isolation: isolation(),
  };
}

export async function verifyMobilizeConnection(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.apiKey || !env.organizationId) {
    const capability = buildBaseCapabilityReport("NOT_CONFIGURED", {
      publishingEnabled: env.publishingEnabled,
      updatesEnabled: env.updatesEnabled,
      deleteEnabled: env.deleteEnabled,
    });
    return {
      ok: false as const,
      state: "NOT_CONFIGURED" as const,
      capability,
      message: "Set MOBILIZE_API_KEY and MOBILIZE_ORGANIZATION_ID in server env.",
    };
  }

  const adapter = new MobilizeAdapter({
    apiKey: env.apiKey,
    apiBaseUrl: env.apiBaseUrl,
    organizationId: env.organizationId,
  });

  const capability = await discoverMobilizeCapabilities({
    adapter,
    importEventsEnabled: env.importEventsEnabled,
    expectedOrganizationId: env.organizationId,
    publishingEnabled: env.publishingEnabled,
    updatesEnabled: env.updatesEnabled,
    deleteEnabled: env.deleteEnabled,
  });

  const connection = await upsertMobilizeConnection({
    externalOrganizationId: env.organizationId,
    organizationName: capability.organization.name,
    organizationSlug: capability.organization.slug,
    status: capability.connectionState,
    lastVerifiedAt: new Date(),
    lastSuccessfulConnectionAt:
      capability.connectionState === "CONNECTED" ||
      capability.connectionState === "DEGRADED"
        ? new Date()
        : null,
    lastErrorCode:
      capability.connectionState === "CONNECTED" ? null : capability.connectionState,
    lastErrorCategory:
      capability.connectionState === "CONNECTED" ? null : capability.connectionState,
    lastErrorSummary:
      capability.connectionState === "CONNECTED"
        ? null
        : `Connection state: ${capability.connectionState}`,
    capabilityJson: capability,
    enabledImportScopesJson: env.importEventsEnabled ? ["EVENTS", "TIMESLOTS"] : [],
    actorUserId: actor.userId,
  });

  await writeAttributedAudit({
    actor,
    action: "MOBILIZE_CONNECTION_VERIFY",
    entityType: "ExternalIntegrationConnection",
    entityId: connection.id,
    reason: `Mobilize verify → ${capability.connectionState}`,
    metadata: {
      state: capability.connectionState,
      documentationRevision: MOBILIZE_DOCS.documentationRevisionShort,
    },
  });

  return {
    ok: capability.connectionState === "CONNECTED" ||
      capability.connectionState === "DEGRADED",
    state: capability.connectionState,
    capability,
    connectionId: connection.id,
  };
}

export async function startMobilizeEventDryRun(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.apiKey || !env.organizationId) {
    throw new ValidationError(
      "Mobilize is NOT_CONFIGURED. Set MOBILIZE_API_KEY and MOBILIZE_ORGANIZATION_ID.",
    );
  }

  const connection = await findMobilizeConnection();
  const run = await createSyncRun({
    connectionId: connection?.id ?? null,
    objectScope: "EVENTS",
    mode: "DRY_RUN",
    requestedByUserId: actor.userId,
    documentationRevision: MOBILIZE_DOCS.documentationRevisionShort,
    adapterVersion: MOBILIZE_DOCS.adapterVersion,
  });

  try {
    const adapter = new MobilizeAdapter({
      apiKey: env.apiKey,
      apiBaseUrl: env.apiBaseUrl,
      organizationId: env.organizationId,
    });
    const remoteEvents = [];
    let next: string | null | undefined = undefined;
    let pages = 0;
    do {
      const page = await adapter.listOrganizationEvents(
        next ? { nextUrl: next } : { perPage: 25 },
      );
      remoteEvents.push(...page.data);
      next = page.next;
      pages += 1;
      if (page.resultsLimitedTo != null) {
        // Detected results_limited_to — stop after documenting.
        break;
      }
    } while (next && pages < 10);

    let deletedEvents: Array<{ id: string; deletedAt: string | null }> = [];
    try {
      const deletedPage = await adapter.listDeletedOrganizationEvents();
      deletedEvents = deletedPage.data;
    } catch {
      deletedEvents = [];
    }

    const refs = await findMobilizeExternalRefs();
    const refMap = new Map(refs.map((r) => [r.externalObjectId, r]));
    const candidates = reconcileMobilizeEvents({
      remoteEvents,
      deletedEvents,
      referencesByExternalId: refMap,
    });
    // Dry run must not create ExternalObjectReference rows.
    await createSyncCandidates(
      run.id,
      candidates.map((c) => ({
        externalObjectType: c.externalObjectType,
        externalObjectId: c.externalObjectId,
        proposedLocalObjectType: c.proposedLocalObjectType,
        proposedLocalObjectId: c.proposedLocalObjectId,
        action: c.action,
        conflictState: c.conflictState,
        comparisonFingerprint: c.comparisonFingerprint,
        changeSummary: c.changeSummary,
      })),
    );
    const counts = countByAction(candidates);
    await completeSyncRun(run.id, {
      status: "COMPLETED",
      completedByUserId: actor.userId,
      remoteExaminedCount: remoteEvents.length + deletedEvents.length,
      createsProposed: counts.NEW_REMOTE,
      updatesProposed: counts.REMOTE_CHANGED + counts.BOTH_CHANGED,
      unchangedCount: counts.MATCHED_UNCHANGED,
      conflictCount:
        counts.CONFLICT + counts.AMBIGUOUS_MATCH + counts.BOTH_CHANGED,
      skippedCount: counts.IGNORED + counts.UNSUPPORTED,
      rateLimitObserved: adapter.rateLimitObserved,
      diagnosticSummary: safeErrorSummary(
        `Dry-run examined ${remoteEvents.length} events, ${deletedEvents.length} deleted.`,
      ),
    });

    await writeAttributedAudit({
      actor,
      action: "MOBILIZE_DRY_RUN",
      entityType: "ExternalSyncRun",
      entityId: run.id,
      reason: "Mobilize event dry-run completed",
      metadata: { counts, pages },
    });

    return getMobilizeSyncRun(actor, run.id);
  } catch (err) {
    const message =
      err instanceof MobilizeTransportError
        ? err.message
        : err instanceof Error
          ? safeErrorSummary(err.message)
          : "Dry-run failed";
    await completeSyncRun(run.id, {
      status: "FAILED",
      completedByUserId: actor.userId,
      errorCount: 1,
      diagnosticSummary: message,
    });
    throw err;
  }
}

export async function getMobilizeSyncRun(actor: AuthenticatedActor, runId: string) {
  assertMobilizeIntegrationAdmin(actor);
  const run = await getSyncRun(runId);
  if (!run) throw new ValidationError("Sync run not found.");
  return {
    run: {
      id: run.id,
      mode: run.mode,
      status: run.status,
      objectScope: run.objectScope,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      remoteExaminedCount: run.remoteExaminedCount,
      createsProposed: run.createsProposed,
      createsApplied: run.createsApplied,
      updatesProposed: run.updatesProposed,
      updatesApplied: run.updatesApplied,
      unchangedCount: run.unchangedCount,
      conflictCount: run.conflictCount,
      skippedCount: run.skippedCount,
      errorCount: run.errorCount,
      rateLimitObserved: run.rateLimitObserved,
      diagnosticSummary: run.diagnosticSummary,
      documentationRevision: run.documentationRevision,
      adapterVersion: run.adapterVersion,
    },
    candidates: run.candidates.map((c) => ({
      id: c.id,
      action: c.action,
      disposition: c.disposition,
      externalObjectType: c.externalObjectType,
      externalObjectId: c.externalObjectId,
      proposedLocalObjectType: c.proposedLocalObjectType,
      proposedLocalObjectId: c.proposedLocalObjectId,
      comparisonFingerprint: c.comparisonFingerprint,
      changeSummary: c.changeSummary,
      conflictState: c.conflictState,
      reviewedAt: c.reviewedAt?.toISOString() ?? null,
      appliedAt: c.appliedAt?.toISOString() ?? null,
    })),
    isolation: isolation(),
  };
}

export async function listMobilizeSyncRuns(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  const runs = await listSyncRuns(30);
  return {
    runs: runs.map((r) => ({
      id: r.id,
      mode: r.mode,
      status: r.status,
      objectScope: r.objectScope,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      createsProposed: r.createsProposed,
      conflictCount: r.conflictCount,
      diagnosticSummary: r.diagnosticSummary,
    })),
  };
}

/**
 * Explicit apply: registers ExternalObjectReference for approved NEW_REMOTE /
 * REMOTE_CHANGED / REMOTE_DELETED candidates. Does not create Missions or
 * materialize Events in D16 (person/attendance apply disabled).
 */
export async function applyMobilizeCandidates(options: {
  actor: AuthenticatedActor;
  runId: string;
  candidateIds: string[];
}) {
  assertMobilizeIntegrationAdmin(options.actor);
  const detail = await getSyncRun(options.runId);
  if (!detail || detail.mode !== "DRY_RUN" || detail.status !== "COMPLETED") {
    throw new ValidationError("Apply requires a completed dry-run.");
  }
  const now = new Date();
  let applied = 0;
  let stale = 0;
  let errors = 0;

  for (const id of options.candidateIds) {
    const candidate = detail.candidates.find((c) => c.id === id);
    if (!candidate) {
      errors += 1;
      continue;
    }
    if (
      candidate.action !== "NEW_REMOTE" &&
      candidate.action !== "REMOTE_CHANGED" &&
      candidate.action !== "REMOTE_DELETED"
    ) {
      await updateCandidateDisposition({
        candidateId: id,
        disposition: "SKIPPED",
        actorUserId: options.actor.userId,
        now,
        errorSummary: "Action not eligible for D16 apply.",
      });
      continue;
    }
    try {
      await upsertExternalEventReference({
        externalObjectId: candidate.externalObjectId,
        contentFingerprint: candidate.comparisonFingerprint ?? "",
        remoteDeletedAt:
          candidate.action === "REMOTE_DELETED" ? now.toISOString() : null,
        actorUserId: options.actor.userId,
        now,
      });
      await updateCandidateDisposition({
        candidateId: id,
        disposition: "APPLIED",
        actorUserId: options.actor.userId,
        now,
      });
      applied += 1;
    } catch (err) {
      errors += 1;
      await updateCandidateDisposition({
        candidateId: id,
        disposition: "STALE",
        actorUserId: options.actor.userId,
        now,
        errorSummary: safeErrorSummary(
          err instanceof Error ? err.message : "Apply failed",
        ),
      });
      stale += 1;
    }
  }

  await writeAttributedAudit({
    actor: options.actor,
    action: "MOBILIZE_APPLY_CANDIDATES",
    entityType: "ExternalSyncRun",
    entityId: options.runId,
    reason: `Applied ${applied} Mobilize candidates`,
    metadata: { applied, stale, errors },
  });

  return {
    applied,
    stale,
    errors,
    isolation: isolation(),
    detail: await getMobilizeSyncRun(options.actor, options.runId),
  };
}
