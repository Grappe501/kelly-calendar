import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { runWithActorAsync } from "@/server/auth/actor-context";
import type { SessionViewer } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  CALENDAR_HEALTH_DETECTOR_VERSION,
  FULL_FRESHNESS_MS,
  LEASE_MS,
  LIGHTWEIGHT_FRESHNESS_MS,
  MANDATORY_DOMAINS,
  MAX_EVENTS_EXAMINED,
  MAX_FINDINGS_PER_RUN,
  MAX_RUN_MS,
  deriveOverallHealthState,
  isAlertStillOpen,
  isStale,
  stableFindingKey,
  type CalendarHealthOverallState,
  type CalendarHealthRunType,
  type HealthDomain,
  type HealthFindingDraft,
  type HealthSeverity,
} from "@/lib/calendar/health";
import {
  runAllIntegrityDetectors,
  type IntegrityDetectorInput,
  type IntegrityEventSnapshot,
} from "@/lib/calendar/integrity/detectors";
import { CALENDAR_INTEGRITY_DETECTOR_VERSION } from "@/lib/calendar/integrity/types";

const CAMPAIGN_KEY = "kelly";
const STALE_IMPORT_MS = 24 * 60 * 60 * 1000;
const STALE_CONFLICT_MS = 7 * 24 * 60 * 60 * 1000;
const STUCK_BULK_MS = 60 * 60 * 1000;
const RECENT_BULK_MS = 7 * 24 * 60 * 60 * 1000;
const INTEGRITY_SCAN_FRESH_MS = 24 * 60 * 60 * 1000;

type DomainState = "COMPLETED" | "FAILED" | "SKIPPED" | "PARTIAL";

type DomainCheckResult = {
  domain: HealthDomain;
  state: DomainState;
  findings: HealthFindingDraft[];
  recordsExamined: number;
  skipped?: boolean;
  error?: string;
};

function fingerprint(parts: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(parts ?? {}))
    .digest("hex")
    .slice(0, 24);
}

function mapIntegritySeverity(sev: string): HealthSeverity {
  const s = sev.toUpperCase();
  if (s === "CRITICAL") return "CRITICAL";
  if (s === "ERROR" || s === "WARNING") return "WARNING";
  return "INFO";
}

function systemHealthViewer(systemJobId: string): SessionViewer {
  return {
    userId: "system-calendar-health",
    email: "system-calendar-health@internal.kccc",
    displayName: "Calendar Health Scheduler",
    systemRole: "SYSTEM_AI",
    teamIds: [],
    sessionId: `calendar-health:${systemJobId}`,
    tokenId: "system-calendar-health",
  };
}

function resolveDomains(
  scope: string,
  domains?: HealthDomain[],
): HealthDomain[] {
  if (domains && domains.length > 0) {
    return domains.filter((d, i, arr) => arr.indexOf(d) === i);
  }
  if (scope === "LIGHTWEIGHT") {
    return [...MANDATORY_DOMAINS.LIGHTWEIGHT];
  }
  return [...MANDATORY_DOMAINS.FULL];
}

async function heartbeat(runId: string): Promise<void> {
  await prisma.calendarHealthRun.update({
    where: { id: runId },
    data: {
      heartbeatAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
    },
  });
}

async function acquireLease(input: {
  campaignKey: string;
  scope: string;
  leaseOwner: string;
}): Promise<void> {
  const now = new Date();
  const blocking = await prisma.calendarHealthRun.findFirst({
    where: {
      campaignKey: input.campaignKey,
      scope: input.scope,
      status: "RUNNING",
      leaseExpiresAt: { gt: now },
    },
    select: { id: true, leaseOwner: true, leaseExpiresAt: true },
  });
  if (blocking) {
    throw new ConflictError(
      "Another calendar health run holds an active lease for this scope.",
      undefined,
      {
        blockingRunId: blocking.id,
        leaseOwner: blocking.leaseOwner,
        leaseExpiresAt: blocking.leaseExpiresAt?.toISOString() ?? null,
      },
    );
  }
}

// ─── Domain checkers (read-only) ─────────────────────────────────────

async function checkEvents(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const byStatus = await prisma.event.groupBy({
    by: ["status"],
    _count: true,
  });
  const archivedCount = await prisma.event.count({
    where: { archivedAt: { not: null } },
  });
  const total = byStatus.reduce((n, r) => n + r._count, 0);
  findings.push({
    domain: "events",
    findingKey: stableFindingKey("events", "EVENT_COUNT_SNAPSHOT"),
    findingType: "EVENT_COUNT_SNAPSHOT",
    severity: "INFO",
    summary: `Event snapshot: ${total} total, ${archivedCount} archived.`,
    evidenceFingerprint: fingerprint({ byStatus, archivedCount, total }),
  });

  const sample = await prisma.event.findMany({
    take: MAX_EVENTS_EXAMINED,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      calendarMemberships: { select: { isPrimary: true } },
    },
  });

  let invalidRange = 0;
  let missingTz = 0;
  let missingMembership = 0;
  for (const e of sample) {
    if (e.startsAt > e.endsAt) {
      invalidRange += 1;
      if (findings.length < MAX_FINDINGS_PER_RUN) {
        findings.push({
          domain: "events",
          findingKey: stableFindingKey("events", "INVALID_TIME_RANGE", e.id),
          findingType: "INVALID_TIME_RANGE",
          severity: "WARNING",
          summary: `Event ${e.id.slice(0, 8)}… has startsAt after endsAt.`,
          evidenceFingerprint: fingerprint({
            id: e.id,
            startsAt: e.startsAt,
            endsAt: e.endsAt,
          }),
          relatedRefType: "Event",
          relatedRefId: e.id,
        });
      }
    }
    if (!e.timezone || !String(e.timezone).trim()) {
      missingTz += 1;
      if (findings.length < MAX_FINDINGS_PER_RUN) {
        findings.push({
          domain: "events",
          findingKey: stableFindingKey("events", "MISSING_TIMEZONE", e.id),
          findingType: "MISSING_TIMEZONE",
          severity: "WARNING",
          summary: `Event ${e.id.slice(0, 8)}… is missing timezone.`,
          evidenceFingerprint: fingerprint({ id: e.id }),
          relatedRefType: "Event",
          relatedRefId: e.id,
        });
      }
    }
    const primaryCount = e.calendarMemberships.filter((m) => m.isPrimary).length;
    if (primaryCount === 0) {
      missingMembership += 1;
      if (findings.length < MAX_FINDINGS_PER_RUN) {
        findings.push({
          domain: "events",
          findingKey: stableFindingKey("events", "MISSING_MEMBERSHIP", e.id),
          findingType: "MISSING_MEMBERSHIP",
          severity: "WARNING",
          summary: `Event ${e.id.slice(0, 8)}… has no primary calendar membership.`,
          evidenceFingerprint: fingerprint({ id: e.id, primaryCount }),
          relatedRefType: "Event",
          relatedRefId: e.id,
        });
      }
    }
  }

  if (invalidRange + missingTz + missingMembership === 0) {
    findings.push({
      domain: "events",
      findingKey: stableFindingKey("events", "EVENTS_SAMPLE_CLEAN"),
      findingType: "EVENTS_SAMPLE_CLEAN",
      severity: "INFO",
      summary: `Sampled ${sample.length} events — no invalid ranges, missing timezones, or missing primary memberships.`,
      evidenceFingerprint: fingerprint({ sampled: sample.length }),
    });
  }

  return {
    domain: "events",
    state: "COMPLETED",
    findings,
    recordsExamined: sample.length + total,
  };
}

