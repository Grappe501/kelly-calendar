import "server-only";

import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoDateKeyToUtcBounds,
  chicagoDateKeysToUtcRange,
  chicagoTodayKey,
  monthDateKeys,
  resolveCalendarDateKey,
  shiftChicagoDateKey,
  weekDateKeys,
} from "@/lib/calendar/chicago-date";
import { eventIntersectsCampaignDay } from "@/lib/calendar/temporal";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  listEventsForActorInRange,
  type OperatingEventRecord,
} from "@/server/services/event-service";

export type EventGraphBundle = {
  timezone: string;
  rangeStart: Date;
  rangeEnd: Date;
  cataloguePartial: boolean;
  events: OperatingEventRecord[];
};

const DEFAULT_TAKE = 250;

/**
 * Canonical Event graph load for operating views.
 * One query → many lenses. Do not bypass with per-view catalogue scans.
 */
export async function loadEventGraphForRange(
  actor: AuthenticatedActor,
  input: { rangeStart: Date; rangeEnd: Date; take?: number },
): Promise<EventGraphBundle> {
  const take = input.take ?? DEFAULT_TAKE;
  const events = await listEventsForActorInRange(actor, {
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    take,
  });
  return {
    timezone: CAMPAIGN_CALENDAR_TIMEZONE,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    cataloguePartial: events.length >= take,
    events,
  };
}

export async function loadEventGraphForChicagoDay(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<EventGraphBundle & { dateKey: string; isToday: boolean }> {
  const dateKey = resolveCalendarDateKey(dateKeyInput);
  const { start, endExclusive } = chicagoDateKeyToUtcBounds(dateKey);
  const graph = await loadEventGraphForRange(actor, {
    rangeStart: start,
    rangeEnd: endExclusive,
    take: 100,
  });
  return {
    ...graph,
    dateKey,
    isToday: dateKey === chicagoTodayKey(),
  };
}

export async function loadEventGraphForChicagoWeek(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<EventGraphBundle & { dateKey: string; weekKeys: string[] }> {
  const dateKey = resolveCalendarDateKey(dateKeyInput);
  const weekKeys = weekDateKeys(dateKey);
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(
    weekKeys[0],
    weekKeys[weekKeys.length - 1],
  );
  const graph = await loadEventGraphForRange(actor, {
    rangeStart,
    rangeEnd,
    take: 200,
  });
  return { ...graph, dateKey, weekKeys };
}

export async function loadEventGraphForChicagoMonth(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<EventGraphBundle & { dateKey: string; monthKeys: string[] }> {
  const dateKey = resolveCalendarDateKey(dateKeyInput);
  const monthKeys = monthDateKeys(dateKey);
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(
    monthKeys[0],
    monthKeys[monthKeys.length - 1],
  );
  const graph = await loadEventGraphForRange(actor, {
    rangeStart,
    rangeEnd,
    take: 300,
  });
  return { ...graph, dateKey, monthKeys };
}

/** Agenda: from anchor day forward (default 90 days). */
export async function loadEventGraphForAgenda(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
  forwardDays = 90,
): Promise<EventGraphBundle & { dateKey: string }> {
  const dateKey = resolveCalendarDateKey(dateKeyInput);
  const lastKey = shiftChicagoDateKey(dateKey, forwardDays);
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(dateKey, lastKey);
  const graph = await loadEventGraphForRange(actor, {
    rangeStart,
    rangeEnd,
    take: 300,
  });
  return { ...graph, dateKey };
}

export function eventsOnChicagoDate(
  events: OperatingEventRecord[],
  dateKey: string,
): OperatingEventRecord[] {
  // CC-03: day membership is interval ∩ campaign-local day (not start-day-only).
  return events
    .filter((e) =>
      eventIntersectsCampaignDay({
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        isAllDay: Boolean(e.allDay),
        dateKey,
      }),
    )
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
}
