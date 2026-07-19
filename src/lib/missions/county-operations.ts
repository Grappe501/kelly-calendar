/**
 * Step 7.3 — County Operations (pure aggregation).
 * Answers: Where are we weak?
 *
 * Canonical owner of county readiness / operational grouping.
 * Consumes Calendar mission signals + Field Operations heat (no re-implementation).
 */

import { ARKANSAS_COUNTIES } from "@/features/event-drafts/arkansas-counties";
import type { FieldHeat, OperationalHeatRow } from "@/lib/missions/field-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { MissionTodayReadiness } from "@/lib/missions/today-readiness";
import {
  countyCommunicationsFact,
  type CommunicationsCountyRow,
} from "@/lib/missions/communications-operations";
import {
  countyLogisticsFact,
  type LogisticsCountyRow,
} from "@/lib/missions/logistics-operations";
import {
  countyVolunteerFact,
  type OperationalNumber,
  type VolunteerCountyCapacity,
} from "@/lib/missions/volunteer-operations";

export type CountyOperationalGroup =
  | "NEEDS_IMMEDIATE_ATTENTION"
  | "READY_FOR_EXPANSION"
  | "HEALTHY_OPERATIONS"
  | "INACTIVE_NO_LEADERSHIP";

export const COUNTY_GROUP_LABELS: Record<CountyOperationalGroup, string> = {
  NEEDS_IMMEDIATE_ATTENTION: "Needs Immediate Attention",
  READY_FOR_EXPANSION: "Ready for Expansion",
  HEALTHY_OPERATIONS: "Healthy Operations",
  INACTIVE_NO_LEADERSHIP: "Inactive / No Leadership",
};

export type CountyHealthFactor = {
  id:
    | "leadership"
    | "upcoming_coverage"
    | "recent_activity"
    | "outstanding_needs"
    | "event_readiness"
    | "check_in_cadence";
  label: string;
  maxPoints: number;
  earned: number;
  detail: string;
};

export type CountyMissionRef = {
  missionId: string;
  title: string;
  whenLabel: string;
  href: string;
  status: string;
};

export type CountyCommandNode = {
  countyName: string;
  slug: string;
  group: CountyOperationalGroup;
  statusLabel: string;
  leaderLabel: string;
  readinessLabel: string;
  readinessPercent: number | null;
  upcomingMissions: CountyMissionRef[];
  upcomingCount: number;
  volunteerCapacity: OperationalNumber & {
    note?: string;
    openRoles?: number;
    coveragePercent?: number | null;
    leadershipDepth?: OperationalNumber;
    benchStrengthReason?: string;
  };
  openNeeds: string[];
  recentActivity: string;
  operationalRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  healthScore: number;
  healthFactors: CountyHealthFactor[];
  healthExplanation: string;
  fieldHeat: FieldHeat | null;
  missionCountToday: number;
  href: string;
  /** Consumed from Communications Operations. */
  communications: {
    pendingAnnouncements: number | null;
    supportNeeds: number | null;
    localMediaActivity: OperationalNumber;
    localMessagingPackages: "UNKNOWN";
    messagingRisk: string;
  } | null;
  /** Consumed from Logistics Operations. */
  logistics: {
    venueReadiness: string;
    transportationReadiness: string;
    materialAvailability: OperationalNumber;
    resourceInventory: "UNKNOWN";
    localLogisticsCoordinator: "UNKNOWN";
    logisticsRisk: string;
  } | null;
};

export type CountyOperationsHome = {
  title: "COUNTY OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  totalCounties: number;
  groupCounts: Record<CountyOperationalGroup, number>;
  groups: Array<{
    group: CountyOperationalGroup;
    label: string;
    counties: CountyCommandNode[];
  }>;
  weakest: CountyCommandNode[];
  /** Compact feed for Executive Command — canonical county weakness signals. */
  executiveFeed: {
    needsImmediate: number;
    inactiveNoLeadership: number;
    readyForExpansion: number;
    healthy: number;
    topWeak: Array<{ countyName: string; healthScore: number; reason: string; href: string }>;
    briefingLine: string;
  };
};

