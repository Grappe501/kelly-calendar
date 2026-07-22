/**
 * CC-05 Standing Availability Inputs — server service.
 * Build: KCCC-CC-05-STANDING-AVAILABILITY-INPUTS-1.0
 *
 * Hard constraints (ADR-090 waiver, binding):
 * - Input / evaluation / overlay / create-reschedule warnings ONLY.
 * - NEVER creates OperationalConflictRecord or any CC-06 persisted artifact.
 * - NEVER auto-moves, cancels, confirms, or resolves Events or Missions.
 */

import "server-only";

import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  assessmentRequiresAcknowledgement,
  computeExceptionFingerprint,
  computeRuleFingerprint,
  evaluateAvailability,
  expandExceptionIntervals,
  expandRuleIntervals,
  standingPolicySeedRules,
  type AvailabilityAssessment,
  type AvailabilityClassification,
  type AvailabilityExceptionSnapshot,
  type AvailabilityInterval,
  type AvailabilityRuleSnapshot,
} from "@/lib/calendar/availability";
import { chicagoDateKeysToUtcRange } from "@/lib/calendar/chicago-date";
import type {
  CalendarAvailabilityAckDisposition,
  CalendarAvailabilityApprovalState,
  CalendarAvailabilityClassification,
  CalendarAvailabilityException,
  CalendarAvailabilityRule,
  CalendarAvailabilityRuleType,
  CalendarAvailabilitySubjectType,
} from "@prisma/client";

const DEFAULT_CAMPAIGN_KEY = "kelly";

export type AvailabilityAcknowledgementInput = {
  disposition: "ACKNOWLEDGED" | "ACCEPTED_RISK";
  reason?: string;
  evaluationFingerprint: string;
};

function ruleRowToSnapshot(row: CalendarAvailabilityRule): AvailabilityRuleSnapshot {
  return {
    id: row.id,
    campaignKey: row.campaignKey,
    subjectType: row.subjectType,
    subjectUserId: row.subjectUserId,
    ruleType: row.ruleType,
    classification: row.classification as AvailabilityClassification,
    timezone: row.timezone,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    startLocalTime: row.startLocalTime,
    endLocalTime: row.endLocalTime,
    weekdays: row.weekdays,
    bufferBeforeMinutes: row.bufferBeforeMinutes,
    bufferAfterMinutes: row.bufferAfterMinutes,
    priority: row.priority,
    approvalState: row.approvalState,
    ruleFingerprint: row.ruleFingerprint,
    label: row.label,
    locationHint: row.locationHint,
    isActive: row.isActive,
  };
}

function exceptionRowToSnapshot(
  row: CalendarAvailabilityException,
): AvailabilityExceptionSnapshot {
  return {
    id: row.id,
    campaignKey: row.campaignKey,
    ruleId: row.ruleId,
    subjectType: row.subjectType,
    startDate: row.startDate,
    endDateExclusive: row.endDateExclusive,
    startLocalTime: row.startLocalTime,
    endLocalTime: row.endLocalTime,
    isAllDay: row.isAllDay,
    timezone: row.timezone,
    classification: row.classification as AvailabilityClassification,
    label: row.label,
    approvalState: row.approvalState,
    exceptionFingerprint: row.exceptionFingerprint,
    isActive: row.isActive,
  };
}

function serializeRule(row: CalendarAvailabilityRule) {
  return {
    id: row.id,
    campaignKey: row.campaignKey,
    subjectType: row.subjectType,
    subjectUserId: row.subjectUserId,
    ruleType: row.ruleType,
    classification: row.classification,
    timezone: row.timezone,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    startLocalTime: row.startLocalTime,
    endLocalTime: row.endLocalTime,
    weekdays: row.weekdays,
    bufferBeforeMinutes: row.bufferBeforeMinutes,
    bufferAfterMinutes: row.bufferAfterMinutes,
    priority: row.priority,
    approvalState: row.approvalState,
    ruleFingerprint: row.ruleFingerprint,
    label: row.label,
    locationHint: row.locationHint,
    visibilityNote: row.visibilityNote,
    source: row.source,
    isActive: row.isActive,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    // reasonSensitive intentionally omitted from the default projection.
  };
}

