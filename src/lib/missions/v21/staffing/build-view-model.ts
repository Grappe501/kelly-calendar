import {
  addDaysToDateKey,
  classifyBriefingDay,
  formatCampaignTime,
  formatFullCampaignDate,
} from "@/lib/missions/v21/day-briefing/briefing-date";
import {
  labelStaffingPlanStatus,
  labelStaffingReadiness,
} from "@/lib/missions/v21/staffing/labels";
import type {
  MissionStaffingPlanStatus,
  RequirementCoverage,
} from "@/lib/missions/v21/staffing/types";

export type DayStaffingBoardMissionRow = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isCancelled: boolean;
  isFirst: boolean;
  isPrimary: boolean;
  planStatus: MissionStaffingPlanStatus | null;
  staffingRequired: boolean;
  isStale: boolean;
  coverage: RequirementCoverage[];
  findingCounts: {
    blockers: number;
    warnings: number;
  };
  readiness: "NOT_ASSESSED" | "READY" | "READY_WITH_RISK" | "BLOCKED";
  href: string;
  whenLabel: string;
  planStatusLabel: string | null;
  readinessLabel: string;
  totalGap: number;
  staffingHref: string;
  fieldOpsHref: string;
  executeHref: string;
};

export type DayStaffingBoardView = {
  campaignDateKey: string;
  campaignTimezone: string;
  firstMissionId: string | null;
  primaryMissionId: string | null;
  dateLabel: string;
  generatedAt: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  summary: {
    missionCount: number;
    withPlanCount: number;
    withoutPlanCount: number;
    blockerCount: number;
    warningCount: number;
    firstMissionTitle: string | null;
    primaryMissionTitle: string | null;
    totalGapCount: number;
  };
  navigation: {
    todayHref: string;
    briefingHref: string;
    launchHref: string;
    logisticsHref: string;
    movementHref: string;
    fieldOpsHref: string;
    closeoutHref: string;
    commandCenterHref: string;
    reportHref: string;
    previousHref: string;
    nextHref: string;
  };
  missions: DayStaffingBoardMissionRow[];
  isolation: ReturnType<
    typeof import("@/lib/missions/v21/staffing/labels").assertStaffingIsolation
  >;
  createdPlans: number;
};

type BoardInput = {
  campaignDateKey: string;
  campaignTimezone: string;
  firstMissionId: string | null;
  primaryMissionId: string | null;
  missions: Array<
    Omit<
      DayStaffingBoardMissionRow,
      | "whenLabel"
      | "planStatusLabel"
      | "readinessLabel"
      | "totalGap"
      | "staffingHref"
      | "fieldOpsHref"
      | "executeHref"
    >
  >;
  isolation: DayStaffingBoardView["isolation"];
  createdPlans: number;
};

function totalGap(coverage: RequirementCoverage[]): number {
  return coverage.reduce((n, row) => n + row.remainingMinimumGap, 0);
}

export function buildDayStaffingBoardView(
  board: BoardInput,
  now: Date,
): DayStaffingBoardView {
  const dateKey = board.campaignDateKey;
  const tz = board.campaignTimezone;
  const day = classifyBriefingDay(dateKey, now, tz);
  const prev = addDaysToDateKey(dateKey, -1);
  const next = addDaysToDateKey(dateKey, 1);

  const missions: DayStaffingBoardMissionRow[] = board.missions.map((m) => ({
    ...m,
    whenLabel: `${formatCampaignTime(m.startsAt, tz, { includeDate: false })} – ${formatCampaignTime(m.endsAt, tz)}`,
    planStatusLabel: m.planStatus ? labelStaffingPlanStatus(m.planStatus) : null,
    readinessLabel: labelStaffingReadiness(m.readiness),
    totalGap: totalGap(m.coverage),
    staffingHref: `/system/missions/${m.missionId}/staffing?date=${dateKey}`,
    fieldOpsHref: `/system/missions/${m.missionId}/field-ops`,
    executeHref: `/system/missions/${m.missionId}/execute`,
  }));

  return {
    campaignDateKey: dateKey,
    campaignTimezone: tz,
    firstMissionId: board.firstMissionId,
    primaryMissionId: board.primaryMissionId,
    isolation: board.isolation,
    createdPlans: board.createdPlans,
    dateLabel: formatFullCampaignDate(dateKey, tz),
    generatedAt: now.toISOString(),
    ...day,
    summary: {
      missionCount: missions.length,
      withPlanCount: missions.filter((m) => m.planStatus).length,
      withoutPlanCount: missions.filter((m) => !m.planStatus).length,
      blockerCount: missions.reduce((n, m) => n + m.findingCounts.blockers, 0),
      warningCount: missions.reduce((n, m) => n + m.findingCounts.warnings, 0),
      firstMissionTitle: missions.find((m) => m.isFirst)?.title ?? null,
      primaryMissionTitle: missions.find((m) => m.isPrimary)?.title ?? null,
      totalGapCount: missions.reduce((n, m) => n + m.totalGap, 0),
    },
    navigation: {
      todayHref: "/system/briefing/staffing",
      briefingHref: `/system/briefing/${dateKey}`,
      launchHref: `/system/briefing/${dateKey}/launch`,
      logisticsHref: `/system/briefing/${dateKey}/logistics`,
      movementHref: `/system/briefing/${dateKey}/movement`,
      fieldOpsHref: `/system/briefing/${dateKey}/field-ops`,
      closeoutHref: `/system/briefing/${dateKey}/closeout`,
      commandCenterHref: "/system/missions/command-center",
      reportHref: `/system/briefing/${dateKey}/staffing/report`,
      previousHref: `/system/briefing/${prev}/staffing`,
      nextHref: `/system/briefing/${next}/staffing`,
    },
    missions,
  };
}
