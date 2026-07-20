import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import type { CampaignDayCloseoutPersisted } from "@/lib/missions/v21/day-closeout/types";
import { labelCloseoutStatus, labelTomorrowReadiness } from "@/lib/missions/v21/day-closeout/labels";
import {
  DEFAULT_DAY_LAUNCH_CONFIG,
  type CampaignDayLaunchConfig,
} from "@/lib/missions/v21/day-launch/launch-config";
import {
  addDaysToDateKey,
  classifyLaunchDay,
  formatCampaignTime,
  formatFullCampaignDate,
  launchDayHeading,
} from "@/lib/missions/v21/day-launch/launch-date";
import {
  labelAckStatus,
  labelDepartureState,
  labelLaunchCheck,
  labelLaunchReadiness,
  labelLaunchStatus,
  labelPrepImpact,
  labelSeverity,
} from "@/lib/missions/v21/day-launch/labels";
import {
  acknowledgementImportKey,
  buildLaunchBlockers,
  buildOvernightChanges,
  deriveDepartureReadiness,
  deriveLaunchReadiness,
  derivePreparationLaunchImpact,
  detectScheduleOverlaps,
  selectFirstMission,
} from "@/lib/missions/v21/day-launch/rules";
import type {
  CampaignDayLaunchReviewPersisted,
  CampaignDayLaunchReviewViewModel,
  EmptyLaunchState,
  LaunchCarryForwardItem,
  LaunchMissionCard,
} from "@/lib/missions/v21/day-launch/types";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";
import { labelFollowUpActionStatus } from "@/lib/missions/v21/follow-up/labels";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const OPEN = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

function emptyLaunch(dateKey: string): EmptyLaunchState {
  return {
    id: null,
    campaignDateKey: dateKey,
    status: "NOT_STARTED",
    readinessAssessment: "NOT_ASSESSED",
    launchSummary: null,
    overnightChangeNotes: null,
    acceptedRiskSummary: null,
    internalNotes: null,
    startedAt: null,
    reviewedAt: null,
    launchedAt: null,
    startedByUserId: null,
    reviewedByUserId: null,
    launchedByUserId: null,
    updatedAt: null,
    acknowledgements: [],
  };
}

function departureOf(m: DayBriefingMissionSnapshot): string | null {
  return m.eventDepartureAt ?? m.travelPlan?.departureAt ?? null;
}

function toMissionCard(
  m: DayBriefingMissionSnapshot,
  tz: string,
): LaunchMissionCard {
  const departure = departureOf(m);
  const action = primaryActionForPhase(m.missionId, m.lifecyclePhase);
  return {
    missionId: m.missionId,
    title: m.title,
    whenLabel: m.isAllDay ? "All day" : formatCampaignTime(m.startsAt, tz),
    locationLabel: m.locationLabel,
    lifecyclePhase: m.lifecyclePhase,
    operationalStatus: m.operationalStatus,
    preparationReadiness: m.preparation.readiness,
    objective: m.objective,
    strategicPurpose: m.preparation.strategicPurpose,
    keyMessage: m.preparation.keyMessage,
    successCriteria: m.successCriteria,
    arrivalTargetLabel: m.travelPlan?.targetArrivalAt
      ? formatCampaignTime(m.travelPlan.targetArrivalAt, tz)
      : m.eventArrivalAt
        ? formatCampaignTime(m.eventArrivalAt, tz)
        : null,
    departureLabel: departure ? formatCampaignTime(departure, tz) : null,
    missingDeparture: Boolean(m.travelRequired && !departure),
    href: action.href,
  };
}

