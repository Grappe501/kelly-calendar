import { fingerprintPayload } from "@/lib/calendar/availability/fingerprint";
import type { AvailabilityFinding } from "@/lib/calendar/availability/types";
import type {
  OperationalConflict,
  TravelFeasibility,
} from "@/features/operational-intelligence/types/conflict-types";

export type ScheduleBlock = {
  id: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
  status?: string;
  candidateAttending?: boolean;
  calendarType?: string;
};

function overlaps(a: ScheduleBlock, b: ScheduleBlock) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

// ─── CC-06 Conflict Engine — Calendar Slice (ADR-092) ──────────────────────
// Pure detectors only: no DB, no server-only. Consumes CC-03 half-open
// overlap semantics, CC-04 occurrence identities (Event ids already
// materialized occurrences), and CC-05 AvailabilityAssessment. Every
// conflict here is `automaticallyResolved: false` and carries a stable
// `conflictKey` (used as `id`) derived from sorted entity ids + type +
// overlap window — never from a random id. Detectors never mutate Events,
// Missions, availability rules, or travel facts.

export const CC06_CONFLICT_TYPES = [
  "TIME_OVERLAP",
  "AVAILABILITY_VIOLATION",
  "BUFFER_CONFLICT",
  "TRAVEL_INFEASIBLE",
] as const;
export type Cc06ConflictType = (typeof CC06_CONFLICT_TYPES)[number];

export const CC06_INACTIVE_EVENT_STATUSES = new Set([
  "CANCELLED",
  "DECLINED",
  "ARCHIVED",
]);
const INACTIVE_EVENT_STATUSES = CC06_INACTIVE_EVENT_STATUSES;

/** Stable conflictKey: sorted entity ids + type + overlap window fingerprint. */
export function computeConflictKey(input: {
  conflictType: string;
  entityIds: string[];
  overlapStartsAt: Date;
  overlapEndsAt: Date;
}): string {
  const entityIds = [...new Set(input.entityIds)].sort();
  return fingerprintPayload({
    conflictType: input.conflictType,
    entityIds,
    overlapStartsAt: input.overlapStartsAt.toISOString(),
    overlapEndsAt: input.overlapEndsAt.toISOString(),
  });
}

/** Fingerprint of the non-identity facts (severity/explanation/evidence) — used to detect fact drift under an unchanged conflictKey. */
export function computeConflictFactFingerprint(input: {
  severity: string;
  explanation: string;
  evidence: string[];
}): string {
  return fingerprintPayload({
    severity: input.severity,
    explanation: input.explanation,
    evidence: [...input.evidence].sort(),
  });
}

export type Cc06OverlapEvent = {
  id: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
  status?: string;
  candidateAttending?: boolean;
};

/**
 * TIME_OVERLAP — direct overlap between two Events for the same schedule.
 * CC-03 half-open interval semantics: a.start < b.end && b.start < a.end.
 * Excludes CANCELLED/DECLINED/ARCHIVED and explicitly non-attending Events.
 */
export function detectTimeOverlapConflicts(
  events: Cc06OverlapEvent[],
): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  const active = events.filter(
    (e) =>
      e.candidateAttending !== false &&
      !INACTIVE_EVENT_STATUSES.has((e.status ?? "").toUpperCase()),
  );
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (!(a.startsAt < b.endsAt && b.startsAt < a.endsAt)) continue;
      const overlapStartsAt = a.startsAt > b.startsAt ? a.startsAt : b.startsAt;
      const overlapEndsAt = a.endsAt < b.endsAt ? a.endsAt : b.endsAt;
      const bothConfirmed =
        /confirmed|in_progress/i.test(a.status ?? "") &&
        /confirmed|in_progress/i.test(b.status ?? "");
      const severity = bothConfirmed ? "CRITICAL" : "WARNING";
      const explanation = bothConfirmed
        ? "Confirmed events overlap on the same schedule."
        : "Tentative or unconfirmed events overlap on the same schedule.";
      const evidence = [
        `${a.label}: ${a.startsAt.toISOString()}–${a.endsAt.toISOString()} (${a.status ?? "UNKNOWN"})`,
        `${b.label}: ${b.startsAt.toISOString()}–${b.endsAt.toISOString()} (${b.status ?? "UNKNOWN"})`,
      ];
      conflicts.push({
        id: computeConflictKey({
          conflictType: "TIME_OVERLAP",
          entityIds: [a.id, b.id],
          overlapStartsAt,
          overlapEndsAt,
        }),
        conflictType: "TIME_OVERLAP",
        severity,
        primaryEntity: { type: "event", id: a.id, label: a.label },
        relatedEntity: { type: "event", id: b.id, label: b.label },
        startsAt: overlapStartsAt.toISOString(),
        endsAt: overlapEndsAt.toISOString(),
        explanation,
        evidence,
        suggestedResolutions: [
          { code: "REVIEW_TIMES", label: "Review times with scheduler", autonomous: false },
        ],
        automaticallyResolved: false,
      });
    }
  }
  return conflicts;
}

