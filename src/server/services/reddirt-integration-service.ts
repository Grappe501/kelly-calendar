import "server-only";
import { RedDirtAdapter } from "@/features/reddirt-integration/adapter";
import {
  getRedDirtIntegrationEnv,
  reddirtConfigStatus,
} from "@/features/reddirt-integration/config";
import { REDDIRT_DOCS } from "@/features/reddirt-integration/docs-revision";
import { parseRedDirtExport } from "@/features/reddirt-integration/export-parse";
import { loadStrategicGeographyFixture } from "@/features/reddirt-integration/fixture-reader";
import { reconcileRedDirtGeography } from "@/features/reddirt-integration/geography-reconcile";
import { normalizeStrategicRecord } from "@/features/reddirt-integration/normalize";
import { safeErrorSummary } from "@/features/reddirt-integration/redact";
import { assertRedDirtIntegrationAdmin } from "@/features/reddirt-integration/require-reddirt-admin";
import type { RawStrategicRecord } from "@/features/reddirt-integration/types";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { ValidationError } from "@/lib/security/safe-error";
import { loadGeographyAuthorityIndex } from "@/server/services/geography-foundation-service";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  applyStrategicGeographyFact,
  completeRedDirtSyncRun,
  createRedDirtSyncCandidates,
  createRedDirtSyncRun,
  createStrategicObservation,
  findRedDirtConnection,
  findRedDirtFactFingerprints,
  getRedDirtSyncRun,
  listActiveStrategicFacts,
  listRedDirtSyncRuns,
  listStrategicFactsForCounty,
  updateRedDirtCandidateDisposition,
  upsertRedDirtConnection,
  upsertRedDirtObjectReference,
} from "@/server/repositories/reddirt-integration-repository";

function isolation() {
  return {
    mutatesEvents: false,
    mutatesMissions: false,
    mutatesPersons: false,
    writesToRedDirt: false,
    modelInvocations: false,
    note: "IC-02 write surface limited to External* + Strategic* + audit.",
  };
}

function mapObjectType(raw: string): string {
  const u = raw.toUpperCase();
  if (u.includes("PLACE")) return "GEOGRAPHY_PLACE";
  if (u.includes("COUNTY")) return "GEOGRAPHY_COUNTY";
  return "STRATEGIC_FACT";
}

export async function getRedDirtIntegrationStatus(actor: AuthenticatedActor) {
  assertRedDirtIntegrationAdmin(actor);
  const env = getRedDirtIntegrationEnv();
  const config = reddirtConfigStatus(env);
  const connection = await findRedDirtConnection();
  const recentRuns = await listRedDirtSyncRuns(5);
  const facts = await listActiveStrategicFacts(5);
  return {
    config,
    connectionState: config.connectionStateHint,
    readOnly: true,
    apiVersusExportMode:
      config.networkReadsAllowed &&
      REDDIRT_DOCS.documentationStatus !== "DOCUMENTATION_PENDING"
        ? "API_READ"
        : "FIXTURE_OR_APPROVED_EXPORT",
    documentation: {
      status: REDDIRT_DOCS.documentationStatus,
      revision: REDDIRT_DOCS.documentationRevisionShort,
      inspectionDate: REDDIRT_DOCS.inspectionDate,
      location: REDDIRT_DOCS.documentationLocation,
      allowlistedHosts: REDDIRT_DOCS.allowlistedHosts,
    },
    capabilities: {
      documented: REDDIRT_DOCS.supportedReadEndpoints,
      credentialTested: [] as string[],
      applicationEnabled: [
        "status",
        "verify_fail_closed",
        "fixture_dry_run",
        "export_preview",
        "geography_reconcile",
        "approve_apply_strategic_fact",
      ],
    },
    connection: connection
      ? {
          id: connection.id,
          status: connection.status,
          organizationId: connection.externalOrganizationId,
          lastVerifiedAt: connection.lastVerifiedAt?.toISOString() ?? null,
          lastErrorSummary: connection.lastErrorSummary,
          outboundWritesEnabled: false,
        }
      : null,
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      status: r.status,
      mode: r.mode,
      startedAt: r.startedAt.toISOString(),
      remoteExaminedCount: r.remoteExaminedCount,
    })),
    appliedFactSample: facts.map((f) => ({
      id: f.id,
      factKind: f.factKind,
      factValue: f.factValue,
      sourceAttributionLabel: f.sourceAttributionLabel,
      arkansasCountyId: f.arkansasCountyId,
    })),
    isolation: isolation(),
  };
}

