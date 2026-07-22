import "server-only";

import { createHash } from "node:crypto";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { NotFoundError, ValidationError } from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  CALENDAR_INTEGRITY_DETECTOR_VERSION,
  INTEGRITY_DISPOSITIONS,
  INTEGRITY_SCAN_EVENT_SOFT_LIMIT,
  type DriftClassification,
  type IntegrityDisposition,
  type IntegrityScanScope,
} from "@/lib/calendar/integrity/types";
import {
  runAllIntegrityDetectors,
  type IntegrityDetectorInput,
  type IntegrityEventSnapshot,
  type IntegrityIdentitySnapshot,
  type IntegrityImportRecordSnapshot,
  type IntegrityImportRunSnapshot,
  type IntegrityMissionSnapshot,
} from "@/lib/calendar/integrity/detectors";
import {
  extractIngestKey,
  extractImportFingerprint,
} from "@/lib/calendar/integrity/normalize";
import {
  eventAppearsManuallyRescheduled,
  IMPORT_FIELD_PRECEDENCE,
  IMPORT_PROVENANCE_AUDIT_ACTIONS,
} from "@/lib/calendar/import-provenance";

function evidenceFingerprint(evidence: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(evidence ?? {}))
    .digest("hex")
    .slice(0, 24);
}

