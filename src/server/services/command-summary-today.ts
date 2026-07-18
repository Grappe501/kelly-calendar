import "server-only";

import { buildTodayCommandSummary } from "@/features/operational-intelligence/services/operational-summary-service";
import type { TodayCommandSummary } from "@/features/operational-intelligence/types/summary-types";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { listEventsForActor } from "@/server/services/event-service";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

const TIMEZONE = "America/Chicago";

function chicagoDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function chicagoNowParts() {
  const now = new Date();
  return {
    now,
    todayKey: chicagoDateKey(now),
    tomorrowKey: chicagoDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
  };
}

export type TodayCommandShellData = {
  summary: TodayCommandSummary;
  nextEvent: SafeEventProjection | null;
  upcomingToday: SafeEventProjection[];
  viewerDisplayName: string;
};

/**
 * Authenticated Today Command summary using safe event projections only.
 * Deep readiness/conflict intelligence remains Step 8; counts start at zero until wired.
 */
export async function getTodayCommandShellData(
  actor: AuthenticatedActor,
): Promise<TodayCommandShellData> {
  const { now, todayKey, tomorrowKey } = chicagoNowParts();
  const all = (await listEventsForActor(actor)).filter(
    (e): e is SafeEventProjection => e != null,
  );

  const eventsToday = all.filter((e) => chicagoDateKey(e.startsAt) === todayKey);
  const eventsTomorrowCount = all.filter(
    (e) => chicagoDateKey(e.startsAt) === tomorrowKey,
  ).length;

  const upcomingToday = eventsToday
    .filter((e) => new Date(e.endsAt).getTime() >= now.getTime())
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const nextEvent = upcomingToday[0] ?? null;

  const summary = buildTodayCommandSummary({
    date: todayKey,
    timezone: TIMEZONE,
    eventsToday,
    eventsTomorrowCount,
    readiness: [],
    conflicts: [],
    authenticationComplete: true,
    liveDataEnabled: true,
  });

  return {
    summary,
    nextEvent,
    upcomingToday,
    viewerDisplayName: actor.displayName,
  };
}
