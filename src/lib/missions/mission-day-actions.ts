/**
 * Step 6.5 — One-tap mission day actions (pure transition rules).
 * Mutations are applied server-side with RBAC + version + audit.
 */

export const MISSION_DAY_ACTIONS = [
  "START_MISSION",
  "MARK_ARRIVED",
  "MARK_COMPLETE",
  "NEEDS_ATTENTION",
] as const;

export type MissionDayAction = (typeof MISSION_DAY_ACTIONS)[number];

export type MissionDayActionLabel =
  | "Start mission"
  | "Mark arrived"
  | "Mark complete"
  | "Needs attention";

export const MISSION_DAY_ACTION_LABELS: Record<MissionDayAction, MissionDayActionLabel> = {
  START_MISSION: "Start mission",
  MARK_ARRIVED: "Mark arrived",
  MARK_COMPLETE: "Mark complete",
  NEEDS_ATTENTION: "Needs attention",
};

export type MissionDaySnapshot = {
  status: string;
  arrivalAt: string | null;
  confirmationStatus: string | null;
  archivedAt?: string | null;
};

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "DECLINED", "ARCHIVED", "POSTPONED"]);

export function isMissionDayAction(value: string): value is MissionDayAction {
  return (MISSION_DAY_ACTIONS as readonly string[]).includes(value);
}

/**
 * Which one-tap actions are offered for the current mission state.
 * Does not check RBAC — server enforces EVENT_EDIT.
 */
export function availableMissionDayActions(
  snapshot: MissionDaySnapshot,
): MissionDayAction[] {
  if (snapshot.archivedAt) return [];
  const status = snapshot.status.toUpperCase();
  if (TERMINAL.has(status)) return [];

  const out: MissionDayAction[] = [];

  if (status !== "IN_PROGRESS") {
    out.push("START_MISSION");
  }
  if (
    (status === "IN_PROGRESS" || status === "CONFIRMED" || status === "APPROVED") &&
    !snapshot.arrivalAt
  ) {
    out.push("MARK_ARRIVED");
  }
  if (status === "IN_PROGRESS" || status === "CONFIRMED" || status === "APPROVED") {
    out.push("MARK_COMPLETE");
  }
  if (snapshot.confirmationStatus !== "NEEDS_ATTENTION") {
    out.push("NEEDS_ATTENTION");
  }

  return out;
}

export function missionDayActionAllowed(
  action: MissionDayAction,
  snapshot: MissionDaySnapshot,
): { ok: true } | { ok: false; reason: string } {
  if (snapshot.archivedAt) {
    return { ok: false, reason: "Archived missions cannot change day state." };
  }

  // Idempotent no-ops (accepted without state change).
  if (action === "START_MISSION" && snapshot.status === "IN_PROGRESS") {
    return { ok: true };
  }
  if (action === "MARK_ARRIVED" && snapshot.arrivalAt) {
    return { ok: true };
  }
  if (action === "MARK_COMPLETE" && snapshot.status === "COMPLETED") {
    return { ok: true };
  }
  if (
    action === "NEEDS_ATTENTION" &&
    snapshot.confirmationStatus === "NEEDS_ATTENTION"
  ) {
    return { ok: true };
  }

  if (!availableMissionDayActions(snapshot).includes(action)) {
    return {
      ok: false,
      reason: `Action ${action} is not available in status ${snapshot.status}.`,
    };
  }
  return { ok: true };
}
