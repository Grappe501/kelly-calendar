/**
 * Step 6.6 — Deterministic Campaign Brief (pure aggregation).
 * Source of truth for leadership scan; AI may only summarize this later.
 */

import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { TodayReadinessSummary } from "@/lib/missions/today-readiness";

export type CampaignBriefMissionProgress = {
  total: number;
  completed: number;
  remaining: number;
  inProgress: number;
  needsAttention: number;
};

export type CampaignBriefNextMission = {
  missionId: string;
  title: string;
  whenLabel: string;
  whereLabel: string;
  statusLabel: string;
  missionStatus: string;
  href: string;
};

export type CampaignBriefReadinessRollup = {
  ready: number;
  needsAttention: number;
  blocked: number;
  unknown: number;
};

export type CampaignBriefBlocker = {
  message: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  href: string | null;
  missionId: string | null;
} | null;

export type CampaignBriefTravel = {
  missionsWithTravel: number;
  knownDriveMinutes: number | null;
  knownDriveMinutesPartial: boolean;
  nextMissionDriveMinutes: number | null;
};

export type CampaignBriefPeople = {
  staffingGapMissions: number;
  unassignedRoles: number;
  detail: string | null;
};

export type CampaignBriefConflicts = {
  unresolvedCount: number;
  criticalCount: number;
  topConflict: {
    explanation: string;
    severity: string;
    href: string | null;
  } | null;
};

export type CampaignBriefCounties = {
  names: string[];
  unknownCountyMissions: number;
};

export type CampaignBriefFollowUp = {
  outstandingCount: number;
  detail: string | null;
  href: string | null;
};

export type CampaignBriefRequiredAction = {
  label: string;
  href: string;
  missionId: string | null;
} | null;

export type CampaignBriefDataCompleteness =
  | "complete"
  | "partial"
  | "empty_day";

export type CampaignBrief = {
  title: "TODAY’S CAMPAIGN BRIEF";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  completeness: CampaignBriefDataCompleteness;
  missions: CampaignBriefMissionProgress;
  nextMission: CampaignBriefNextMission | null;
  readiness: CampaignBriefReadinessRollup;
  topBlocker: CampaignBriefBlocker;
  requiredAction: CampaignBriefRequiredAction;
  travel: CampaignBriefTravel;
  people: CampaignBriefPeople;
  conflicts: CampaignBriefConflicts;
  counties: CampaignBriefCounties;
  followUp: CampaignBriefFollowUp;
};

export type CampaignBriefBuildInput = {
  date: string;
  timezone: string;
  now?: Date;
  allMissionsToday: MissionCard[];
  nextMission: MissionCard | null;
  todayReadiness: TodayReadinessSummary;
  conflicts: OperationalConflict[];
  countiesByMission: Array<{
    missionId: string;
    countyName: string | null;
  }>;
  staffingByMission: Array<{
    missionId: string;
    staffAssignedCount: number;
    staffRequiredCount: number;
  }>;
};

function severityRank(severity: string): number {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "WARNING":
      return 2;
    default:
      return 3;
  }
}

/**
 * Pure deterministic Campaign Brief builder.
 */
