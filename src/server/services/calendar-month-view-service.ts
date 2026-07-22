import "server-only";

import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import { loadConflictsForViewEvents } from "@/server/services/conflict-engine-service";
import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoDateKey,
  chicagoTodayKey,
  formatMonthLabel,
  monthGridDateKeys,
  startOfMonthDateKey,
  startOfWeekDateKey,
  weekDateKeys,
} from "@/lib/calendar/chicago-date";
import { OPERATING_VIEW_QUESTIONS } from "@/lib/calendar/operating-view-lenses";
import {
  eventIntersectsCampaignDay,
  occupiedCampaignDateKeysForInterval,
} from "@/lib/calendar/temporal";
import { getElectionCountdown } from "@/lib/dates/election";
import { toMissionCard, type MissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import { roleMayMutate } from "@/lib/auth/system-roles";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  loadMissionContextForIds,
  type MissionContextBundle,
} from "@/server/services/mission-context-loader";
import { loadEventGraphForChicagoMonth } from "@/server/services/operating-views/load-event-graph";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

const TIMEZONE = CAMPAIGN_CALENDAR_TIMEZONE;

export type ActivityDensity = "none" | "light" | "moderate" | "heavy";

export type MonthDayCell = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  eventCount: number;
  density: ActivityDensity;
  sampleEvents: Array<{ eventId: string; title: string }>;
  weekHref: string;
  dayHref: string;
};

export type MonthHighlight = {
  missionId: string;
  title: string;
  whenLabel: string;
  kind: string;
};

export type MonthWeekRhythm = {
  weekLabel: string;
  weekStartKey: string;
  focusTitle: string | null;
  eventCount: number;
  peak: "overloaded" | "empty" | "steady";
  weekHref: string;
};

export type MonthTravelOverview = {
  missionsWithTravel: number;
  travelDays: number;
  knownMiles: number | null;
  knownMilesPartial: boolean;
  overnightStays: number;
  overnightPartial: boolean;
  rentalDaysUnknown: true;
  conflictCount: number;
  countyCount: number;
};

export type MonthCountyHeat = {
  countyName: string;
  eventCount: number;
  heat: "heavy" | "moderate" | "light";
  href: string;
};

export type MonthDeadline = {
  dateKey: string;
  title: string;
  missionId: string;
  kind: string;
};

export type CalendarMonthViewData = {
  dateKey: string;
  monthStartKey: string;
  monthLabel: string;
  timezone: string;
  executiveQuestion: string;
  electionLabel: string;
  daysRemaining: number;
  scheduledEventCount: number;
  majorFocus: string | null;
  campaignPhase: string;
  highlights: MonthHighlight[];
  grid: MonthDayCell[];
  weekRhythm: MonthWeekRhythm[];
  travel: MonthTravelOverview;
  countyHeat: MonthCountyHeat[];
  unknownCountyActivity: boolean;
  deadlines: MonthDeadline[];
  brief: {
    opportunities: string | null;
    risks: string;
    priorities: string | null;
    pendingDecisions: string;
    commandHref: string;
    briefHref: string;
  };
  conflicts: OperationalConflict[];
  cataloguePartial: boolean;
  isCurrentMonth: boolean;
  viewerDisplayName: string;
};

async function loadMissionContextBatched(eventIds: string[]): Promise<MissionContextBundle> {
  const merged: MissionContextBundle = {
    readiness: new Map(),
    travel: new Map(),
    day: new Map(),
    geo: new Map(),
    comms: new Map(),
    logistics: new Map(),
    finance: new Map(),
    compliance: new Map(),
    constituent: new Map(),
  };
  const unique = [...new Set(eventIds)];
  for (let i = 0; i < unique.length; i += 12) {
    const part = await loadMissionContextForIds(unique.slice(i, i + 12));
    for (const [k, v] of part.readiness) merged.readiness.set(k, v);
    for (const [k, v] of part.travel) merged.travel.set(k, v);
    for (const [k, v] of part.day) merged.day.set(k, v);
    for (const [k, v] of part.geo) merged.geo.set(k, v);
    for (const [k, v] of part.comms) merged.comms.set(k, v);
    for (const [k, v] of part.logistics) merged.logistics.set(k, v);
    for (const [k, v] of part.finance) merged.finance.set(k, v);
    for (const [k, v] of part.compliance) merged.compliance.set(k, v);
    for (const [k, v] of part.constituent) merged.constituent.set(k, v);
  }
  return merged;
}

