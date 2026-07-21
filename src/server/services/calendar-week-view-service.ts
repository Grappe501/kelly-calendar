import "server-only";

import { detectCandidateOverlaps } from "@/features/operational-intelligence/services/conflict-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoDateKey,
  chicagoTodayKey,
  displayCampaignWeekIndex,
  formatWeekRangeLabel,
  shiftChicagoDateKey,
  startOfWeekDateKey,
} from "@/lib/calendar/chicago-date";
import { getElectionCountdown } from "@/lib/dates/election";
import { HISTORICAL_IMPORT_FLOOR } from "@/lib/system/constants";
import { classifyPublicAppearance } from "@/lib/missions/debate-media-operations";
import { classifyFundraisingEvent } from "@/lib/missions/fundraising-operations";
import { classifyGotvActivity } from "@/lib/missions/gotv-operations";
import { toMissionCard, type MissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import { classifyPetitionActivity } from "@/lib/missions/petition-ballot-operations";
import {
  buildMissionTodayReadiness,
  buildTodayReadinessSummary,
  type TodayReadinessSummary,
} from "@/lib/missions/today-readiness";
import { roleMayMutate } from "@/lib/auth/system-roles";
import { OPERATING_VIEW_QUESTIONS } from "@/lib/calendar/operating-view-lenses";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  loadMissionContextForIds,
  type MissionContextBundle,
} from "@/server/services/mission-context-loader";
import { loadEventGraphForChicagoWeek } from "@/server/services/operating-views/load-event-graph";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

const TIMEZONE = CAMPAIGN_CALENDAR_TIMEZONE;

const DOMAIN_STRIP = [
  { id: "executive", label: "Executive", href: "/command" },
  { id: "field", label: "Field", href: "/field" },
  { id: "volunteer", label: "Volunteer", href: "/volunteers" },
  { id: "communications", label: "Communications", href: "/communications" },
  { id: "logistics", label: "Logistics", href: "/logistics" },
  { id: "finance", label: "Finance", href: "/finance" },
  { id: "compliance", label: "Compliance", href: "/compliance" },
  { id: "candidate", label: "Candidate", href: "/candidate" },
  { id: "gotv", label: "GOTV", href: "/gotv" },
  { id: "petition", label: "Petition", href: "/petition" },
] as const;

export type WeekDomainTile = {
  id: string;
  label: string;
  href: string;
  state: "UNKNOWN";
  reason: string;
};

export type WeekDayColumn = {
  dateKey: string;
  weekdayLabel: string;
  isToday: boolean;
  events: SafeEventProjection[];
};

export type WeekMissionPriority = {
  priority: number;
  missionId: string;
  title: string;
  whenLabel: string;
  riskLevel: MissionCard["riskLevel"];
  readinessLabel: string;
};

export type WeekTravelSummary = {
  missionsWithTravel: number;
  knownDriveMinutes: number | null;
  knownDriveMinutesPartial: boolean;
  knownMiles: number | null;
  knownMilesPartial: boolean;
  overnightStays: number;
  overnightPartial: boolean;
  conflictCount: number;
};

export type WeekCountyActivity = {
  countyName: string;
  eventCount: number;
  sampleTitle: string;
  href: string;
};

export type WeekCandidateItem = {
  missionId: string;
  title: string;
  whenLabel: string;
  kind: string;
  href: string;
};

export type WeekVolunteerSummary = {
  missionsWithStaffing: number;
  staffAssignedTotal: number | null;
  staffRequiredTotal: number | null;
  volunteerLeadGaps: number;
  shortages: number;
  note: string;
};

export type WeekBriefSignals = {
  mostImportant: string | null;
  riskCount: number;
  pendingDecisions: string;
  whatChanged: string;
  fullBriefHref: string;
};

/** Week accomplishment themes — not day-by-day inventory. */
export type WeekCampaignTheme = {
  id: string;
  label: string;
  eventCount: number;
  sampleTitles: string[];
};

