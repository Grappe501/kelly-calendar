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