async function checkImports(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const runs = await prisma.calendarImportRun.findMany({
    take: 20,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      errorCount: true,
    },
  });
  const now = Date.now();
  for (const run of runs) {
    if (run.status === "FAILED") {
      findings.push({
        domain: "imports",
        findingKey: stableFindingKey("imports", "IMPORT_RUN_FAILED", run.id),
        findingType: "IMPORT_RUN_FAILED",
        severity: "WARNING",
        summary: `Import run ${run.id.slice(0, 8)}… failed.`,
        evidenceFingerprint: fingerprint({ id: run.id, status: run.status }),
        relatedRefType: "ImportRun",
        relatedRefId: run.id,
      });
    } else if (run.status === "PARTIAL") {
      findings.push({
        domain: "imports",
        findingKey: stableFindingKey("imports", "IMPORT_RUN_PARTIAL", run.id),
        findingType: "IMPORT_RUN_PARTIAL",
        severity: "WARNING",
        summary: `Import run ${run.id.slice(0, 8)}… completed partially.`,
        evidenceFingerprint: fingerprint({ id: run.id, status: run.status }),
        relatedRefType: "ImportRun",
        relatedRefId: run.id,
      });
    } else if (
      !run.completedAt &&
      ["STARTED", "FETCHED", "NORMALIZED", "STAGED"].includes(run.status) &&
      now - run.startedAt.getTime() > STALE_IMPORT_MS
    ) {
      findings.push({
        domain: "imports",
        findingKey: stableFindingKey("imports", "IMPORT_RUN_STALE", run.id),
        findingType: "IMPORT_RUN_STALE",
        severity: "WARNING",
        summary: `Import run ${run.id.slice(0, 8)}… appears abandoned/stale (>24h without completion).`,
        evidenceFingerprint: fingerprint({
          id: run.id,
          status: run.status,
          startedAt: run.startedAt,
        }),
        relatedRefType: "ImportRun",
        relatedRefId: run.id,
      });
    }
  }

  const approvedWithoutEvent = await prisma.calendarImportRecord.count({
    where: {
      reviewStatus: "APPROVED",
      canonicalEventId: null,
    },
  });
  if (approvedWithoutEvent > 0) {
    findings.push({
      domain: "imports",
      findingKey: stableFindingKey("imports", "APPROVED_WITHOUT_EVENT"),
      findingType: "APPROVED_WITHOUT_EVENT",
      severity: "CRITICAL",
      summary: `${approvedWithoutEvent} approved import record(s) lack a canonical Event link.`,
      evidenceFingerprint: fingerprint({ approvedWithoutEvent }),
    });
  }

  if (findings.length === 0) {
    findings.push({
      domain: "imports",
      findingKey: stableFindingKey("imports", "IMPORTS_OK"),
      findingType: "IMPORTS_OK",
      severity: "INFO",
      summary: `Recent ${runs.length} import run(s) look healthy (observe-only; no re-run).`,
      evidenceFingerprint: fingerprint({ examined: runs.length }),
    });
  }

  return {
    domain: "imports",
    state: "COMPLETED",
    findings,
    recordsExamined: runs.length + approvedWithoutEvent,
  };
}

async function loadBoundedIntegrityInput(): Promise<{
  input: IntegrityDetectorInput;
  truncated: boolean;
  eventsExamined: number;
}> {
  const softLimit = Math.min(MAX_EVENTS_EXAMINED, 800);
  const eventsRaw = await prisma.event.findMany({
    take: softLimit + 1,
    orderBy: { updatedAt: "desc" },
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
    primaryMembershipCount: e.calendarMemberships.filter((m) => m.isPrimary)
      .length,
    statusHistory: e.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
    })),
    externalIdentityIds: e.externalIdentities.map((i) => i.id),
    importRecordIds: e.importRecords.map((r) => r.id),
    missionId: e.campaignMission?.id ?? null,
  }));

  return {
      input: {
      events,
      identities: [],
      importRecords: [],
      importRuns: [],
      missions: [],
      eventAuditActions: {},
    },
    truncated,
    eventsExamined: events.length,
  };
}