export async function verifyRedDirtConnection(actor: AuthenticatedActor) {
  assertRedDirtIntegrationAdmin(actor);
  const env = getRedDirtIntegrationEnv();
  const config = reddirtConfigStatus(env);

  if (!env.apiKey || !env.organizationId) {
    return {
      ok: false as const,
      state: "NOT_CONFIGURED" as const,
      message:
        "Set REDDIRT_API_KEY and REDDIRT_ORGANIZATION_ID. Use fixture dry-run until configured.",
      networkCalls: 0,
    };
  }

  if (!env.readEnabled) {
    return {
      ok: false as const,
      state: "DISABLED" as const,
      message: "REDDIRT_READ_ENABLED is false — no network request made.",
      networkCalls: 0,
    };
  }

  const adapter = new RedDirtAdapter({
    apiKey: env.apiKey,
    baseUrl: env.baseUrl,
    organizationId: env.organizationId,
    readEnabled: env.readEnabled,
  });
  const result = await adapter.verifyConnection();

  await upsertRedDirtConnection({
    externalOrganizationId: env.organizationId,
    organizationName: "RedDirt",
    status:
      result.state === "DOCUMENTATION_PENDING"
        ? "CONFIGURED_UNVERIFIED"
        : result.state === "DISABLED"
          ? "NOT_CONFIGURED"
          : "UNAVAILABLE",
    lastVerifiedAt: new Date(),
    lastErrorCode: result.state,
    lastErrorCategory: result.state,
    lastErrorSummary: result.message,
    capabilityJson: {
      documentationStatus: REDDIRT_DOCS.documentationStatus,
      config,
      verify: result,
    },
    enabledImportScopesJson: ["STRATEGIC_GEOGRAPHY"],
    actorUserId: actor.userId,
  });

  await writeAttributedAudit({
    actor,
    action: "REDDIRT_CONNECTION_VERIFY",
    entityType: "ExternalIntegrationConnection",
    entityId: env.organizationId,
    reason: `RedDirt verify → ${result.state}`,
    metadata: {
      state: result.state,
      networkCalls: result.networkCalls,
      documentationRevision: REDDIRT_DOCS.documentationRevisionShort,
    },
  });

  return result;
}

