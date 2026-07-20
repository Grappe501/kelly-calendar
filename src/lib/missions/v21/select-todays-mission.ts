import type { MissionLifecyclePhase } from "@/lib/missions/v21/types";
import type { TodaysMissionSelectionReason } from "@/lib/missions/v21/mission-home-view-model";

/**
 * Pure Today’s Mission selection (Deliverable 2).
 *
 * Uses MissionLifecyclePhase only for precedence — never MissionOperationalStatus
 * and never legacy Mission Card status (PENDING / IN_PROGRESS / …).
 */

export type TodaysMissionCandidate = {
  id: string;
  startsAt: string;
  endsAt: string;
  lifecyclePhase: MissionLifecyclePhase;
};

export type TodaysMissionSelection = {
  primaryId: string | null;
  nextId: string | null;
  selectionReason: TodaysMissionSelectionReason;
};

const PHASE_RANK: Record<MissionLifecyclePhase, number> = {
  EXECUTE: 1,
  TRAVEL: 2,
  DEBRIEF: 3,
  FOLLOW_UP: 4,
  PREPARE: 5,
  COMPLETE: 99,
};

const ACTIVE_PHASES = new Set<MissionLifecyclePhase>([
  "EXECUTE",
  "TRAVEL",
  "DEBRIEF",
  "FOLLOW_UP",
  "PREPARE",
]);

export function campaignDateKey(isoOrDate: string | Date, timeZone: string): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function reasonForPhase(
  phase: MissionLifecyclePhase,
): Exclude<TodaysMissionSelectionReason, "NO_MISSION" | "NEXT_UPCOMING"> {
  switch (phase) {
    case "EXECUTE":
      return "EXECUTING_NOW";
    case "TRAVEL":
      return "TRAVEL_WINDOW";
    case "DEBRIEF":
      return "DEBRIEF_DUE";
    case "FOLLOW_UP":
      return "FOLLOW_UP_DUE";
    case "PREPARE":
    default:
      return "PREPARING_TODAY";
  }
}

function compareWithinPhase(
  a: TodaysMissionCandidate,
  b: TodaysMissionCandidate,
  nowMs: number,
): number {
  const aStart = new Date(a.startsAt).getTime();
  const aEnd = new Date(a.endsAt).getTime();
  const bStart = new Date(b.startsAt).getTime();
  const bEnd = new Date(b.endsAt).getTime();
  const aUnderway = aStart <= nowMs && nowMs <= aEnd;
  const bUnderway = bStart <= nowMs && nowMs <= bEnd;
  if (aUnderway !== bUnderway) return aUnderway ? -1 : 1;
  if (aStart !== bStart) return aStart - bStart;
  return a.id.localeCompare(b.id);
}

function pickBest(
  pool: TodaysMissionCandidate[],
  nowMs: number,
): TodaysMissionCandidate | null {
  if (!pool.length) return null;
  const ranked = [...pool].sort((a, b) => {
    const rankDiff = PHASE_RANK[a.lifecyclePhase] - PHASE_RANK[b.lifecyclePhase];
    if (rankDiff !== 0) return rankDiff;
    return compareWithinPhase(a, b, nowMs);
  });
  return ranked[0] ?? null;
}

function pickNext(
  candidates: TodaysMissionCandidate[],
  primary: TodaysMissionCandidate | null,
  nowMs: number,
): TodaysMissionCandidate | null {
  const exclude = primary?.id;
  const upcoming = candidates
    .filter((c) => c.id !== exclude)
    .filter((c) => new Date(c.startsAt).getTime() > nowMs)
    .filter((c) => c.lifecyclePhase !== "COMPLETE")
    .sort((a, b) => {
      const startDiff =
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (startDiff !== 0) return startDiff;
      return a.id.localeCompare(b.id);
    });
  return upcoming[0] ?? null;
}

/**
 * Deterministic Today’s Mission selection.
 *
 * Priority: EXECUTE → TRAVEL → DEBRIEF → FOLLOW_UP → PREPARE → next upcoming → empty.
 * Within phase: currently underway → nearest start → mission id.
 */
export function selectTodaysMission(
  candidates: TodaysMissionCandidate[],
  options: { now: Date; timezone: string },
): TodaysMissionSelection {
  const now = options.now;
  const nowMs = now.getTime();
  const todayKey = campaignDateKey(now, options.timezone);

  const eligible = candidates.filter((c) => {
    if (!ACTIVE_PHASES.has(c.lifecyclePhase)) return false;
    const startKey = campaignDateKey(c.startsAt, options.timezone);
    const endKey = campaignDateKey(c.endsAt, options.timezone);
    const activePhase =
      c.lifecyclePhase === "EXECUTE" ||
      c.lifecyclePhase === "TRAVEL" ||
      c.lifecyclePhase === "DEBRIEF" ||
      c.lifecyclePhase === "FOLLOW_UP";
    return startKey === todayKey || endKey === todayKey || activePhase;
  });

  const primary = pickBest(eligible, nowMs);
  if (primary) {
    return {
      primaryId: primary.id,
      nextId: pickNext(candidates, primary, nowMs)?.id ?? null,
      selectionReason: reasonForPhase(primary.lifecyclePhase),
    };
  }

  const upcoming = pickNext(candidates, null, nowMs);
  if (upcoming) {
    return {
      primaryId: upcoming.id,
      nextId: pickNext(candidates, upcoming, nowMs)?.id ?? null,
      selectionReason: "NEXT_UPCOMING",
    };
  }

  return {
    primaryId: null,
    nextId: null,
    selectionReason: "NO_MISSION",
  };
}