export type CalendarWeekViewData = {
  dateKey: string;
  weekStartKey: string;
  weekKeys: string[];
  weekRangeLabel: string;
  campaignWeekDisplay: number;
  timezone: string;
  executiveQuestion: string;
  electionLabel: string;
  daysRemaining: number;
  scheduleReadiness: TodayReadinessSummary;
  highPriorityTitle: string | null;
  domainStrip: WeekDomainTile[];
  days: WeekDayColumn[];
  campaignThemes: WeekCampaignTheme[];
  missionRail: WeekMissionPriority[];
  travel: WeekTravelSummary;
  counties: WeekCountyActivity[];
  candidateSchedule: WeekCandidateItem[];
  volunteer: WeekVolunteerSummary;
  brief: WeekBriefSignals;
  standingReminders: string[];
  conflicts: OperationalConflict[];
  cataloguePartial: boolean;
  isCurrentWeek: boolean;
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
    const chunk = unique.slice(i, i + 12);
    const part = await loadMissionContextForIds(chunk);
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

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
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

function buildWeekCampaignThemes(events: SafeEventProjection[]): WeekCampaignTheme[] {
  const buckets: Array<{
    id: string;
    label: string;
    match: (e: SafeEventProjection) => boolean;
  }> = [
    {
      id: "fundraising",
      label: "Fundraisers",
      match: (e) =>
        classifyFundraisingEvent({
          title: e.title,
          isFundraisingCalendar: e.primaryCalendar.type === "FUNDRAISING",
        }) !== "NOT_FUNDRAISING",
    },
    {
      id: "media",
      label: "Media",
      match: (e) => {
        const kind = classifyPublicAppearance({
          title: e.title,
          hasSpeech: false,
          hasPressItem: false,
        });
        return (
          kind !== "NOT_PUBLIC" &&
          /DEBATE|INTERVIEW|PODCAST|EDITORIAL|PRESS|LIVESTREAM|RADIO|EARNED_MEDIA|RECORDED_VIDEO/.test(
            kind,
          )
        );
      },
    },
    {
      id: "appearances",
      label: "Major appearances",
      match: (e) =>
        classifyPublicAppearance({
          title: e.title,
          hasSpeech: false,
          hasPressItem: false,
        }) !== "NOT_PUBLIC",
    },
    {
      id: "volunteer",
      label: "Volunteer events",
      match: (e) =>
        e.primaryCalendar.type === "VOLUNTEER" ||
        classifyGotvActivity({ title: e.title }) !== "NOT_GOTV",
    },
    {
      id: "county",
      label: "County visits",
      match: (e) =>
        e.primaryCalendar.type === "COUNTY_ACTIVITY" ||
        /county|tour|springfield/i.test(e.title),
    },
    {
      id: "travel",
      label: "Travel",
      match: (e) => e.primaryCalendar.type === "TRAVEL" || /travel|drive|flight/i.test(e.title),
    },
  ];

  const themes: WeekCampaignTheme[] = [];
  const claimed = new Set<string>();
  for (const bucket of buckets) {
    const matched = events.filter((e) => !claimed.has(e.eventId) && bucket.match(e));
    if (matched.length === 0) continue;
    for (const e of matched) claimed.add(e.eventId);
    themes.push({
      id: bucket.id,
      label: bucket.label,
      eventCount: matched.length,
      sampleTitles: matched.slice(0, 3).map((e) => e.title),
    });
  }
  const residual = events.filter((e) => !claimed.has(e.eventId));
  if (residual.length > 0) {
    themes.unshift({
      id: "campaign_goals",
      label: "Campaign goals",
      eventCount: residual.length,
      sampleTitles: residual.slice(0, 3).map((e) => e.title),
    });
  }
  return themes;
}

function classifyCandidateKind(title: string, calendarType: string): string | null {
  const appearance = classifyPublicAppearance({
    title,
    hasSpeech: false,
    hasPressItem: false,
  });
  if (appearance !== "NOT_PUBLIC") return appearance;
  const fundraise = classifyFundraisingEvent({
    title,
    isFundraisingCalendar: /fundrais/i.test(calendarType),
  });
  if (fundraise !== "NOT_FUNDRAISING") return fundraise;
  const gotv = classifyGotvActivity({ title });
  if (gotv !== "NOT_GOTV") return gotv;
  const petition = classifyPetitionActivity({ title });
  if (petition !== "NOT_PETITION") return petition;
  if (/town\s*hall|meet[\s-]?and[\s-]?greet|interview|speech|debate|media/i.test(title)) {
    return "CANDIDATE_FACING";
  }
  if (/candidate/i.test(calendarType)) return "CANDIDATE_CALENDAR";
  return null;
}

/**
 * Calendar Experience Week View — presentation adapter only.
 * Owns no facts. Domain strip uses UNKNOWN until week-scoped rollups exist.
 */
export async function getCalendarWeekViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<CalendarWeekViewData> {
  const now = new Date();
  const graph = await loadEventGraphForChicagoWeek(actor, dateKeyInput);
  const weekKeys = graph.weekKeys;
  const weekStartKey = weekKeys[0];
  const weekKeySet = new Set(weekKeys);
  const todayKey = chicagoTodayKey(now);
  const cataloguePartial = graph.cataloguePartial;

  const weekEvents = graph.events
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const context = await loadMissionContextBatched(weekEvents.map((e) => e.eventId));
  const canMutate = roleMayMutate(actor.primarySystemRole);

  const missions = weekEvents.map((event, index) => {
    const travel = context.travel.get(event.eventId) ?? event.travel;
    const day = context.day.get(event.eventId);
    const timeline = computeMissionTimeline({
      missionId: event.eventId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      now,
      travelRequired: travel?.travelRequired,
      estimatedDurationMinutes: travel?.estimatedDurationMinutes ?? undefined,
      bufferMinutes: travel?.bufferMinutes ?? undefined,
      departureAt: travel?.departureAt ?? undefined,
      targetArrivalAt: travel?.targetArrivalAt ?? undefined,
    });
    return toMissionCard({
      event,
      timezone: TIMEZONE,
      readiness: context.readiness.get(event.eventId) ?? null,
      timeline,
      isNext: chicagoDateKey(event.startsAt) === todayKey && index === 0,
      now,
      eventVersion: day?.version,
      arrivalAt: day?.arrivalAt ?? null,
      confirmationStatus: day?.confirmationStatus ?? null,
      canMutateDayActions: chicagoDateKey(event.startsAt) === todayKey ? canMutate : false,
    });
  });

  const scheduleReadiness = buildTodayReadinessSummary(
    weekEvents.map((event) =>
      buildMissionTodayReadiness({
        missionId: event.eventId,
        missionTitle: event.title,
        readiness: context.readiness.get(event.eventId) ?? null,
      }),
    ),
  );

  const conflicts = detectCandidateOverlaps(
    weekEvents.map((e) => ({
      id: e.eventId,
      label: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      status: e.status,
      candidateAttending: true,
      calendarType: e.primaryCalendar.type,
    })),
  );

  const days: WeekDayColumn[] = weekKeys.map((dateKey) => ({
    dateKey,
    weekdayLabel: weekdayLabel(dateKey),
    isToday: dateKey === todayKey,
    events: weekEvents.filter((e) => chicagoDateKey(e.startsAt) === dateKey),
  }));

  const missionRail: WeekMissionPriority[] = [...missions]
    .sort((a, b) => {
      const risk = riskRank(a.riskLevel) - riskRank(b.riskLevel);
      if (risk !== 0) return risk;
      return a.startsAt.localeCompare(b.startsAt);
    })
    .slice(0, 4)
    .map((m, i) => ({
      priority: i + 1,
      missionId: m.missionId,
      title: m.title,
      whenLabel: m.whenLabel,
      riskLevel: m.riskLevel,
      readinessLabel: m.todayReadiness.state,
    }));

  const campaignThemes = buildWeekCampaignThemes(weekEvents);
  let driveSum = 0;
  let driveKnown = 0;
  let milesSum = 0;
  let milesKnown = 0;
  let overnight = 0;
  let overnightKnown = 0;
  let missionsWithTravel = 0;

  for (const event of weekEvents) {
    const travel = context.travel.get(event.eventId);
    const logistics = context.logistics.get(event.eventId);
    const required = Boolean(travel?.travelRequired || logistics?.travelRequired);
    if (required) missionsWithTravel += 1;
    if (travel?.estimatedDurationMinutes != null) {
      driveSum += travel.estimatedDurationMinutes;
      driveKnown += 1;
    }
    if (logistics?.estimatedDistanceMiles != null) {
      milesSum += logistics.estimatedDistanceMiles;
      milesKnown += 1;
    }
    if (logistics) {
      overnightKnown += 1;
      if (logistics.overnightStay) overnight += 1;
    }
  }

  const travel: WeekTravelSummary = {
    missionsWithTravel,
    knownDriveMinutes: driveKnown > 0 ? driveSum : null,
    knownDriveMinutesPartial: missionsWithTravel > driveKnown,
    knownMiles: milesKnown > 0 ? milesSum : null,
    knownMilesPartial: missionsWithTravel > milesKnown,
    overnightStays: overnightKnown > 0 ? overnight : 0,
    overnightPartial: weekEvents.length > overnightKnown,
    conflictCount: conflicts.length,
  };

  const countyMap = new Map<string, WeekCountyActivity>();
  for (const event of weekEvents) {
    const geo = context.geo.get(event.eventId);
    const name = geo?.countyName?.trim();
    if (!name) continue;
    const existing = countyMap.get(name);
    if (existing) {
      existing.eventCount += 1;
    } else {
      countyMap.set(name, {
        countyName: name,
        eventCount: 1,
        sampleTitle: event.title,
        href: "/counties",
      });
    }
  }
  const counties = [...countyMap.values()].sort((a, b) => b.eventCount - a.eventCount);

  const candidateSchedule: WeekCandidateItem[] = [];
  for (const m of missions) {
    const event = weekEvents.find((e) => e.eventId === m.missionId);
    const kind = classifyCandidateKind(m.title, event?.primaryCalendar.type ?? "");
    if (!kind) continue;
    candidateSchedule.push({
      missionId: m.missionId,
      title: m.title,
      whenLabel: m.whenLabel,
      kind,
      href: "/candidate",
    });
  }

  let staffAssigned: number | null = 0;
  let staffRequired: number | null = 0;
  let assignedKnown = false;
  let requiredKnown = false;
  let leadGaps = 0;
  let shortages = 0;
  let staffingMissions = 0;
  for (const event of weekEvents) {
    const geo = context.geo.get(event.eventId);
    if (!geo) continue;
    staffingMissions += 1;
    if (geo.staffAssignedCount != null) {
      staffAssigned = (staffAssigned ?? 0) + geo.staffAssignedCount;
      assignedKnown = true;
    }
    if (geo.staffRequiredCount != null) {
      staffRequired = (staffRequired ?? 0) + geo.staffRequiredCount;
      requiredKnown = true;
    }
    if (!geo.volunteerLeadAssigned) leadGaps += 1;
    if (
      geo.staffRequiredCount != null &&
      geo.staffAssignedCount != null &&
      geo.staffAssignedCount < geo.staffRequiredCount
    ) {
      shortages += 1;
    }
  }

  const volunteer: WeekVolunteerSummary = {
    missionsWithStaffing: staffingMissions,
    staffAssignedTotal: assignedKnown ? staffAssigned : null,
    staffRequiredTotal: requiredKnown ? staffRequired : null,
    volunteerLeadGaps: leadGaps,
    shortages,
    note: "Week staffing signals from mission geo — Volunteer Ops remains the owner.",
  };

  const countdown = getElectionCountdown(now);
  const highPriorityTitle = missionRail[0]?.title ?? null;

  const domainStrip: WeekDomainTile[] = DOMAIN_STRIP.map((d) => ({
    id: d.id,
    label: d.label,
    href: d.href,
    state: "UNKNOWN" as const,
    reason: `Week-scoped ${d.label} rollup not available — open module for today's owned readiness.`,
  }));

  return {
    dateKey: graph.dateKey,
    weekStartKey,
    weekKeys,
    weekRangeLabel: formatWeekRangeLabel(weekKeys),
    campaignWeekDisplay: displayCampaignWeekIndex(weekStartKey, HISTORICAL_IMPORT_FLOOR),
    timezone: TIMEZONE,
    executiveQuestion: OPERATING_VIEW_QUESTIONS.week,
    electionLabel: countdown.label,
    daysRemaining: countdown.daysRemaining,
    scheduleReadiness,
    highPriorityTitle,
    domainStrip,
    days,
    campaignThemes,
    missionRail,
    travel,
    counties,
    candidateSchedule,
    volunteer,
    brief: {
      mostImportant: highPriorityTitle,
      riskCount: conflicts.length + scheduleReadiness.blockedCount,
      pendingDecisions:
        scheduleReadiness.needsAttentionCount + scheduleReadiness.blockedCount > 0
          ? `${scheduleReadiness.needsAttentionCount + scheduleReadiness.blockedCount} missions need attention or are blocked`
          : "No pending mission decisions surfaced from this week's loaded schedule",
      whatChanged:
        "Week-scoped change log not available — see Executive Brief for today's owned brief.",
      fullBriefHref: "/brief",
    },
    standingReminders: getStandingAvailabilityPolicy().rules.map((r) => r.summary),
    conflicts,
    cataloguePartial,
    isCurrentWeek: weekKeySet.has(todayKey),
    viewerDisplayName: actor.displayName,
  };
}

export function shiftWeekAnchor(dateKey: string, deltaWeeks: number): string {
  return shiftChicagoDateKey(startOfWeekDateKey(dateKey), deltaWeeks * 7);
}