async function runDryRunFromRecords(
  actor: AuthenticatedActor,
  records: RawStrategicRecord[],
  objectScope: string,
  diagnosticSummary: string,
) {
  const connection = await findRedDirtConnection();
  const run = await createRedDirtSyncRun({
    connectionId: connection?.id ?? null,
    objectScope,
    mode: "DRY_RUN",
    requestedByUserId: actor.userId,
    documentationRevision: REDDIRT_DOCS.documentationRevisionShort,
    adapterVersion: REDDIRT_DOCS.adapterVersion,
  });

  try {
    const index = await loadGeographyAuthorityIndex();
    const existing = await findRedDirtFactFingerprints();
    const candidateRows = [];
    let excluded = 0;
    let ambiguous = 0;
    let unmatched = 0;
    let exact = 0;

    for (const raw of records) {
      const normalized = normalizeStrategicRecord(raw);
      excluded += normalized.excludedFieldCount;
      if (
        normalized.privacyClassification === "PERSONAL_CONTACT" ||
        normalized.privacyClassification === "SENSITIVE_PERSONAL"
      ) {
        unmatched += 1;
        continue;
      }
      const geo = reconcileRedDirtGeography(normalized, index, existing);
      if (geo.outcome === "EXACT" || geo.outcome === "MAPPED") exact += 1;
      if (geo.outcome === "AMBIGUOUS") ambiguous += 1;
      if (geo.outcome === "UNMATCHED") unmatched += 1;

      candidateRows.push({
        externalObjectType: mapObjectType(normalized.objectType),
        externalObjectId: normalized.externalObjectId,
        proposedLocalObjectType: geo.proposedLocalObjectType,
        proposedLocalObjectId: geo.proposedLocalObjectId,
        action: geo.action,
        conflictState:
          geo.outcome === "AMBIGUOUS"
            ? "MANUAL_REQUIRED"
            : ("NONE" as const),
        comparisonFingerprint: normalized.fingerprint,
        changeSummary: safeErrorSummary(
          JSON.stringify({
            factKind: normalized.factKind,
            factValue: normalized.factValue,
            outcome: geo.outcome,
            matchMethod: geo.matchMethod,
            excludedFieldCount: normalized.excludedFieldCount,
            focusArea: normalized.focusArea,
            countyFips: normalized.countyFips,
            mappingVersion: normalized.mappingVersion,
            geographyReconcileVersion: geo.geographyReconcileVersion,
          }),
          800,
        ),
      });
    }

    await createRedDirtSyncCandidates(run.id, candidateRows);
    await completeRedDirtSyncRun(run.id, {
      status: "COMPLETED",
      remoteExaminedCount: records.length,
      createsProposed: candidateRows.filter((c) => c.action === "NEW_REMOTE")
        .length,
      unchangedCount: candidateRows.filter(
        (c) => c.action === "MATCHED_UNCHANGED",
      ).length,
      conflictCount: ambiguous,
      skippedCount: unmatched,
      diagnosticSummary: safeErrorSummary(
        `${diagnosticSummary}; exact=${exact}; ambiguous=${ambiguous}; unmatched=${unmatched}; excludedFields=${excluded}`,
      ),
    });

    await writeAttributedAudit({
      actor,
      action: "REDDIRT_DRY_RUN",
      entityType: "ExternalSyncRun",
      entityId: run.id,
      reason: diagnosticSummary,
      metadata: {
        examined: records.length,
        candidates: candidateRows.length,
        exact,
        ambiguous,
        unmatched,
      },
    });

    return {
      runId: run.id,
      examined: records.length,
      candidates: candidateRows.length,
      exact,
      ambiguous,
      unmatched,
      excludedFieldTouches: excluded,
      strategicFactsCreated: 0,
    };
  } catch (err) {
    await completeRedDirtSyncRun(run.id, {
      status: "FAILED",
      errorCount: 1,
      diagnosticSummary: safeErrorSummary(
        err instanceof Error ? err.message : "dry-run failed",
      ),
    });
    throw err;
  }
}

/** Intentional dry-run from fixture when NOT_CONFIGURED / docs pending. */
export async function startRedDirtDryRun(actor: AuthenticatedActor) {
  assertRedDirtIntegrationAdmin(actor);
  const fixture = loadStrategicGeographyFixture();
  return runDryRunFromRecords(
    actor,
    fixture.records,
    "STRATEGIC_GEOGRAPHY_FIXTURE",
    "Fixture dry-run (NOT live RedDirt)",
  );
}

export async function previewRedDirtExport(
  actor: AuthenticatedActor,
  file: { buffer: Buffer; filename: string },
) {
  assertRedDirtIntegrationAdmin(actor);
  const parsed = parseRedDirtExport(file.buffer, file.filename);
  return {
    ...parsed,
    recordsPreview: parsed.records.slice(0, 25),
    note: "Preview only — no candidates or facts created.",
  };
}

export async function startRedDirtExportDryRun(
  actor: AuthenticatedActor,
  file: { buffer: Buffer; filename: string },
) {
  assertRedDirtIntegrationAdmin(actor);
  const parsed = parseRedDirtExport(file.buffer, file.filename);
  if (parsed.errors.length && !parsed.records.length) {
    throw new ValidationError(parsed.errors.join("; "));
  }
  return runDryRunFromRecords(
    actor,
    parsed.records,
    `STRATEGIC_GEOGRAPHY_EXPORT:${parsed.sourceHash}`,
    `Approved-export dry-run ${file.filename}`,
  );
}

export async function listRedDirtRuns(actor: AuthenticatedActor) {
  assertRedDirtIntegrationAdmin(actor);
  const runs = await listRedDirtSyncRuns(50);
  return runs.map((r) => ({
    id: r.id,
    status: r.status,
    mode: r.mode,
    objectScope: r.objectScope,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    remoteExaminedCount: r.remoteExaminedCount,
    createsProposed: r.createsProposed,
    createsApplied: r.createsApplied,
    conflictCount: r.conflictCount,
    skippedCount: r.skippedCount,
    diagnosticSummary: r.diagnosticSummary,
  }));
}