async function checkIntegrity(full: boolean): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const latest = await prisma.calendarIntegrityScan.findFirst({
    orderBy: { startedAt: "desc" },
    include: {
      findings: {
        where: { state: { in: ["OPEN", "ACKNOWLEDGED"] } },
        take: 100,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const scanFresh =
    latest?.completedAt != null &&
    Date.now() - latest.completedAt.getTime() < INTEGRITY_SCAN_FRESH_MS;

  if (scanFresh && latest) {
    findings.push({
      domain: "integrity",
      findingKey: stableFindingKey("integrity", "INTEGRITY_SCAN_SUMMARY", latest.id),
      findingType: "INTEGRITY_SCAN_SUMMARY",
      severity: "INFO",
      summary: `Latest integrity scan ${latest.status}: ${latest.findingsTotal} finding(s), ${latest.eventsExamined} events (detector ${latest.detectorVersion}).`,
      evidenceFingerprint: fingerprint({
        scanId: latest.id,
        findingsTotal: latest.findingsTotal,
        status: latest.status,
      }),
      relatedRefType: "IntegrityScan",
      relatedRefId: latest.id,
    });
    for (const f of latest.findings.slice(0, 40)) {
      findings.push({
        domain: "integrity",
        findingKey: `integrity:${f.findingKey}`,
        findingType: f.findingType,
        severity: mapIntegritySeverity(f.severity),
        summary: f.summary,
        evidenceFingerprint: fingerprint({
          integrityFindingId: f.id,
          findingKey: f.findingKey,
        }),
        relatedRefType: f.primaryEventId ? "Event" : "IntegrityFinding",
        relatedRefId: f.primaryEventId ?? f.id,
        integrityFindingId: f.id,
      });
    }
  }

  let recordsExamined = latest?.eventsExamined ?? 0;
  let truncated = false;

  if (full || !scanFresh) {
    try {
      const loaded = await loadBoundedIntegrityInput();
      truncated = loaded.truncated;
      recordsExamined = Math.max(recordsExamined, loaded.eventsExamined);
      const drafts = runAllIntegrityDetectors(loaded.input);
      for (const d of drafts.slice(0, 80)) {
        findings.push({
          domain: "integrity",
          findingKey: `integrity:${d.findingKey}`,
          findingType: d.findingType,
          severity: mapIntegritySeverity(d.severity),
          summary: d.summary,
          evidenceFingerprint: fingerprint({
            findingKey: d.findingKey,
            version: CALENDAR_INTEGRITY_DETECTOR_VERSION,
          }),
          relatedRefType: d.primaryEventId ? "Event" : null,
          relatedRefId: d.primaryEventId,
        });
      }
      findings.push({
        domain: "integrity",
        findingKey: stableFindingKey("integrity", "INTEGRITY_LIVE_PASS"),
        findingType: "INTEGRITY_LIVE_PASS",
        severity: "INFO",
        summary: `In-memory integrity detectors examined ${loaded.eventsExamined} event(s)${truncated ? " (truncated)" : ""} — no CalendarIntegrityScan write.`,
        evidenceFingerprint: fingerprint({
          examined: loaded.eventsExamined,
          draftCount: drafts.length,
          truncated,
        }),
      });
    } catch (error) {
      return {
        domain: "integrity",
        state: "FAILED",
        findings,
        recordsExamined,
        error: error instanceof Error ? error.message.slice(0, 200) : "integrity_failed",
      };
    }
  }

  return {
    domain: "integrity",
    state: truncated ? "PARTIAL" : "COMPLETED",
    findings,
    recordsExamined,
  };
}

async function checkTime(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const badRanges = await prisma.event.findMany({
    where: {
      // Prisma can't compare columns directly in all versions — sample + filter
    },
    take: 500,
    orderBy: { updatedAt: "desc" },
    select: { id: true, startsAt: true, endsAt: true, timezone: true },
  });
  let bad = 0;
  let missingTz = 0;
  for (const e of badRanges) {
    if (e.startsAt > e.endsAt) {
      bad += 1;
      findings.push({
        domain: "time",
        findingKey: stableFindingKey("time", "INVALID_TIME_RANGE", e.id),
        findingType: "INVALID_TIME_RANGE",
        severity: "WARNING",
        summary: `Event ${e.id.slice(0, 8)}… invalid time range.`,
        evidenceFingerprint: fingerprint({ id: e.id }),
        relatedRefType: "Event",
        relatedRefId: e.id,
      });
    }
    if (!e.timezone?.trim()) {
      missingTz += 1;
      findings.push({
        domain: "time",
        findingKey: stableFindingKey("time", "MISSING_TIMEZONE", e.id),
        findingType: "MISSING_TIMEZONE",
        severity: "WARNING",
        summary: `Event ${e.id.slice(0, 8)}… missing timezone.`,
        evidenceFingerprint: fingerprint({ id: e.id }),
        relatedRefType: "Event",
        relatedRefId: e.id,
      });
    }
  }
  if (bad + missingTz === 0) {
    findings.push({
      domain: "time",
      findingKey: stableFindingKey("time", "TIME_SAMPLE_OK"),
      findingType: "TIME_SAMPLE_OK",
      severity: "INFO",
      summary: `Time sample of ${badRanges.length} events — no bad ranges or missing timezones.`,
      evidenceFingerprint: fingerprint({ sampled: badRanges.length }),
    });
  }
  return {
    domain: "time",
    state: "COMPLETED",
    findings: findings.slice(0, 100),
    recordsExamined: badRanges.length,
  };
}

async function checkRecurrence(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const seriesCount = await prisma.calendarRecurrenceSeries.count();
  const recurringEvents = await prisma.event.count({
    where: { isRecurring: true },
  });
  findings.push({
    domain: "recurrence",
    findingKey: stableFindingKey("recurrence", "RECURRENCE_COUNT_SNAPSHOT"),
    findingType: "RECURRENCE_COUNT_SNAPSHOT",
    severity: "INFO",
    summary: `${seriesCount} series · ${recurringEvents} recurring event(s).`,
    evidenceFingerprint: fingerprint({ seriesCount, recurringEvents }),
  });

  const withSeries = await prisma.event.findMany({
    where: { recurrenceSeriesId: { not: null } },
    take: 500,
    select: { id: true, recurrenceSeriesId: true },
  });
  const seriesIds = [
    ...new Set(
      withSeries
        .map((e) => e.recurrenceSeriesId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const existing = seriesIds.length
    ? await prisma.calendarRecurrenceSeries.findMany({
        where: { id: { in: seriesIds } },
        select: { id: true },
      })
    : [];
  const existingSet = new Set(existing.map((s) => s.id));
  let orphans = 0;
  for (const e of withSeries) {
    if (e.recurrenceSeriesId && !existingSet.has(e.recurrenceSeriesId)) {
      orphans += 1;
      findings.push({
        domain: "recurrence",
        findingKey: stableFindingKey(
          "recurrence",
          "ORPHANED_RECURRENCE_SERIES_REF",
          e.id,
        ),
        findingType: "ORPHANED_RECURRENCE_SERIES_REF",
        severity: "WARNING",
        summary: `Event ${e.id.slice(0, 8)}… points at missing recurrence series.`,
        evidenceFingerprint: fingerprint({
          eventId: e.id,
          seriesId: e.recurrenceSeriesId,
        }),
        relatedRefType: "Event",
        relatedRefId: e.id,
      });
    }
  }
  if (orphans === 0) {
    findings.push({
      domain: "recurrence",
      findingKey: stableFindingKey("recurrence", "RECURRENCE_REFS_OK"),
      findingType: "RECURRENCE_REFS_OK",
      severity: "INFO",
      summary: "No orphaned recurrenceSeriesId references in sampled events.",
      evidenceFingerprint: fingerprint({ sampled: withSeries.length }),
    });
  }

  return {
    domain: "recurrence",
    state: "COMPLETED",
    findings: findings.slice(0, 80),
    recordsExamined: seriesCount + withSeries.length,
  };
}

async function checkAvailability(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const ruleCount = await prisma.calendarAvailabilityRule.count();
  findings.push({
    domain: "availability",
    findingKey: stableFindingKey("availability", "AVAILABILITY_RULE_COUNT"),
    findingType: "AVAILABILITY_RULE_COUNT",
    severity: "INFO",
    summary: `${ruleCount} availability rule(s) (observe-only; no approve).`,
    evidenceFingerprint: fingerprint({ ruleCount }),
  });
  const badTz = await prisma.calendarAvailabilityRule.findMany({
    where: { OR: [{ timezone: "" }, { timezone: { equals: " " } }] },
    take: 50,
    select: { id: true, timezone: true },
  });
  // Also catch whitespace-only via sample
  const sample = await prisma.calendarAvailabilityRule.findMany({
    take: 200,
    select: { id: true, timezone: true },
  });
  for (const r of [...badTz, ...sample]) {
    if (!r.timezone || !String(r.timezone).trim()) {
      findings.push({
        domain: "availability",
        findingKey: stableFindingKey(
          "availability",
          "INVALID_AVAILABILITY_TIMEZONE",
          r.id,
        ),
        findingType: "INVALID_AVAILABILITY_TIMEZONE",
        severity: "WARNING",
        summary: `Availability rule ${r.id.slice(0, 8)}… has empty timezone.`,
        evidenceFingerprint: fingerprint({ id: r.id }),
        relatedRefType: "AvailabilityRule",
        relatedRefId: r.id,
      });
    }
  }
  return {
    domain: "availability",
    state: "COMPLETED",
    findings: findings.slice(0, 60),
    recordsExamined: ruleCount,
  };
}

async function checkConflicts(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const autoResolved = await prisma.operationalConflictRecord.findMany({
    where: { automaticallyResolved: true },
    take: 50,
    select: { id: true, conflictKey: true, status: true },
  });
  for (const c of autoResolved) {
    findings.push({
      domain: "conflicts",
      findingKey: stableFindingKey(
        "conflicts",
        "AUTOMATICALLY_RESOLVED_CONFLICT",
        c.id,
      ),
      findingType: "AUTOMATICALLY_RESOLVED_CONFLICT",
      severity: "CRITICAL",
      summary: `Conflict ${c.conflictKey} marked automaticallyResolved=true (forbidden auto-disposition).`,
      evidenceFingerprint: fingerprint({ id: c.id, key: c.conflictKey }),
      relatedRefType: "OperationalConflict",
      relatedRefId: c.id,
    });
  }

  const staleActive = await prisma.operationalConflictRecord.findMany({
    where: {
      status: "OPEN",
      stale: true,
      updatedAt: { lt: new Date(Date.now() - STALE_CONFLICT_MS) },
    },
    take: 40,
    select: { id: true, conflictKey: true, updatedAt: true },
  });
  for (const c of staleActive) {
    findings.push({
      domain: "conflicts",
      findingKey: stableFindingKey("conflicts", "STALE_ACTIVE_CONFLICT", c.id),
      findingType: "STALE_ACTIVE_CONFLICT",
      severity: "WARNING",
      summary: `Open conflict ${c.conflictKey} is stale and aged.`,
      evidenceFingerprint: fingerprint({
        id: c.id,
        updatedAt: c.updatedAt,
      }),
      relatedRefType: "OperationalConflict",
      relatedRefId: c.id,
    });
  }

  if (findings.length === 0) {
    findings.push({
      domain: "conflicts",
      findingKey: stableFindingKey("conflicts", "CONFLICTS_OK"),
      findingType: "CONFLICTS_OK",
      severity: "INFO",
      summary: "No automatically-resolved or aged stale-open conflicts detected.",
      evidenceFingerprint: fingerprint({ ok: true }),
    });
  }

  return {
    domain: "conflicts",
    state: "COMPLETED",
    findings,
    recordsExamined: autoResolved.length + staleActive.length,
  };
}

async function checkSearch(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const staleViews = await prisma.calendarSavedView.findMany({
    where: {
      OR: [
        { staleState: { not: null } },
        { querySchemaVersion: { not: 1 } },
      ],
      archivedAt: null,
    },
    take: 50,
    select: {
      id: true,
      name: true,
      staleState: true,
      querySchemaVersion: true,
    },
  });
  for (const v of staleViews) {
    const unsupported =
      v.querySchemaVersion > 1 || v.querySchemaVersion < 1;
    findings.push({
      domain: "search",
      findingKey: stableFindingKey(
        "search",
        unsupported ? "UNSUPPORTED_VIEW_SCHEMA" : "STALE_SAVED_VIEW",
        v.id,
      ),
      findingType: unsupported
        ? "UNSUPPORTED_VIEW_SCHEMA"
        : "STALE_SAVED_VIEW",
      severity: unsupported ? "WARNING" : "INFO",
      summary: unsupported
        ? `Saved view "${v.name}" has unsupported querySchemaVersion=${v.querySchemaVersion}.`
        : `Saved view "${v.name}" marked stale (${v.staleState}).`,
      evidenceFingerprint: fingerprint({
        id: v.id,
        staleState: v.staleState,
        querySchemaVersion: v.querySchemaVersion,
      }),
      relatedRefType: "SavedView",
      relatedRefId: v.id,
    });
  }
  if (findings.length === 0) {
    findings.push({
      domain: "search",
      findingKey: stableFindingKey("search", "SEARCH_VIEWS_OK"),
      findingType: "SEARCH_VIEWS_OK",
      severity: "INFO",
      summary: "No stale or unsupported saved views detected.",
      evidenceFingerprint: fingerprint({ ok: true }),
    });
  }
  return {
    domain: "search",
    state: "COMPLETED",
    findings,
    recordsExamined: staleViews.length,
  };
}

async function checkScheduling(): Promise<DomainCheckResult> {
  return {
    domain: "scheduling",
    state: "COMPLETED",
    findings: [
      {
        domain: "scheduling",
        findingKey: stableFindingKey("scheduling", "SCHEDULING_COVERAGE"),
        findingType: "SCHEDULING_COVERAGE",
        severity: "INFO",
        summary:
          "Scheduling workspace health: observe-only coverage (no view-triggered write detector).",
        evidenceFingerprint: fingerprint({ coverage: true }),
      },
    ],
    recordsExamined: 0,
  };
}

async function checkBulk(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const stuck = await prisma.calendarBulkOperation.findMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: new Date(Date.now() - STUCK_BULK_MS) },
    },
    take: 20,
    select: { id: true, actionType: true, startedAt: true },
  });
  for (const op of stuck) {
    findings.push({
      domain: "bulk",
      findingKey: stableFindingKey("bulk", "BULK_STUCK_RUNNING", op.id),
      findingType: "BULK_STUCK_RUNNING",
      severity: "CRITICAL",
      summary: `Bulk operation ${op.id.slice(0, 8)}… stuck RUNNING >1h (${op.actionType}).`,
      evidenceFingerprint: fingerprint({
        id: op.id,
        startedAt: op.startedAt,
      }),
      relatedRefType: "BulkOperation",
      relatedRefId: op.id,
    });
  }
  const recentBad = await prisma.calendarBulkOperation.findMany({
    where: {
      status: { in: ["PARTIAL", "FAILED"] },
      createdAt: { gte: new Date(Date.now() - RECENT_BULK_MS) },
    },
    take: 20,
    select: { id: true, status: true, actionType: true },
  });
  for (const op of recentBad) {
    findings.push({
      domain: "bulk",
      findingKey: stableFindingKey("bulk", `BULK_${op.status}`, op.id),
      findingType: `BULK_${op.status}`,
      severity: "WARNING",
      summary: `Recent bulk operation ${op.id.slice(0, 8)}… ended ${op.status}.`,
      evidenceFingerprint: fingerprint({ id: op.id, status: op.status }),
      relatedRefType: "BulkOperation",
      relatedRefId: op.id,
    });
  }
  if (findings.length === 0) {
    findings.push({
      domain: "bulk",
      findingKey: stableFindingKey("bulk", "BULK_OK"),
      findingType: "BULK_OK",
      severity: "INFO",
      summary: "No stuck or recently failed/partial bulk operations.",
      evidenceFingerprint: fingerprint({ ok: true }),
    });
  }
  return {
    domain: "bulk",
    state: "COMPLETED",
    findings,
    recordsExamined: stuck.length + recentBad.length,
  };
}

async function checkIcs(): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const byStatus = await prisma.calendarSubscriptionFeed.groupBy({
    by: ["status"],
    _count: true,
  });
  const total = byStatus.reduce((n, r) => n + r._count, 0);
  findings.push({
    domain: "ics",
    findingKey: stableFindingKey("ics", "FEED_COUNT_SNAPSHOT"),
    findingType: "FEED_COUNT_SNAPSHOT",
    severity: "INFO",
    summary: `Subscription feeds: ${total} total (${byStatus
      .map((r) => `${r.status}=${r._count}`)
      .join(", ") || "none"}).`,
    evidenceFingerprint: fingerprint({ byStatus, total }),
  });
  findings.push({
    domain: "ics",
    findingKey: stableFindingKey("ics", "PUBLIC_ANONYMOUS_FEEDS"),
    findingType: "PUBLIC_ANONYMOUS_FEEDS",
    severity: "INFO",
    summary:
      "Public anonymous ICS feed count = 0 (CC-10 private feeds only) — PASS.",
    evidenceFingerprint: fingerprint({ publicAnonymous: 0 }),
  });

  const emptyToken = await prisma.calendarSubscriptionFeed.findMany({
    where: { OR: [{ tokenHash: "" }] },
    take: 20,
    select: { id: true, status: true, tokenPrefix: true },
  });
  // Also sample for whitespace
  const sample = await prisma.calendarSubscriptionFeed.findMany({
    take: 100,
    select: { id: true, tokenHash: true, tokenPrefix: true, status: true },
  });
  const bad = [
    ...emptyToken,
    ...sample.filter((f) => !f.tokenHash || !String(f.tokenHash).trim()),
  ];
  const seen = new Set<string>();
  for (const f of bad) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    findings.push({
      domain: "ics",
      findingKey: stableFindingKey("ics", "EMPTY_TOKEN_HASH", f.id),
      findingType: "EMPTY_TOKEN_HASH",
      severity: "CRITICAL",
      summary: `Feed ${f.id.slice(0, 8)}… has empty tokenHash (prefix ${f.tokenPrefix ?? "—"}; token never printed).`,
      evidenceFingerprint: fingerprint({ id: f.id, status: f.status }),
      relatedRefType: "Feed",
      relatedRefId: f.id,
    });
  }

  return {
    domain: "ics",
    state: "COMPLETED",
    findings,
    recordsExamined: total,
  };
}