function serializeException(row: CalendarAvailabilityException) {
  return {
    id: row.id,
    campaignKey: row.campaignKey,
    ruleId: row.ruleId,
    subjectType: row.subjectType,
    startDate: row.startDate,
    endDateExclusive: row.endDateExclusive,
    startLocalTime: row.startLocalTime,
    endLocalTime: row.endLocalTime,
    isAllDay: row.isAllDay,
    timezone: row.timezone,
    classification: row.classification,
    label: row.label,
    source: row.source,
    approvalState: row.approvalState,
    exceptionFingerprint: row.exceptionFingerprint,
    isActive: row.isActive,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  };
}

async function loadActiveRulesAndExceptions(campaignKey: string) {
  const [ruleRows, exceptionRows] = await Promise.all([
    prisma.calendarAvailabilityRule.findMany({
      where: { campaignKey, isActive: true, approvalState: "ACTIVE" },
    }),
    prisma.calendarAvailabilityException.findMany({
      where: { campaignKey, isActive: true, approvalState: "ACTIVE" },
    }),
  ]);
  return {
    rules: ruleRows.map(ruleRowToSnapshot),
    exceptions: exceptionRows.map(exceptionRowToSnapshot),
  };
}

// ─── Rules ────────────────────────────────────────────────────────────────

export async function listRules(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  includeInactive?: boolean;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_VIEW",
    resource: { type: "system" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const rows = await prisma.calendarAvailabilityRule.findMany({
    where: input.includeInactive
      ? { campaignKey }
      : { campaignKey, isActive: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return { rules: rows.map(serializeRule) };
}

export async function getRule(input: { actor: AuthenticatedActor; ruleId: string }) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_VIEW",
    resource: { type: "system" },
  });
  const row = await prisma.calendarAvailabilityRule.findUnique({
    where: { id: input.ruleId },
  });
  if (!row) throw new NotFoundError("Availability rule not found.");
  return { rule: serializeRule(row) };
}

export type CreateRuleInput = {
  campaignKey?: string;
  subjectType?: CalendarAvailabilitySubjectType;
  subjectUserId?: string | null;
  ruleType: CalendarAvailabilityRuleType;
  classification: CalendarAvailabilityClassification;
  timezone?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  weekdays?: number[];
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priority?: number;
  label: string;
  reasonSensitive?: string | null;
  locationHint?: string | null;
  visibilityNote?: string | null;
};

function assertValidHhMm(value: string | null | undefined, field: string) {
  if (value === null || value === undefined) return;
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be HH:mm (24-hour).`);
  }
}

function assertValidDateKey(value: string | null | undefined, field: string) {
  if (value === null || value === undefined) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be YYYY-MM-DD.`);
  }
}