export type Cc06AvailabilityInput = {
  event: { id: string; label: string };
  finding: AvailabilityFinding;
};

/**
 * AVAILABILITY_VIOLATION — a CC-05 UNAVAILABLE finding overlapping this
 * Event. Caller supplies findings from `evaluateAvailability` (CC-05); this
 * function never evaluates rules itself. ACKNOWLEDGED does not clear this —
 * disposition is tracked separately by the persistence layer.
 */
export function detectAvailabilityViolationConflicts(
  inputs: Cc06AvailabilityInput[],
): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  for (const { event, finding } of inputs) {
    if (finding.classification !== "UNAVAILABLE") continue;
    const explanation = `Event overlaps a standing UNAVAILABLE availability rule: ${finding.explanation}`;
    const evidence = [
      finding.explanation,
      `classification=${finding.classification}`,
      `window=${finding.overlapStartsAt.toISOString()}–${finding.overlapEndsAt.toISOString()}`,
    ];
    const relatedId = finding.ruleId ?? finding.exceptionId ?? finding.key;
    conflicts.push({
      id: computeConflictKey({
        conflictType: "AVAILABILITY_VIOLATION",
        entityIds: [event.id, relatedId],
        overlapStartsAt: finding.overlapStartsAt,
        overlapEndsAt: finding.overlapEndsAt,
      }),
      conflictType: "AVAILABILITY_VIOLATION",
      severity: "CRITICAL",
      primaryEntity: { type: "event", id: event.id, label: event.label },
      relatedEntity: finding.ruleId
        ? { type: "availability_rule", id: finding.ruleId, label: finding.explanation }
        : finding.exceptionId
          ? {
              type: "availability_exception",
              id: finding.exceptionId,
              label: finding.explanation,
            }
          : undefined,
      startsAt: finding.overlapStartsAt.toISOString(),
      endsAt: finding.overlapEndsAt.toISOString(),
      explanation,
      evidence,
      suggestedResolutions: [
        {
          code: "REVIEW_AVAILABILITY",
          label: "Review standing availability with operator",
          autonomous: false,
        },
      ],
      automaticallyResolved: false,
    });
  }
  return conflicts;
}

const BUFFER_RULE_TYPES = new Set([
  "TRAVEL_BUFFER",
  "PREPARATION_BUFFER",
  "RECOVERY_BUFFER",
]);

export type Cc06BufferInput = {
  event: { id: string; label: string };
  finding: AvailabilityFinding;
  ruleType?: string | null;
};

/**
 * BUFFER_CONFLICT — a CC-05 CONSTRAINED/REQUIRES_REVIEW finding that comes
 * specifically from an explicit buffer rule type (TRAVEL_BUFFER /
 * PREPARATION_BUFFER / RECOVERY_BUFFER). Other CONSTRAINED findings (e.g.
 * PROTECTED_WORK) are out of CC-06 minimum scope.
 */
