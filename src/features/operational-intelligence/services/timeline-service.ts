export type TimelineMilestoneStatus =
  | "MISSED"
  | "DUE_NOW"
  | "ACCELERATED"
  | "UPCOMING"
  | "COMPLETE"
  | "NOT_REQUIRED";

export type TimelineMilestone = {
  id: string;
  label: string;
  dueAt: string;
  status: TimelineMilestoneStatus;
  phase: string;
  accelerated: boolean;
};

const PUBLIC_RELATIVE: Array<{ id: string; label: string; hoursBefore: number; phase: string }> =
  [
    { id: "t14d", label: "Confirm invitation and candidate role", hoursBefore: 14 * 24, phase: "PRE_EVENT" },
    { id: "t10d", label: "Confirm venue and address", hoursBefore: 10 * 24, phase: "PRE_EVENT" },
    { id: "t7d", label: "Create communications plan", hoursBefore: 7 * 24, phase: "COMMUNICATIONS" },
    { id: "t5d", label: "Assign event lead and photographer", hoursBefore: 5 * 24, phase: "PRE_EVENT" },
    { id: "t3d", label: "Complete candidate briefing", hoursBefore: 3 * 24, phase: "PRE_EVENT" },
    { id: "t48h", label: "Confirm host and parking", hoursBefore: 48, phase: "PRE_EVENT" },
    { id: "t24h", label: "Final schedule confirmation", hoursBefore: 24, phase: "PRE_EVENT" },
    { id: "tMorning", label: "Weather and travel check", hoursBefore: 8, phase: "EVENT_DAY" },
    { id: "t2h", label: "Materials loaded", hoursBefore: 2, phase: "EVENT_DAY" },
    { id: "tDepart", label: "Driver and candidate confirmed", hoursBefore: 1.5, phase: "TRAVEL" },
    { id: "tArrive", label: "Host notified of arrival", hoursBefore: 0.5, phase: "TRAVEL" },
    { id: "tStart", label: "Program flow active", hoursBefore: 0, phase: "EVENT_DAY" },
    { id: "tEnd", label: "Commitments and contacts captured", hoursBefore: -2, phase: "POST_EVENT" },
    { id: "tRecap", label: "Photos uploaded", hoursBefore: -4, phase: "POST_EVENT" },
    { id: "tThanks", label: "Thank host and volunteers", hoursBefore: -24, phase: "FOLLOWUP" },
    { id: "t3after", label: "Complete follow-up actions", hoursBefore: -72, phase: "FOLLOWUP" },
  ];

export function generateEventTimeline(input: {
  eventId: string;
  startsAt: Date;
  asOf?: Date;
  existingActionTitles?: string[];
}): {
  eventId: string;
  accelerated: boolean;
  milestones: TimelineMilestone[];
} {
  const asOf = input.asOf ?? new Date();
  const hoursUntil = (input.startsAt.getTime() - asOf.getTime()) / (1000 * 60 * 60);
  const accelerated = hoursUntil < 48 && hoursUntil > 0;
  const existing = new Set(
    (input.existingActionTitles ?? []).map((t) => t.toLowerCase()),
  );

  const milestones: TimelineMilestone[] = [];
  for (const def of PUBLIC_RELATIVE) {
    if (existing.has(def.label.toLowerCase())) continue;
    const due = new Date(input.startsAt.getTime() - def.hoursBefore * 60 * 60 * 1000);
    let status: TimelineMilestoneStatus = "UPCOMING";
    if (due.getTime() < asOf.getTime() - 60 * 60 * 1000) status = "MISSED";
    else if (Math.abs(due.getTime() - asOf.getTime()) < 60 * 60 * 1000) status = "DUE_NOW";
    if (accelerated && status === "MISSED" && def.hoursBefore > 0) status = "ACCELERATED";
    if (hoursUntil <= 0 && def.hoursBefore > 0) status = "MISSED";

    milestones.push({
      id: `${input.eventId}_${def.id}`,
      label: accelerated && def.hoursBefore > 24 ? `[ACCELERATED] ${def.label}` : def.label,
      dueAt: due.toISOString(),
      status,
      phase: def.phase,
      accelerated,
    });
  }

  return { eventId: input.eventId, accelerated, milestones };
}
