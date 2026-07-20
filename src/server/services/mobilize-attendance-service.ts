import "server-only";
import { MobilizeAdapter } from "@/features/mobilize-integration/adapter";
import {
  assertMobilizeAttendanceIsolation,
  buildAttendanceAggregates,
  proposePersonMatch,
} from "@/features/mobilize-integration/attendance";
import {
  getMobilizeIntegrationEnv,
  mobilizeConfigStatus,
} from "@/features/mobilize-integration/config";
import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import { assertMobilizeIntegrationAdmin } from "@/features/mobilize-integration/require-mobilize-admin";
import type { NormalizedMobilizeAttendance } from "@/features/mobilize-integration/types";
import { AppError, ValidationError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  completeSyncRun,
  createSyncCandidates,
  createSyncRun,
  findMobilizeConnection,
} from "@/server/repositories/mobilize-integration-repository";
import {
  createAttendanceCorrelation,
  findLocalEventForExternalMobilizeEvent,
  listAttendanceObservations,
  listCorrelationsForMission,
  listObservationsForExternalEvent,
  listPersonMatches,
  removeAttendanceCorrelation,
  upsertAttendanceObservation,
  upsertPersonMatch,
} from "@/server/repositories/mobilize-attendance-repository";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { prisma } from "@/server/db/prisma";

/** D18: local Person lacks consent-aware authority — person-level apply stays off. */
export const PERSON_LEVEL_APPLY_ENABLED = false;

export async function getMobilizeAttendanceWorkspace(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  const config = mobilizeConfigStatus(env);
  const observations = await listAttendanceObservations(50);
  const matches = await listPersonMatches();
  return {
    config: {
      ...config,
      importAttendanceEnabled: env.importAttendanceEnabled,
      personLevelApplyEnabled: PERSON_LEVEL_APPLY_ENABLED,
      personConsentAuthorityPresent: MOBILIZE_DOCS.personConsentAuthorityPresent,
    },
    observations,
    matches,
    isolation: assertMobilizeAttendanceIsolation(),
    documentation: {
      revision: MOBILIZE_DOCS.documentationRevisionShort,
      inspectionDate: MOBILIZE_DOCS.d18InspectionDate,
      attendanceAdapterVersion: MOBILIZE_DOCS.attendanceAdapterVersion,
      statuses: MOBILIZE_DOCS.attendanceStatusesDocumented,
      deniedFields: MOBILIZE_DOCS.attendanceFieldsDeniedByDefault,
      credentialTesting: MOBILIZE_DOCS.liveAttendanceCredentialTesting,
    },
    notice:
      "Signup ≠ attendance ≠ local check-in ≠ Mission Execute. Custom signup values are deny-by-default.",
  };
}

export async function previewAttendanceAggregates(
  actor: AuthenticatedActor,
  externalEventId?: string | null,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.apiKey || !env.organizationId) {
    return {
      state: "NOT_CONFIGURED" as const,
      aggregates: buildAttendanceAggregates({ rows: [] }),
      message:
        "Mobilize credentials not configured — aggregates empty; local ops unaffected.",
      isolation: assertMobilizeAttendanceIsolation(),
    };
  }

  // Preview uses stored observations only — does not start a remote sync.
  const rows = externalEventId
    ? await listObservationsForExternalEvent(externalEventId)
    : await listAttendanceObservations(500);

  const normalized: NormalizedMobilizeAttendance[] = rows.map((r) => ({
    id: r.externalAttendanceId,
    eventId: r.externalEventId,
    timeslotId: r.externalTimeslotId,
    personId: r.externalPersonId,
    status: r.remoteStatus,
    isSignup:
      r.statusCategory === "SIGNUP_REGISTERED" ||
      r.statusCategory === "SIGNUP_CONFIRMED",
    isCancelled: r.statusCategory === "CANCELLED",
    attended: r.attendedFlag,
    createdAt: r.signupAt?.toISOString() ?? null,
    modifiedAt: r.remoteModifiedAt?.toISOString() ?? null,
    customSignupFieldCount: 0,
    hasReferrer: false,
    fingerprint: r.contentFingerprint,
  }));

  const localEventByExternal = new Map<string, string>();
  const localMissionByLocalEvent = new Map<string, string>();
  for (const r of rows) {
    if (r.localEventId) {
      localEventByExternal.set(r.externalEventId, r.localEventId);
      if (r.localMissionId) {
        localMissionByLocalEvent.set(r.localEventId, r.localMissionId);
      }
    }
  }

  return {
    state: "OK" as const,
    aggregates: buildAttendanceAggregates({
      rows: normalized,
      localEventByExternalEventId: localEventByExternal,
      localMissionByLocalEventId: localMissionByLocalEvent,
    }),
    observationCount: rows.length,
    staleWarning:
      rows.length === 0
        ? "No stored observations — run an explicit dry-run sync when credentials exist."
        : null,
    isolation: assertMobilizeAttendanceIsolation(),
  };
}