export async function createRule(input: {
  actor: AuthenticatedActor;
  data: CreateRuleInput;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_MANAGE",
    resource: { type: "system" },
  });
  const d = input.data;
  if (!d.label?.trim()) throw new ValidationError("Label is required.");
  assertValidDateKey(d.effectiveStartDate, "Effective start date");
  assertValidDateKey(d.effectiveEndDate, "Effective end date");
  assertValidHhMm(d.startLocalTime, "Start local time");
  assertValidHhMm(d.endLocalTime, "End local time");
  const weekdays = [...new Set(d.weekdays ?? [])].filter(
    (w) => Number.isInteger(w) && w >= 1 && w <= 7,
  );
  if ((d.weekdays ?? []).length !== weekdays.length) {
    throw new ValidationError("Weekdays must be unique integers 1 (Mon) – 7 (Sun).");
  }

  const base = {
    campaignKey: d.campaignKey ?? DEFAULT_CAMPAIGN_KEY,
    subjectType: d.subjectType ?? "CANDIDATE",
    subjectUserId: d.subjectUserId ?? null,
    ruleType: d.ruleType,
    classification: d.classification,
    timezone: d.timezone ?? "America/Chicago",
    effectiveStartDate: d.effectiveStartDate,
    effectiveEndDate: d.effectiveEndDate ?? null,
    startLocalTime: d.startLocalTime ?? null,
    endLocalTime: d.endLocalTime ?? null,
    weekdays,
    bufferBeforeMinutes: Math.max(0, d.bufferBeforeMinutes ?? 0),
    bufferAfterMinutes: Math.max(0, d.bufferAfterMinutes ?? 0),
    priority: d.priority ?? 50,
    label: d.label.trim(),
    locationHint: d.locationHint ?? null,
  };
  const ruleFingerprint = computeRuleFingerprint(base as never);

  const row = await prisma.calendarAvailabilityRule.create({
    data: {
      ...base,
      ruleFingerprint,
      reasonSensitive: d.reasonSensitive ?? null,
      visibilityNote: d.visibilityNote ?? null,
      source: "OPERATOR",
      approvalState: "DRAFT",
      isActive: true,
      createdByUserId: input.actor.userId,
      updatedByUserId: input.actor.userId,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_RULE_CREATED",
    entityType: "CalendarAvailabilityRule",
    entityId: row.id,
    requestId: input.requestId,
    newState: { label: row.label, classification: row.classification, ruleFingerprint },
  });

  return { rule: serializeRule(row) };
}

export type UpdateRuleInput = Partial<
  Omit<CreateRuleInput, "campaignKey" | "subjectType" | "subjectUserId" | "ruleType">
>;

export async function updateRule(input: {
  actor: AuthenticatedActor;
  ruleId: string;
  data: UpdateRuleInput;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_MANAGE",
    resource: { type: "system" },
  });
  const existing = await prisma.calendarAvailabilityRule.findUnique({
    where: { id: input.ruleId },
  });
  if (!existing) throw new NotFoundError("Availability rule not found.");

  const d = input.data;
  assertValidDateKey(d.effectiveStartDate, "Effective start date");
  assertValidDateKey(d.effectiveEndDate, "Effective end date");
  assertValidHhMm(d.startLocalTime, "Start local time");
  assertValidHhMm(d.endLocalTime, "End local time");
  const weekdays =
    d.weekdays !== undefined
      ? [...new Set(d.weekdays)].filter((w) => Number.isInteger(w) && w >= 1 && w <= 7)
      : existing.weekdays;

  const merged = {
    campaignKey: existing.campaignKey,
    subjectType: existing.subjectType,
    subjectUserId: existing.subjectUserId,
    ruleType: existing.ruleType,
    classification: d.classification ?? existing.classification,
    timezone: d.timezone ?? existing.timezone,
    effectiveStartDate: d.effectiveStartDate ?? existing.effectiveStartDate,
    effectiveEndDate:
      d.effectiveEndDate !== undefined ? d.effectiveEndDate : existing.effectiveEndDate,
    startLocalTime:
      d.startLocalTime !== undefined ? d.startLocalTime : existing.startLocalTime,
    endLocalTime: d.endLocalTime !== undefined ? d.endLocalTime : existing.endLocalTime,
    weekdays,
    bufferBeforeMinutes: d.bufferBeforeMinutes ?? existing.bufferBeforeMinutes,
    bufferAfterMinutes: d.bufferAfterMinutes ?? existing.bufferAfterMinutes,
    priority: d.priority ?? existing.priority,
    label: (d.label ?? existing.label).trim(),
    locationHint: d.locationHint !== undefined ? d.locationHint : existing.locationHint,
  };
  const ruleFingerprint = computeRuleFingerprint(merged as never);

  const row = await prisma.calendarAvailabilityRule.update({
    where: { id: input.ruleId },
    data: {
      ...merged,
      ruleFingerprint,
      reasonSensitive:
        d.reasonSensitive !== undefined ? d.reasonSensitive : existing.reasonSensitive,
      visibilityNote:
        d.visibilityNote !== undefined ? d.visibilityNote : existing.visibilityNote,
      updatedByUserId: input.actor.userId,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_RULE_UPDATED",
    entityType: "CalendarAvailabilityRule",
    entityId: row.id,
    requestId: input.requestId,
    previousState: { ruleFingerprint: existing.ruleFingerprint },
    newState: { ruleFingerprint },
  });

  return { rule: serializeRule(row) };
}