export async function getRedDirtRun(actor: AuthenticatedActor, runId: string) {
  assertRedDirtIntegrationAdmin(actor);
  const run = await getRedDirtSyncRun(runId);
  if (!run) {
    throw new ValidationError("RedDirt sync run not found.");
  }
  return {
    id: run.id,
    status: run.status,
    mode: run.mode,
    objectScope: run.objectScope,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    requestedByUserId: run.requestedByUserId,
    remoteExaminedCount: run.remoteExaminedCount,
    createsProposed: run.createsProposed,
    createsApplied: run.createsApplied,
    updatesProposed: run.updatesProposed,
    updatesApplied: run.updatesApplied,
    unchangedCount: run.unchangedCount,
    conflictCount: run.conflictCount,
    skippedCount: run.skippedCount,
    errorCount: run.errorCount,
    diagnosticSummary: run.diagnosticSummary,
    documentationRevision: run.documentationRevision,
    adapterVersion: run.adapterVersion,
    candidates: run.candidates.map((c) => ({
      id: c.id,
      externalObjectId: c.externalObjectId,
      externalObjectType: c.externalObjectType,
      action: c.action,
      disposition: c.disposition,
      proposedLocalObjectType: c.proposedLocalObjectType,
      proposedLocalObjectId: c.proposedLocalObjectId,
      comparisonFingerprint: c.comparisonFingerprint,
      changeSummary: c.changeSummary,
      conflictState: c.conflictState,
    })),
    isolation: isolation(),
  };
}

export async function disposeRedDirtCandidate(
  actor: AuthenticatedActor,
  input: { candidateId: string; disposition: "APPROVED" | "REJECTED" | "SKIPPED" },
) {
  assertRedDirtIntegrationAdmin(actor);
  const now = new Date();
  const updated = await updateRedDirtCandidateDisposition({
    candidateId: input.candidateId,
    disposition: input.disposition,
    actorUserId: actor.userId,
    now,
  });
  await writeAttributedAudit({
    actor,
    action: "REDDIRT_CANDIDATE_DISPOSITION",
    entityType: "ExternalSyncCandidate",
    entityId: updated.id,
    reason: `disposition=${input.disposition}`,
  });
  return { id: updated.id, disposition: updated.disposition };
}