export async function startAttendanceDryRun(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.apiKey || !env.organizationId) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 409,
      publicMessage:
        "Set MOBILIZE_API_KEY and MOBILIZE_ORGANIZATION_ID before attendance dry-run.",
    });
  }
  if (!env.importAttendanceEnabled) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 409,
      publicMessage:
        "MOBILIZE_IMPORT_ATTENDANCE_ENABLED is off — dry-run blocked until explicitly enabled.",
    });
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const externalEventId =
    typeof b.externalEventId === "string" ? b.externalEventId.trim() : "";
  if (!externalEventId) {
    throw new ValidationError(
      "externalEventId is required — never match by title alone.",
    );
  }

  // Require linked external reference — never title-only.
  const local = await findLocalEventForExternalMobilizeEvent(externalEventId);
  if (!local) {
    throw new ValidationError(
      "No ExternalObjectReference links this Mobilize event to a local Event. Register identity first (D16).",
    );
  }

  const connection = await findMobilizeConnection();
  const run = await createSyncRun({
    connectionId: connection?.id,
    objectScope: `ATTENDANCE:EVENT:${externalEventId}`,
    mode: "DRY_RUN",
    requestedByUserId: actor.userId,
    documentationRevision: MOBILIZE_DOCS.documentationRevisionShort,
    adapterVersion: MOBILIZE_DOCS.attendanceAdapterVersion,
  });

  const adapter = new MobilizeAdapter({
    apiKey: env.apiKey,
    apiBaseUrl: env.apiBaseUrl,
    organizationId: env.organizationId,
    correlationId: `att-${run.id}`,
  });

  const collected: NormalizedMobilizeAttendance[] = [];
  let nextUrl: string | null | undefined = undefined;
  let pages = 0;
  let resultsLimitedTo: number | null = null;
  let partial = false;

  try {
    while (pages < 20) {
      pages += 1;
      const page = await adapter.listEventAttendances(externalEventId, {
        nextUrl: nextUrl ?? null,
      });
      collected.push(...page.data);
      if (page.resultsLimitedTo != null) {
        resultsLimitedTo = page.resultsLimitedTo;
        partial = true;
      }
      nextUrl = page.next;
      if (!nextUrl) break;
    }
    if (nextUrl) partial = true;

    const aggregates = buildAttendanceAggregates({
      rows: collected,
      localEventByExternalEventId: new Map([[externalEventId, local.eventId]]),
      localMissionByLocalEventId: local.missionId
        ? new Map([[local.eventId, local.missionId]])
        : new Map(),
    });

    const candidates = collected.map((row) => ({
      externalObjectType: "ATTENDANCE",
      externalObjectId: row.id,
      proposedLocalObjectType: "MobilizeAttendanceObservation",
      proposedLocalObjectId: null,
      action: "NEW_REMOTE",
      comparisonFingerprint: row.fingerprint,
      changeSummary: `status=${row.status ?? "unknown"};attended=${String(row.attended)};timeslot=${row.timeslotId ?? "none"}`,
    }));

    await createSyncCandidates(run.id, candidates);
    await completeSyncRun(run.id, {
      status: "COMPLETED",
      completedByUserId: actor.userId,
      remoteExaminedCount: collected.length,
      createsProposed: candidates.length,
      rateLimitObserved: adapter.rateLimitObserved,
      diagnosticSummary: safePartialSummary({
        candidateCount: candidates.length,
        pages,
        partial,
        resultsLimitedTo,
      }),
      cursorCheckpointJson: {
        aggregates,
        pages,
        resultsLimitedTo,
        partial,
        personLevelApplyEnabled: PERSON_LEVEL_APPLY_ENABLED,
        dryRunCreatesNoObservations: true,
      },
    });

    await writeAttributedAudit({
      actor,
      action: "mobilize.attendance.dry_run",
      entityType: "ExternalSyncRun",
      entityId: run.id,
      metadata: {
        externalEventId,
        candidateCount: candidates.length,
        partial,
        pages,
      },
    });

    return {
      runId: run.id,
      candidateCount: candidates.length,
      aggregates,
      partial,
      resultsLimitedTo,
      localEventId: local.eventId,
      localMissionId: local.missionId,
      personLevelApplyEnabled: PERSON_LEVEL_APPLY_ENABLED,
      observationsCreated: 0,
      isolation: assertMobilizeAttendanceIsolation(),
    };
  } catch (err) {
    await completeSyncRun(run.id, {
      status: "FAILED",
      completedByUserId: actor.userId,
      errorCount: 1,
      diagnosticSummary:
        err instanceof Error ? err.message.slice(0, 200) : "failed",
    });
    throw err;
  }
}