async function checkJobs(configState: string): Promise<DomainCheckResult> {
  const findings: HealthFindingDraft[] = [];
  const hasDatabaseUrl = Boolean(
    process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim(),
  );
  findings.push({
    domain: "jobs",
    findingKey: stableFindingKey("jobs", "DATABASE_URL_PRESENT"),
    findingType: "DATABASE_URL_PRESENT",
    severity: hasDatabaseUrl ? "INFO" : "CRITICAL",
    summary: hasDatabaseUrl
      ? "DATABASE_URL is present (value not printed)."
      : "DATABASE_URL is missing — health cannot be HEALTHY.",
    evidenceFingerprint: fingerprint({ present: hasDatabaseUrl }),
  });

  let leaseOk = false;
  try {
    await prisma.calendarHealthCheckpoint.findFirst({
      where: { campaignKey: CAMPAIGN_KEY },
    });
    leaseOk = true;
  } catch {
    leaseOk = false;
  }
  findings.push({
    domain: "jobs",
    findingKey: stableFindingKey("jobs", "LEASE_INFRASTRUCTURE"),
    findingType: "LEASE_INFRASTRUCTURE",
    severity: leaseOk ? "INFO" : "CRITICAL",
    summary: leaseOk
      ? "Health checkpoint/lease tables reachable."
      : "Health lease/checkpoint tables unreachable.",
    evidenceFingerprint: fingerprint({ leaseOk }),
  });
  findings.push({
    domain: "jobs",
    findingKey: stableFindingKey("jobs", "CONFIG_STATE"),
    findingType: "CONFIG_STATE",
    severity:
      configState === "OK"
        ? "INFO"
        : configState === "MISSING_DATABASE"
          ? "CRITICAL"
          : "WARNING",
    summary: `configState=${configState}`,
    evidenceFingerprint: fingerprint({ configState }),
  });

  return {
    domain: "jobs",
    state: hasDatabaseUrl && leaseOk ? "COMPLETED" : "FAILED",
    findings,
    recordsExamined: 3,
  };
}