async function loadDetectorInput(options: {
  eventId?: string;
  importRunId?: string;
  sourceId?: string;
  rangeStart?: Date;
  rangeEnd?: Date;
  softLimit?: number;
}): Promise<{
  input: IntegrityDetectorInput;
  truncated: boolean;
  eventsExamined: number;
}> {
  const softLimit = options.softLimit ?? INTEGRITY_SCAN_EVENT_SOFT_LIMIT;
  const eventWhere: Record<string, unknown> = {};
  if (options.eventId) eventWhere.id = options.eventId;
  if (options.rangeStart || options.rangeEnd) {
    eventWhere.startsAt = {
      ...(options.rangeStart ? { gte: options.rangeStart } : {}),
      ...(options.rangeEnd ? { lte: options.rangeEnd } : {}),
    };
  }

  const eventsRaw = await prisma.event.findMany({
    where: eventWhere,
    take: softLimit + 1,
    orderBy: { startsAt: "asc" },
    include: {
      primaryCalendar: { select: { id: true, slug: true } },
      calendarMemberships: { select: { calendarId: true, isPrimary: true } },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { fromStatus: true, toStatus: true, reason: true },
      },
      externalIdentities: { select: { id: true } },
      importRecords: { select: { id: true } },
      campaignMission: { select: { id: true } },
    },
  });

  const truncated = eventsRaw.length > softLimit;
  const eventsSlice = truncated ? eventsRaw.slice(0, softLimit) : eventsRaw;
  const eventIds = eventsSlice.map((e) => e.id);

  const events: IntegrityEventSnapshot[] = eventsSlice.map((e) => ({
    id: e.id,
    eventNumber: e.eventNumber,
    internalTitle: e.internalTitle,
    campaignDisplayTitle: e.campaignDisplayTitle,
    status: e.status,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    timezone: e.timezone,
    isAllDay: e.isAllDay,
    isImported: e.isImported,
    isRecurring: e.isRecurring,
    recurrenceSeriesId: e.recurrenceSeriesId,
    recurrenceRule: e.recurrenceRule,
    originalOccurrenceAt: e.originalOccurrenceAt,
    city: e.city,
    streetAddress: e.streetAddress,
    privateNotes: e.privateNotes,
    sourceType: e.sourceType,
    primaryCalendarId: e.primaryCalendarId,
    primaryCalendarSlug: e.primaryCalendar.slug,
    archivedAt: e.archivedAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    version: e.version,
    membershipCalendarIds: e.calendarMemberships.map((m) => m.calendarId),
    primaryMembershipCount: e.calendarMemberships.filter((m) => m.isPrimary).length,
    statusHistory: e.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
    })),
    externalIdentityIds: e.externalIdentities.map((i) => i.id),
    importRecordIds: e.importRecords.map((r) => r.id),
    missionId: e.campaignMission?.id ?? null,
  }));

  const identityWhere: Record<string, unknown> = {};
  if (options.sourceId) identityWhere.externalSourceId = options.sourceId;
  if (options.eventId) identityWhere.canonicalEventId = options.eventId;
  else if (eventIds.length > 0 && (options.rangeStart || options.rangeEnd)) {
    identityWhere.OR = [
      { canonicalEventId: { in: eventIds } },
      { canonicalEventId: null },
    ];
  }

  const identitiesRaw = await prisma.externalEventIdentity.findMany({
    where: identityWhere,
    take: softLimit + 200,
  });
  const identities: IntegrityIdentitySnapshot[] = identitiesRaw.map((i) => ({
    id: i.id,
    externalSourceId: i.externalSourceId,
    externalEventId: i.externalEventId,
    fingerprint: i.fingerprint,
    canonicalEventId: i.canonicalEventId,
    deletedAt: i.deletedAt,
    provider: i.provider,
  }));

  const recordWhere: Record<string, unknown> = {};
  if (options.importRunId) recordWhere.importRunId = options.importRunId;
  if (options.eventId) recordWhere.canonicalEventId = options.eventId;

  const recordsRaw = await prisma.calendarImportRecord.findMany({
    where: recordWhere,
    take: softLimit + 200,
    select: {
      id: true,
      importRunId: true,
      rawFingerprint: true,
      reviewStatus: true,
      canonicalEventId: true,
      externalEventIdentityId: true,
    },
  });
  const importRecords: IntegrityImportRecordSnapshot[] = recordsRaw.map((r) => ({
    id: r.id,
    importRunId: r.importRunId,
    rawFingerprint: r.rawFingerprint,
    reviewStatus: r.reviewStatus,
    canonicalEventId: r.canonicalEventId,
    externalEventIdentityId: r.externalEventIdentityId,
  }));

  const runIds = [
    ...new Set([
      ...(options.importRunId ? [options.importRunId] : []),
      ...importRecords.map((r) => r.importRunId),
    ]),
  ];
  const runsRaw =
    runIds.length > 0
      ? await prisma.calendarImportRun.findMany({ where: { id: { in: runIds } } })
      : options.sourceId
        ? await prisma.calendarImportRun.findMany({
            where: { externalSourceId: options.sourceId },
            take: 100,
            orderBy: { createdAt: "desc" },
          })
        : await prisma.calendarImportRun.findMany({
            take: 50,
            orderBy: { createdAt: "desc" },
          });

  const recordsByRun = new Map<string, string[]>();
  for (const r of importRecords) {
    const list = recordsByRun.get(r.importRunId) ?? [];
    list.push(r.id);
    recordsByRun.set(r.importRunId, list);
  }
  // Fill run children counts if missing
  for (const run of runsRaw) {
    if (!recordsByRun.has(run.id)) {
      const children = await prisma.calendarImportRecord.findMany({
        where: { importRunId: run.id },
        select: { id: true },
      });
      recordsByRun.set(
        run.id,
        children.map((c) => c.id),
      );
    }
  }

  const importRuns: IntegrityImportRunSnapshot[] = runsRaw.map((r) => ({
    id: r.id,
    externalSourceId: r.externalSourceId,
    status: r.status,
    stagedCount: r.stagedCount,
    approvedCount: r.approvedCount,
    rejectedCount: r.rejectedCount,
    errorCount: r.errorCount,
    recordIds: recordsByRun.get(r.id) ?? [],
  }));

  const missionsRaw =
    eventIds.length > 0
      ? await prisma.campaignMission.findMany({
          where: {
            OR: [
              { sourceEventId: { in: eventIds } },
              // Orphans relative to this slice are detected when loading all missions
              // that claim an event id outside the slice — keep scoped for performance.
            ],
          },
          select: { id: true, sourceEventId: true },
          take: softLimit + 200,
        })
      : await prisma.campaignMission.findMany({
          select: { id: true, sourceEventId: true },
          take: softLimit + 200,
        });
  const missions: IntegrityMissionSnapshot[] = missionsRaw.map((m) => ({
    id: m.id,
    sourceEventId: m.sourceEventId,
  }));

  const audits =
    eventIds.length > 0
      ? await prisma.auditLog.findMany({
          where: { entityType: "Event", entityId: { in: eventIds } },
          select: { entityId: true, action: true },
          take: softLimit * 5,
        })
      : [];
  const eventAuditActions: Record<string, string[]> = {};
  for (const a of audits) {
    if (!a.entityId) continue;
    const list = eventAuditActions[a.entityId] ?? [];
    list.push(a.action);
    eventAuditActions[a.entityId] = list;
  }
  // Mark examined imported events so missing-audit detection can distinguish "no audits loaded"
  for (const e of events) {
    if (e.isImported && !Object.prototype.hasOwnProperty.call(eventAuditActions, e.id)) {
      eventAuditActions[e.id] = [];
    }
  }

  return {
    input: { events, identities, importRecords, importRuns, missions, eventAuditActions },
    truncated,
    eventsExamined: events.length,
  };
}

