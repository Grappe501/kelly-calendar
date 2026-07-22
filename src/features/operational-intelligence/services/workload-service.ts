import { isStandingWorkBlockEvent } from "@/lib/campaign/standing-work-blocks";

export type WorkloadDay = {
  date: string;
  eventCount: number;
  publicFacingHours: number;
  travelHours: number;
  earlyStart: boolean;
  lateFinish: boolean;
};

export type CandidateWorkloadSummary = {
  days: WorkloadDay[];
  flags: string[];
  note: string;
};

export function analyzeCandidateWorkload(input: {
  events: Array<{
    startsAt: Date;
    endsAt: Date;
    isTravel?: boolean;
    isPublicFacing?: boolean;
    eventType?: string | null;
    title?: string | null;
  }>;
}): CandidateWorkloadSummary {
  const countable = input.events.filter(
    (e) =>
      !isStandingWorkBlockEvent({
        eventType: e.eventType,
        title: e.title,
      }),
  );
  const byDay = new Map<string, typeof countable>();
  for (const e of countable) {
    const key = e.startsAt.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(e);
    byDay.set(key, list);
  }

  const days: WorkloadDay[] = [];
  const flags: string[] = [];
  for (const [date, events] of [...byDay.entries()].sort()) {
    let publicFacingHours = 0;
    let travelHours = 0;
    let earliest = Number.POSITIVE_INFINITY;
    let latest = 0;
    for (const e of events) {
      const hours = (e.endsAt.getTime() - e.startsAt.getTime()) / 3600000;
      if (e.isTravel) travelHours += hours;
      if (e.isPublicFacing) publicFacingHours += hours;
      earliest = Math.min(earliest, e.startsAt.getHours() + e.startsAt.getMinutes() / 60);
      latest = Math.max(latest, e.endsAt.getHours() + e.endsAt.getMinutes() / 60);
    }
    const earlyStart = earliest < 8;
    const lateFinish = latest > 21;
    days.push({
      date,
      eventCount: events.length,
      publicFacingHours: Math.round(publicFacingHours * 10) / 10,
      travelHours: Math.round(travelHours * 10) / 10,
      earlyStart,
      lateFinish,
    });
    if (events.length >= 3 && publicFacingHours >= 4) {
      flags.push(`${date}: multiple public events with limited preparation buffer`);
    }
    if (lateFinish) flags.push(`${date}: late finish`);
    if (earlyStart) flags.push(`${date}: early-morning start`);
  }

  return {
    days,
    flags,
    note: "Operational workload advisory only. Not medical advice.",
  };
}