export async function approveRule(input: {
  actor: AuthenticatedActor;
  ruleId: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_APPROVE",
    resource: { type: "system" },
  });
  const existing = await prisma.calendarAvailabilityRule.findUnique({
    where: { id: input.ruleId },
  });
  if (!existing) throw new NotFoundError("Availability rule not found.");

  const row = await prisma.calendarAvailabilityRule.update({
    where: { id: input.ruleId },
    data: {
      approvalState: "ACTIVE",
      isActive: true,
      approvedAt: new Date(),
      approvedByUserId: input.actor.userId,
      updatedByUserId: input.actor.userId,
      deactivatedAt: null,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_RULE_APPROVED",
    entityType: "CalendarAvailabilityRule",
    entityId: row.id,
    requestId: input.requestId,
    previousState: { approvalState: existing.approvalState },
    newState: { approvalState: row.approvalState },
  });

  return { rule: serializeRule(row) };
}

export async function deactivateRule(input: {
  actor: AuthenticatedActor;
  ruleId: string;
  reason?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_MANAGE",
    resource: { type: "system" },
  });
  const existing = await prisma.calendarAvailabilityRule.findUnique({
    where: { id: input.ruleId },
  });
  if (!existing) throw new NotFoundError("Availability rule not found.");

  const row = await prisma.calendarAvailabilityRule.update({
    where: { id: input.ruleId },
    data: {
      approvalState: "INACTIVE",
      isActive: false,
      deactivatedAt: new Date(),
      updatedByUserId: input.actor.userId,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_RULE_DEACTIVATED",
    entityType: "CalendarAvailabilityRule",
    entityId: row.id,
    requestId: input.requestId,
    reason: input.reason ?? null,
    previousState: { approvalState: existing.approvalState, isActive: existing.isActive },
    newState: { approvalState: row.approvalState, isActive: row.isActive },
  });

  return { rule: serializeRule(row) };
}

// ─── Exceptions ─────────────────────────────────────────────────────────────