export async function startIntegrityScan(input: {
  actor: AuthenticatedActor;
  scope: IntegrityScanScope;
  eventId?: string;
  importRunId?: string;
  sourceId?: string;
  rangeStart?: Date;
  rangeEnd?: Date;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "CALENDAR_INTEGRITY_SCAN",
    resource: { type: "system" },
  });

  if (input.scope === "EVENT" && !input.eventId) {
    throw new ValidationError("eventId is required for EVENT scope.");
  }
  if (input.scope === "IMPORT_RUN" && !input.importRunId) {
    throw new ValidationError("importRunId is required for IMPORT_RUN scope.");
  }
  if (input.scope === "SOURCE" && !input.sourceId) {
    throw new ValidationError("sourceId is required for SOURCE scope.");
  }

  const loaded = await loadDetectorInput({
    eventId: input.eventId,
    importRunId: input.importRunId,
    sourceId: input.sourceId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
  });
  const drafts = runAllIntegrityDetectors(loaded.input);

  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const f of drafts) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byType[f.findingType] = (byType[f.findingType] ?? 0) + 1;
  }

  const scan = await withTransaction(async (tx) => {
    const created = await tx.calendarIntegrityScan.create({
      data: {
        campaignKey: "kelly",
        scope: input.scope,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        sourceId: input.sourceId,
        importRunId: input.importRunId,
        eventId: input.eventId,
        detectorVersion: CALENDAR_INTEGRITY_DETECTOR_VERSION,
        status: loaded.truncated ? "PARTIAL" : "COMPLETED",
        completedAt: new Date(),
        requestedByUserId: input.actor.userId,
        eventsExamined: loaded.eventsExamined,
        findingsTotal: drafts.length,
        findingsBySeverity: bySeverity,
        findingsByType: byType,
        truncated: loaded.truncated,
        truncationNote: loaded.truncated
          ? `Examined first ${INTEGRITY_SCAN_EVENT_SOFT_LIMIT} Events only.`
          : null,
      },
    });

    if (drafts.length > 0) {
      await tx.calendarIntegrityFinding.createMany({
        data: drafts.map((f) => ({
          scanId: created.id,
          campaignKey: "kelly",
          findingKey: f.findingKey,
          findingType: f.findingType,
          severity: f.severity,
          summary: f.summary,
          evidenceJson: f.evidence as object,
          primaryEventId: f.primaryEventId,
          relatedEventIds: f.relatedEventIds,
          externalSourceId: f.externalSourceId,
          externalIdentityId: f.externalIdentityId,
          importRunId: f.importRunId,
          importRecordId: f.importRecordId,
          detectionVersion: f.detectionVersion,
          repairAvailable: f.repairAvailable,
        })),
      });
    }

    await writeAttributedAudit({
      actor: input.actor,
      action: "CALENDAR_INTEGRITY_SCAN",
      entityType: "CalendarIntegrityScan",
      entityId: created.id,
      requestId: input.requestId,
      newState: {
        scope: input.scope,
        eventsExamined: loaded.eventsExamined,
        findingsTotal: drafts.length,
        truncated: loaded.truncated,
        detectorVersion: CALENDAR_INTEGRITY_DETECTOR_VERSION,
      },
      tx,
    });

    return created;
  });

  return {
    scanId: scan.id,
    status: scan.status,
    eventsExamined: scan.eventsExamined,
    findingsTotal: scan.findingsTotal,
    truncated: scan.truncated,
    findingsBySeverity: bySeverity,
    findingsByType: byType,
    detectorVersion: CALENDAR_INTEGRITY_DETECTOR_VERSION,
  };
}

