import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import {
  DEFAULT_DAY_CLOSEOUT_CONFIG,
  type CampaignDayCloseoutConfig,
} from "@/lib/missions/v21/day-closeout/closeout-config";
import {
  addDaysToDateKey,
  classifyCloseoutDay,
  closeoutDayHeading,
  formatCampaignTime,
  formatFullCampaignDate,
} from "@/lib/missions/v21/day-closeout/closeout-date";
import {
  buildCarryForwardSuggestions,
  classifyMissionDayReview,
} from "@/lib/missions/v21/day-closeout/carry-forward-rules";
import {
  buildDayCloseoutChecklist,
  collectReviewBlockers,
  collectSignoffBlockers,
} from "@/lib/missions/v21/day-closeout/checklist-builder";
import {
  labelCarryForwardSource,
  labelCarryForwardStatus,
  labelCloseoutStatus,
  labelMissionClassification,
  labelTodayAssessment,
  labelTomorrowReadiness,
} from "@/lib/missions/v21/day-closeout/labels";
import {
  buildTomorrowMissionItem,
  deriveTomorrowReadiness,
  detectTomorrowConflicts,
} from "@/lib/missions/v21/day-closeout/tomorrow-readiness";
import type {
  CampaignDayCloseoutActionItem,
  CampaignDayCloseoutPersisted,
  CampaignDayCloseoutViewModel,
  CampaignDayCommitmentReviewItem,
  CampaignDayDebriefReviewItem,
  EmptyCloseoutState,
} from "@/lib/missions/v21/day-closeout/types";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { formatRelativeAge } from "@/lib/missions/v21/command-center/time-windows";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";
import { labelFollowUpActionStatus } from "@/lib/missions/v21/follow-up/labels";

const OPEN = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

function isDueOnDateKey(dueAt: string, dateKey: string, timeZone: string): boolean {
  return campaignDateKey(new Date(dueAt), timeZone) === dateKey;
}

function isDueBeforeDateKey(
  dueAt: string,
  dateKey: string,
  timeZone: string,
): boolean {
  return campaignDateKey(new Date(dueAt), timeZone) < dateKey;
}

function emptyCloseout(dateKey: string): EmptyCloseoutState {
  return {
    id: null,
    campaignDateKey: dateKey,
    status: "NOT_STARTED",
    todayAssessment: "NOT_ASSESSED",
    tomorrowReadiness: "NOT_ASSESSED",
    closeoutSummary: null,
    carryForwardSummary: null,
    tomorrowSummary: null,
    internalNotes: null,
    startedAt: null,
    reviewedAt: null,
    signedOffAt: null,
    startedByUserId: null,
    reviewedByUserId: null,
    signedOffByUserId: null,
    updatedAt: null,
    carryForwardItems: [],
  };
}

function ownerLabel(a: {
  ownerType: string;
  ownerName: string | null;
}): string {
  if (a.ownerType === "UNASSIGNED" || !a.ownerName) return "Owner needed";
  return a.ownerName;
}

function missionHref(
  missionId: string,
  phase: DayBriefingMissionSnapshot["lifecyclePhase"],
): { label: string; href: string } {
  const action = primaryActionForPhase(missionId, phase);
  return {
    label: action.label,
    href: action.href,
  };
}