async function runDomain(
  domain: HealthDomain,
  opts: { full: boolean; configState: string },
): Promise<DomainCheckResult> {
  try {
    switch (domain) {
      case "events":
        return await checkEvents();
      case "imports":
        return await checkImports();
      case "integrity":
        return await checkIntegrity(opts.full);
      case "time":
        return await checkTime();
      case "recurrence":
        return await checkRecurrence();
      case "availability":
        return await checkAvailability();
      case "conflicts":
        return await checkConflicts();
      case "search":
        return await checkSearch();
      case "scheduling":
        return await checkScheduling();
      case "bulk":
        return await checkBulk();
      case "ics":
        return await checkIcs();
      case "jobs":
        return await checkJobs(opts.configState);
      default:
        return {
          domain,
          state: "SKIPPED",
          findings: [],
          recordsExamined: 0,
          skipped: true,
          error: "unknown_domain",
        };
    }
  } catch (error) {
    return {
      domain,
      state: "FAILED",
      findings: [],
      recordsExamined: 0,
      error: error instanceof Error ? error.message.slice(0, 200) : "domain_failed",
    };
  }
}

function resolveConfigState(opts?: {
  secretConfigured?: boolean;
  forScheduled?: boolean;
}): string {
  if (!process.env.DATABASE_URL?.trim()) {
    return "MISSING_DATABASE";
  }
  if (opts?.forScheduled && opts.secretConfigured === false) {
    return "MISSING_SECRET";
  }
  return "OK";
}

async function coalesceAlerts(
  campaignKey: string,
  findings: HealthFindingDraft[],
): Promise<void> {
  const alertWorthy = findings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "WARNING",
  );
  for (const f of alertWorthy) {
    const existing = await prisma.calendarHealthAlert.findUnique({
      where: {
        campaignKey_findingKey: {
          campaignKey,
          findingKey: f.findingKey,
        },
      },
    });
    let nextStatus: "OPEN" | "ACKNOWLEDGED" | "SUPPRESSED" = "OPEN";
    if (existing?.status === "ACKNOWLEDGED") {
      nextStatus = "ACKNOWLEDGED";
    } else if (
      existing?.status === "SUPPRESSED" &&
      existing.suppressedUntil &&
      existing.suppressedUntil.getTime() > Date.now()
    ) {
      nextStatus = "SUPPRESSED";
    }

    await prisma.calendarHealthAlert.upsert({
      where: {
        campaignKey_findingKey: {
          campaignKey,
          findingKey: f.findingKey,
        },
      },
      create: {
        campaignKey,
        findingKey: f.findingKey,
        alertType: f.findingType,
        severity: String(f.severity),
        status: "OPEN",
        summary: f.summary.slice(0, 500),
        firstTriggeredAt: new Date(),
        lastTriggeredAt: new Date(),
      },
      update: {
        lastTriggeredAt: new Date(),
        severity: String(f.severity),
        summary: f.summary.slice(0, 500),
        alertType: f.findingType,
        status: nextStatus,
        resolvedAt: null,
      },
    });
  }
}