export async function getIntegritySummary(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "CALENDAR_INTEGRITY_VIEW",
    resource: { type: "system" },
  });
  try {
    const latest = await prisma.calendarIntegrityScan.findFirst({
      orderBy: { startedAt: "desc" },
    });
    const openFindings = latest
      ? await prisma.calendarIntegrityFinding.groupBy({
          by: ["severity"],
          where: { scanId: latest.id, state: { in: ["OPEN", "ACKNOWLEDGED"] } },
          _count: true,
        })
      : [];
    return {
      detectorVersion: CALENDAR_INTEGRITY_DETECTOR_VERSION,
      schemaReady: true,
      latestScan: latest
        ? {
            id: latest.id,
            status: latest.status,
            scope: latest.scope,
            startedAt: latest.startedAt,
            completedAt: latest.completedAt,
            eventsExamined: latest.eventsExamined,
            findingsTotal: latest.findingsTotal,
            truncated: latest.truncated,
            findingsBySeverity: latest.findingsBySeverity,
            findingsByType: latest.findingsByType,
          }
        : null,
      openBySeverity: Object.fromEntries(
        openFindings.map((r) => [r.severity, r._count]),
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021|relation .* does not exist/i.test(message)) {
      return {
        detectorVersion: CALENDAR_INTEGRITY_DETECTOR_VERSION,
        schemaReady: false,
        latestScan: null,
        openBySeverity: {},
        schemaNote:
          "Integrity tables not applied yet — run KCCC_ALLOW_SCHEMA_MIGRATION=1 npm run db:migration:apply",
      };
    }
    throw error;
  }
}

export async function listIntegrityScans(actor: AuthenticatedActor, limit = 20) {
  await requireAuthorized(actor, {
    action: "CALENDAR_INTEGRITY_VIEW",
    resource: { type: "system" },
  });
  try {
    return await prisma.calendarIntegrityScan.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021|relation .* does not exist/i.test(message)) {
      return [];
    }
    throw error;
  }
}

export async function getIntegrityScan(actor: AuthenticatedActor, scanId: string) {
  await requireAuthorized(actor, {
    action: "CALENDAR_INTEGRITY_VIEW",
    resource: { type: "system" },
  });
  const scan = await prisma.calendarIntegrityScan.findUnique({
    where: { id: scanId },
    include: {
      findings: {
        orderBy: [{ severity: "asc" }, { findingType: "asc" }],
        take: 500,
      },
    },
  });
  if (!scan) throw new NotFoundError("Integrity scan not found.");
  return scan;
}

export async function getIntegrityFinding(
  actor: AuthenticatedActor,
  findingId: string,
) {
  await requireAuthorized(actor, {
    action: "CALENDAR_INTEGRITY_VIEW",
    resource: { type: "system" },
  });
  const finding = await prisma.calendarIntegrityFinding.findUnique({
    where: { id: findingId },
    include: {
      dispositions: { orderBy: { createdAt: "desc" } },
      repairAttempts: { orderBy: { createdAt: "desc" } },
      scan: true,
    },
  });
  if (!finding) throw new NotFoundError("Integrity finding not found.");
  return finding;
}