export async function applyRedDirtCandidates(options: {
  actor: AuthenticatedActor;
  runId: string;
  candidateIds: string[];
}) {
  assertRedDirtIntegrationAdmin(options.actor);
  const run = await getRedDirtSyncRun(options.runId);
  if (!run || run.status !== "COMPLETED" || run.mode !== "DRY_RUN") {
    throw new ValidationError(
      "Apply requires a completed RedDirt DRY_RUN with current candidates.",
    );
  }

  const now = new Date();
  let created = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const candidateId of options.candidateIds) {
    const candidate = run.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      skipped += 1;
      continue;
    }
    if (candidate.disposition === "STALE") {
      skipped += 1;
      continue;
    }
    if (
      candidate.disposition !== "APPROVED" &&
      candidate.disposition !== "PENDING"
    ) {
      // Allow PENDING with explicit apply list as approval-in-apply for fixture path
      if (candidate.disposition === "REJECTED") {
        skipped += 1;
        continue;
      }
    }
    if (
      candidate.action === "AMBIGUOUS_MATCH" ||
      candidate.action === "CONFLICT" ||
      candidate.action === "UNSUPPORTED" ||
      candidate.action === "IGNORED"
    ) {
      await updateRedDirtCandidateDisposition({
        candidateId: candidate.id,
        disposition: "SKIPPED",
        actorUserId: options.actor.userId,
        now,
        errorCode: "NOT_APPLYABLE",
        errorSummary: `action=${candidate.action}`,
      });
      skipped += 1;
      continue;
    }
    if (!candidate.comparisonFingerprint || !candidate.proposedLocalObjectId) {
      skipped += 1;
      continue;
    }

    // Explicit approval step
    if (candidate.disposition === "PENDING") {
      await updateRedDirtCandidateDisposition({
        candidateId: candidate.id,
        disposition: "APPROVED",
        actorUserId: options.actor.userId,
        now,
      });
    }

    let summary: Record<string, unknown> = {};
    try {
      summary = JSON.parse(candidate.changeSummary ?? "{}") as Record<
        string,
        unknown
      >;
    } catch {
      summary = {};
    }

    const observation = await createStrategicObservation({
      externalObjectType: candidate.externalObjectType,
      externalObjectId: candidate.externalObjectId,
      normalizedFingerprint: candidate.comparisonFingerprint,
      allowedFieldsJson: {
        factKind: summary.factKind ?? "COUNTY_PRIORITY",
        factValue: summary.factValue ?? "",
        countyFips: summary.countyFips ?? null,
      },
      privacyClassification: "CAMPAIGN_STRATEGIC",
      syncRunId: run.id,
    });

    const ref = await upsertRedDirtObjectReference({
      externalObjectId: candidate.externalObjectId,
      objectType: candidate.externalObjectType,
      contentFingerprint: candidate.comparisonFingerprint,
      localObjectType: candidate.proposedLocalObjectType,
      localObjectId: candidate.proposedLocalObjectId,
      now,
      actorUserId: options.actor.userId,
    });

    const isCounty =
      candidate.proposedLocalObjectType === "ArkansasCounty";
    const result = await applyStrategicGeographyFact({
      externalObjectType: candidate.externalObjectType,
      externalObjectId: candidate.externalObjectId,
      factKind: String(summary.factKind ?? "COUNTY_PRIORITY"),
      factValue: String(summary.factValue ?? ""),
      factUnits: summary.factUnits ? String(summary.factUnits) : null,
      contentFingerprint: candidate.comparisonFingerprint,
      arkansasCountyId: isCounty ? candidate.proposedLocalObjectId : null,
      geographyPlaceAuthorityId: !isCounty
        ? candidate.proposedLocalObjectId
        : null,
      observationId: observation.id,
      externalObjectReferenceId: ref.id,
      observedAt: now,
      appliedByUserId: options.actor.userId,
      syncRunId: run.id,
    });

    if (result.created) created += 1;
    else duplicates += 1;

    await updateRedDirtCandidateDisposition({
      candidateId: candidate.id,
      disposition: "APPLIED",
      actorUserId: options.actor.userId,
      now,
    });
  }

  await completeRedDirtSyncRun(run.id, {
    status: "COMPLETED",
    createsApplied: (run.createsApplied ?? 0) + created,
    diagnosticSummary: safeErrorSummary(
      `${run.diagnosticSummary ?? ""}; apply created=${created} duplicates=${duplicates} skipped=${skipped}`,
    ),
  });

  await writeAttributedAudit({
    actor: options.actor,
    action: "REDDIRT_APPLY",
    entityType: "ExternalSyncRun",
    entityId: run.id,
    reason: `created=${created}; duplicates=${duplicates}; skipped=${skipped}`,
    metadata: { created, duplicates, skipped },
  });

  return {
    runId: run.id,
    created,
    duplicates,
    skipped,
    isolation: isolation(),
  };
}

export async function getRedDirtPolicy(actor: AuthenticatedActor) {
  assertRedDirtIntegrationAdmin(actor);
  return {
    denyByDefault: true,
    allowedClasses: [
      "PUBLIC_GEOGRAPHY",
      "CAMPAIGN_STRATEGIC",
      "VOLUNTEER_AGGREGATE",
    ],
    deniedClasses: ["PERSONAL_CONTACT", "SENSITIVE_PERSONAL", "UNKNOWN"],
    deniedFields: REDDIRT_DOCS.privacySensitiveFieldsDeniedByDefault,
    privacyAllowlistVersion: REDDIRT_DOCS.privacyAllowlistVersion,
    personImport: false,
    consentInference: false,
    reddirtWrites: false,
    modelInvocations: false,
  };
}

export async function getRedDirtGeographySummary(actor: AuthenticatedActor) {
  assertRedDirtIntegrationAdmin(actor);
  const facts = await listActiveStrategicFacts(200);
  return {
    activeFactCount: facts.length,
    facts: facts.map((f) => ({
      id: f.id,
      factKind: f.factKind,
      factValue: f.factValue,
      sourceAttributionLabel: f.sourceAttributionLabel,
      arkansasCountyId: f.arkansasCountyId,
      geographyPlaceAuthorityId: f.geographyPlaceAuthorityId,
      contentFingerprint: f.contentFingerprint,
      observedAt: f.observedAt.toISOString(),
      appliedAt: f.appliedAt?.toISOString() ?? null,
    })),
  };
}

export async function getCountyStrategicFacts(
  actor: AuthenticatedActor,
  arkansasCountyId: string,
) {
  // Leadership not strictly required for restrained badge — but keep gated.
  assertRedDirtIntegrationAdmin(actor);
  return listStrategicFactsForCounty(arkansasCountyId);
}