export function buildCampaignBrief(input: CampaignBriefBuildInput): CampaignBrief {
  const now = input.now ?? new Date();
  const missions = input.allMissionsToday;
  const completed = missions.filter((m) => m.missionStatus === "COMPLETE").length;
  const inProgress = missions.filter(
    (m) => m.missionStatus === "IN_PROGRESS",
  ).length;
  const needsAttention = missions.filter(
    (m) => m.missionStatus === "NEEDS_ATTENTION",
  ).length;
  const remaining = Math.max(0, missions.length - completed);

  const driveMinutes = missions
    .map((m) => m.timeline?.driveMinutes)
    .filter((n): n is number => typeof n === "number" && n >= 0);
  const travelRequiredCount = missions.filter(
    (m) => typeof m.timeline?.driveMinutes === "number" && m.timeline.driveMinutes > 0,
  ).length;

  const staffingGaps = input.staffingByMission.filter(
    (s) => s.staffRequiredCount > 0 && s.staffAssignedCount < s.staffRequiredCount,
  );
  const unassignedRoles = staffingGaps.reduce(
    (sum, s) => sum + (s.staffRequiredCount - s.staffAssignedCount),
    0,
  );

  const peopleFromReadiness = input.todayReadiness.missions.filter((m) => {
    const people = m.categories.find((c) => c.category === "People");
    return people?.state === "BLOCKED" || people?.state === "NEEDS_ATTENTION";
  });

  const followUpMissions = input.todayReadiness.missions.filter((m) => {
    const follow = m.categories.find((c) => c.category === "Follow-up");
    return (
      follow?.state === "BLOCKED" ||
      follow?.state === "NEEDS_ATTENTION" ||
      follow?.state === "UNKNOWN"
    );
  });

  const countyNames = [
    ...new Set(
      input.countiesByMission
        .map((c) => c.countyName?.trim())
        .filter((n): n is string => Boolean(n)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const unknownCountyMissions = input.countiesByMission.filter(
    (c) => !c.countyName?.trim(),
  ).length;

  const unresolved = [...input.conflicts].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
  const criticalCount = unresolved.filter(
    (c) => c.severity === "CRITICAL" || c.severity === "HIGH",
  ).length;
  const topConflict = unresolved[0]
    ? {
        explanation: unresolved[0].explanation,
        severity: unresolved[0].severity,
        href: unresolved[0].primaryEntity?.id
          ? `/calendar?event=${unresolved[0].primaryEntity.id}`
          : null,
      }
    : null;

  const readinessBlocker: CampaignBriefBlocker =
    input.todayReadiness.blockedCount > 0 || input.todayReadiness.topIssue
      ? {
          message:
            input.todayReadiness.topIssue ||
            `${input.todayReadiness.blockedCount} mission(s) blocked`,
          priority:
            input.todayReadiness.blockedCount > 0 ? "CRITICAL" : "HIGH",
          href: input.todayReadiness.nextAction?.href ?? null,
          missionId: input.todayReadiness.nextAction?.missionId ?? null,
        }
      : null;

  const conflictBlocker: CampaignBriefBlocker =
    topConflict && (topConflict.severity === "CRITICAL" || topConflict.severity === "HIGH")
      ? {
          message: topConflict.explanation,
          priority: topConflict.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          href: topConflict.href,
          missionId: unresolved[0]?.primaryEntity?.id ?? null,
        }
      : null;

  const topBlocker =
    conflictBlocker &&
    (!readinessBlocker ||
      severityRank(conflictBlocker.priority) <=
        severityRank(readinessBlocker.priority))
      ? conflictBlocker
      : readinessBlocker;

  const next = input.nextMission;
  const requiredAction: CampaignBriefRequiredAction =
    input.todayReadiness.nextAction
      ? {
          label: input.todayReadiness.nextAction.label,
          href: input.todayReadiness.nextAction.href,
          missionId: input.todayReadiness.nextAction.missionId,
        }
      : next
        ? {
            label: next.immediateAction.label,
            href: next.immediateAction.href,
            missionId: next.missionId,
          }
        : null;

  let completeness: CampaignBriefDataCompleteness = "complete";
  if (missions.length === 0) completeness = "empty_day";
  else if (
    input.todayReadiness.unknownCount > 0 ||
    unknownCountyMissions > 0 ||
    driveMinutes.length < travelRequiredCount
  ) {
    completeness = "partial";
  }

  return {
    title: "TODAY’S CAMPAIGN BRIEF",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    completeness,
    missions: {
      total: missions.length,
      completed,
      remaining,
      inProgress,
      needsAttention,
    },
    nextMission: next
      ? {
          missionId: next.missionId,
          title: next.title,
          whenLabel: next.whenLabel,
          whereLabel: next.whereLabel,
          statusLabel: next.missionStatusPresentation.label,
          missionStatus: next.missionStatus,
          href: `/calendar?event=${next.missionId}`,
        }
      : null,
    readiness: {
      ready: input.todayReadiness.readyCount,
      needsAttention: input.todayReadiness.needsAttentionCount,
      blocked: input.todayReadiness.blockedCount,
      unknown: input.todayReadiness.unknownCount,
    },
    topBlocker,
    requiredAction,
    travel: {
      missionsWithTravel: travelRequiredCount,
      knownDriveMinutes:
        driveMinutes.length > 0
          ? driveMinutes.reduce((a, b) => a + b, 0)
          : null,
      knownDriveMinutesPartial:
        travelRequiredCount > 0 && driveMinutes.length < travelRequiredCount,
      nextMissionDriveMinutes: next?.timeline?.driveMinutes ?? null,
    },
    people: {
      staffingGapMissions: Math.max(staffingGaps.length, peopleFromReadiness.length),
      unassignedRoles,
      detail:
        staffingGaps.length > 0 || peopleFromReadiness.length > 0
          ? `${Math.max(staffingGaps.length, peopleFromReadiness.length)} mission(s) need staffing attention`
          : null,
    },
    conflicts: {
      unresolvedCount: unresolved.length,
      criticalCount,
      topConflict,
    },
    counties: {
      names: countyNames,
      unknownCountyMissions,
    },
    followUp: {
      outstandingCount: followUpMissions.length,
      detail:
        followUpMissions.length > 0
          ? `${followUpMissions.length} mission(s) have follow-up work outstanding or unknown`
          : null,
      href: followUpMissions[0]
        ? `/calendar?event=${followUpMissions[0].missionId}`
        : null,
    },
  };
}

export type CampaignBriefAdvisory = {
  status: "advisory" | "unavailable" | "skipped";
  label: "Advisory AI summary";
  text: string | null;
  uncertaintyNote: string | null;
  provider: "openai" | null;
};

/** Safe payload for optional AI advisory — no protected fields. */
export function campaignBriefForAdvisory(brief: CampaignBrief) {
  return {
    date: brief.date,
    timezone: brief.timezone,
    completeness: brief.completeness,
    missions: brief.missions,
    nextMission: brief.nextMission
      ? {
          title: brief.nextMission.title,
          whenLabel: brief.nextMission.whenLabel,
          whereLabel: brief.nextMission.whereLabel,
          statusLabel: brief.nextMission.statusLabel,
        }
      : null,
    readiness: brief.readiness,
    topBlocker: brief.topBlocker
      ? { message: brief.topBlocker.message, priority: brief.topBlocker.priority }
      : null,
    requiredAction: brief.requiredAction
      ? { label: brief.requiredAction.label }
      : null,
    travel: brief.travel,
    people: {
      staffingGapMissions: brief.people.staffingGapMissions,
      unassignedRoles: brief.people.unassignedRoles,
      detail: brief.people.detail,
    },
    conflicts: {
      unresolvedCount: brief.conflicts.unresolvedCount,
      criticalCount: brief.conflicts.criticalCount,
      top: brief.conflicts.topConflict?.explanation ?? null,
    },
    counties: brief.counties.names,
    followUp: brief.followUp.detail,
  };
}