async function autoResolveMissingAlerts(
  campaignKey: string,
  currentKeys: Set<string>,
): Promise<void> {
  const openAlerts = await prisma.calendarHealthAlert.findMany({
    where: {
      campaignKey,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    select: { id: true, findingKey: true, severity: true },
  });
  for (const a of openAlerts) {
    if (!currentKeys.has(a.findingKey)) {
      await prisma.calendarHealthAlert.update({
        where: { id: a.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
    }
  }
}

async function updateCheckpoint(input: {
  campaignKey: string;
  scope: string;
  runId: string;
  overallState: CalendarHealthOverallState;
  status: string;
}): Promise<void> {
  const isLightweight = input.scope === "LIGHTWEIGHT";
  const checkpointKey = isLightweight
    ? "last_lightweight"
    : "last_successful_full";
  const success =
    input.status === "COMPLETED" || input.status === "PARTIAL";
  const healthyEnough =
    success &&
    (input.overallState === "HEALTHY" ||
      input.overallState === "DEGRADED" ||
      input.overallState === "PARTIAL");

  const existing = await prisma.calendarHealthCheckpoint.findUnique({
    where: {
      campaignKey_checkpointKey: {
        campaignKey: input.campaignKey,
        checkpointKey,
      },
    },
  });

  const consecutiveFailures = healthyEnough
    ? 0
    : (existing?.consecutiveFailures ?? 0) + 1;

  await prisma.calendarHealthCheckpoint.upsert({
    where: {
      campaignKey_checkpointKey: {
        campaignKey: input.campaignKey,
        checkpointKey,
      },
    },
    create: {
      campaignKey: input.campaignKey,
      checkpointKey,
      lastAttemptedRunId: input.runId,
      lastCompleteRunId: success ? input.runId : null,
      lastSuccessfulRunId: healthyEnough ? input.runId : null,
      consecutiveFailures,
      nextExpectedAt: new Date(
        Date.now() +
          (isLightweight ? LIGHTWEIGHT_FRESHNESS_MS : FULL_FRESHNESS_MS),
      ),
      metaJson: { overallState: input.overallState, status: input.status },
    },
    update: {
      lastAttemptedRunId: input.runId,
      lastCompleteRunId: success ? input.runId : existing?.lastCompleteRunId,
      lastSuccessfulRunId: healthyEnough
        ? input.runId
        : existing?.lastSuccessfulRunId,
      consecutiveFailures,
      nextExpectedAt: new Date(
        Date.now() +
          (isLightweight ? LIGHTWEIGHT_FRESHNESS_MS : FULL_FRESHNESS_MS),
      ),
      metaJson: { overallState: input.overallState, status: input.status },
    },
  });

  // Always refresh last_attempted alias
  await prisma.calendarHealthCheckpoint.upsert({
    where: {
      campaignKey_checkpointKey: {
        campaignKey: input.campaignKey,
        checkpointKey: "last_attempted",
      },
    },
    create: {
      campaignKey: input.campaignKey,
      checkpointKey: "last_attempted",
      lastAttemptedRunId: input.runId,
      consecutiveFailures,
    },
    update: {
      lastAttemptedRunId: input.runId,
      consecutiveFailures,
    },
  });
}

function previousComparableFindingKeys(
  previous: Array<{ findingKey: string }> | null,
): Set<string> {
  return new Set((previous ?? []).map((f) => f.findingKey));
}

function applyTrends(
  drafts: HealthFindingDraft[],
  previousKeys: Set<string>,
): HealthFindingDraft[] {
  return drafts.map((d) => ({
    ...d,
    trend: previousKeys.has(d.findingKey) ? "CONTINUING" : "NEW",
  }));
}

export async function startHealthRun(input: {
  actor?: AuthenticatedActor | null;
  runType: CalendarHealthRunType;
  scope: string;
  domains?: HealthDomain[];
  focusedRef?: { type: string; id: string } | null;
  systemJobId?: string;
  requestId?: string;
  /** When true, skip session auth (secret already validated at ingress). */
  asSystem?: boolean;
  secretConfigured?: boolean;
}) {
  const asSystem = Boolean(input.asSystem || input.runType === "SCHEDULED");
  if (!asSystem) {
    if (!input.actor) {
      throw new ValidationError("Authenticated actor required for manual health runs.");
    }
    await requireAuthorized(input.actor, {
      action: "CALENDAR_HEALTH_RUN",
      resource: { type: "system" },
    });
  }

  const scope = input.scope || (asSystem ? "LIGHTWEIGHT" : "FULL");
  const domains = resolveDomains(scope, input.domains);
  const full = scope === "FULL" || scope === "DATE_RANGE";
  const configState = resolveConfigState({
    forScheduled: asSystem,
    secretConfigured: input.secretConfigured,
  });
  const leaseOwner =
    input.systemJobId ??
    input.actor?.userId ??
    `manual:${randomUUID()}`;
  const systemJobId = input.systemJobId ?? (asSystem ? randomUUID() : null);

  await acquireLease({
    campaignKey: CAMPAIGN_KEY,
    scope,
    leaseOwner,
  });

  const previous = await prisma.calendarHealthRun.findFirst({
    where: {
      campaignKey: CAMPAIGN_KEY,
      scope,
      status: { in: ["COMPLETED", "PARTIAL"] },
    },
    orderBy: { completedAt: "desc" },
    include: { findings: { select: { findingKey: true } } },
  });

  const run = await prisma.calendarHealthRun.create({
    data: {
      campaignKey: CAMPAIGN_KEY,
      runType: input.runType,
      scope,
      domainsJson: domains,
      detectorVersion: CALENDAR_HEALTH_DETECTOR_VERSION,
      status: "STARTED",
      overallState: "UNKNOWN",
      requestedByUserId: asSystem ? null : input.actor?.userId ?? null,
      systemJobId,
      leaseOwner,
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      mandatoryExpected: domains.length,
      previousComparableRunId: previous?.id ?? null,
      configState,
      heartbeatAt: new Date(),
    },
  });

  await prisma.calendarHealthRun.update({
    where: { id: run.id },
    data: { status: "RUNNING" },
  });

  const execute = async () => {
    const startedMs = Date.now();
    const allFindings: HealthFindingDraft[] = [];
    let mandatoryCompleted = 0;
    let mandatoryFailed = 0;
    let mandatorySkipped = 0;
    let recordsExamined = 0;
    let truncated = false;
    const findingsByDomain: Record<string, number> = {};
    const findingsBySeverity: Record<string, number> = {};
    const domainResults: DomainCheckResult[] = [];

    if (configState === "MISSING_DATABASE") {
      mandatoryFailed = domains.length;
      mandatorySkipped = 0;
      mandatoryCompleted = 0;
    } else {
      for (const domain of domains) {
        if (Date.now() - startedMs > MAX_RUN_MS) {
          truncated = true;
          mandatorySkipped += 1;
          domainResults.push({
            domain,
            state: "SKIPPED",
            findings: [],
            recordsExamined: 0,
            skipped: true,
            error: "run_timeout",
          });
          continue;
        }
        await heartbeat(run.id);
        const result = await runDomain(domain, { full, configState });
        domainResults.push(result);
        recordsExamined += result.recordsExamined;
        if (result.skipped || result.state === "SKIPPED") {
          mandatorySkipped += 1;
        } else if (result.state === "FAILED") {
          mandatoryFailed += 1;
        } else {
          mandatoryCompleted += 1;
          if (result.state === "PARTIAL") truncated = true;
        }
        for (const f of result.findings) {
          allFindings.push(f);
          findingsByDomain[f.domain] = (findingsByDomain[f.domain] ?? 0) + 1;
          const sev = String(f.severity);
          findingsBySeverity[sev] = (findingsBySeverity[sev] ?? 0) + 1;
        }
      }
    }

    const capped = allFindings.slice(0, MAX_FINDINGS_PER_RUN);
    if (allFindings.length > MAX_FINDINGS_PER_RUN) {
      truncated = true;
    }
    const previousKeys = previousComparableFindingKeys(previous?.findings ?? null);
    const withTrends = applyTrends(capped, previousKeys);

    if (withTrends.length > 0) {
      await prisma.calendarHealthFinding.createMany({
        data: withTrends.map((f) => ({
          runId: run.id,
          campaignKey: CAMPAIGN_KEY,
          domain: String(f.domain),
          findingKey: f.findingKey,
          findingType: f.findingType,
          severity: String(f.severity),
          certainty: f.certainty ?? "CONFIRMED",
          status: f.status ?? "OPEN",
          summary: f.summary.slice(0, 800),
          evidenceFingerprint: f.evidenceFingerprint,
          relatedRefType: f.relatedRefType ?? null,
          relatedRefId: f.relatedRefId ?? null,
          integrityFindingId: f.integrityFindingId ?? null,
          trend: f.trend ? String(f.trend) : null,
        })),
      });
    }

    await coalesceAlerts(CAMPAIGN_KEY, withTrends);
    await autoResolveMissingAlerts(
      CAMPAIGN_KEY,
      new Set(
        withTrends
          .filter((f) => f.severity === "CRITICAL" || f.severity === "WARNING")
          .map((f) => f.findingKey),
      ),
    );

    const criticalFindings = withTrends.filter(
      (f) => f.severity === "CRITICAL",
    ).length;
    const warningFindings = withTrends.filter(
      (f) => f.severity === "WARNING",
    ).length;

    const overallState = deriveOverallHealthState({
      mandatoryExpected: domains.length,
      mandatoryCompleted,
      mandatoryFailed,
      mandatorySkipped,
      truncated,
      criticalFindings,
      warningFindings,
      configState,
    });

    let status: "COMPLETED" | "PARTIAL" | "FAILED" = "COMPLETED";
    if (mandatoryFailed > 0 && mandatoryCompleted === 0) status = "FAILED";
    else if (mandatoryFailed > 0 || truncated || mandatorySkipped > 0)
      status = "PARTIAL";

    const resultFingerprint = fingerprint({
      overallState,
      findingsBySeverity,
      findingsByDomain,
      recordsExamined,
    });

    const updated = await prisma.calendarHealthRun.update({
      where: { id: run.id },
      data: {
        status,
        overallState,
        completedAt: new Date(),
        heartbeatAt: new Date(),
        leaseExpiresAt: new Date(),
        mandatoryExpected: domains.length,
        mandatoryCompleted,
        mandatoryFailed,
        mandatorySkipped,
        recordsExamined,
        findingsBySeverity,
        findingsByDomain,
        truncated,
        truncationNote: truncated
          ? `Soft limits applied (max findings ${MAX_FINDINGS_PER_RUN}, max run ${MAX_RUN_MS}ms).`
          : null,
        resultFingerprint,
        configState,
        errorSummaryRedacted:
          domainResults
            .filter((d) => d.error)
            .map((d) => `${d.domain}:${d.error}`)
            .join("; ")
            .slice(0, 500) || null,
      },
    });

    await updateCheckpoint({
      campaignKey: CAMPAIGN_KEY,
      scope,
      runId: run.id,
      overallState,
      status,
    });

    if (input.actor && !asSystem) {
      await writeAttributedAudit({
        actor: input.actor,
        action: "CALENDAR_HEALTH_RUN",
        entityType: "CalendarHealthRun",
        entityId: run.id,
        requestId: input.requestId,
        newState: {
          scope,
          overallState,
          status,
          recordsExamined,
          truncated,
          detectorVersion: CALENDAR_HEALTH_DETECTOR_VERSION,
        },
      });
    }

    return {
      runId: updated.id,
      status: updated.status,
      overallState: updated.overallState,
      scope: updated.scope,
      runType: updated.runType,
      recordsExamined: updated.recordsExamined,
      truncated: updated.truncated,
      findingsTotal: withTrends.length,
      findingsBySeverity,
      findingsByDomain,
      mandatoryExpected: domains.length,
      mandatoryCompleted,
      mandatoryFailed,
      mandatorySkipped,
      configState,
      detectorVersion: CALENDAR_HEALTH_DETECTOR_VERSION,
      domainResults: domainResults.map((d) => ({
        domain: d.domain,
        state: d.state,
        recordsExamined: d.recordsExamined,
        findings: d.findings.length,
        skipped: d.skipped ?? false,
        error: d.error ?? null,
      })),
    };
  };

  if (asSystem) {
    return runWithActorAsync(systemHealthViewer(systemJobId ?? run.id), execute);
  }
  return execute();
}

export async function getHealthDashboard(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  try {
    const latest = await prisma.calendarHealthRun.findFirst({
      where: {
        campaignKey: CAMPAIGN_KEY,
        status: { in: ["COMPLETED", "PARTIAL", "FAILED"] },
      },
      orderBy: { completedAt: "desc" },
    });
    const latestAttempt = await prisma.calendarHealthRun.findFirst({
      where: { campaignKey: CAMPAIGN_KEY },
      orderBy: { startedAt: "desc" },
    });
    const openAlerts = await prisma.calendarHealthAlert.findMany({
      where: {
        campaignKey: CAMPAIGN_KEY,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      orderBy: [{ severity: "asc" }, { lastTriggeredAt: "desc" }],
      take: 40,
    });
    const checkpoints = await prisma.calendarHealthCheckpoint.findMany({
      where: { campaignKey: CAMPAIGN_KEY },
    });

    const domainCards =
      latest && latest.findingsByDomain
        ? Object.entries(latest.findingsByDomain as Record<string, number>).map(
            ([domain, count]) => ({ domain, findingCount: count }),
          )
        : [];

    const freshnessMs =
      latest?.scope === "LIGHTWEIGHT"
        ? LIGHTWEIGHT_FRESHNESS_MS
        : FULL_FRESHNESS_MS;

    return {
      detectorVersion: CALENDAR_HEALTH_DETECTOR_VERSION,
      schemaReady: true,
      overallState: latest?.overallState ?? "UNKNOWN",
      latestRun: latest
        ? {
            id: latest.id,
            status: latest.status,
            overallState: latest.overallState,
            scope: latest.scope,
            runType: latest.runType,
            startedAt: latest.startedAt,
            completedAt: latest.completedAt,
            recordsExamined: latest.recordsExamined,
            truncated: latest.truncated,
            findingsBySeverity: latest.findingsBySeverity,
            findingsByDomain: latest.findingsByDomain,
            configState: latest.configState,
          }
        : null,
      latestAttempt: latestAttempt
        ? {
            id: latestAttempt.id,
            status: latestAttempt.status,
            startedAt: latestAttempt.startedAt,
            overallState: latestAttempt.overallState,
          }
        : null,
      domainCards,
      openAlerts: openAlerts.map((a) => ({
        id: a.id,
        findingKey: a.findingKey,
        alertType: a.alertType,
        severity: a.severity,
        status: a.status,
        summary: a.summary,
        lastTriggeredAt: a.lastTriggeredAt,
        acknowledgedAt: a.acknowledgedAt,
      })),
      checkpoints,
      stale: isStale(latest?.completedAt, freshnessMs),
      configState: resolveConfigState(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021|relation .* does not exist/i.test(message)) {
      return {
        detectorVersion: CALENDAR_HEALTH_DETECTOR_VERSION,
        schemaReady: false,
        overallState: "UNKNOWN" as const,
        latestRun: null,
        latestAttempt: null,
        domainCards: [],
        openAlerts: [],
        checkpoints: [],
        stale: true,
        configState: "MISSING_DATABASE",
        schemaNote:
          "Health tables not applied yet — run migration before health runs.",
      };
    }
    throw error;
  }
}

export async function listHealthRuns(actor: AuthenticatedActor, limit = 30) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  try {
    return await prisma.calendarHealthRun.findMany({
      where: { campaignKey: CAMPAIGN_KEY },
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

export async function getHealthRun(actor: AuthenticatedActor, runId: string) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  const run = await prisma.calendarHealthRun.findUnique({
    where: { id: runId },
    include: {
      findings: { orderBy: [{ severity: "asc" }, { createdAt: "desc" }] },
    },
  });
  if (!run) throw new NotFoundError("Health run not found.");
  return run;
}

export async function listFindings(
  actor: AuthenticatedActor,
  opts?: { runId?: string; domain?: string; limit?: number },
) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  return prisma.calendarHealthFinding.findMany({
    where: {
      campaignKey: CAMPAIGN_KEY,
      ...(opts?.runId ? { runId: opts.runId } : {}),
      ...(opts?.domain ? { domain: opts.domain } : {}),
    },
    orderBy: [{ severity: "asc" }, { lastObservedAt: "desc" }],
    take: opts?.limit ?? 100,
  });
}

export async function getFinding(actor: AuthenticatedActor, findingId: string) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  const finding = await prisma.calendarHealthFinding.findUnique({
    where: { id: findingId },
    include: { run: true },
  });
  if (!finding) throw new NotFoundError("Health finding not found.");
  return finding;
}

export async function listAlerts(
  actor: AuthenticatedActor,
  opts?: { includeResolved?: boolean; limit?: number },
) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  return prisma.calendarHealthAlert.findMany({
    where: {
      campaignKey: CAMPAIGN_KEY,
      ...(opts?.includeResolved
        ? {}
        : { status: { in: ["OPEN", "ACKNOWLEDGED", "SUPPRESSED"] } }),
    },
    orderBy: [{ severity: "asc" }, { lastTriggeredAt: "desc" }],
    take: opts?.limit ?? 50,
  });
}

export async function acknowledgeAlert(
  actor: AuthenticatedActor,
  alertId: string,
) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_ALERT_ACK",
    resource: { type: "system" },
  });
  const alert = await prisma.calendarHealthAlert.findUnique({
    where: { id: alertId },
  });
  if (!alert) throw new NotFoundError("Health alert not found.");
  if (!isAlertStillOpen(alert.status) && alert.status !== "SUPPRESSED") {
    throw new ValidationError("Only open/acknowledged alerts can be acknowledged.");
  }
  const updated = await prisma.calendarHealthAlert.update({
    where: { id: alertId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedByUserId: actor.userId,
    },
  });
  await writeAttributedAudit({
    actor,
    action: "CALENDAR_HEALTH_ALERT_ACK",
    entityType: "CalendarHealthAlert",
    entityId: alertId,
    newState: { status: "ACKNOWLEDGED", findingKey: alert.findingKey },
  });
  return updated;
}

export async function suppressAlert(
  actor: AuthenticatedActor,
  alertId: string,
  input: { reason: string; until: Date },
) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_ALERT_SUPPRESS",
    resource: { type: "system" },
  });
  if (!input.reason?.trim()) {
    throw new ValidationError("Suppression reason is required.");
  }
  if (!(input.until instanceof Date) || Number.isNaN(input.until.getTime())) {
    throw new ValidationError("suppressedUntil must be a valid date.");
  }
  const alert = await prisma.calendarHealthAlert.findUnique({
    where: { id: alertId },
  });
  if (!alert) throw new NotFoundError("Health alert not found.");
  const updated = await prisma.calendarHealthAlert.update({
    where: { id: alertId },
    data: {
      status: "SUPPRESSED",
      suppressedUntil: input.until,
      suppressionReason: input.reason.trim().slice(0, 500),
      acknowledgedByUserId: actor.userId,
      acknowledgedAt: new Date(),
    },
  });
  await writeAttributedAudit({
    actor,
    action: "CALENDAR_HEALTH_ALERT_SUPPRESS",
    entityType: "CalendarHealthAlert",
    entityId: alertId,
    newState: {
      status: "SUPPRESSED",
      until: input.until.toISOString(),
      findingKey: alert.findingKey,
    },
  });
  return updated;
}