export type CountyMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  staffAssignedCount: number;
  staffRequiredCount: number;
  readiness: MissionTodayReadiness | null;
};

export function countySlug(countyName: string): string {
  return countyName
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export function normalizeCountyName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s+County$/i, "").trim();
  const hit = ARKANSAS_COUNTIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  return hit ?? trimmed;
}

function leaderFromMissions(missions: CountyMissionInput[]): string {
  for (const m of missions) {
    const owner = m.mission.ownerLabel?.trim() || "";
    if (owner && owner.toLowerCase() !== "unassigned") return owner;
  }
  return "Unassigned";
}

function avgReadiness(missions: CountyMissionInput[]): number | null {
  const vals = missions
    .map((m) => m.mission.readinessScore)
    .filter((n): n is number => typeof n === "number");
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function readinessLabelFor(missions: CountyMissionInput[], percent: number | null): string {
  if (missions.length === 0) return "No missions today";
  if (missions.some((m) => (m.readiness?.state ?? m.mission.todayReadiness?.state) === "BLOCKED")) {
    return "Blocked";
  }
  if (
    missions.some(
      (m) => (m.readiness?.state ?? m.mission.todayReadiness?.state) === "NEEDS_ATTENTION",
    )
  ) {
    return "Needs attention";
  }
  if (percent == null) return "Unknown";
  if (percent >= 80) return "Ready";
  if (percent >= 50) return "Partial";
  return "At risk";
}

function collectOpenNeeds(
  missions: CountyMissionInput[],
  fieldHelp: Array<{ detail: string }>,
): string[] {
  const needs = new Set<string>();
  for (const h of fieldHelp) {
    if (h.detail && h.detail !== "Ready") needs.add(h.detail);
  }
  for (const m of missions) {
    const issue = m.readiness?.topIssue ?? m.mission.todayReadiness?.topIssue;
    if (issue) needs.add(issue);
    if (m.staffRequiredCount > m.staffAssignedCount) needs.add("Volunteer / staffing");
    if (m.mission.confirmationStatus === "NEEDS_ATTENTION") needs.add("Confirmation");
  }
  return [...needs].slice(0, 6);
}

function checkedInCount(missions: CountyMissionInput[]): number {
  return missions.filter((m) => {
    const s = m.mission.missionStatus;
    return s === "IN_PROGRESS" || s === "COMPLETE";
  }).length;
}

export function scoreCountyHealth(input: {
  hasLeader: boolean;
  upcomingCount: number;
  missionCountToday: number;
  openNeedsCount: number;
  readinessPercent: number | null;
  checkedIn: number;
  fieldHeat: FieldHeat | null;
}): { score: number; factors: CountyHealthFactor[]; explanation: string } {
  const factors: CountyHealthFactor[] = [];

  const leadershipEarned = input.hasLeader ? 20 : 0;
  factors.push({
    id: "leadership",
    label: "Leadership assigned",
    maxPoints: 20,
    earned: leadershipEarned,
    detail: input.hasLeader
      ? "Mission owner/contact present"
      : "No county/mission leader in view",
  });

  const upcomingEarned =
    input.upcomingCount >= 2 ? 20 : input.upcomingCount === 1 ? 14 : 0;
  factors.push({
    id: "upcoming_coverage",
    label: "Upcoming mission coverage",
    maxPoints: 20,
    earned: upcomingEarned,
    detail:
      input.upcomingCount > 0
        ? `${input.upcomingCount} upcoming mission(s)`
        : "No upcoming missions today",
  });

  const activityEarned =
    input.missionCountToday >= 2 ? 15 : input.missionCountToday === 1 ? 10 : 0;
  factors.push({
    id: "recent_activity",
    label: "Recent activity",
    maxPoints: 15,
    earned: activityEarned,
    detail:
      input.missionCountToday > 0
        ? `${input.missionCountToday} mission(s) on today’s schedule`
        : "No activity in permissioned view today",
  });

  let needsEarned = 20;
  if (input.fieldHeat === "BLOCKED") needsEarned = 0;
  else if (input.fieldHeat === "OVERLOADED") needsEarned = 4;
  else if (input.fieldHeat === "BUSY") needsEarned = 10;
  else if (input.openNeedsCount >= 3) needsEarned = 6;
  else if (input.openNeedsCount >= 1) needsEarned = 12;
  else if (input.missionCountToday === 0) needsEarned = 8;
  factors.push({
    id: "outstanding_needs",
    label: "Outstanding needs",
    maxPoints: 20,
    earned: needsEarned,
    detail:
      input.openNeedsCount === 0 && input.fieldHeat !== "BLOCKED"
        ? "No open field/readiness needs flagged"
        : `${input.openNeedsCount} open need(s); field heat ${input.fieldHeat ?? "none"}`,
  });

  let readinessEarned = 6;
  if (input.readinessPercent == null) {
    readinessEarned = input.missionCountToday === 0 ? 6 : 4;
  } else if (input.readinessPercent >= 80) readinessEarned = 15;
  else if (input.readinessPercent >= 60) readinessEarned = 11;
  else if (input.readinessPercent >= 40) readinessEarned = 7;
  else readinessEarned = 3;
  factors.push({
    id: "event_readiness",
    label: "Event readiness",
    maxPoints: 15,
    earned: readinessEarned,
    detail:
      input.readinessPercent == null
        ? "Readiness unknown"
        : `Avg readiness ${input.readinessPercent}%`,
  });

  const cadenceEarned =
    input.missionCountToday === 0
      ? 3
      : Math.round((input.checkedIn / input.missionCountToday) * 10);
  factors.push({
    id: "check_in_cadence",
    label: "Check-in cadence",
    maxPoints: 10,
    earned: Math.min(10, cadenceEarned),
    detail:
      input.missionCountToday === 0
        ? "No missions to check in"
        : `${input.checkedIn}/${input.missionCountToday} arrived/in-progress/complete`,
  });

  const score = factors.reduce((sum, f) => sum + f.earned, 0);
  const weak = factors
    .filter((f) => f.earned < f.maxPoints * 0.6)
    .map((f) => f.label)
    .slice(0, 3);
  const explanation =
    weak.length > 0
      ? `Score ${score}/100 — weak on: ${weak.join("; ")}.`
      : `Score ${score}/100 — factors within healthy bands.`;

  return { score, factors, explanation };
}

export function deriveCountyGroup(input: {
  missionCountToday: number;
  hasLeader: boolean;
  healthScore: number;
  fieldHeat: FieldHeat | null;
  operationalRisk: CountyCommandNode["operationalRisk"];
}): CountyOperationalGroup {
  if (input.missionCountToday === 0 && !input.hasLeader) {
    return "INACTIVE_NO_LEADERSHIP";
  }
  if (
    input.operationalRisk === "CRITICAL" ||
    input.fieldHeat === "BLOCKED" ||
    input.fieldHeat === "OVERLOADED" ||
    input.healthScore < 45 ||
    (input.missionCountToday > 0 && !input.hasLeader)
  ) {
    return "NEEDS_IMMEDIATE_ATTENTION";
  }
  if (
    input.healthScore >= 70 &&
    input.hasLeader &&
    input.missionCountToday > 0 &&
    (input.fieldHeat === "READY" || input.fieldHeat == null)
  ) {
    return "READY_FOR_EXPANSION";
  }
  if (input.missionCountToday > 0 && input.healthScore >= 50) {
    return "HEALTHY_OPERATIONS";
  }
  if (input.missionCountToday === 0) {
    return "INACTIVE_NO_LEADERSHIP";
  }
  return "NEEDS_IMMEDIATE_ATTENTION";
}

function deriveRisk(input: {
  fieldHeat: FieldHeat | null;
  healthScore: number;
  openNeeds: number;
  hasLeader: boolean;
  missionCount: number;
}): CountyCommandNode["operationalRisk"] {
  if (input.fieldHeat === "BLOCKED" || (!input.hasLeader && input.missionCount > 0)) {
    return "CRITICAL";
  }
  if (input.fieldHeat === "OVERLOADED" || input.healthScore < 40) return "HIGH";
  if (input.fieldHeat === "BUSY" || input.openNeeds > 0 || input.healthScore < 55) {
    return "WATCH";
  }
  if (input.missionCount === 0) return "UNKNOWN";
  return "LOW";
}

function missionRef(m: CountyMissionInput): CountyMissionRef {
  return {
    missionId: m.mission.missionId,
    title: m.mission.title,
    whenLabel: m.mission.whenLabel,
    href: `/calendar?event=${m.mission.missionId}`,
    status: m.mission.missionStatus,
  };
}

function volunteerCapacityForCounty(
  countyName: string,
  volunteerFeed: VolunteerCountyCapacity[] | null | undefined,
): CountyCommandNode["volunteerCapacity"] {
  const fact = countyVolunteerFact(volunteerFeed, countyName);
  if (!fact) {
    return {
      status: "unknown",
      value: null,
      reason:
        "Volunteer capacity is Unknown because Volunteer Operations has not provided a county feed for this node.",
      note: "Unknown — not zero.",
    };
  }
  return {
    ...fact.volunteerCapacity,
    note:
      fact.volunteerCapacity.status === "known"
        ? fact.volunteerCapacity.note
        : fact.volunteerCapacity.reason,
    openRoles: fact.openRoles.value,
    coveragePercent: fact.coverage.percent,
    leadershipDepth: fact.leadershipDepth,
    benchStrengthReason: fact.benchStrength.reason,
  };
}

function communicationsForCounty(
  countyName: string,
  feed: CommunicationsCountyRow[] | null | undefined,
): CountyCommandNode["communications"] {
  const fact = countyCommunicationsFact(feed, countyName);
  if (!fact) return null;
  return {
    pendingAnnouncements: fact.pendingAnnouncements.value,
    supportNeeds: fact.communicationsSupportNeeds.value,
    localMediaActivity: fact.localMediaActivity,
    localMessagingPackages: "UNKNOWN",
    messagingRisk: fact.messagingRisk,
  };
}

function logisticsForCounty(
  countyName: string,
  feed: LogisticsCountyRow[] | null | undefined,
): CountyCommandNode["logistics"] {
  const fact = countyLogisticsFact(feed, countyName);
  if (!fact) return null;
  return {
    venueReadiness: fact.venueReadiness,
    transportationReadiness: fact.transportationReadiness,
    materialAvailability: fact.materialAvailability,
    resourceInventory: "UNKNOWN",
    localLogisticsCoordinator: "UNKNOWN",
    logisticsRisk: fact.logisticsRisk,
  };
}

export function buildCountyCommandNode(input: {
  countyName: string;
  missions: CountyMissionInput[];
  fieldHeat: FieldHeat | null;
  fieldHelp: Array<{ detail: string; severity: string }>;
  volunteerFeed?: VolunteerCountyCapacity[] | null;
  communicationsFeed?: CommunicationsCountyRow[] | null;
  logisticsFeed?: LogisticsCountyRow[] | null;
  now: Date;
}): CountyCommandNode {
  const { countyName, missions, fieldHeat, fieldHelp, now } = input;
  const leaderLabel = leaderFromMissions(missions);
  const hasLeader = leaderLabel !== "Unassigned";
  const readinessPercent = avgReadiness(missions);
  const readinessLabel = readinessLabelFor(missions, readinessPercent);
  const upcoming = missions
    .filter((m) => new Date(m.mission.endsAt).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        new Date(a.mission.startsAt).getTime() - new Date(b.mission.startsAt).getTime(),
    );
  const openNeeds = collectOpenNeeds(missions, fieldHelp);
  const checkedIn = checkedInCount(missions);
  const { score, factors, explanation } = scoreCountyHealth({
    hasLeader,
    upcomingCount: upcoming.length,
    missionCountToday: missions.length,
    openNeedsCount: openNeeds.length,
    readinessPercent,
    checkedIn,
    fieldHeat,
  });
  const operationalRisk = deriveRisk({
    fieldHeat,
    healthScore: score,
    openNeeds: openNeeds.length,
    hasLeader,
    missionCount: missions.length,
  });
  const group = deriveCountyGroup({
    missionCountToday: missions.length,
    hasLeader,
    healthScore: score,
    fieldHeat,
    operationalRisk,
  });

  let recentActivity = "No missions in today’s permissioned view";
  if (missions.length > 0) {
    const latest = [...missions].sort(
      (a, b) =>
        new Date(b.mission.startsAt).getTime() - new Date(a.mission.startsAt).getTime(),
    )[0];
    recentActivity = `${latest.mission.title} · ${latest.mission.whenLabel}`;
  }

  const slug = countySlug(countyName);
  return {
    countyName,
    slug,
    group,
    statusLabel: COUNTY_GROUP_LABELS[group],
    leaderLabel,
    readinessLabel,
    readinessPercent,
    upcomingMissions: upcoming.map(missionRef),
    upcomingCount: upcoming.length,
    volunteerCapacity: volunteerCapacityForCounty(countyName, input.volunteerFeed),
    openNeeds,
    recentActivity,
    operationalRisk,
    healthScore: score,
    healthFactors: factors,
    healthExplanation: explanation,
    fieldHeat,
    missionCountToday: missions.length,
    href: `/counties/${slug}`,
    communications: communicationsForCounty(countyName, input.communicationsFeed),
    logistics: logisticsForCounty(countyName, input.logisticsFeed),
  };
}

const GROUP_ORDER: CountyOperationalGroup[] = [
  "NEEDS_IMMEDIATE_ATTENTION",
  "READY_FOR_EXPANSION",
  "HEALTHY_OPERATIONS",
  "INACTIVE_NO_LEADERSHIP",
];

export function buildCountyOperationsHome(input: {
  date: string;
  timezone: string;
  missions: CountyMissionInput[];
  fieldHeat: OperationalHeatRow[];
  fieldHelp?: Array<{ countyLabel: string; detail: string; severity: string }>;
  volunteerFeed?: VolunteerCountyCapacity[] | null;
  communicationsFeed?: CommunicationsCountyRow[] | null;
  logisticsFeed?: LogisticsCountyRow[] | null;
  countyNames?: readonly string[];
  now?: Date;
}): CountyOperationsHome {
  const now = input.now ?? new Date();
  const names = input.countyNames ?? ARKANSAS_COUNTIES;
  const byCounty = new Map<string, CountyMissionInput[]>();

  for (const m of input.missions) {
    const name = normalizeCountyName(m.countyName);
    if (!name) continue;
    const list = byCounty.get(name) ?? [];
    list.push({ ...m, countyName: name });
    byCounty.set(name, list);
  }

  const heatByCounty = new Map(
    input.fieldHeat.map((h) => [normalizeCountyName(h.countyName) ?? h.countyName, h.heat]),
  );
  const helpByCounty = new Map<string, Array<{ detail: string; severity: string }>>();
  for (const item of input.fieldHelp ?? []) {
    const key = normalizeCountyName(item.countyLabel) ?? item.countyLabel;
    const list = helpByCounty.get(key) ?? [];
    list.push({ detail: item.detail, severity: item.severity });
    helpByCounty.set(key, list);
  }

  const nodes = names.map((countyName) =>
    buildCountyCommandNode({
      countyName,
      missions: byCounty.get(countyName) ?? [],
      fieldHeat: heatByCounty.get(countyName) ?? null,
      fieldHelp: helpByCounty.get(countyName) ?? [],
      volunteerFeed: input.volunteerFeed,
      communicationsFeed: input.communicationsFeed,
      logisticsFeed: input.logisticsFeed,
      now,
    }),
  );

  const groupCounts: Record<CountyOperationalGroup, number> = {
    NEEDS_IMMEDIATE_ATTENTION: 0,
    READY_FOR_EXPANSION: 0,
    HEALTHY_OPERATIONS: 0,
    INACTIVE_NO_LEADERSHIP: 0,
  };
  for (const n of nodes) groupCounts[n.group] += 1;

  const groups = GROUP_ORDER.map((group) => ({
    group,
    label: COUNTY_GROUP_LABELS[group],
    counties: nodes
      .filter((n) => n.group === group)
      .sort((a, b) => a.healthScore - b.healthScore || a.countyName.localeCompare(b.countyName)),
  }));

  const weakest = [...nodes]
    .filter((n) => n.group === "NEEDS_IMMEDIATE_ATTENTION" || n.missionCountToday > 0)
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 8);

  const topWeak = weakest.slice(0, 5).map((n) => ({
    countyName: n.countyName,
    healthScore: n.healthScore,
    reason: n.healthExplanation,
    href: n.href,
  }));

  const briefingParts: string[] = [];
  if (groupCounts.NEEDS_IMMEDIATE_ATTENTION > 0) {
    briefingParts.push(
      `${groupCounts.NEEDS_IMMEDIATE_ATTENTION} count${
        groupCounts.NEEDS_IMMEDIATE_ATTENTION === 1 ? "y" : "ies"
      } need immediate attention.`,
    );
  }
  if (groupCounts.INACTIVE_NO_LEADERSHIP > 0) {
    briefingParts.push(
      `${groupCounts.INACTIVE_NO_LEADERSHIP} inactive / no leadership.`,
    );
  }
  if (groupCounts.READY_FOR_EXPANSION > 0) {
    briefingParts.push(
      `${groupCounts.READY_FOR_EXPANSION} ready for expansion.`,
    );
  }
  if (briefingParts.length === 0) {
    briefingParts.push("County operations show no immediate statewide weakness flags.");
  }

  return {
    title: "COUNTY OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    totalCounties: names.length,
    groupCounts,
    groups,
    weakest,
    executiveFeed: {
      needsImmediate: groupCounts.NEEDS_IMMEDIATE_ATTENTION,
      inactiveNoLeadership: groupCounts.INACTIVE_NO_LEADERSHIP,
      readyForExpansion: groupCounts.READY_FOR_EXPANSION,
      healthy: groupCounts.HEALTHY_OPERATIONS,
      topWeak,
      briefingLine: briefingParts.join(" "),
    },
  };
}

export function findCountyNode(
  home: CountyOperationsHome,
  slug: string,
): CountyCommandNode | null {
  for (const g of home.groups) {
    const hit = g.counties.find((c) => c.slug === slug);
    if (hit) return hit;
  }
  return null;
}

export function countyOperationsForAdvisory(home: CountyOperationsHome) {
  return {
    date: home.date,
    totalCounties: home.totalCounties,
    groupCounts: home.groupCounts,
    weakest: home.weakest.slice(0, 8).map((c) => ({
      county: c.countyName,
      health: c.healthScore,
      group: c.group,
      risk: c.operationalRisk,
      needs: c.openNeeds,
      explanation: c.healthExplanation,
    })),
    executiveFeed: home.executiveFeed,
  };
}