function densityForCount(count: number): ActivityDensity {
  if (count <= 0) return "none";
  if (count === 1) return "light";
  if (count <= 3) return "moderate";
  return "heavy";
}

function heatForCount(count: number): "heavy" | "moderate" | "light" {
  if (count >= 4) return "heavy";
  if (count >= 2) return "moderate";
  return "light";
}

function highlightKind(title: string): string | null {
  const t = title.toLowerCase();
  if (/\bconvention\b/.test(t)) return "State Convention";
  if (/\bgala\b|\bfundraiser\b|\bfundraising\b/.test(t)) return "Fundraising";
  if (/\btour\b/.test(t)) return "Tour";
  if (/\bsummit\b/.test(t)) return "Volunteer Summit";
  if (/\bforum\b|\bdebate\b|\btown hall\b/.test(t)) return "Forum / Debate";
  if (/\bpetition\b|\bsignature\b/.test(t)) return "Petition";
  if (/\bfiling\b|\bdeadline\b|\breport\b/.test(t)) return "Deadline";
  if (/\bmedia\b|\bpress\b|\binterview\b/.test(t)) return "Media";
  return null;
}

function isDeadlineTitle(title: string): boolean {
  return /\bdeadline\b|\bfiling\b|\breport due\b|\bdue date\b|\belection day\b|\bqualification\b|\bballot title\b/i.test(
    title,
  );
}

function riskRank(level: MissionCard["riskLevel"]): number {
  switch (level) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "WATCH":
      return 2;
    default:
      return 3;
  }
}

/**
 * Calendar Experience Month View — strategic planning presentation only.
 * Owns no facts; density and heat are derived from loaded safe projections.
 */