export async function recordIntegrityDisposition(input: {
  actor: AuthenticatedActor;
  findingId: string;
  disposition: IntegrityDisposition;
  reason?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "CALENDAR_INTEGRITY_DISPOSE",
    resource: { type: "system" },
  });
  if (!INTEGRITY_DISPOSITIONS.includes(input.disposition)) {
    throw new ValidationError("Invalid disposition.");
  }
  if (
    (input.disposition === "ACCEPTED_RISK" ||
      input.disposition === "NOT_APPLICABLE" ||
      input.disposition === "RESOLVED") &&
    !input.reason?.trim()
  ) {
    throw new ValidationError("A reason is required for this disposition.");
  }

  return withTransaction(async (tx) => {
    const finding = await tx.calendarIntegrityFinding.findUnique({
      where: { id: input.findingId },
    });
    if (!finding) throw new NotFoundError("Integrity finding not found.");

    if (input.disposition === "RESOLVED") {
      // Recompute evidence for related Event before accepting RESOLVED without a repair.
      const loaded = await loadDetectorInput({
        eventId: finding.primaryEventId ?? undefined,
        importRunId: finding.importRunId ?? undefined,
      });
      const live = runAllIntegrityDetectors(loaded.input);
      const stillPresent = live.some((f) => f.findingKey === finding.findingKey);
      if (stillPresent && !input.reason?.toLowerCase().includes("verified")) {
        throw new ValidationError(
          "RESOLVED requires underlying change (finding key gone) or reason containing 'verified' after operator confirmation. No Event mutation performed.",
        );
      }
    }
    await tx.calendarIntegrityDisposition.updateMany({
      where: { findingId: finding.id, superseded: false },
      data: { superseded: true },
    });

    const disposition = await tx.calendarIntegrityDisposition.create({
      data: {
        findingId: finding.id,
        findingKey: finding.findingKey,
        disposition: input.disposition,
        reason: input.reason?.trim() || null,
        actorUserId: input.actor.userId,
        evidenceFingerprint: evidenceFingerprint(finding.evidenceJson),
      },
    });

    const state =
      input.disposition === "ACKNOWLEDGED"
        ? "ACKNOWLEDGED"
        : input.disposition === "ACCEPTED_RISK"
          ? "ACCEPTED_RISK"
          : input.disposition === "RESOLVED"
            ? "RESOLVED"
            : "NOT_APPLICABLE";

    await tx.calendarIntegrityFinding.update({
      where: { id: finding.id },
      data: {
        state,
        resolvedAt:
          input.disposition === "RESOLVED" || input.disposition === "NOT_APPLICABLE"
            ? new Date()
            : finding.resolvedAt,
      },
    });

    await writeAttributedAudit({
      actor: input.actor,
      action: "CALENDAR_INTEGRITY_DISPOSITION",
      entityType: "CalendarIntegrityFinding",
      entityId: finding.id,
      requestId: input.requestId,
      reason: input.reason?.trim() || null,
      newState: {
        disposition: input.disposition,
        findingKey: finding.findingKey,
        // Disposition never mutates Event/Mission
        eventMutated: false,
        missionMutated: false,
      },
      tx,
    });

    return disposition;
  });
}

export type EventProvenancePanel = {
  eventId: string;
  eventNumber: string;
  origin: "IMPORTED" | "LOCAL" | "UNKNOWN";
  provider: string | null;
  externalSourceId: string | null;
  externalEventId: string | null;
  fingerprint: string | null;
  importRunId: string | null;
  importRecordId: string | null;
  approvalAction: string | null;
  createdAt: string;
  updatedAt: string;
  ingestKey: string | null;
  drift: DriftClassification;
  localEditProtectedFields: readonly string[];
  manuallyRescheduled: boolean;
  sourceDeleted: boolean;
  missionId: string | null;
  relatedAuditActions: string[];
  cc01Contracts: typeof IMPORT_PROVENANCE_AUDIT_ACTIONS;
};

export async function explainEventProvenance(
  actor: AuthenticatedActor,
  eventId: string,
): Promise<EventProvenancePanel> {
  await requireAuthorized(actor, {
    action: "CALENDAR_INTEGRITY_VIEW",
    resource: { type: "system" },
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      externalIdentities: true,
      importRecords: {
        orderBy: { reviewedAt: "desc" },
        take: 5,
        include: { reviewActions: { orderBy: { createdAt: "desc" }, take: 3 } },
      },
      campaignMission: { select: { id: true } },
      statusHistory: { select: { reason: true } },
    },
  });
  if (!event) throw new NotFoundError("Event not found.");

  const identity = event.externalIdentities[0] ?? null;
  const importRecord = event.importRecords[0] ?? null;
  const audits = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Event", entityId: event.id },
        {
          entityType: "CalendarImportRecord",
          entityId: { in: event.importRecords.map((r) => r.id) },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { action: true },
  });

  const manuallyRescheduled = eventAppearsManuallyRescheduled({
    statusHistoryReasons: event.statusHistory.map((h) => h.reason),
    auditActions: audits.map((a) => a.action),
  });

  let drift: DriftClassification = "UNKNOWN";
  if (identity?.deletedAt && event.status !== "CANCELLED") {
    drift = "SOURCE_DELETED_LOCAL_ACTIVE";
  } else if (!identity?.deletedAt && event.status === "CANCELLED" && event.isImported) {
    drift = "SOURCE_ACTIVE_LOCAL_CANCELLED";
  } else if (event.isImported && manuallyRescheduled) {
    drift = "SOURCE_UNCHANGED_LOCAL_CHANGED";
  } else if (event.isImported) {
    drift = "SOURCE_UNCHANGED_LOCAL_UNCHANGED";
  }

  return {
    eventId: event.id,
    eventNumber: event.eventNumber,
    origin: event.isImported ? "IMPORTED" : event.sourceType === "MANUAL" ? "LOCAL" : "UNKNOWN",
    provider: identity?.provider ?? null,
    externalSourceId: identity?.externalSourceId ?? null,
    externalEventId: identity?.externalEventId ?? null,
    fingerprint: identity?.fingerprint ?? extractImportFingerprint(event.privateNotes),
    importRunId: importRecord?.importRunId ?? null,
    importRecordId: importRecord?.id ?? null,
    approvalAction: importRecord?.reviewActions[0]?.action ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    ingestKey: extractIngestKey(event.privateNotes),
    drift,
    localEditProtectedFields: IMPORT_FIELD_PRECEDENCE.localWins,
    manuallyRescheduled,
    sourceDeleted: Boolean(identity?.deletedAt),
    missionId: event.campaignMission?.id ?? null,
    relatedAuditActions: audits.map((a) => a.action).slice(0, 10),
    cc01Contracts: IMPORT_PROVENANCE_AUDIT_ACTIONS,
  };
}