export function buildCampaignDayCloseoutViewModel(input: {
  campaignDate: string;
  now: Date;
  campaignTimezone: string;
  dayMissions: DayBriefingMissionSnapshot[];
  tomorrowMissions: DayBriefingMissionSnapshot[];
  operationalMissions: DayBriefingMissionSnapshot[];
  closeout: CampaignDayCloseoutPersisted | null;
  config?: CampaignDayCloseoutConfig;
}): CampaignDayCloseoutViewModel {
  const config = input.config ?? DEFAULT_DAY_CLOSEOUT_CONFIG;
  const tz = input.campaignTimezone;
  const dateKey = input.campaignDate;
  const { isToday, isPast } = classifyCloseoutDay(dateKey, input.now, tz);
  const closeout = input.closeout ?? emptyCloseout(dateKey);
  const tomorrowKey = addDaysToDateKey(dateKey, 1);

  const dayMissions = [...input.dayMissions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );
  const tomorrowMissions = [...input.tomorrowMissions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );

  const activeExecutions = dayMissions
    .filter(
      (m) =>
        m.execution.status === "ARRIVED" ||
        m.execution.status === "IN_PROGRESS",
    )
    .map((m) => ({
      missionId: m.missionId,
      title: m.title,
      scheduledEndLabel: formatCampaignTime(m.endsAt, tz, { includeDate: true }),
      arrivedAtLabel: m.execution.arrivedAt
        ? formatCampaignTime(m.execution.arrivedAt, tz)
        : null,
      startedAtLabel: m.execution.startedAt
        ? formatCampaignTime(m.execution.startedAt, tz)
        : null,
      executionStatus: m.execution.status ?? "NOT_STARTED",
      timeSinceScheduledEnd:
        new Date(m.endsAt).getTime() < input.now.getTime()
          ? formatRelativeAge(m.endsAt, input.now)
          : null,
      href: `/system/missions/${m.missionId}/execute`,
    }));

  const completedExecutions = dayMissions.filter(
    (m) => m.execution.status === "COMPLETED",
  ).length;

  const debriefReview: CampaignDayDebriefReviewItem[] = dayMissions
    .filter(
      (m) =>
        m.execution.status === "COMPLETED" ||
        m.debrief.exists ||
        m.lifecyclePhase === "DEBRIEF",
    )
    .map((m) => {
      const group =
        m.debrief.status === "APPROVED"
          ? ("APPROVED" as const)
          : m.debrief.status === "COMPLETED"
            ? ("AWAITING_APPROVAL" as const)
            : m.debrief.status === "IN_PROGRESS"
              ? ("IN_PROGRESS" as const)
              : ("NOT_STARTED" as const);
      return {
        missionId: m.missionId,
        title: m.title,
        executionEndedLabel: m.execution.endedAt
          ? formatCampaignTime(m.execution.endedAt, tz)
          : null,
        debriefStatus: m.debrief.status ?? "NOT_STARTED",
        timeSinceExecutionEnded: m.execution.endedAt
          ? formatRelativeAge(m.execution.endedAt, input.now)
          : null,
        outcomeAssessment: m.debrief.outcomeAssessment,
        approvedFollowUpCount: m.followUp.actions.length,
        primaryActionLabel:
          group === "APPROVED"
            ? "Open Follow-up"
            : group === "AWAITING_APPROVAL"
              ? "Review Debrief"
              : group === "IN_PROGRESS"
                ? "Continue Debrief"
                : "Start Debrief",
        href: `/system/missions/${m.missionId}/debrief`,
        group,
      };
    });

  const debriefNotStarted = debriefReview.filter(
    (d) => d.group === "NOT_STARTED",
  ).length;
  const debriefInProgress = debriefReview.filter(
    (d) => d.group === "IN_PROGRESS",
  ).length;
  const debriefAwaitingApproval = debriefReview.filter(
    (d) => d.group === "AWAITING_APPROVAL",
  ).length;

  const commitments: CampaignDayCommitmentReviewItem[] = [];
  const immediateFollowUps: CampaignDayCloseoutViewModel["immediateFollowUps"] =
    [];
  const dueToday: CampaignDayCloseoutActionItem[] = [];
  const overdue: CampaignDayCloseoutActionItem[] = [];

  const actionPool = [
    ...dayMissions,
    ...input.operationalMissions.filter(
      (m) => !dayMissions.some((d) => d.missionId === m.missionId),
    ),
  ];

  for (const m of actionPool) {
    for (const a of m.followUp.actions) {
      if (a.sourceType === "EXECUTE_COMMITMENT") {
        const flags: string[] = [];
        if (a.ownerType === "UNASSIGNED") flags.push("Unassigned");
        if (a.status === "BLOCKED") flags.push("Blocked");
        if (
          a.dueAt &&
          isDueBeforeDateKey(a.dueAt, dateKey, tz)
        ) {
          flags.push("Overdue");
        }
        commitments.push({
          id: a.id,
          title: a.title,
          missionId: m.missionId,
          missionTitle: m.title,
          ownerLabel: ownerLabel(a),
          dueLabel: a.dueAt
            ? formatCampaignTime(a.dueAt, tz, { includeDate: true })
            : null,
          status: a.status,
          priority: a.priority,
          flags,
          href: `/system/missions/${m.missionId}/follow-up`,
        });
      }
      if (a.sourceType === "EXECUTE_IMMEDIATE_FOLLOW_UP") {
        immediateFollowUps.push({
          id: a.id,
          title: a.title,
          missionId: m.missionId,
          missionTitle: m.title,
          priority: a.priority,
          ownerLabel: ownerLabel(a),
          dueLabel: a.dueAt
            ? formatCampaignTime(a.dueAt, tz, { includeDate: true })
            : null,
          status: a.status,
          flags: [],
          href: `/system/missions/${m.missionId}/follow-up`,
        });
      }

      const dueTodayMatch =
        (a.dueAt && isDueOnDateKey(a.dueAt, dateKey, tz)) ||
        (a.status === "WAITING" &&
          a.nextCheckAt &&
          isDueOnDateKey(a.nextCheckAt, dateKey, tz));
      const overdueMatch =
        a.dueAt &&
        OPEN.has(a.status) &&
        isDueBeforeDateKey(a.dueAt, dateKey, tz);

      if (dueTodayMatch || overdueMatch || a.status === "COMPLETED" || a.status === "CANCELLED") {
        if (dueTodayMatch || a.status === "COMPLETED" || a.status === "CANCELLED") {
          if (dueTodayMatch || (a.dueAt && isDueOnDateKey(a.dueAt, dateKey, tz))) {
            dueToday.push({
              id: a.id,
              title: a.title,
              missionId: m.missionId,
              missionTitle: m.title,
              ownerLabel: ownerLabel(a),
              dueLabel: a.dueAt
                ? formatCampaignTime(a.dueAt, tz, { includeDate: true })
                : a.nextCheckAt
                  ? formatCampaignTime(a.nextCheckAt, tz, { includeDate: true })
                  : "Due today",
              priority: a.priority,
              status: labelFollowUpActionStatus(a.status),
              statusBucket:
                a.status === "COMPLETED"
                  ? "COMPLETED"
                  : a.status === "CANCELLED"
                    ? "CANCELLED"
                    : "OPEN",
              href: `/system/missions/${m.missionId}/follow-up`,
              overdueByDays: null,
            });
          }
        }
        if (overdueMatch) {
          const days = Math.max(
            1,
            Math.floor(
              (input.now.getTime() - new Date(a.dueAt!).getTime()) /
                86_400_000,
            ),
          );
          overdue.push({
            id: a.id,
            title: a.title,
            missionId: m.missionId,
            missionTitle: m.title,
            ownerLabel: ownerLabel(a),
            dueLabel: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
            priority: a.priority,
            status: labelFollowUpActionStatus(a.status),
            statusBucket: "OPEN",
            href: `/system/missions/${m.missionId}/follow-up`,
            overdueByDays: days,
          });
        }
      }
    }
  }

  overdue.sort((a, b) => {
    const rank = (p: string | null) =>
      p === "URGENT" ? 0 : p === "IMPORTANT" ? 1 : 2;
    return (
      rank(a.priority) - rank(b.priority) ||
      (b.overdueByDays ?? 0) - (a.overdueByDays ?? 0) ||
      a.id.localeCompare(b.id)
    );
  });

  const leadershipDecisions: CampaignDayCloseoutViewModel["leadershipDecisions"] =
    [];
  for (const m of [...dayMissions, ...input.operationalMissions]) {
    if (m.debrief.status === "COMPLETED") {
      leadershipDecisions.push({
        id: `debrief-approve:${m.missionId}`,
        label: "Debrief awaiting approval",
        explanation: `${m.title} Debrief is completed and requires leadership approval.`,
        missionId: m.missionId,
        missionTitle: m.title,
        ageLabel: m.debrief.completedAt
          ? formatRelativeAge(m.debrief.completedAt, input.now)
          : null,
        requiredPermission: "Campaign leadership",
        href: `/system/missions/${m.missionId}/debrief`,
      });
    }
    if (m.followUp.status === "READY_TO_CLOSE") {
      leadershipDecisions.push({
        id: `closeout:${m.missionId}`,
        label: "Mission ready for closeout",
        explanation: `${m.title} Follow-up is ready for closeout review.`,
        missionId: m.missionId,
        missionTitle: m.title,
        ageLabel: null,
        requiredPermission: "Campaign leadership",
        href: `/system/missions/${m.missionId}/follow-up`,
      });
    }
  }

  const suggestedCarryForward = buildCarryForwardSuggestions({
    dayMissions,
    tomorrowMissions,
    existing: closeout.carryForwardItems,
  });

  const tomorrowConflicts = detectTomorrowConflicts(tomorrowMissions);
  const derivedTomorrowReadiness = deriveTomorrowReadiness({
    tomorrowMissions,
    conflicts: tomorrowConflicts,
    config,
  });
  const tomorrowItems = tomorrowMissions.map((m) =>
    buildTomorrowMissionItem(m, tz),
  );
  const tomorrowFirst = tomorrowItems[0] ?? null;

  const tomorrowDue: CampaignDayCloseoutActionItem[] = [];
  for (const m of tomorrowMissions) {
    for (const a of m.followUp.actions) {
      if (
        a.dueAt &&
        OPEN.has(a.status) &&
        isDueOnDateKey(a.dueAt, tomorrowKey, tz)
      ) {
        tomorrowDue.push({
          id: a.id,
          title: a.title,
          missionId: m.missionId,
          missionTitle: m.title,
          ownerLabel: ownerLabel(a),
          dueLabel: formatCampaignTime(a.dueAt, tz, { includeDate: true }),
          priority: a.priority,
          status: labelFollowUpActionStatus(a.status),
          statusBucket: "OPEN",
          href: `/system/missions/${m.missionId}/follow-up`,
          overdueByDays: null,
        });
      }
    }
  }

  const openDueToday = dueToday.filter((d) => d.statusBucket === "OPEN").length;
  const openCommitments = commitments.filter((c) =>
    OPEN.has(c.status),
  ).length;
  const blocked = commitments.filter((c) => c.status === "BLOCKED").length +
    actionPool
      .flatMap((m) => m.followUp.actions)
      .filter((a) => a.status === "BLOCKED").length;
  const unassigned = actionPool
    .flatMap((m) => m.followUp.actions)
    .filter((a) => OPEN.has(a.status) && a.ownerType === "UNASSIGNED").length;

  const todayMissionItems = dayMissions.map((m) => {
    const classification = classifyMissionDayReview(m);
    const action = missionHref(m.missionId, m.lifecyclePhase);
    return {
      missionId: m.missionId,
      title: m.title,
      whenLabel: m.isAllDay
        ? "All day"
        : formatCampaignTime(m.startsAt, tz),
      locationLabel: m.locationLabel,
      lifecyclePhase: m.lifecyclePhase,
      operationalStatus: m.operationalStatus,
      preparationReadiness: m.preparation.readiness,
      executionStatus: m.execution.status,
      debriefStatus: m.debrief.status,
      followUpStatus: m.followUp.status,
      classification,
      classificationLabel: labelMissionClassification(classification),
      primaryActionLabel: action.label,
      href: action.href,
    };
  });

  const checklist = buildDayCloseoutChecklist({
    dayMissions,
    activeExecutionCount: activeExecutions.length,
    debriefNotStarted,
    openDueToday,
    overdue: overdue.length,
    leadershipDecisions: leadershipDecisions.length,
    carryForwardOpen: closeout.carryForwardItems.filter(
      (i) => i.status === "OPEN",
    ).length,
    suggestedPending: suggestedCarryForward.filter((s) => !s.alreadyPresent)
      .length,
    tomorrowMissions,
    tomorrowConflicts: tomorrowConflicts.length,
    derivedTomorrowReadiness,
    closeout,
  });

  const urgentUnownedCarryForward = closeout.carryForwardItems.filter(
    (i) =>
      i.status === "OPEN" &&
      !i.ownerName &&
      !i.ownerUserId &&
      (i.sourceType === "ACTIVE_EXECUTION" ||
        i.sourceType === "COMMITMENT" ||
        i.sourceType === "UNASSIGNED_ACTION"),
  ).length;

  const reviewBlockers = collectReviewBlockers({
    config,
    activeExecutionCount: activeExecutions.length,
    closeout,
    tomorrowMissionCount: tomorrowMissions.length,
    urgentUnownedCarryForward,
    checklist,
  });
  const signoffBlockers = collectSignoffBlockers({
    config,
    closeout,
    reviewBlockers,
    derivedTomorrowReadiness,
  });

  const integrityWarnings: string[] = [];
  if (closeout.status === "SIGNED_OFF" && activeExecutions.length > 0) {
    integrityWarnings.push(
      "Signed-off day still shows active execution in current Mission records.",
    );
  }
  if (
    closeout.tomorrowReadiness === "READY" &&
    derivedTomorrowReadiness === "NOT_READY"
  ) {
    integrityWarnings.push(
      "Persisted tomorrow readiness is Ready, but current checks show Not ready.",
    );
  }
  for (const m of dayMissions) {
    if (m.execution.exists && m.isAllDay === false && m.startsAt > m.endsAt) {
      integrityWarnings.push(
        `Record review needed: ${m.title} ends before it starts.`,
      );
    }
  }

  const limits = config.sectionLimits;
  const prev = addDaysToDateKey(dateKey, -1);
  const next = isToday ? null : addDaysToDateKey(dateKey, 1);
  const earliest = addDaysToDateKey(
    classifyCloseoutDay(dateKey, input.now, tz).isToday
      ? dateKey
      : dateKey,
    0,
  );
  void earliest;

  return {
    campaignDate: dateKey,
    dateLabel: formatFullCampaignDate(dateKey, tz),
    closingHeading: closeoutDayHeading(dateKey, input.now, tz),
    timezone: tz,
    generatedAt: input.now.toISOString(),
    isToday,
    isPast,
    historicalNotice: isPast
      ? "Mission and Follow-up records may have changed since this day was signed off. Closeout notes and signoff metadata are preserved."
      : null,
    closeout: {
      exists: Boolean(input.closeout),
      id: closeout.id,
      status: closeout.status,
      statusLabel: labelCloseoutStatus(closeout.status),
      todayAssessment: closeout.todayAssessment,
      todayAssessmentLabel: labelTodayAssessment(closeout.todayAssessment),
      tomorrowReadiness: closeout.tomorrowReadiness,
      tomorrowReadinessLabel: labelTomorrowReadiness(
        closeout.tomorrowReadiness,
      ),
      derivedTomorrowReadiness,
      derivedTomorrowReadinessLabel: labelTomorrowReadiness(
        derivedTomorrowReadiness,
      ),
      closeoutSummary: closeout.closeoutSummary,
      carryForwardSummary: closeout.carryForwardSummary,
      tomorrowSummary: closeout.tomorrowSummary,
      internalNotes: closeout.internalNotes,
      startedAt: closeout.startedAt,
      reviewedAt: closeout.reviewedAt,
      signedOffAt: closeout.signedOffAt,
      startedByUserId: closeout.startedByUserId,
      reviewedByUserId: closeout.reviewedByUserId,
      signedOffByUserId: closeout.signedOffByUserId,
      updatedAt: closeout.updatedAt,
      expectedUpdatedAt: closeout.updatedAt,
    },
    summary: {
      scheduledMissions: dayMissions.length,
      completedExecutions,
      activeExecutions: activeExecutions.length,
      debriefNotStarted,
      debriefInProgress,
      debriefAwaitingApproval,
      openDueToday,
      overdue: overdue.length,
      openCommitments,
      blocked,
      unassigned,
      leadershipDecisions: leadershipDecisions.length,
      tomorrowPreparationRisks: tomorrowItems.filter((t) => t.gaps.length > 0)
        .length,
      tomorrowConflicts: tomorrowConflicts.length,
    },
    todayMissions: todayMissionItems.slice(0, limits.todayMissions),
    todayMissionsTotal: todayMissionItems.length,
    activeExecutions: activeExecutions.slice(0, limits.activeExecutions),
    debriefReview: debriefReview.slice(0, limits.debriefReview),
    commitments: commitments.slice(0, limits.commitments),
    immediateFollowUps: immediateFollowUps.slice(
      0,
      limits.immediateFollowUps,
    ),
    dueToday: dueToday.slice(0, limits.dueToday),
    overdue: overdue.slice(0, limits.overdue),
    leadershipDecisions: leadershipDecisions.slice(
      0,
      limits.leadershipDecisions,
    ),
    carryForwardItems: closeout.carryForwardItems
      .slice(0, limits.carryForwardItems)
      .map((i) => ({
        id: i.id,
        sourceType: i.sourceType,
        sourceTypeLabel: labelCarryForwardSource(i.sourceType),
        sourceRecordId: i.sourceRecordId,
        missionId: i.missionId,
        title: i.title,
        reason: i.reason,
        ownerLabel: i.ownerName ?? (i.ownerUserId ? "Assigned" : "Owner needed"),
        targetDateKey: i.targetDateKey,
        destination: i.destination,
        status: i.status,
        statusLabel: labelCarryForwardStatus(i.status),
        createdAt: i.createdAt,
      })),
    suggestedCarryForward: suggestedCarryForward.slice(
      0,
      limits.carryForwardSuggestions,
    ),
    tomorrowFirstMission: tomorrowFirst,
    tomorrowMissions: tomorrowItems.slice(0, limits.tomorrowMissions),
    tomorrowConflicts: tomorrowConflicts.slice(0, limits.tomorrowConflicts),
    tomorrowDue: tomorrowDue.slice(0, limits.dueToday),
    checklist,
    reviewBlockers,
    signoffBlockers,
    integrityWarnings,
    navigation: {
      briefingHref: `/system/briefing/${dateKey}`,
      commandCenterHref: "/system/missions/command-center",
      calendarHref: `/calendar?view=day&date=${dateKey}`,
      reportHref: `/system/briefing/${dateKey}/closeout/report`,
      todayHref: "/system/briefing/closeout",
      previousHref: `/system/briefing/${prev}/closeout`,
      nextHref: next ? `/system/briefing/${next}/closeout` : null,
    },
    isolation: {
      mutatesMissionRecords: false,
      mutatesEventSchedule: false,
      signoffCompletesUnderlyingWork: false,
    },
  };
}