export async function getCalendarMonthViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<CalendarMonthViewData> {
  const now = new Date();
  const graph = await loadEventGraphForChicagoMonth(actor, dateKeyInput);
  const anchor = graph.dateKey;
  const monthStartKey = startOfMonthDateKey(anchor);
  const monthKeys = graph.monthKeys;
  const monthKeySet = new Set(monthKeys);
  const gridKeys = monthGridDateKeys(anchor);
  const todayKey = chicagoTodayKey(now);
  const monthPrefix = monthStartKey.slice(0, 7);
  const cataloguePartial = graph.cataloguePartial;

  // CC-03: include Events whose intervals intersect the month (not start-day-only).
  const monthEvents = graph.events
    .filter((e) =>
      monthKeys.some((dateKey) =>
        eventIntersectsCampaignDay({
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          isAllDay: Boolean(e.allDay),
          dateKey,
        }),
      ),
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const context = await loadMissionContextBatched(monthEvents.map((e) => e.eventId));
  const canMutate = roleMayMutate(actor.primarySystemRole);

  const missions = monthEvents.map((event) => {
    const travel = context.travel.get(event.eventId);
    const day = context.day.get(event.eventId);
    const timeline = computeMissionTimeline({
      missionId: event.eventId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      now,
      travelRequired: travel?.travelRequired,
      estimatedDurationMinutes: travel?.estimatedDurationMinutes,
      bufferMinutes: travel?.bufferMinutes,
      departureAt: travel?.departureAt,
      targetArrivalAt: travel?.targetArrivalAt,
    });
    return toMissionCard({
      event,
      timezone: TIMEZONE,
      readiness: context.readiness.get(event.eventId) ?? null,
      timeline,
      isNext: false,
      now,
      eventVersion: day?.version,
      arrivalAt: day?.arrivalAt ?? null,
      confirmationStatus: day?.confirmationStatus ?? null,
      canMutateDayActions:
        chicagoDateKey(event.startsAt) === todayKey ? canMutate : false,
    });
  });

  // CC-06: merges an in-memory TIME_OVERLAP scan with persisted, still-open
  // conflicts (availability/buffer/travel) for the same Events.
  const conflicts = await loadConflictsForViewEvents(
    monthEvents.map((e) => ({
      id: e.eventId,
      label: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      status: e.status,
      candidateAttending: true,
    })),
  );

  const byDay = new Map<string, SafeEventProjection[]>();
  for (const event of monthEvents) {
    const occupied = occupiedCampaignDateKeysForInterval(
      event.startsAt,
      event.endsAt,
      Boolean(event.allDay),
    );
    for (const key of occupied) {
      if (!monthKeySet.has(key) && !gridKeys.includes(key)) continue;
      const list = byDay.get(key) ?? [];
      list.push(event);
      byDay.set(key, list);
    }
  }

  const grid: MonthDayCell[] = gridKeys.map((dateKey) => {
    const events = byDay.get(dateKey) ?? [];
    const inMonth = dateKey.startsWith(monthPrefix);
    return {
      dateKey,
      dayNumber: Number(dateKey.slice(8, 10)),
      inMonth,
      isToday: dateKey === todayKey,
      eventCount: events.length,
      density: densityForCount(events.length),
      sampleEvents: events.slice(0, 2).map((e) => ({
        eventId: e.eventId,
        title: e.title,
      })),
      weekHref: `/calendar?view=week&date=${startOfWeekDateKey(dateKey)}`,
      dayHref: `/calendar?view=day&date=${dateKey}`,
    };
  });

  const highlightCandidates = [...missions]
    .map((m) => {
      const kind = highlightKind(m.title);
      return kind
        ? {
            missionId: m.missionId,
            title: m.title,
            whenLabel: m.whenLabel,
            kind,
            risk: m.riskLevel,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => riskRank(a.risk) - riskRank(b.risk));

  const highlights: MonthHighlight[] = highlightCandidates.slice(0, 8).map((h) => ({
    missionId: h.missionId,
    title: h.title,
    whenLabel: h.whenLabel,
    kind: h.kind,
  }));

  if (highlights.length < 4) {
    for (const m of [...missions].sort((a, b) => riskRank(a.riskLevel) - riskRank(b.riskLevel))) {
      if (highlights.some((h) => h.missionId === m.missionId)) continue;
      highlights.push({
        missionId: m.missionId,
        title: m.title,
        whenLabel: m.whenLabel,
        kind: "Major mission",
      });
      if (highlights.length >= 6) break;
    }
  }

  const weekStarts: string[] = [];
  for (const key of monthKeys) {
    const start = startOfWeekDateKey(key);
    if (!weekStarts.includes(start)) weekStarts.push(start);
  }

  const weekRhythm: MonthWeekRhythm[] = weekStarts.map((weekStartKey, index) => {
    const keys = new Set(weekDateKeys(weekStartKey));
    const weekMissions = missions.filter((m) => keys.has(chicagoDateKey(m.startsAt)));
    const focus =
      [...weekMissions].sort((a, b) => riskRank(a.riskLevel) - riskRank(b.riskLevel))[0] ??
      null;
    const eventCount = weekMissions.length;
    const peak =
      eventCount === 0 ? "empty" : eventCount >= 8 ? "overloaded" : "steady";
    return {
      weekLabel: `Week ${index + 1}`,
      weekStartKey,
      focusTitle: focus?.title ?? null,
      eventCount,
      peak,
      weekHref: `/calendar?view=week&date=${weekStartKey}`,
    };
  });

  const travelDays = new Set<string>();
  let milesSum = 0;
  let milesKnown = 0;
  let overnight = 0;
  let overnightKnown = 0;
  let missionsWithTravel = 0;
  const countyNames = new Set<string>();

  for (const event of monthEvents) {
    const travel = context.travel.get(event.eventId);
    const logistics = context.logistics.get(event.eventId);
    const geo = context.geo.get(event.eventId);
    const required = Boolean(travel?.travelRequired || logistics?.travelRequired);
    if (required) {
      missionsWithTravel += 1;
      travelDays.add(chicagoDateKey(event.startsAt));
    }
    if (logistics?.estimatedDistanceMiles != null) {
      milesSum += logistics.estimatedDistanceMiles;
      milesKnown += 1;
    }
    if (logistics) {
      overnightKnown += 1;
      if (logistics.overnightStay) overnight += 1;
    }
    if (geo?.countyName?.trim()) countyNames.add(geo.countyName.trim());
  }

  const countyMap = new Map<string, number>();
  for (const event of monthEvents) {
    const name = context.geo.get(event.eventId)?.countyName?.trim();
    if (!name) continue;
    countyMap.set(name, (countyMap.get(name) ?? 0) + 1);
  }
  const countyHeat: MonthCountyHeat[] = [...countyMap.entries()]
    .map(([countyName, eventCount]) => ({
      countyName,
      eventCount,
      heat: heatForCount(eventCount),
      href: "/counties",
    }))
    .sort((a, b) => b.eventCount - a.eventCount);

  const deadlines: MonthDeadline[] = monthEvents
    .filter((e) => isDeadlineTitle(e.title))
    .map((e) => ({
      dateKey: chicagoDateKey(e.startsAt),
      title: e.title,
      missionId: e.eventId,
      kind: highlightKind(e.title) ?? "Deadline",
    }));

  const countdown = getElectionCountdown(now);
  const majorFocus = highlights[0]?.title ?? weekRhythm.find((w) => w.focusTitle)?.focusTitle ?? null;
  const blocked = missions.filter((m) => m.todayReadiness.state === "BLOCKED").length;
  const needsAttention = missions.filter(
    (m) => m.todayReadiness.state === "NEEDS_ATTENTION",
  ).length;

  return {
    dateKey: anchor,
    monthStartKey,
    monthLabel: formatMonthLabel(monthStartKey),
    timezone: TIMEZONE,
    executiveQuestion: OPERATING_VIEW_QUESTIONS.month,
    electionLabel: countdown.label,
    daysRemaining: countdown.daysRemaining,
    scheduledEventCount: monthEvents.length,
    majorFocus,
    campaignPhase: countdown.isPastElection
      ? "Post-election"
      : countdown.isElectionDay
        ? "Election Day"
        : countdown.daysRemaining <= 60
          ? "Final stretch"
          : countdown.daysRemaining <= 120
            ? "Active campaign"
            : "Build phase",
    highlights,
    grid,
    weekRhythm,
    travel: {
      missionsWithTravel,
      travelDays: travelDays.size,
      knownMiles: milesKnown > 0 ? milesSum : null,
      knownMilesPartial: missionsWithTravel > milesKnown,
      overnightStays: overnightKnown > 0 ? overnight : 0,
      overnightPartial: monthEvents.length > overnightKnown,
      rentalDaysUnknown: true,
      conflictCount: conflicts.length,
      countyCount: countyNames.size,
    },
    countyHeat,
    unknownCountyActivity: monthEvents.length > 0 && countyHeat.length === 0,
    deadlines,
    brief: {
      opportunities: majorFocus,
      risks:
        conflicts.length + blocked > 0
          ? `${conflicts.length} overlaps · ${blocked} blocked missions in loaded month schedule`
          : "No high risks surfaced from loaded month schedule",
      priorities: majorFocus,
      pendingDecisions:
        needsAttention + blocked > 0
          ? `${needsAttention + blocked} missions need attention or are blocked`
          : "No pending mission decisions surfaced from loaded month schedule",
      commandHref: "/command",
      briefHref: "/brief",
    },
    conflicts,
    cataloguePartial,
    isCurrentMonth: todayKey.startsWith(monthPrefix),
    viewerDisplayName: actor.displayName,
  };
}