export function detectBufferConflicts(inputs: Cc06BufferInput[]): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  for (const { event, finding, ruleType } of inputs) {
    if (finding.classification !== "CONSTRAINED" && finding.classification !== "REQUIRES_REVIEW") {
      continue;
    }
    if (!ruleType || !BUFFER_RULE_TYPES.has(ruleType)) continue;
    const relatedId = finding.ruleId ?? finding.key;
    const explanation = `Event compresses a standing ${ruleType} buffer: ${finding.explanation}`;
    conflicts.push({
      id: computeConflictKey({
        conflictType: "BUFFER_CONFLICT",
        entityIds: [event.id, relatedId],
        overlapStartsAt: finding.overlapStartsAt,
        overlapEndsAt: finding.overlapEndsAt,
      }),
      conflictType: "BUFFER_CONFLICT",
      severity: "WARNING",
      primaryEntity: { type: "event", id: event.id, label: event.label },
      relatedEntity: finding.ruleId
        ? { type: "availability_rule", id: finding.ruleId, label: finding.explanation }
        : undefined,
      startsAt: finding.overlapStartsAt.toISOString(),
      endsAt: finding.overlapEndsAt.toISOString(),
      explanation,
      evidence: [finding.explanation, `ruleType=${ruleType}`],
      suggestedResolutions: [
        {
          code: "ADJUST_BUFFERS",
          label: "Adjust timing or the standing buffer with operator",
          autonomous: false,
        },
      ],
      automaticallyResolved: false,
    });
  }
  return conflicts;
}

export type Cc06TravelInput = {
  previousEvent: { id: string; label: string; endsAt: Date };
  nextEvent: { id: string; label: string; startsAt: Date };
  /** Stored fact only — never invented. Absent → skip (UNKNOWN), never flagged. */
  estimatedTravelMinutes?: number | null;
  bufferMinutes?: number | null;
};

/**
 * TRAVEL_INFEASIBLE — only from stored travel facts (EventTravelPlan
 * estimatedDurationMinutes/bufferMinutes). Reuses `assessTravelFeasibility`
 * for the tiering; never estimates distance, duration, or routing itself.
 */
export function detectTravelInfeasibleConflicts(
  inputs: Cc06TravelInput[],
): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  for (const input of inputs) {
    if (input.estimatedTravelMinutes == null) continue; // UNKNOWN — no stored fact
    const result = assessTravelFeasibility({
      previousEnd: input.previousEvent.endsAt,
      nextArrivalTarget: input.nextEvent.startsAt,
      estimatedTravelMinutes: input.estimatedTravelMinutes,
      bufferMinutes: input.bufferMinutes,
    });
    if (result.feasibility === "FEASIBLE" || result.feasibility === "UNKNOWN") continue;
    const severity =
      result.feasibility === "IMPOSSIBLE"
        ? "CRITICAL"
        : result.feasibility === "UNLIKELY"
          ? "HIGH"
          : "WARNING";
    const explanation =
      result.conflict?.explanation ??
      `Travel feasibility ${result.feasibility} between stored events.`;
    conflicts.push({
      id: computeConflictKey({
        conflictType: "TRAVEL_INFEASIBLE",
        entityIds: [input.previousEvent.id, input.nextEvent.id],
        overlapStartsAt: input.previousEvent.endsAt,
        overlapEndsAt: input.nextEvent.startsAt,
      }),
      conflictType: "TRAVEL_INFEASIBLE",
      severity,
      primaryEntity: { type: "event", id: input.nextEvent.id, label: input.nextEvent.label },
      relatedEntity: {
        type: "event",
        id: input.previousEvent.id,
        label: input.previousEvent.label,
      },
      startsAt: input.previousEvent.endsAt.toISOString(),
      endsAt: input.nextEvent.startsAt.toISOString(),
      explanation,
      evidence: [
        `feasibility=${result.feasibility}`,
        `estimatedTravelMinutes=${input.estimatedTravelMinutes}`,
        `bufferMinutes=${input.bufferMinutes ?? 0}`,
      ],
      suggestedResolutions: [
        {
          code: "ADJUST_TIME",
          label: "Adjust departure, arrival, or event times",
          autonomous: false,
        },
      ],
      automaticallyResolved: false,
    });
  }
  return conflicts;
}

export function detectCandidateOverlaps(blocks: ScheduleBlock[]): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  const candidateBlocks = blocks.filter((b) => b.candidateAttending !== false);
  for (let i = 0; i < candidateBlocks.length; i++) {
    for (let j = i + 1; j < candidateBlocks.length; j++) {
      const a = candidateBlocks[i];
      const b = candidateBlocks[j];
      if (!overlaps(a, b)) continue;
      const bothConfirmed =
        /confirmed|in_progress/i.test(a.status ?? "") &&
        /confirmed|in_progress/i.test(b.status ?? "");
      conflicts.push({
        id: `conflict_overlap_${a.id}_${b.id}`,
        conflictType: "CANDIDATE_SCHEDULE_OVERLAP",
        severity: bothConfirmed ? "CRITICAL" : "WARNING",
        primaryEntity: { type: "event", id: a.id, label: a.label },
        relatedEntity: { type: "event", id: b.id, label: b.label },
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        explanation: bothConfirmed
          ? "Confirmed candidate events overlap"
          : "Tentative or unconfirmed candidate events overlap",
        evidence: [`${a.label} overlaps ${b.label}`],
        suggestedResolutions: [
          { code: "REVIEW_TIMES", label: "Review times with scheduler", autonomous: false },
        ],
        automaticallyResolved: false,
      });
    }
  }
  return conflicts;
}