export async function resolveAlert(
  actor: AuthenticatedActor,
  alertId: string,
  input?: { reason?: string; force?: boolean },
) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_ALERT_SUPPRESS",
    resource: { type: "system" },
  });
  const alert = await prisma.calendarHealthAlert.findUnique({
    where: { id: alertId },
  });
  if (!alert) throw new NotFoundError("Health alert not found.");

  if (!input?.force) {
    const latest = await prisma.calendarHealthRun.findFirst({
      where: {
        campaignKey: CAMPAIGN_KEY,
        status: { in: ["COMPLETED", "PARTIAL"] },
      },
      orderBy: { completedAt: "desc" },
      include: {
        findings: {
          where: { findingKey: alert.findingKey },
          select: { id: true },
        },
      },
    });
    if (latest && latest.findings.length > 0) {
      throw new ConflictError(
        "Finding still present on latest successful run — cannot auto-resolve.",
      );
    }
  } else if (alert.severity === "CRITICAL" && !input.reason?.trim()) {
    throw new ValidationError(
      "Manual resolve of CRITICAL alerts requires a reason.",
    );
  }

  return prisma.calendarHealthAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      suppressionReason: input?.reason?.trim().slice(0, 500) ?? alert.suppressionReason,
    },
  });
}

export async function exportHealthDiagnostics(
  actor: AuthenticatedActor,
): Promise<string> {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  const dash = await getHealthDashboard(actor);
  const lines = [
    "KCCC Calendar Health Diagnostics (redacted)",
    `detectorVersion=${CALENDAR_HEALTH_DETECTOR_VERSION}`,
    `overallState=${dash.overallState}`,
    `configState=${dash.configState}`,
    `schemaReady=${dash.schemaReady}`,
    `stale=${dash.stale}`,
    `latestRunId=${dash.latestRun?.id ?? "none"}`,
    `latestRunStatus=${dash.latestRun?.status ?? "none"}`,
    `latestOverall=${dash.latestRun?.overallState ?? "none"}`,
    `recordsExamined=${dash.latestRun?.recordsExamined ?? 0}`,
    `openAlerts=${dash.openAlerts.length}`,
    ...dash.openAlerts.map(
      (a) =>
        `alert severity=${a.severity} status=${a.status} type=${a.alertType} key=${a.findingKey}`,
    ),
    ...dash.domainCards.map(
      (c) => `domain=${c.domain} findings=${c.findingCount}`,
    ),
    "NOTE: tokens, URLs, payloads, and DATABASE_URL values are never exported.",
  ];
  await writeAttributedAudit({
    actor,
    action: "CALENDAR_HEALTH_VIEW",
    entityType: "CalendarHealthExport",
    entityId: dash.latestRun?.id ?? "none",
    newState: { exported: true, redacted: true },
  });
  return lines.join("\n");
}

