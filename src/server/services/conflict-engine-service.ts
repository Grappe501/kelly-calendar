/**
 * CC-06 Conflict Engine — Calendar Slice (ADR-092) — server service.
 * Build: KCCC-CC-06-CONFLICT-ENGINE-1.0
 *
 * Hard constraints (binding, per ADR-092 / KCCC_CC_06_AUTHORIZATION):
 * - NEVER moves/cancels/confirms/archives/restores/deletes Events.
 * - NEVER changes Event status, recurrence, availability rules, or Missions.
 * - NEVER writes to Travel/Logistics/Field Ops/Staffing/Closeout/Launch.
 * - NEVER invents travel duration/distance/traffic/routing — TRAVEL_INFEASIBLE
 *   only fires from stored EventTravelPlan facts; missing facts → skipped
 *   (UNKNOWN), never flagged.
 * - `automaticallyResolved` is always `false`.
 * - `ACKNOWLEDGED` never clears a blocker and never changes `status`.
 * - Recompute never deletes history; unmatched OPEN/ACKNOWLEDGED/ACCEPTED_RISK
 *   records are marked `stale: true` only — operator disposition required to
 *   close them out.
 */

import "server-only";

import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { NotFoundError } from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  DEFAULT_CAMPAIGN_KEY,
  loadActiveRulesAndExceptions,
} from "@/server/services/availability-service";
import { evaluateAvailability } from "@/lib/calendar/availability";
import {
  CC06_INACTIVE_EVENT_STATUSES,
  computeConflictFactFingerprint,
  detectAvailabilityViolationConflicts,
  detectBufferConflicts,
  detectTimeOverlapConflicts,
  detectTravelInfeasibleConflicts,
  type Cc06AvailabilityInput,
  type Cc06BufferInput,
  type Cc06OverlapEvent,
  type Cc06TravelInput,
} from "@/features/operational-intelligence/services/conflict-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import type { Prisma } from "@prisma/client";

/** Pad the scanned window on each side so adjacency (travel, boundary overlaps) is not missed. */
const RECOMPUTE_PADDING_MS = 24 * 60 * 60 * 1000;
const CLOSED_STATUSES = ["RESOLVED", "NOT_APPLICABLE"] as const;

type EngineEvent = {
  id: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  status: string;
  candidateAttendance: boolean | null;
  travelRequired: boolean;
  estimatedTravelMinutes: number | null;
  bufferMinutes: number | null;
};