export async function listExceptions(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  includeInactive?: boolean;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_VIEW",
    resource: { type: "system" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const rows = await prisma.calendarAvailabilityException.findMany({
    where: input.includeInactive
      ? { campaignKey }
      : { campaignKey, isActive: true },
    orderBy: [{ startDate: "asc" }],
  });
  return { exceptions: rows.map(serializeException) };
}

export type CreateExceptionInput = {
  campaignKey?: string;
  ruleId?: string | null;
  subjectType?: CalendarAvailabilitySubjectType;
  startDate: string;
  endDateExclusive: string;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  isAllDay?: boolean;
  timezone?: string;
  classification: CalendarAvailabilityClassification;
  label: string;
  reasonSensitive?: string | null;
};

export async function createException(input: {
  actor: AuthenticatedActor;
  data: CreateExceptionInput;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_MANAGE",
    resource: { type: "system" },
  });
  const d = input.data;
  if (!d.label?.trim()) throw new ValidationError("Label is required.");
  assertValidDateKey(d.startDate, "Start date");
  assertValidDateKey(d.endDateExclusive, "End date (exclusive)");
  if (d.endDateExclusive <= d.startDate) {
    throw new ValidationError("End date (exclusive) must be after start date.");
  }
  const isAllDay = d.isAllDay ?? true;
  if (!isAllDay) {
    assertValidHhMm(d.startLocalTime, "Start local time");
    assertValidHhMm(d.endLocalTime, "End local time");
    if (!d.startLocalTime || !d.endLocalTime) {
      throw new ValidationError("Timed exceptions require start and end local times.");
    }
  }
  if (d.ruleId) {
    const rule = await prisma.calendarAvailabilityRule.findUnique({
      where: { id: d.ruleId },
    });
    if (!rule) throw new NotFoundError("Referenced availability rule not found.");
  }

  const base = {
    campaignKey: d.campaignKey ?? DEFAULT_CAMPAIGN_KEY,
    ruleId: d.ruleId ?? null,
    subjectType: d.subjectType ?? "CANDIDATE",
    startDate: d.startDate,
    endDateExclusive: d.endDateExclusive,
    startLocalTime: isAllDay ? null : (d.startLocalTime ?? null),
    endLocalTime: isAllDay ? null : (d.endLocalTime ?? null),
    isAllDay,
    timezone: d.timezone ?? "America/Chicago",
    classification: d.classification,
    label: d.label.trim(),
  };
  const exceptionFingerprint = computeExceptionFingerprint(base as never);

  const row = await prisma.calendarAvailabilityException.create({
    data: {
      ...base,
      exceptionFingerprint,
      reasonSensitive: d.reasonSensitive ?? null,
      source: "OPERATOR",
      approvalState: "ACTIVE",
      isActive: true,
      approvedAt: new Date(),
      approvedByUserId: input.actor.userId,
      createdByUserId: input.actor.userId,
      updatedByUserId: input.actor.userId,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_EXCEPTION_CREATED",
    entityType: "CalendarAvailabilityException",
    entityId: row.id,
    requestId: input.requestId,
    newState: { label: row.label, classification: row.classification, exceptionFingerprint },
  });

  return { exception: serializeException(row) };
}

export async function cancelException(input: {
  actor: AuthenticatedActor;
  exceptionId: string;
  reason?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_MANAGE",
    resource: { type: "system" },
  });
  const existing = await prisma.calendarAvailabilityException.findUnique({
    where: { id: input.exceptionId },
  });
  if (!existing) throw new NotFoundError("Availability exception not found.");

  const row = await prisma.calendarAvailabilityException.update({
    where: { id: input.exceptionId },
    data: {
      approvalState: "CANCELLED",
      isActive: false,
      cancelledAt: new Date(),
      updatedByUserId: input.actor.userId,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_EXCEPTION_CANCELLED",
    entityType: "CalendarAvailabilityException",
    entityId: row.id,
    requestId: input.requestId,
    reason: input.reason ?? null,
    previousState: { approvalState: existing.approvalState },
    newState: { approvalState: row.approvalState },
  });

  return { exception: serializeException(row) };
}

// ─── Evaluation ─────────────────────────────────────────────────────────────

export async function evaluateProposedInterval(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  startsAt: string | Date;
  endsAt: string | Date;
  timezone: string;
  isAllDay: boolean;
  eventStatus?: string | null;
  subjectType?: string;
}): Promise<AvailabilityAssessment> {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_VIEW",
    resource: { type: "system" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const { rules, exceptions } = await loadActiveRulesAndExceptions(campaignKey);
  const startsAt =
    typeof input.startsAt === "string" ? new Date(input.startsAt) : input.startsAt;
  const endsAt = typeof input.endsAt === "string" ? new Date(input.endsAt) : input.endsAt;

  return evaluateAvailability({
    rules,
    exceptions,
    startsAt,
    endsAt,
    timezone: input.timezone,
    isAllDay: input.isAllDay,
    eventStatus: input.eventStatus,
    subjectType: input.subjectType,
  });
}

/**
 * Shared create/update/reschedule guard (CC-05).
 * Never mutates Events/Missions. Throws a 409 AppError carrying the
 * assessment in `metadata.availabilityAssessment` when acknowledgement is
 * required but missing or mismatched. On success, records acknowledgement
 * rows for any findings that required one.
 */
export async function assertAvailabilityAllowsSave(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  eventId?: string | null;
  startsAt: string | Date;
  endsAt: string | Date;
  timezone: string;
  isAllDay: boolean;
  eventStatus?: string | null;
  subjectType?: string;
  acknowledgement?: AvailabilityAcknowledgementInput | null;
  requestId?: string;
}): Promise<{ assessment: AvailabilityAssessment }> {
  const assessment = await evaluateProposedInterval(input);

  if (!assessmentRequiresAcknowledgement(assessment)) {
    return { assessment };
  }

  const ack = input.acknowledgement;
  const matches = Boolean(
    ack &&
      ack.evaluationFingerprint === assessment.evaluationFingerprint &&
      (ack.disposition === "ACKNOWLEDGED" || ack.disposition === "ACCEPTED_RISK"),
  );

  if (!matches) {
    throw new ConflictError(
      "This time overlaps a standing availability rule. Review and acknowledge before saving.",
      undefined,
      { availabilityAssessment: assessment },
    );
  }

  await recordAcknowledgement({
    actor: input.actor,
    campaignKey: input.campaignKey,
    eventId: input.eventId ?? null,
    assessment,
    disposition: ack!.disposition,
    reason: ack!.reason,
    requestId: input.requestId,
  });

  return { assessment };
}