/** Dry preview helper — CC-02 does not execute Event mutations as repairs. */
export async function previewIntegrityRepair(input: {
  actor: AuthenticatedActor;
  findingId: string;
}) {
  await requireAuthorized(input.actor, {
    action: "CALENDAR_INTEGRITY_REPAIR",
    resource: { type: "system" },
  });
  const finding = await prisma.calendarIntegrityFinding.findUnique({
    where: { id: input.findingId },
  });
  if (!finding) throw new NotFoundError("Integrity finding not found.");
  return {
    findingId: finding.id,
    findingType: finding.findingType,
    repairAvailable: false,
    message:
      "CC-02 ships detection and disposition only. Open Events or import records for manual repair; no automatic merge/delete/cancel.",
    safeLinks: {
      eventId: finding.primaryEventId,
      importRecordId: finding.importRecordId,
      importRunId: finding.importRunId,
    },
  };
}

/**
 * Privacy-safe diagnostic export — counts and finding types only.
 * No Event titles, descriptions, streets, tokens, or raw provider payloads.
 */
export async function exportIntegrityDiagnostics(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "CALENDAR_INTEGRITY_VIEW",
    resource: { type: "system" },
  });
  const latest = await prisma.calendarIntegrityScan.findFirst({
    orderBy: { startedAt: "desc" },
  });
  const eventCounts = await prisma.event.groupBy({
    by: ["status"],
    _count: true,
  });
  const missionCount = await prisma.campaignMission.count();
  const scanCount = await prisma.calendarIntegrityScan.count();
  const dispositionCount = await prisma.calendarIntegrityDisposition.count();
  const repairCount = await prisma.calendarIntegrityRepairAttempt.count();

  await writeAttributedAudit({
    actor,
    action: "CALENDAR_INTEGRITY_EXPORT",
    entityType: "CalendarIntegrityScan",
    entityId: latest?.id ?? "none",
    newState: {
      exportKind: "diagnostic-summary",
      scanId: latest?.id ?? null,
      redacted: true,
    },
  });

  const lines = [
    "KCCC Calendar Integrity Diagnostic Summary",
    `detectorVersion=${CALENDAR_INTEGRITY_DETECTOR_VERSION}`,
    `exportedAt=${new Date().toISOString()}`,
    `eventsByStatus=${JSON.stringify(Object.fromEntries(eventCounts.map((r) => [r.status, r._count])))}`,
    `missions=${missionCount}`,
    `integrityScans=${scanCount}`,
    `dispositions=${dispositionCount}`,
    `repairAttempts=${repairCount}`,
    `latestScanId=${latest?.id ?? ""}`,
    `latestFindingsTotal=${latest?.findingsTotal ?? 0}`,
    `latestFindingsBySeverity=${JSON.stringify(latest?.findingsBySeverity ?? {})}`,
    `latestFindingsByType=${JSON.stringify(latest?.findingsByType ?? {})}`,
    `truncated=${latest?.truncated ?? false}`,
    "note=No Event titles, private notes, street addresses, tokens, or provider payloads included.",
  ];
  // Sanitize against spreadsheet formula injection
  return lines.map((line) => (line.startsWith("=") ? `'${line}` : line)).join("\n");
}