function safePartialSummary(input: {
  candidateCount: number;
  pages: number;
  partial: boolean;
  resultsLimitedTo: number | null;
}): string {
  return `Attendance dry-run candidates=${input.candidateCount} pages=${input.pages} partial=${input.partial} limited=${input.resultsLimitedTo ?? "none"}`;
}

export async function applyAttendanceAggregates(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.apiKey || !env.organizationId || !env.importAttendanceEnabled) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 409,
      publicMessage: "Attendance import is not configured/enabled.",
    });
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const dryRunId = typeof b.dryRunId === "string" ? b.dryRunId : "";
  if (!dryRunId) throw new ValidationError("dryRunId required.");

  const dryRun = await prisma.externalSyncRun.findFirst({
    where: {
      id: dryRunId,
      campaignScopeKey: "KELLY",
      provider: "MOBILIZE",
      mode: "DRY_RUN",
    },
    include: { candidates: true },
  });
  if (!dryRun) throw new ValidationError("Dry run not found.");
  if (dryRun.status !== "COMPLETED") {
    throw new ValidationError("Dry run is not completed.");
  }

  const externalEventId = dryRun.objectScope.replace("ATTENDANCE:EVENT:", "");
  const local = await findLocalEventForExternalMobilizeEvent(externalEventId);
  if (!local) {
    throw new ValidationError("Event mapping became stale — re-run dry-run.");
  }

  const adapter = new MobilizeAdapter({
    apiKey: env.apiKey,
    apiBaseUrl: env.apiBaseUrl,
    organizationId: env.organizationId,
  });

  const applyRun = await createSyncRun({
    connectionId: dryRun.connectionId,
    objectScope: dryRun.objectScope,
    mode: "APPLY",
    requestedByUserId: actor.userId,
    documentationRevision: MOBILIZE_DOCS.documentationRevisionShort,
    adapterVersion: MOBILIZE_DOCS.attendanceAdapterVersion,
  });

  const page = await adapter.listEventAttendances(externalEventId);
  let upserted = 0;
  for (const row of page.data) {
    const candidate = dryRun.candidates.find(
      (c) => c.externalObjectId === row.id,
    );
    if (
      candidate?.comparisonFingerprint &&
      candidate.comparisonFingerprint !== row.fingerprint
    ) {
      continue; // stale candidate skipped
    }
    await upsertAttendanceObservation({
      row,
      localEventId: local.eventId,
      localMissionId: local.missionId,
      syncRunId: applyRun.id,
      storePersonId: false, // privacy: aggregate-only by default
    });
    upserted += 1;
  }

  await completeSyncRun(applyRun.id, {
    status: "COMPLETED",
    completedByUserId: actor.userId,
    createsApplied: upserted,
    remoteExaminedCount: page.data.length,
    diagnosticSummary: `Attendance aggregate apply upserted=${upserted}; peopleCreated=0`,
    cursorCheckpointJson: {
      personLevelApplyEnabled: false,
      peopleCreated: 0,
      missionsMutated: false,
    },
  });

  await writeAttributedAudit({
    actor,
    action: "mobilize.attendance.apply_aggregates",
    entityType: "ExternalSyncRun",
    entityId: applyRun.id,
    metadata: { dryRunId, upserted, externalEventId },
  });

  return {
    applyRunId: applyRun.id,
    upserted,
    peopleCreated: 0,
    personLevelApplyEnabled: false,
    isolation: assertMobilizeAttendanceIsolation(),
  };
}