export async function recordAcknowledgement(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  eventId?: string | null;
  assessment: AvailabilityAssessment;
  disposition: "ACKNOWLEDGED" | "ACCEPTED_RISK";
  reason?: string;
  requestId?: string;
}) {
  const findingsRequiringAck = input.assessment.findings.filter(
    (f) => f.requiresAcknowledgement,
  );
  const keys = findingsRequiringAck.length > 0 ? findingsRequiringAck : [
    { key: "no-blocking-findings" },
  ];

  const rows = await Promise.all(
    keys.map((f) =>
      prisma.calendarAvailabilityAcknowledgement.create({
        data: {
          campaignKey: input.campaignKey ?? DEFAULT_CAMPAIGN_KEY,
          eventId: input.eventId ?? null,
          findingKey: f.key,
          disposition: input.disposition as CalendarAvailabilityAckDisposition,
          reason: input.reason ?? null,
          evaluationFingerprint: input.assessment.evaluationFingerprint,
          ruleSetFingerprint: input.assessment.ruleSetFingerprint,
          actorUserId: input.actor.userId,
        },
      }),
    ),
  );

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_ACKNOWLEDGED",
    entityType: "Event",
    entityId: input.eventId ?? null,
    requestId: input.requestId,
    reason: input.reason ?? null,
    newState: {
      disposition: input.disposition,
      evaluationFingerprint: input.assessment.evaluationFingerprint,
      findingCount: findingsRequiringAck.length,
    },
  });

  return { acknowledgements: rows.map((r) => r.id) };
}

/** Standalone acknowledge API — evaluate then record, without a save gate. */
export async function acknowledgeAvailability(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  eventId?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  isAllDay: boolean;
  eventStatus?: string | null;
  disposition: "ACKNOWLEDGED" | "ACCEPTED_RISK";
  reason?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_ACKNOWLEDGE",
    resource: { type: "system" },
  });
  const assessment = await evaluateProposedInterval(input);
  const result = await recordAcknowledgement({
    actor: input.actor,
    campaignKey: input.campaignKey,
    eventId: input.eventId,
    assessment,
    disposition: input.disposition,
    reason: input.reason,
    requestId: input.requestId,
  });
  return { assessment, ...result };
}

// ─── Seeding ────────────────────────────────────────────────────────────────