export function buildCampaignDayLaunchReviewViewModel(input: {
  campaignDate: string;
  now: Date;
  campaignTimezone: string;
  dayMissions: DayBriefingMissionSnapshot[];
  operationalMissions: DayBriefingMissionSnapshot[];
  priorCloseout: CampaignDayCloseoutPersisted | null;
  priorCloseoutDateKey: string;
  launchReview: CampaignDayLaunchReviewPersisted | null;
  config?: CampaignDayLaunchConfig;
}): CampaignDayLaunchReviewViewModel {
  const config = input.config ?? DEFAULT_DAY_LAUNCH_CONFIG;
  const tz = input.campaignTimezone;
  const dateKey = input.campaignDate;
  const { isToday, isPast } = classifyLaunchDay(dateKey, input.now, tz);
  const launch = input.launchReview ?? emptyLaunch(dateKey);
  const dayMissions = [...input.dayMissions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );

  const first = selectFirstMission(dayMissions);
  const selection = selectTodaysMission(
    dayMissions.map((m) => ({
      id: m.missionId,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      lifecyclePhase: m.lifecyclePhase,
    })),
    { now: input.now, timezone: tz },
  );
  const primary =
    dayMissions.find((m) => m.missionId === selection.primaryId) ?? first;

  const overlaps = detectScheduleOverlaps(dayMissions);
  const departureState = deriveDepartureReadiness(first, config);
  const prepImpact = derivePreparationLaunchImpact(first);

  const carryItems: LaunchCarryForwardItem[] = (
    input.priorCloseout?.carryForwardItems ?? []
  )
    .filter((i) => i.status === "OPEN" || i.status === "TRANSFERRED")
    .map((i) => {
      const key = acknowledgementImportKey(
        "CARRY_FORWARD",
        "CARRY_FORWARD_ITEM",
        i.id,
      );
      const urgent =
        i.sourceType === "ACTIVE_EXECUTION" ||
        i.sourceType === "COMMITMENT" ||
        i.sourceType === "UNASSIGNED_ACTION" ||
        i.sourceType === "BLOCKED_ACTION" ||
        i.targetDateKey === dateKey;
      return {
        id: i.id,
        title: i.title,
        sourceType: i.sourceType,
        missionId: i.missionId,
        missionTitle: null,
        ownerLabel: i.ownerName ?? (i.ownerUserId ? "Assigned" : "Owner needed"),
        targetDateKey: i.targetDateKey,
        status: i.status,
        sourceStateLabel: i.status,
        dueBeforeFirstMission: i.targetDateKey === dateKey,
        urgent,
        href: i.destination ?? "/system/missions/command-center",
        acknowledgementImportKey: key,
        acknowledgementStatus:
          launch.acknowledgements.find((a) => a.importKey === key)?.status ??
          null,
      };
    });

  const urgentCarry = carryItems.filter((c) => c.urgent);
  const urgentUnowned = urgentCarry.filter((c) => c.ownerLabel === "Owner needed")
    .length;

  // Provisional readiness for overnight comparison (without ack-cleared blockers yet)
  const provisionalBlockers = buildLaunchBlockers({
    dayMissions,
    firstMission: first,
    departureState,
    prepImpact,
    overlaps,
    urgentUnownedCarryForward: config.requireCriticalCarryForwardOwner
      ? urgentUnowned
      : 0,
    unacknowledgedCritical: 0,
    priorCloseoutMissing: !input.priorCloseout,
    requirePriorCloseoutReview: config.requirePriorCloseoutReview,
    acknowledgements: launch.acknowledgements,
  });
  const derivedReadiness = deriveLaunchReadiness({
    dayMissionCount: dayMissions.length,
    blockers: provisionalBlockers,
  });

  const baselineAt =
    input.priorCloseout?.signedOffAt ??
    input.priorCloseout?.reviewedAt ??
    null;

  const overnightChanges = buildOvernightChanges({
    priorCloseout: input.priorCloseout,
    priorCloseoutExists: Boolean(input.priorCloseout),
    priorTomorrowReadiness: input.priorCloseout?.tomorrowReadiness ?? null,
    currentDerivedReadiness: derivedReadiness,
    dayMissions,
    firstMission: first,
    overlaps,
    acknowledgements: launch.acknowledgements,
    baselineAt,
  });

  const blockingConditions = provisionalBlockers;

  const firstStartMs = first ? new Date(first.startsAt).getTime() : null;
  const firstDepartureMs = first
    ? departureOf(first)
      ? new Date(departureOf(first)!).getTime()
      : firstStartMs
    : null;
  const cutoffMs = firstDepartureMs ?? firstStartMs;

  const dueBeforeLaunch = [];
  const dueSeen = new Set<string>();
  for (const m of [...dayMissions, ...input.operationalMissions]) {
    for (const a of m.followUp.actions) {
      if (dueSeen.has(a.id)) continue;
      if (!OPEN.has(a.status) || !a.dueAt) continue;
      const dueMs = new Date(a.dueAt).getTime();
      const dueToday = campaignDateKey(new Date(a.dueAt), tz) === dateKey;
      const beforeCutoff = cutoffMs != null && dueMs <= cutoffMs;
      if (dueToday && (beforeCutoff || a.priority === "URGENT")) {
        dueSeen.add(a.id);
        dueBeforeLaunch.push({
          id: a.id,
          title: a.title,
          missionId: m.missionId,
          missionTitle: m.title,
          ownerLabel:
            a.ownerType === "UNASSIGNED" || !a.ownerName
              ? "Owner needed"
              : a.ownerName,
          dueLabel: formatCampaignTime(a.dueAt, tz, { includeDate: true }),
          priority: a.priority,
          status: labelFollowUpActionStatus(a.status),
          href: `/system/missions/${m.missionId}/follow-up`,
        });
      }
    }
  }

  const leadershipDecisions = [];
  const decisionSeen = new Set<string>();
  for (const m of [...dayMissions, ...input.operationalMissions]) {
    if (m.debrief.status === "COMPLETED") {
      const id = `debrief:${m.missionId}`;
      if (!decisionSeen.has(id)) {
        decisionSeen.add(id);
        leadershipDecisions.push({
          id,
          label: "Debrief awaiting approval",
          explanation: `${m.title} Debrief requires leadership approval.`,
          missionId: m.missionId,
          missionTitle: m.title,
          requiredPermission: "Campaign leadership",
          href: `/system/missions/${m.missionId}/debrief`,
        });
      }
    }
    if (m.followUp.status === "READY_TO_CLOSE") {
      const id = `close:${m.missionId}`;
      if (!decisionSeen.has(id)) {
        decisionSeen.add(id);
        leadershipDecisions.push({
          id,
          label: "Mission ready for closeout",
          explanation: `${m.title} is ready for Follow-up closeout review.`,
          missionId: m.missionId,
          missionTitle: m.title,
          requiredPermission: "Campaign leadership",
          href: `/system/missions/${m.missionId}/follow-up`,
        });
      }
    }
  }

  const peopleCount = first?.preparation.peopleBriefings.length ?? 0;
  const peopleMissing =
    first?.preparation.peopleBriefings.filter(
      (p) => !p.conversationGoal || !p.roleOrTitle,
    ).length ?? 0;
  const orgCount = first?.preparation.organizationBriefings.length ?? 0;
  const orgMissing =
    first?.preparation.organizationBriefings.filter((o) => !o.desiredOutcome)
      .length ?? 0;
  const incompleteTasks =
    first?.preparation.preparationTasks.filter((t) => !t.completed).length ?? 0;

  const materialsState =
    !first
      ? ("NOT_APPLICABLE" as const)
      : !first.preparation.exists
        ? ("NOT_REVIEWED" as const)
        : incompleteTasks > 0
          ? ("INCOMPLETE" as const)
          : ("CONFIRMED_READY" as const);

  const acceptedRisks = launch.acknowledgements
    .filter((a) => a.status === "ACCEPTED_RISK")
    .map((a) => ({
      id: a.id,
      title: a.title,
      reason: a.acceptedRiskReason ?? "",
      acknowledgedByUserId: a.acknowledgedByUserId,
      acknowledgedAt: a.acknowledgedAt,
    }));

  const unacknowledgedCritical = [
    ...overnightChanges.filter(
      (c) =>
        c.severity === "CRITICAL" &&
        (!c.acknowledgementStatus || c.acknowledgementStatus === "OPEN"),
    ),
    ...blockingConditions.filter(
      (b) => !b.acknowledgementStatus || b.acknowledgementStatus === "OPEN",
    ),
  ].length;

  const checklist = [
    {
      id: "prior-closeout",
      label: "Prior Closeout reviewed",
      group: "OVERNIGHT" as const,
      state: input.priorCloseout
        ? ("COMPLETE" as const)
        : config.requirePriorCloseoutReview
          ? ("BLOCKING" as const)
          : ("NEEDS_ATTENTION" as const),
      stateLabel: "",
    },
    {
      id: "overnight",
      label: "Overnight changes reviewed",
      group: "OVERNIGHT" as const,
      state:
        overnightChanges.filter(
          (c) => !c.acknowledgementStatus || c.acknowledgementStatus === "OPEN",
        ).length === 0
          ? ("COMPLETE" as const)
          : ("BLOCKING" as const),
      stateLabel: "",
    },
    {
      id: "carry-forward",
      label: "Critical carry-forward reviewed",
      group: "OVERNIGHT" as const,
      state:
        urgentCarry.filter(
          (c) => !c.acknowledgementStatus || c.acknowledgementStatus === "OPEN",
        ).length === 0
          ? ("COMPLETE" as const)
          : ("NEEDS_ATTENTION" as const),
      stateLabel: "",
    },
    {
      id: "first-mission",
      label: "First Mission confirmed",
      group: "FIRST_MISSION" as const,
      state: first ? ("COMPLETE" as const) : ("NOT_APPLICABLE" as const),
      stateLabel: "",
    },
    {
      id: "prep",
      label: "Preparation usable",
      group: "FIRST_MISSION" as const,
      state: !first
        ? ("NOT_APPLICABLE" as const)
        : prepImpact === "BLOCKING_LAUNCH"
          ? ("BLOCKING" as const)
          : prepImpact === "NEEDS_REVIEW"
            ? ("NEEDS_ATTENTION" as const)
            : ("COMPLETE" as const),
      stateLabel: "",
    },
    {
      id: "travel",
      label: "Travel / departure reviewed",
      group: "FIRST_MISSION" as const,
      state: !first
        ? ("NOT_APPLICABLE" as const)
        : departureState === "BLOCKING"
          ? ("BLOCKING" as const)
          : departureState === "NEEDS_ATTENTION"
            ? ("NEEDS_ATTENTION" as const)
            : ("COMPLETE" as const),
      stateLabel: "",
    },
    {
      id: "due-before",
      label: "Due-before-launch work reviewed",
      group: "CAMPAIGN" as const,
      state:
        dueBeforeLaunch.length === 0
          ? ("COMPLETE" as const)
          : ("NEEDS_ATTENTION" as const),
      stateLabel: "",
    },
    {
      id: "readiness",
      label: "Readiness assessment selected",
      group: "CAMPAIGN" as const,
      state:
        launch.readinessAssessment === "NOT_ASSESSED"
          ? ("NEEDS_ATTENTION" as const)
          : ("COMPLETE" as const),
      stateLabel: "",
    },
  ].map((c) => ({ ...c, stateLabel: labelLaunchCheck(c.state) }));

  const reviewBlockers: string[] = [];
  if (!launch.launchSummary?.trim()) {
    reviewBlockers.push("Launch summary is required.");
  }
  if (launch.readinessAssessment === "NOT_ASSESSED") {
    reviewBlockers.push("Readiness assessment must be selected.");
  }
  if (unacknowledgedCritical > 0) {
    reviewBlockers.push(
      "Critical overnight changes or blockers must be acknowledged before review can complete.",
    );
  }

  const launchBlockers: string[] = [];
  if (launch.status !== "REVIEWED") {
    launchBlockers.push("Morning review must be completed before launch.");
  }
  if (
    launch.readinessAssessment !== "READY" &&
    launch.readinessAssessment !== "READY_WITH_ACCEPTED_RISK" &&
    launch.readinessAssessment !== "NO_MISSIONS_SCHEDULED"
  ) {
    launchBlockers.push(
      "Readiness must be Ready, Ready with accepted risk, or No Missions scheduled.",
    );
  }
  if (
    derivedReadiness === "NOT_READY" &&
    launch.readinessAssessment === "READY"
  ) {
    launchBlockers.push(
      "Derived readiness is Not ready. Resolve or accept each blocker individually.",
    );
  }
  if (
    !config.allowLaunchWithAcceptedRisk &&
    launch.readinessAssessment === "READY_WITH_ACCEPTED_RISK"
  ) {
    launchBlockers.push("Launch with accepted risk is not enabled.");
  }

  const integrityWarnings: string[] = [];
  if (launch.status === "LAUNCHED" && derivedReadiness === "NOT_READY") {
    integrityWarnings.push(
      "Launched day still shows unresolved blockers in current Mission records.",
    );
  }
  if (
    launch.readinessAssessment === "READY" &&
    derivedReadiness === "NOT_READY"
  ) {
    integrityWarnings.push(
      "Persisted readiness is Ready, but current checks show Not ready.",
    );
  }

  const limits = config.sectionLimits;
  const prev = addDaysToDateKey(dateKey, -1);
  const next = isToday ? null : addDaysToDateKey(dateKey, 1);

  return {
    campaignDate: dateKey,
    dateLabel: formatFullCampaignDate(dateKey, tz),
    closingHeading: launchDayHeading(dateKey, input.now, tz),
    timezone: tz,
    generatedAt: input.now.toISOString(),
    isToday,
    isPast,
    historicalNotice: isPast
      ? "Launch Review decisions are preserved. Mission and Follow-up records shown here reflect their current state."
      : null,
    launchReview: {
      exists: Boolean(input.launchReview),
      id: launch.id,
      status: launch.status,
      statusLabel: labelLaunchStatus(launch.status),
      readinessAssessment: launch.readinessAssessment,
      readinessAssessmentLabel: labelLaunchReadiness(launch.readinessAssessment),
      derivedReadiness,
      derivedReadinessLabel: labelLaunchReadiness(derivedReadiness),
      launchSummary: launch.launchSummary,
      overnightChangeNotes: launch.overnightChangeNotes,
      acceptedRiskSummary: launch.acceptedRiskSummary,
      internalNotes: launch.internalNotes,
      startedAt: launch.startedAt,
      reviewedAt: launch.reviewedAt,
      launchedAt: launch.launchedAt,
      startedByUserId: launch.startedByUserId,
      reviewedByUserId: launch.reviewedByUserId,
      launchedByUserId: launch.launchedByUserId,
      updatedAt: launch.updatedAt,
      expectedUpdatedAt: launch.updatedAt,
    },
    priorCloseout: {
      exists: Boolean(input.priorCloseout),
      dateKey: input.priorCloseoutDateKey,
      status: input.priorCloseout?.status ?? null,
      statusLabel: input.priorCloseout
        ? labelCloseoutStatus(input.priorCloseout.status)
        : null,
      tomorrowReadiness: input.priorCloseout?.tomorrowReadiness ?? null,
      tomorrowReadinessLabel: input.priorCloseout
        ? labelTomorrowReadiness(input.priorCloseout.tomorrowReadiness)
        : null,
      signedOffAt: input.priorCloseout?.signedOffAt ?? null,
      signedOffByUserId: input.priorCloseout?.signedOffByUserId ?? null,
      summary: input.priorCloseout?.closeoutSummary ?? null,
      carryForwardCount: input.priorCloseout?.carryForwardItems.length ?? 0,
      href: `/system/briefing/${input.priorCloseoutDateKey}/closeout`,
      baselineLabel: baselineAt
        ? `Baseline: ${baselineAt}`
        : "No signed-off prior-day baseline is available.",
    },
    summary: {
      missionCount: dayMissions.length,
      overnightChangeCount: overnightChanges.length,
      urgentCarryForwardCount: urgentCarry.length,
      blockingConditionCount: blockingConditions.length,
      acceptedRiskCount: acceptedRisks.length,
      scheduleConflictCount: overlaps.length,
      dueBeforeLaunchCount: dueBeforeLaunch.length,
      leadershipDecisionCount: leadershipDecisions.length,
      unacknowledgedCount: unacknowledgedCritical,
      firstMissionTitle: first?.title ?? null,
      firstMissionTime: first
        ? first.isAllDay
          ? "All day"
          : formatCampaignTime(first.startsAt, tz)
        : null,
      firstDepartureTime: first
        ? departureOf(first)
          ? formatCampaignTime(departureOf(first)!, tz)
          : null
        : null,
      primaryMissionTitle: primary?.title ?? null,
    },
    primaryMission: primary ? toMissionCard(primary, tz) : null,
    firstMission: first ? toMissionCard(first, tz) : null,
    overnightChanges: overnightChanges.slice(0, limits.overnightChanges),
    carryForwardItems: carryItems.slice(0, limits.urgentCarryForward),
    urgentCarryForward: urgentCarry.slice(0, limits.urgentCarryForward),
    departureReview: first
      ? {
          missionId: first.missionId,
          missionTitle: first.title,
          destinationLabel: first.locationLabel,
          departureLabel: departureOf(first)
            ? formatCampaignTime(departureOf(first)!, tz)
            : null,
          arrivalTargetLabel: first.travelPlan?.targetArrivalAt
            ? formatCampaignTime(first.travelPlan.targetArrivalAt, tz)
            : null,
          durationMinutes: first.travelPlan?.estimatedDurationMinutes ?? null,
          parking:
            first.preparation.parkingInstructions ??
            first.travelPlan?.parkingInstructions ??
            null,
          arrivalInstructions: first.preparation.arrivalInstructions,
          accessibilityNotes: first.preparation.accessibilityNotes,
          travelRequired: first.travelRequired,
          state: departureState,
          stateLabel: labelDepartureState(departureState),
          href: `/system/missions/${first.missionId}/prepare`,
        }
      : null,
    preparationReview: first
      ? {
          missionId: first.missionId,
          readiness: first.preparation.readiness,
          impact: prepImpact,
          impactLabel: labelPrepImpact(prepImpact),
          strategicPurpose: first.preparation.strategicPurpose,
          keyMessage: first.preparation.keyMessage,
          successCriteriaCount: first.successCriteria.length,
          peopleCount,
          organizationCount: orgCount,
          incompleteTaskCount: incompleteTasks,
          gaps: [
            !first.preparation.exists ? "No preparation record exists." : null,
            !first.preparation.keyMessage
              ? "No key message is available."
              : null,
            !first.preparation.strategicPurpose
              ? "No strategic purpose is available."
              : null,
          ].filter((g): g is string => Boolean(g)),
          href: `/system/missions/${first.missionId}/prepare`,
        }
      : null,
    scheduleReview: overlaps.slice(0, limits.scheduleIssues).map((o) => ({
      id: o.id,
      title: "Schedule review required",
      explanation: `${o.titles.join(" and ")} have overlapping scheduled times.`,
      missionIds: o.missionIds,
      severity: "CRITICAL" as const,
      severityLabel: labelSeverity("CRITICAL"),
    })),
    dueBeforeLaunch: dueBeforeLaunch.slice(0, limits.dueBeforeLaunch),
    leadershipDecisions: leadershipDecisions.slice(
      0,
      limits.leadershipDecisions,
    ),
    peopleReadiness: {
      briefedCount: peopleCount,
      missingContextCount: peopleMissing,
      label: `${peopleCount} people briefed · ${peopleMissing} missing context`,
    },
    organizationReadiness: {
      briefedCount: orgCount,
      missingOutcomeCount: orgMissing,
      label: `${orgCount} organizations briefed · ${orgMissing} missing outcome`,
    },
    materialsReadiness: {
      incompleteTaskCount: incompleteTasks,
      state: materialsState,
      stateLabel:
        materialsState === "CONFIRMED_READY"
          ? "Confirmed ready"
          : materialsState === "INCOMPLETE"
            ? "Incomplete"
            : materialsState === "NOT_REVIEWED"
              ? "Not reviewed"
              : "Not applicable",
    },
    blockingConditions: blockingConditions.slice(0, limits.blockers),
    acceptedRisks,
    acknowledgements: launch.acknowledgements
      .slice(0, limits.acknowledgements)
      .map((a) => ({
        id: a.id,
        title: a.title,
        typeLabel: a.acknowledgementType,
        status: a.status,
        statusLabel: labelAckStatus(a.status),
      })),
    checklist,
    reviewBlockers,
    launchBlockers,
    integrityWarnings,
    navigation: {
      briefingHref: `/system/briefing/${dateKey}`,
      closeoutHref: `/system/briefing/${input.priorCloseoutDateKey}/closeout`,
      todaysMissionHref: "/",
      commandCenterHref: "/system/missions/command-center",
      reportHref: `/system/briefing/${dateKey}/launch/report`,
      todayHref: "/system/briefing/launch",
      previousHref: `/system/briefing/${prev}/launch`,
      nextHref: next ? `/system/briefing/${next}/launch` : null,
    },
    isolation: {
      mutatesMissionRecords: false,
      mutatesEventSchedule: false,
      launchStartsExecution: false,
    },
  };
}