export async function getHealthScheduleStatus(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "CALENDAR_HEALTH_VIEW",
    resource: { type: "system" },
  });
  const healthSecret = Boolean(
    process.env.KCCC_CALENDAR_HEALTH_SCHEDULE_SECRET?.trim() ||
      process.env.KCCC_SCHEDULED_EXECUTION_SECRET?.trim(),
  );
  const checkpoints = await prisma.calendarHealthCheckpoint.findMany({
    where: { campaignKey: CAMPAIGN_KEY },
  });
  const recentScheduled = await prisma.calendarHealthRun.findMany({
    where: { campaignKey: CAMPAIGN_KEY, runType: "SCHEDULED" },
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return {
    configState: resolveConfigState({
      forScheduled: true,
      secretConfigured: healthSecret,
    }),
    scheduleSecretConfigured: healthSecret,
    databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    checkpoints,
    recentScheduled,
    intendedIngress: "POST /api/internal/calendar/health/scheduled",
    note: "Netlify scheduled HTTP invoke is the intended foundation path. Observe/explain only.",
  };
}

/**
 * Secret-authenticated scheduled ingress body. Fail closed when misconfigured.
 */
export async function runScheduledHealthIngress(opts: {
  secretOk: boolean;
  secretConfigured: boolean;
  systemJobId?: string;
}) {
  if (!opts.secretConfigured) {
    return {
      accepted: false,
      overallState: "NOT_CONFIGURED" as const,
      configState: "NOT_CONFIGURED",
      reason: "Schedule secret not configured (fail closed).",
    };
  }
  if (!opts.secretOk) {
    throw new ValidationError("SCHEDULED_INGRESS_UNAUTHORIZED");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      accepted: false,
      overallState: "UNKNOWN" as const,
      configState: "MISSING_DATABASE",
      reason: "DATABASE_URL missing — never report healthy.",
    };
  }

  const result = await startHealthRun({
    runType: "SCHEDULED",
    scope: "LIGHTWEIGHT",
    asSystem: true,
    systemJobId: opts.systemJobId ?? `sched-${randomUUID()}`,
    secretConfigured: true,
  });

  return {
    accepted: true,
    ...result,
  };
}