export async function seedStandingRulesIfEmpty(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_APPROVE",
    resource: { type: "system" },
  });
  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const existingCount = await prisma.calendarAvailabilityRule.count({
    where: { campaignKey },
  });
  if (existingCount > 0) {
    return { seeded: false, createdCount: 0, reason: "Rules already exist." };
  }

  const seeds = standingPolicySeedRules(campaignKey);
  const now = new Date();
  const created = await prisma.$transaction(
    seeds.map((seed) =>
      prisma.calendarAvailabilityRule.create({
        data: {
          campaignKey: seed.campaignKey,
          subjectType: seed.subjectType as CalendarAvailabilitySubjectType,
          subjectUserId: seed.subjectUserId ?? null,
          ruleType: seed.ruleType as CalendarAvailabilityRuleType,
          classification: seed.classification,
          timezone: seed.timezone,
          effectiveStartDate: seed.effectiveStartDate,
          effectiveEndDate: seed.effectiveEndDate ?? null,
          startLocalTime: seed.startLocalTime ?? null,
          endLocalTime: seed.endLocalTime ?? null,
          weekdays: seed.weekdays,
          bufferBeforeMinutes: seed.bufferBeforeMinutes,
          bufferAfterMinutes: seed.bufferAfterMinutes,
          priority: seed.priority,
          label: seed.label,
          locationHint: seed.locationHint ?? null,
          ruleFingerprint: seed.ruleFingerprint,
          source: "STANDING_POLICY_SEED",
          approvalState: "ACTIVE" as CalendarAvailabilityApprovalState,
          isActive: true,
          approvedAt: now,
          approvedByUserId: input.actor.userId,
          createdByUserId: input.actor.userId,
          updatedByUserId: input.actor.userId,
        },
      }),
    ),
  );

  await writeAttributedAudit({
    actor: input.actor,
    action: "AVAILABILITY_STANDING_RULES_SEEDED",
    entityType: "CalendarAvailabilityRule",
    requestId: input.requestId,
    newState: { campaignKey, createdCount: created.length },
  });

  return { seeded: true, createdCount: created.length, rules: created.map(serializeRule) };
}

// ─── Preview ────────────────────────────────────────────────────────────────

export async function previewExpansion(input: {
  actor: AuthenticatedActor;
  campaignKey?: string;
  fromDateKey: string;
  toDateKeyInclusive: string;
}) {
  await requireAuthorized(input.actor, {
    action: "AVAILABILITY_VIEW",
    resource: { type: "system" },
  });
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.fromDateKey) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.toDateKeyInclusive)
  ) {
    throw new ValidationError("from/to must be YYYY-MM-DD date keys.");
  }
  if (input.toDateKeyInclusive < input.fromDateKey) {
    throw new ValidationError("to must not be before from.");
  }

  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const { rules, exceptions } = await loadActiveRulesAndExceptions(campaignKey);
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(
    input.fromDateKey,
    input.toDateKeyInclusive,
  );

  const intervals: AvailabilityInterval[] = [];
  let truncated = false;
  for (const rule of rules) {
    const expanded = expandRuleIntervals({
      rule,
      rangeStartsAt: rangeStart,
      rangeEndsAt: rangeEnd,
    });
    if (expanded.truncated) truncated = true;
    intervals.push(...expanded.intervals);
  }
  for (const ex of exceptions) {
    intervals.push(
      ...expandExceptionIntervals({
        exception: ex,
        rangeStartsAt: rangeStart,
        rangeEndsAt: rangeEnd,
      }),
    );
  }
  intervals.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return {
    from: input.fromDateKey,
    to: input.toDateKeyInclusive,
    truncated,
    intervals: intervals.map((iv) => ({
      startsAt: iv.startsAt.toISOString(),
      endsAt: iv.endsAt.toISOString(),
      classification: iv.classification,
      ruleId: iv.ruleId ?? null,
      exceptionId: iv.exceptionId ?? null,
      label: iv.label,
      explanation: iv.explanation,
    })),
  };
}