async function loadEventsForWindow(rangeStart: Date, rangeEnd: Date): Promise<EngineEvent[]> {
  const rows = await prisma.event.findMany({
    where: {
      archivedAt: null,
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: {
      id: true,
      internalTitle: true,
      campaignDisplayTitle: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      isAllDay: true,
      status: true,
      candidateAttendance: true,
      travelPlans: {
        select: { travelRequired: true, estimatedDurationMinutes: true, bufferMinutes: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.campaignDisplayTitle || r.internalTitle,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    timezone: r.timezone,
    isAllDay: r.isAllDay,
    status: r.status,
    candidateAttendance: r.candidateAttendance,
    travelRequired: r.travelPlans[0]?.travelRequired ?? false,
    estimatedTravelMinutes: r.travelPlans[0]?.estimatedDurationMinutes ?? null,
    bufferMinutes: r.travelPlans[0]?.bufferMinutes ?? null,
  }));
}

/**
 * Deterministic detection pipeline shared by recompute (persist) and
 * recheck (read-only). Never touches Event/Mission state.
 */
async function detectConflictsForEvents(
  events: EngineEvent[],
  campaignKey: string,
): Promise<OperationalConflict[]> {
  if (events.length === 0) return [];
  const { rules, exceptions } = await loadActiveRulesAndExceptions(campaignKey);
  const ruleTypeById = new Map(rules.map((r) => [r.id, r.ruleType]));

  const overlapConflicts = detectTimeOverlapConflicts(
    events.map((e) => ({
      id: e.id,
      label: e.label,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      status: e.status,
      candidateAttending: e.candidateAttendance !== false,
    })),
  );

  const availabilityInputs: Cc06AvailabilityInput[] = [];
  const bufferInputs: Cc06BufferInput[] = [];
  for (const e of events) {
    if (CC06_INACTIVE_EVENT_STATUSES.has(e.status)) continue;
    const assessment = evaluateAvailability({
      rules,
      exceptions,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      timezone: e.timezone,
      isAllDay: e.isAllDay,
      eventStatus: e.status,
      subjectType: "CANDIDATE",
    });
    for (const finding of assessment.findings) {
      availabilityInputs.push({ event: { id: e.id, label: e.label }, finding });
      bufferInputs.push({
        event: { id: e.id, label: e.label },
        finding,
        ruleType: finding.ruleId ? ruleTypeById.get(finding.ruleId) : undefined,
      });
    }
  }
  const availabilityConflicts = detectAvailabilityViolationConflicts(availabilityInputs);
  const bufferConflicts = detectBufferConflicts(bufferInputs);

  const chronological = events
    .filter((e) => !CC06_INACTIVE_EVENT_STATUSES.has(e.status))
    .slice()
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const travelInputs: Cc06TravelInput[] = [];
  for (let i = 0; i < chronological.length - 1; i++) {
    const prevEvent = chronological[i];
    const nextEvent = chronological[i + 1];
    if (prevEvent.endsAt > nextEvent.startsAt) continue; // overlap — TIME_OVERLAP already covers it
    if (!nextEvent.travelRequired) continue;
    travelInputs.push({
      previousEvent: { id: prevEvent.id, label: prevEvent.label, endsAt: prevEvent.endsAt },
      nextEvent: { id: nextEvent.id, label: nextEvent.label, startsAt: nextEvent.startsAt },
      estimatedTravelMinutes: nextEvent.estimatedTravelMinutes,
      bufferMinutes: nextEvent.bufferMinutes,
    });
  }
  const travelConflicts = detectTravelInfeasibleConflicts(travelInputs);

  return [...overlapConflicts, ...availabilityConflicts, ...bufferConflicts, ...travelConflicts];
}

function toConflictRecordCreateData(conflict: OperationalConflict, campaignKey: string, now: Date) {
  return {
    conflictKey: conflict.id,
    conflictType: conflict.conflictType,
    severity: conflict.severity,
    primaryEntityType: conflict.primaryEntity.type,
    primaryEntityId: conflict.primaryEntity.id,
    primaryLabel: conflict.primaryEntity.label,
    relatedEntityType: conflict.relatedEntity?.type ?? null,
    relatedEntityId: conflict.relatedEntity?.id ?? null,
    relatedLabel: conflict.relatedEntity?.label ?? null,
    startsAt: conflict.startsAt ? new Date(conflict.startsAt) : null,
    endsAt: conflict.endsAt ? new Date(conflict.endsAt) : null,
    explanation: conflict.explanation,
    evidence: conflict.evidence as Prisma.InputJsonValue,
    suggestedResolutions: conflict.suggestedResolutions as unknown as Prisma.InputJsonValue,
    status: "OPEN",
    automaticallyResolved: false,
    campaignKey,
    factFingerprint: computeConflictFactFingerprint({
      severity: conflict.severity,
      explanation: conflict.explanation,
      evidence: conflict.evidence,
    }),
    lastEvaluatedAt: now,
    stale: false,
  };
}

export type RecomputeConflictsSummary = {
  rangeStart: string;
  rangeEnd: string;
  scannedEvents: number;
  detectedCount: number;
  created: number;
  updated: number;
  reopened: number;
  staled: number;
};

/**
 * Recompute conflicts for a padded date window. Never deletes history.
 * Detected conflicts not matching an existing OPEN/ACKNOWLEDGED/ACCEPTED_RISK
 * record are created; existing records are refreshed (`lastEvaluatedAt`,
 * fact drift) and reopened only if they were previously RESOLVED/
 * NOT_APPLICABLE and recompute detects them again (facts recurred — never a
 * disposition override). Records for scanned Events that are no longer
 * detected are marked `stale: true`, never deleted, never auto-resolved.
 */
export async function recomputeConflictsForRange(input: {
  actor: AuthenticatedActor;
  rangeStart: Date;
  rangeEnd: Date;
  campaignKey?: string;
  requestId?: string;
}): Promise<RecomputeConflictsSummary> {
  await requireAuthorized(input.actor, {
    action: "CONFLICT_RECOMPUTE",
    resource: { type: "system" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const paddedStart = new Date(input.rangeStart.getTime() - RECOMPUTE_PADDING_MS);
  const paddedEnd = new Date(input.rangeEnd.getTime() + RECOMPUTE_PADDING_MS);

  const events = await loadEventsForWindow(paddedStart, paddedEnd);
  const detected = await detectConflictsForEvents(events, campaignKey);
  const now = new Date();
  const detectedKeys = detected.map((c) => c.id);

  let created = 0;
  let updated = 0;
  let reopened = 0;

  for (const conflict of detected) {
    const factFingerprint = computeConflictFactFingerprint({
      severity: conflict.severity,
      explanation: conflict.explanation,
      evidence: conflict.evidence,
    });
    const existing = await prisma.operationalConflictRecord.findUnique({
      where: { conflictKey: conflict.id },
    });

    if (!existing) {
      const row = await prisma.operationalConflictRecord.create({
        data: toConflictRecordCreateData(conflict, campaignKey, now),
      });
      created += 1;
      await writeAttributedAudit({
        actor: input.actor,
        action: "CONFLICT_DETECTED",
        entityType: "OperationalConflictRecord",
        entityId: row.id,
        requestId: input.requestId,
        newState: {
          conflictType: row.conflictType,
          severity: row.severity,
          primaryEntityId: row.primaryEntityId,
        },
      });
      continue;
    }

    const factChanged = existing.factFingerprint !== factFingerprint;
    const wasClosed = (CLOSED_STATUSES as readonly string[]).includes(existing.status);
    const data: Prisma.OperationalConflictRecordUpdateInput = {
      lastEvaluatedAt: now,
      stale: false,
    };
    if (factChanged) {
      data.factFingerprint = factFingerprint;
      data.severity = conflict.severity;
      data.explanation = conflict.explanation;
      data.evidence = conflict.evidence as Prisma.InputJsonValue;
      data.suggestedResolutions = conflict.suggestedResolutions as unknown as Prisma.InputJsonValue;
      data.primaryLabel = conflict.primaryEntity.label;
      data.relatedLabel = conflict.relatedEntity?.label ?? null;
      data.startsAt = conflict.startsAt ? new Date(conflict.startsAt) : null;
      data.endsAt = conflict.endsAt ? new Date(conflict.endsAt) : null;
    }
    if (wasClosed) {
      data.status = "OPEN";
      data.disposition = null;
      data.dispositionReason = null;
    }
    const row = await prisma.operationalConflictRecord.update({
      where: { id: existing.id },
      data,
    });
    updated += 1;
    if (wasClosed) {
      reopened += 1;
      await writeAttributedAudit({
        actor: input.actor,
        action: "CONFLICT_REOPENED",
        entityType: "OperationalConflictRecord",
        entityId: row.id,
        requestId: input.requestId,
        reason:
          "Recompute re-detected this conflict after a prior disposition; underlying facts recurred.",
        previousState: { status: existing.status },
        newState: { status: row.status },
      });
    } else if (factChanged) {
      await writeAttributedAudit({
        actor: input.actor,
        action: "CONFLICT_RECOMPUTED_CHANGED",
        entityType: "OperationalConflictRecord",
        entityId: row.id,
        requestId: input.requestId,
        newState: { factFingerprint },
      });
    }
  }

  let staled = 0;
  const eventIds = events.map((e) => e.id);
  if (eventIds.length > 0) {
    const staleCandidates = await prisma.operationalConflictRecord.findMany({
      where: {
        campaignKey,
        stale: false,
        status: { notIn: [...CLOSED_STATUSES] },
        conflictKey: { notIn: detectedKeys },
        OR: [
          { primaryEntityId: { in: eventIds } },
          { relatedEntityId: { in: eventIds } },
        ],
      },
    });
    for (const row of staleCandidates) {
      await prisma.operationalConflictRecord.update({
        where: { id: row.id },
        data: { stale: true, lastEvaluatedAt: now },
      });
      await writeAttributedAudit({
        actor: input.actor,
        action: "CONFLICT_MARKED_STALE",
        entityType: "OperationalConflictRecord",
        entityId: row.id,
        requestId: input.requestId,
        reason:
          "Recompute no longer detects this conflict from current facts; operator disposition still required to close it out.",
      });
    }
    staled = staleCandidates.length;
  }

  return {
    rangeStart: paddedStart.toISOString(),
    rangeEnd: paddedEnd.toISOString(),
    scannedEvents: events.length,
    detectedCount: detected.length,
    created,
    updated,
    reopened,
    staled,
  };
}

/** Convenience wrapper — recompute the padded window around one Event. */
export async function recomputeConflictsForEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  campaignKey?: string;
  requestId?: string;
}): Promise<RecomputeConflictsSummary> {
  const event = await prisma.event.findFirst({
    where: { id: input.eventId },
    select: { startsAt: true, endsAt: true },
  });
  if (!event) throw new NotFoundError("Event not found.");
  return recomputeConflictsForRange({
    actor: input.actor,
    rangeStart: event.startsAt,
    rangeEnd: event.endsAt,
    campaignKey: input.campaignKey,
    requestId: input.requestId,
  });
}

/**
 * Fire-and-forget recompute for the create/update/reschedule save hook.
 * Never throws — a recompute failure must never block or roll back an
 * Event save. Failures are logged only.
 */
export async function recomputeConflictsForEventBestEffort(input: {
  actor: AuthenticatedActor;
  eventId: string;
  requestId?: string;
}): Promise<void> {
  try {
    await recomputeConflictsForEvent(input);
  } catch (error) {
    console.error("[CC-06 conflict-engine] best-effort recompute failed", {
      eventId: input.eventId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function serializeConflictRecord(
  row: Prisma.OperationalConflictRecordGetPayload<{ include: { actions: true } }>,
) {
  return {
    id: row.id,
    conflictKey: row.conflictKey,
    conflictType: row.conflictType,
    severity: row.severity,
    primaryEntity: {
      type: row.primaryEntityType,
      id: row.primaryEntityId,
      label: row.primaryLabel,
    },
    relatedEntity: row.relatedEntityId
      ? { type: row.relatedEntityType, id: row.relatedEntityId, label: row.relatedLabel }
      : null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    explanation: row.explanation,
    evidence: row.evidence,
    suggestedResolutions: row.suggestedResolutions,
    status: row.status,
    automaticallyResolved: row.automaticallyResolved,
    campaignKey: row.campaignKey,
    disposition: row.disposition,
    dispositionReason: row.dispositionReason,
    stale: row.stale,
    lastEvaluatedAt: row.lastEvaluatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    actions: row.actions
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        action: a.action,
        disposition: a.disposition,
        actorUserId: a.actorUserId,
        reason: a.reason,
        createdAt: a.createdAt.toISOString(),
      })),
  };
}

export type ConflictListFilter = {
  actor: AuthenticatedActor;
  campaignKey?: string;
  status?: string[];
  severity?: string[];
  conflictType?: string[];
  includeStale?: boolean;
  take?: number;
  skip?: number;
};

/** `/api/conflicts` GET and `/system/conflicts` operator queue. */
export async function listConflicts(input: ConflictListFilter) {
  await requireAuthorized(input.actor, {
    action: "CONFLICT_VIEW",
    resource: { type: "conflict" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const where: Prisma.OperationalConflictRecordWhereInput = { campaignKey };
  if (input.status?.length) where.status = { in: input.status };
  if (input.severity?.length) where.severity = { in: input.severity };
  if (input.conflictType?.length) where.conflictType = { in: input.conflictType };
  if (!input.includeStale) where.stale = false;

  const [rows, total] = await Promise.all([
    prisma.operationalConflictRecord.findMany({
      where,
      include: { actions: true },
      orderBy: [{ status: "asc" }, { severity: "asc" }, { updatedAt: "desc" }],
      take: Math.min(input.take ?? 100, 200),
      skip: input.skip ?? 0,
    }),
    prisma.operationalConflictRecord.count({ where }),
  ]);
  return { conflicts: rows.map(serializeConflictRecord), total };
}

/** `/api/events/[eventId]/conflicts` — persisted history + a read-only live assessment. */
export async function getConflictsForEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  campaignKey?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "CONFLICT_VIEW",
    resource: { type: "conflict" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const event = await prisma.event.findFirst({
    where: { id: input.eventId },
    select: { id: true, startsAt: true, endsAt: true },
  });
  if (!event) throw new NotFoundError("Event not found.");

  const persistedRows = await prisma.operationalConflictRecord.findMany({
    where: {
      campaignKey,
      OR: [{ primaryEntityId: input.eventId }, { relatedEntityId: input.eventId }],
    },
    include: { actions: true },
    orderBy: [{ status: "asc" }, { severity: "asc" }, { updatedAt: "desc" }],
  });

  let live: OperationalConflict[] = [];
  try {
    const events = await loadEventsForWindow(
      new Date(event.startsAt.getTime() - RECOMPUTE_PADDING_MS),
      new Date(event.endsAt.getTime() + RECOMPUTE_PADDING_MS),
    );
    const all = await detectConflictsForEvents(events, campaignKey);
    live = all.filter(
      (c) => c.primaryEntity.id === input.eventId || c.relatedEntity?.id === input.eventId,
    );
  } catch (error) {
    console.error("[CC-06 conflict-engine] live assessment failed", {
      eventId: input.eventId,
      error: error instanceof Error ? error.message : error,
    });
    live = [];
  }

  return { persisted: persistedRows.map(serializeConflictRecord), live };
}

/**
 * Read-only view helper for day/week/month/today operating views. Not
 * actor-gated — callers are already-authorized operating-view loads. Only
 * surfaces non-closed, non-stale records so the "what needs attention"
 * views stay honest.
 */
export async function loadPersistedConflictsForEvents(
  eventIds: string[],
  campaignKey: string = DEFAULT_CAMPAIGN_KEY,
): Promise<OperationalConflict[]> {
  if (eventIds.length === 0) return [];
  const rows = await prisma.operationalConflictRecord.findMany({
    where: {
      campaignKey,
      stale: false,
      status: { notIn: [...CLOSED_STATUSES] },
      OR: [
        { primaryEntityId: { in: eventIds } },
        { relatedEntityId: { in: eventIds } },
      ],
    },
  });
  return rows.map((row) => ({
    id: row.conflictKey,
    conflictType: row.conflictType,
    severity: row.severity as OperationalConflict["severity"],
    primaryEntity: {
      type: row.primaryEntityType,
      id: row.primaryEntityId,
      label: row.primaryLabel ?? row.primaryEntityId,
    },
    relatedEntity: row.relatedEntityId
      ? {
          type: row.relatedEntityType ?? "unknown",
          id: row.relatedEntityId,
          label: row.relatedLabel ?? row.relatedEntityId,
        }
      : undefined,
    startsAt: row.startsAt?.toISOString(),
    endsAt: row.endsAt?.toISOString(),
    explanation: row.explanation,
    evidence: Array.isArray(row.evidence) ? (row.evidence as string[]) : [],
    suggestedResolutions: Array.isArray(row.suggestedResolutions)
      ? (row.suggestedResolutions as OperationalConflict["suggestedResolutions"])
      : [],
    automaticallyResolved: false,
  }));
}

/**
 * Read-only, non-throwing helper for day/week/month/today operating views.
 * Combines a fast in-memory TIME_OVERLAP scan of the events already on
 * screen (so the indicator never lags a just-made edit) with persisted,
 * still-open CC-06 conflicts for the same Events (AVAILABILITY_VIOLATION,
 * BUFFER_CONFLICT, TRAVEL_INFEASIBLE — types this in-memory scan cannot
 * compute without rules/travel facts). TIME_OVERLAP `conflictKey`s are
 * deterministic, so an already-persisted overlap simply overwrites the
 * ephemeral copy — no duplicate rows are shown. Never persists anything.
 */
export async function loadConflictsForViewEvents(
  events: Cc06OverlapEvent[],
  campaignKey: string = DEFAULT_CAMPAIGN_KEY,
): Promise<OperationalConflict[]> {
  let ephemeral: OperationalConflict[] = [];
  try {
    ephemeral = detectTimeOverlapConflicts(events);
  } catch (error) {
    console.error("[CC-06 conflict-engine] view-scan overlap detection failed", {
      error: error instanceof Error ? error.message : error,
    });
  }
  let persisted: OperationalConflict[] = [];
  try {
    persisted = await loadPersistedConflictsForEvents(events.map((e) => e.id), campaignKey);
  } catch (error) {
    console.error("[CC-06 conflict-engine] view-scan persisted load failed", {
      error: error instanceof Error ? error.message : error,
    });
  }
  const merged = new Map<string, OperationalConflict>();
  for (const c of ephemeral) merged.set(c.id, c);
  for (const c of persisted) merged.set(c.id, c);
  return [...merged.values()];
}

/**
 * Read-only recheck used by `resolveConflict` — RESOLVED is only granted
 * without an explicit reason when recompute confirms the conflict is no
 * longer detected. Never persists.
 */
export async function recheckConflictStillDetected(conflictId: string): Promise<{
  stillDetected: boolean;
  record: Prisma.OperationalConflictRecordGetPayload<Record<string, never>> | null;
}> {
  const record = await prisma.operationalConflictRecord.findUnique({ where: { id: conflictId } });
  if (!record) return { stillDetected: false, record: null };
  const rangeStart = record.startsAt ?? new Date();
  const rangeEnd = record.endsAt ?? new Date();
  const events = await loadEventsForWindow(
    new Date(rangeStart.getTime() - RECOMPUTE_PADDING_MS),
    new Date(rangeEnd.getTime() + RECOMPUTE_PADDING_MS),
  );
  const detected = await detectConflictsForEvents(events, record.campaignKey);
  const stillDetected = detected.some((c) => c.id === record.conflictKey);
  return { stillDetected, record };
}
