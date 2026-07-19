import {
  emptyLeaveByHook,
  type LeaveByHook,
} from "@/lib/missions/leave-by-contract";

/**
 * Step 6.3 — Mission Timeline Engine (pure, deterministic).
 * Leave By is the first computed capability. No external traffic/maps.
 */

export type MissionTimelineInput = {
  missionId: string;
  startsAt: string;
  endsAt: string;
  /** Optional planned departure from travel plan. */
  departureAt?: string | null;
  targetArrivalAt?: string | null;
  travelRequired?: boolean;
  estimatedDurationMinutes?: number | null;
  bufferMinutes?: number | null;
  now?: Date;
};

export type MissionTimelineStatus = "computed" | "unavailable";

export type MissionTimeline = {
  missionId: string;
  status: MissionTimelineStatus;
  leaveByAt: string | null;
  driveMinutes: number | null;
  arrivalAt: string | null;
  bufferMinutes: number | null;
  startsAt: string | null;
  windowStartAt: string | null;
  windowEndAt: string | null;
  /** 0–100; deterministic confidence from input quality only. */
  confidence: number | null;
  travelRisk: string | null;
  recommendation: string | null;
  /** Provenance for later enrichment (traffic/weather). */
  source: "deterministic_v1";
};

export const DEFAULT_DRIVE_MINUTES = 20;
export const DEFAULT_TRAVEL_BUFFER_MINUTES = 10;
export const DEFAULT_LOCAL_BUFFER_MINUTES = 5;

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/**
 * Compute mission timeline. Safe to call from UI or server — no I/O.
 */
export function computeMissionTimeline(input: MissionTimelineInput): MissionTimeline {
  const starts = new Date(input.startsAt);
  const ends = new Date(input.endsAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return {
      missionId: input.missionId,
      status: "unavailable",
      leaveByAt: null,
      driveMinutes: null,
      arrivalAt: null,
      bufferMinutes: null,
      startsAt: null,
      windowStartAt: null,
      windowEndAt: null,
      confidence: null,
      travelRisk: null,
      recommendation: null,
      source: "deterministic_v1",
    };
  }

  const travelRequired = Boolean(input.travelRequired);
  const hasDuration =
    typeof input.estimatedDurationMinutes === "number" &&
    Number.isFinite(input.estimatedDurationMinutes) &&
    input.estimatedDurationMinutes >= 0;
  const hasBuffer =
    typeof input.bufferMinutes === "number" &&
    Number.isFinite(input.bufferMinutes) &&
    input.bufferMinutes >= 0;

  const driveMinutes = travelRequired
    ? hasDuration
      ? Math.round(input.estimatedDurationMinutes as number)
      : DEFAULT_DRIVE_MINUTES
    : 0;
  const bufferMinutes = hasBuffer
    ? Math.round(input.bufferMinutes as number)
    : travelRequired
      ? DEFAULT_TRAVEL_BUFFER_MINUTES
      : DEFAULT_LOCAL_BUFFER_MINUTES;

  const leaveBy = input.departureAt
    ? new Date(input.departureAt)
    : new Date(starts.getTime() - (driveMinutes + bufferMinutes) * 60_000);

  const arrival = input.targetArrivalAt
    ? new Date(input.targetArrivalAt)
    : new Date(leaveBy.getTime() + driveMinutes * 60_000);

  let confidence = 72;
  if (!travelRequired) confidence = 88;
  if (travelRequired && hasDuration) confidence = 84;
  if (travelRequired && hasDuration && hasBuffer) confidence = 92;
  if (input.departureAt) confidence = Math.min(96, confidence + 4);

  let travelRisk: string | null = null;
  if (arrival.getTime() > starts.getTime()) {
    const late = minutesBetween(starts, arrival);
    travelRisk = `Projected arrival is ${late} min after start.`;
    confidence = Math.max(40, confidence - 18);
  } else if (travelRequired && !hasDuration) {
    travelRisk = "Drive time is estimated (no planned duration yet).";
  }

  const now = input.now ?? new Date();
  const minutesToLeave = minutesBetween(now, leaveBy);
  let recommendation: string | null = null;
  if (minutesToLeave <= 0 && now.getTime() < starts.getTime()) {
    recommendation = "Leave window is open — depart now if not already en route.";
  } else if (minutesToLeave > 0 && minutesToLeave <= 20) {
    recommendation = `Leave in ${minutesToLeave} min.`;
  } else if (travelRequired) {
    recommendation = `Plan to leave by the computed leave time (${driveMinutes} min drive + ${bufferMinutes} min buffer).`;
  } else {
    recommendation = `Be ready ${bufferMinutes} min before start.`;
  }

  return {
    missionId: input.missionId,
    status: "computed",
    leaveByAt: leaveBy.toISOString(),
    driveMinutes,
    arrivalAt: arrival.toISOString(),
    bufferMinutes,
    startsAt: starts.toISOString(),
    windowStartAt: starts.toISOString(),
    windowEndAt: ends.toISOString(),
    confidence,
    travelRisk,
    recommendation,
    source: "deterministic_v1",
  };
}

/** Project timeline → existing Mission Card leaveBy slot. */
export function leaveByFromTimeline(timeline: MissionTimeline): LeaveByHook {
  if (timeline.status !== "computed" || !timeline.leaveByAt) {
    return emptyLeaveByHook("unavailable");
  }
  return {
    status: "computed",
    leaveByAt: timeline.leaveByAt,
    driveMinutes: timeline.driveMinutes,
    arrivalAt: timeline.arrivalAt,
    confidence: timeline.confidence,
    riskNote: timeline.travelRisk,
    backupRoute: null,
  };
}