export async function reviewPersonMatch(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  if (PERSON_LEVEL_APPLY_ENABLED) {
    // Future path — still gated.
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const externalPersonId =
    typeof b.externalPersonId === "string" ? b.externalPersonId : "";
  const decision = typeof b.decision === "string" ? b.decision : "";
  if (!externalPersonId) throw new ValidationError("externalPersonId required.");

  if (decision === "DO_NOT_LINK") {
    const match = await upsertPersonMatch({
      externalPersonId,
      proposedLocalPersonId: null,
      matchMethod: "OPERATOR_SELECTED",
      confidenceCategory: "HIGH",
      status: "DO_NOT_LINK",
      provenanceSummary: "Operator DO_NOT_LINK",
      reviewedByUserId: actor.userId,
    });
    await writeAttributedAudit({
      actor,
      action: "mobilize.person_match.do_not_link",
      entityType: "ExternalPersonMatch",
      entityId: match.id,
    });
    return { match, isolation: assertMobilizeAttendanceIsolation() };
  }

  if (decision === "REJECT") {
    const match = await upsertPersonMatch({
      externalPersonId,
      proposedLocalPersonId: null,
      matchMethod: "OPERATOR_SELECTED",
      confidenceCategory: "HIGH",
      status: "REJECTED",
      reviewedByUserId: actor.userId,
      provenanceSummary: "Operator rejected match",
    });
    return { match, isolation: assertMobilizeAttendanceIsolation() };
  }

  if (decision === "CONFIRM") {
    // Confirming a match review record does not create/link Person without consent authority.
    throw new AppError({
      code: "NOT_IMPLEMENTED",
      status: 403,
      publicMessage:
        "Person-level confirm is disabled — local Person model lacks consent-aware authority (D18).",
    });
  }

  if (decision === "PROPOSE") {
    const proposal = proposePersonMatch({
      externalPersonId,
      evidence: {
        exactEmailLocalPersonIds:
          typeof b.exactEmailLocalPersonId === "string"
            ? [b.exactEmailLocalPersonId]
            : [],
        nameOnlyLocalPersonIds: Array.isArray(b.nameOnlyLocalPersonIds)
          ? (b.nameOnlyLocalPersonIds as string[])
          : [],
      },
    });
    const match = await upsertPersonMatch({
      ...proposal,
      reviewedByUserId: actor.userId,
    });
    return {
      match,
      note: "Proposal stored for review only — no local Person created.",
      isolation: assertMobilizeAttendanceIsolation(),
    };
  }

  throw new ValidationError("decision must be PROPOSE, REJECT, CONFIRM, or DO_NOT_LINK.");
}

export async function correlateCheckIn(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const missionId = typeof b.missionId === "string" ? b.missionId : "";
  const observationId =
    typeof b.attendanceObservationId === "string"
      ? b.attendanceObservationId
      : "";
  const localCheckInObjectType =
    typeof b.localCheckInObjectType === "string"
      ? b.localCheckInObjectType
      : "MissionFieldOpsSession";
  const localCheckInObjectId =
    typeof b.localCheckInObjectId === "string" ? b.localCheckInObjectId : "";
  if (!missionId || !observationId || !localCheckInObjectId) {
    throw new ValidationError(
      "missionId, attendanceObservationId, and localCheckInObjectId are required.",
    );
  }

  const mission = await prisma.campaignMission.findFirst({
    where: { id: missionId },
  });
  if (!mission) throw new ValidationError("Mission not found.");

  const observation = await prisma.mobilizeAttendanceObservation.findFirst({
    where: { id: observationId, campaignScopeKey: "KELLY" },
  });
  if (!observation) throw new ValidationError("Observation not found.");

  // Correlation must not rewrite sources; RSVP alone is not check-in.
  if (
    observation.statusCategory === "SIGNUP_REGISTERED" ||
    observation.statusCategory === "SIGNUP_CONFIRMED"
  ) {
    if (b.allowRsvpCorrelation !== true) {
      throw new ValidationError(
        "RSVP/signup is not local check-in. Pass allowRsvpCorrelation only for explicit operator override with reason.",
      );
    }
  }

  const correlation = await createAttendanceCorrelation({
    missionId,
    localCheckInObjectType,
    localCheckInObjectId,
    attendanceObservationId: observationId,
    correlationReason:
      typeof b.reason === "string" ? b.reason : "Explicit operator correlation",
    confirmedByUserId: actor.userId,
    correctedFromCorrelationId:
      typeof b.correctedFromCorrelationId === "string"
        ? b.correctedFromCorrelationId
        : null,
  });

  await writeAttributedAudit({
    actor,
    action: "mobilize.attendance.correlate_checkin",
    entityType: "MissionAttendanceCorrelation",
    entityId: correlation.id,
    metadata: {
      missionId,
      observationId,
      localCheckInObjectType,
      localCheckInObjectId,
    },
  });

  return {
    correlation,
    sourcesRewritten: false,
    executeAdvanced: false,
    fieldOpsMutated: false,
    isolation: assertMobilizeAttendanceIsolation(),
  };
}

export async function correctCheckInCorrelation(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const correlationId =
    typeof b.correlationId === "string" ? b.correlationId : "";
  if (!correlationId) throw new ValidationError("correlationId required.");
  const removed = await removeAttendanceCorrelation(correlationId, actor.userId);
  await writeAttributedAudit({
    actor,
    action: "mobilize.attendance.correlation_removed",
    entityType: "MissionAttendanceCorrelation",
    entityId: correlationId,
  });
  return {
    correlation: removed,
    historyPreserved: true,
    isolation: assertMobilizeAttendanceIsolation(),
  };
}

export async function getAttendanceEventDetail(
  actor: AuthenticatedActor,
  eventId: string,
) {
  assertMobilizeIntegrationAdmin(actor);
  // eventId may be local Event id — resolve via reference reverse lookup
  const ref = await prisma.externalObjectReference.findFirst({
    where: {
      provider: "MOBILIZE",
      objectType: "EVENT",
      localObjectType: "Event",
      localObjectId: eventId,
    },
  });
  const observations = ref
    ? await listObservationsForExternalEvent(ref.externalObjectId)
    : [];
  const mission = await prisma.campaignMission.findFirst({
    where: { sourceEventId: eventId },
    select: { id: true },
  });
  const correlations = mission
    ? await listCorrelationsForMission(mission.id)
    : [];
  const aggregates = buildAttendanceAggregates({
    rows: observations.map((r) => ({
      id: r.externalAttendanceId,
      eventId: r.externalEventId,
      timeslotId: r.externalTimeslotId,
      personId: null,
      status: r.remoteStatus,
      isSignup:
        r.statusCategory === "SIGNUP_REGISTERED" ||
        r.statusCategory === "SIGNUP_CONFIRMED",
      isCancelled: r.statusCategory === "CANCELLED",
      attended: r.attendedFlag,
      createdAt: r.signupAt?.toISOString() ?? null,
      modifiedAt: r.remoteModifiedAt?.toISOString() ?? null,
      customSignupFieldCount: 0,
      hasReferrer: false,
      fingerprint: r.contentFingerprint,
    })),
    localEventByExternalEventId: ref
      ? new Map([[ref.externalObjectId, eventId]])
      : new Map(),
    localMissionByLocalEventId: mission
      ? new Map([[eventId, mission.id]])
      : new Map(),
  });
  return {
    localEventId: eventId,
    externalEventId: ref?.externalObjectId ?? null,
    missionId: mission?.id ?? null,
    aggregates,
    observationCount: observations.length,
    correlations,
    personLevelApplyEnabled: false,
    isolation: assertMobilizeAttendanceIsolation(),
  };
}

export async function getAttendanceRunDetail(
  actor: AuthenticatedActor,
  runId: string,
) {
  assertMobilizeIntegrationAdmin(actor);
  const run = await prisma.externalSyncRun.findFirst({
    where: { id: runId, provider: "MOBILIZE" },
    include: { candidates: true },
  });
  if (!run) throw new ValidationError("Run not found.");
  return {
    run: {
      id: run.id,
      mode: run.mode,
      status: run.status,
      objectScope: run.objectScope,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      notesJson: run.cursorCheckpointJson,
    },
    candidates: run.candidates.map((c) => ({
      id: c.id,
      externalObjectId: c.externalObjectId,
      action: c.action,
      changeSummary: c.changeSummary,
      disposition: c.disposition,
    })),
    isolation: assertMobilizeAttendanceIsolation(),
  };
}