export function assessTravelFeasibility(input: {
  previousEnd?: Date | null;
  nextArrivalTarget?: Date | null;
  estimatedTravelMinutes?: number | null;
  bufferMinutes?: number | null;
}): { feasibility: TravelFeasibility; conflict?: OperationalConflict } {
  if (
    !input.previousEnd ||
    !input.nextArrivalTarget ||
    input.estimatedTravelMinutes == null
  ) {
    return { feasibility: "UNKNOWN" };
  }
  const available =
    (input.nextArrivalTarget.getTime() - input.previousEnd.getTime()) / 60000;
  const need = input.estimatedTravelMinutes + (input.bufferMinutes ?? 15);
  let feasibility: TravelFeasibility = "FEASIBLE";
  if (available < need * 0.5) feasibility = "IMPOSSIBLE";
  else if (available < need * 0.8) feasibility = "UNLIKELY";
  else if (available < need) feasibility = "TIGHT";

  if (feasibility === "FEASIBLE") return { feasibility };

  return {
    feasibility,
    conflict: {
      id: "conflict_travel_feasibility",
      conflictType: "INSUFFICIENT_TRAVEL_BUFFER",
      severity: feasibility === "IMPOSSIBLE" ? "CRITICAL" : "HIGH",
      primaryEntity: {
        type: "travel",
        id: "segment",
        label: "Travel between events",
      },
      explanation: `Available ${Math.round(available)} minutes; need about ${Math.round(need)} minutes`,
      evidence: [`feasibility=${feasibility}`],
      suggestedResolutions: [
        { code: "ADJUST_TIME", label: "Adjust departure or arrival", autonomous: false },
      ],
      automaticallyResolved: false,
    },
  };
}

export function detectStaffDoubleBookings(input: Array<{
  userId: string;
  userLabel: string;
  eventId: string;
  eventLabel: string;
  startsAt: Date;
  endsAt: Date;
}>): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  for (let i = 0; i < input.length; i++) {
    for (let j = i + 1; j < input.length; j++) {
      const a = input[i];
      const b = input[j];
      if (a.userId !== b.userId) continue;
      if (!(a.startsAt < b.endsAt && b.startsAt < a.endsAt)) continue;
      conflicts.push({
        id: `conflict_staff_${a.userId}_${a.eventId}_${b.eventId}`,
        conflictType: "STAFF_ASSIGNMENT_OVERLAP",
        severity: "HIGH",
        primaryEntity: { type: "user", id: a.userId, label: a.userLabel },
        relatedEntity: { type: "event", id: b.eventId, label: b.eventLabel },
        explanation: `${a.userLabel} is assigned to overlapping events`,
        evidence: [a.eventLabel, b.eventLabel],
        suggestedResolutions: [
          { code: "REASSIGN", label: "Reassign one event", autonomous: false },
        ],
        automaticallyResolved: false,
      });
    }
  }
  return conflicts;
}

export function detectCommunicationsDeadlineConflict(input: {
  eventId: string;
  eventLabel: string;
  eventStartsAt: Date;
  publishAt?: Date | null;
}): OperationalConflict | null {
  if (!input.publishAt) return null;
  if (input.publishAt <= input.eventStartsAt) return null;
  return {
    id: `conflict_comms_${input.eventId}`,
    conflictType: "COMMUNICATIONS_DEADLINE_AFTER_EVENT",
    severity: "HIGH",
    primaryEntity: { type: "event", id: input.eventId, label: input.eventLabel },
    explanation: "Communications publish deadline is after event start",
    evidence: [`publishAt=${input.publishAt.toISOString()}`],
    suggestedResolutions: [
      { code: "MOVE_DEADLINE", label: "Move publish deadline earlier", autonomous: false },
    ],
    automaticallyResolved: false,
  };
}
