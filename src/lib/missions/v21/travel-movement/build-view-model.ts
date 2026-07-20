import {
  formatCampaignTime,
  formatFullCampaignDate,
  addDaysToDateKey,
  classifyMovementDay,
} from "@/lib/missions/v21/travel-movement/travel-date";
import {
  labelTravelPlanStatus,
  labelTravelReadiness,
} from "@/lib/missions/v21/travel-movement/labels";
import {
  deriveTravelReadiness,
  evaluateTravelFindings,
  detectMovementOverlaps,
  scheduleFingerprint,
} from "@/lib/missions/v21/travel-movement/readiness";
import type {
  DayMovementBoardView,
  MissionTravelPlanPersisted,
  MissionTravelWorkspaceView,
  TravelMissionContext,
} from "@/lib/missions/v21/travel-movement/types";
import {
  DEFAULT_TRAVEL_MOVEMENT_CONFIG,
  type TravelMovementConfig,
} from "@/lib/missions/v21/travel-movement/travel-config";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";

export function buildMissionTravelWorkspaceView(input: {
  context: TravelMissionContext;
  plan: MissionTravelPlanPersisted | null;
  config?: TravelMovementConfig;
}): MissionTravelWorkspaceView {
  const config = input.config ?? DEFAULT_TRAVEL_MOVEMENT_CONFIG;
  const findings = evaluateTravelFindings({
    context: input.context,
    plan: input.plan,
    config,
  });
  const derived = deriveTravelReadiness({
    context: input.context,
    plan: input.plan,
    findings,
  });
  const plan = input.plan;
  const ctx = input.context;

  return {
    mission: {
      missionId: ctx.missionId,
      title: ctx.title,
      whenLabel: `${formatCampaignTime(ctx.startsAt, ctx.timezone, { includeDate: true })} – ${formatCampaignTime(ctx.endsAt, ctx.timezone)}`,
      locationLabel: ctx.locationLabel,
      campaignDateKey: ctx.campaignDateKey,
      lifecyclePhase: ctx.lifecyclePhase,
      operationalStatus: ctx.operationalStatus,
      eventTravelRequired: ctx.eventTravelRequired,
      isCancelled: ctx.isCancelled,
      href: `/system/missions/${ctx.missionId}`,
      prepareHref: `/system/missions/${ctx.missionId}/prepare`,
      executeHref: `/system/missions/${ctx.missionId}/execute`,
    },
    plan: {
      exists: Boolean(plan),
      id: plan?.id ?? null,
      status: plan?.status ?? "DRAFT",
      statusLabel: labelTravelPlanStatus(plan?.status ?? "DRAFT"),
      readinessState: plan?.readinessState ?? "NOT_ASSESSED",
      readinessStateLabel: labelTravelReadiness(
        plan?.readinessState ?? "NOT_ASSESSED",
      ),
      derivedReadiness: derived,
      derivedReadinessLabel: labelTravelReadiness(derived),
      movementRequired: plan?.movementRequired ?? null,
      plannedReadyAt: plan?.plannedReadyAt ?? null,
      plannedDepartureAt: plan?.plannedDepartureAt ?? null,
      requiredArrivalAt: plan?.requiredArrivalAt ?? null,
      bufferMinutes: plan?.bufferMinutes ?? null,
      driverRequired: plan?.driverRequired ?? false,
      vehicleRequired: plan?.vehicleRequired ?? false,
      driverName: plan?.driverName ?? null,
      driverUserId: plan?.driverUserId ?? null,
      vehicleDescription: plan?.vehicleDescription ?? null,
      passengerNotes: plan?.passengerNotes ?? null,
      accessibilityNotes: plan?.accessibilityNotes ?? null,
      securityNotes: plan?.securityNotes ?? null,
      logisticsNotes: plan?.logisticsNotes ?? null,
      acceptedRiskSummary: plan?.acceptedRiskSummary ?? null,
      internalNotes: plan?.internalNotes ?? null,
      scheduleFingerprint: plan?.scheduleFingerprint ?? null,
      confirmedAt: plan?.confirmedAt ?? null,
      expectedUpdatedAt: plan?.updatedAt ?? null,
      legs: plan?.legs ?? [],
      acknowledgements: plan?.acknowledgements ?? [],
    },
    findings,
    blockerCount: findings.filter(
      (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
    ).length,
    warningCount: findings.filter(
      (f) => f.severity === "WARNING" && !f.clearsForReadiness,
    ).length,
    boundaryMessage:
      "Travel status does not start or complete the Mission. Editing travel does not change Event schedule, Prepare, Execute, Debrief, Follow-up, Closeout, or Morning Launch Review state.",
    isolation: {
      mutatesMissionLifecycle: false,
      mutatesEventSchedule: false,
      startsExecution: false,
    },
  };
}

export function buildDayMovementBoardView(input: {
  campaignDate: string;
  now: Date;
  campaignTimezone: string;
  missions: TravelMissionContext[];
  plansByMissionId: Map<string, MissionTravelPlanPersisted>;
  config?: TravelMovementConfig;
}): DayMovementBoardView {
  const config = input.config ?? DEFAULT_TRAVEL_MOVEMENT_CONFIG;
  const tz = input.campaignTimezone;
  const dateKey = input.campaignDate;
  const { isToday, isPast, isFuture } = classifyMovementDay(
    dateKey,
    input.now,
    tz,
  );

  const sorted = [...input.missions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );
  const firstId = sorted[0]?.missionId ?? null;
  const selection = selectTodaysMission(
    sorted.map((m) => ({
      id: m.missionId,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      lifecyclePhase: m.lifecyclePhase as never,
    })),
    { now: input.now, timezone: tz },
  );
  const primaryId = selection.primaryId;

  const overlapInput = sorted.map((m) => {
    const plan = input.plansByMissionId.get(m.missionId) ?? null;
    return {
      missionId: m.missionId,
      departureAt: plan?.plannedDepartureAt ?? null,
      arrivalAt: plan?.requiredArrivalAt ?? null,
      startsAt: m.startsAt,
    };
  });
  const overlaps = detectMovementOverlaps(overlapInput);

  const cards = sorted.map((m) => {
    const plan = input.plansByMissionId.get(m.missionId) ?? null;
    const findings = evaluateTravelFindings({
      context: m,
      plan,
      config,
      overlappingMissionIds: overlaps.get(m.missionId),
    });
    const readiness = deriveTravelReadiness({
      context: m,
      plan,
      findings,
    });
    const activeLegs = [...(plan?.legs ?? [])]
      .filter((l) => l.status !== "CANCELLED" && l.status !== "SKIPPED")
      .sort((a, b) => a.sequence - b.sequence);

    return {
      missionId: m.missionId,
      title: m.title,
      whenLabel: formatCampaignTime(m.startsAt, tz, { includeDate: false }),
      locationLabel: m.locationLabel,
      isFirst: m.missionId === firstId,
      isPrimary: m.missionId === primaryId,
      isCancelled: m.isCancelled,
      planExists: Boolean(plan && plan.status !== "INACTIVE" && plan.status !== "CANCELLED"),
      planStatus: plan?.status ?? null,
      readiness,
      readinessLabel: labelTravelReadiness(readiness),
      departureLabel: plan?.plannedDepartureAt
        ? formatCampaignTime(plan.plannedDepartureAt, tz)
        : null,
      arrivalLabel: plan?.requiredArrivalAt
        ? formatCampaignTime(plan.requiredArrivalAt, tz)
        : null,
      bufferMinutes: plan?.bufferMinutes ?? null,
      driverLabel: plan?.driverName ?? null,
      vehicleLabel: plan?.vehicleDescription ?? null,
      legCount: activeLegs.length,
      legs: activeLegs.map((l) => ({
        sequence: l.sequence,
        originLabel: l.originLabel,
        destinationLabel: l.destinationLabel,
        departureLabel: l.plannedDepartureAt
          ? formatCampaignTime(l.plannedDepartureAt, tz)
          : null,
        arrivalLabel: l.plannedArrivalAt
          ? formatCampaignTime(l.plannedArrivalAt, tz)
          : null,
      })),
      blockerCount: findings.filter(
        (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
      ).length,
      warningCount: findings.filter(
        (f) => f.severity === "WARNING" && !f.clearsForReadiness,
      ).length,
      findings: findings.slice(0, config.sectionLimits.findings),
      href: `/system/missions/${m.missionId}/travel`,
    };
  });

  const withPlan = cards.filter((c) => c.planExists).length;
  const prev = addDaysToDateKey(dateKey, -1);
  const next = addDaysToDateKey(dateKey, 1);

  return {
    campaignDate: dateKey,
    dateLabel: formatFullCampaignDate(dateKey, tz),
    timezone: tz,
    generatedAt: input.now.toISOString(),
    isToday,
    isPast,
    isFuture,
    summary: {
      missionCount: cards.length,
      withPlanCount: withPlan,
      withoutPlanCount: cards.length - withPlan,
      blockerCount: cards.reduce((n, c) => n + c.blockerCount, 0),
      warningCount: cards.reduce((n, c) => n + c.warningCount, 0),
      firstMissionTitle: cards.find((c) => c.isFirst)?.title ?? null,
      primaryMissionTitle: cards.find((c) => c.isPrimary)?.title ?? null,
    },
    missions: cards.slice(0, config.sectionLimits.dayMissions),
    navigation: {
      todayHref: "/system/briefing/movement",
      briefingHref: `/system/briefing/${dateKey}`,
      launchHref: `/system/briefing/${dateKey}/launch`,
      closeoutHref: `/system/briefing/${dateKey}/closeout`,
      commandCenterHref: "/system/missions/command-center",
      todaysMissionHref: "/",
      reportHref: `/system/briefing/${dateKey}/movement/report`,
      previousHref: `/system/briefing/${prev}/movement`,
      nextHref: `/system/briefing/${next}/movement`,
    },
    isolation: {
      mutatesMissionLifecycle: false,
      startsExecution: false,
      launchesCampaignDay: false,
    },
  };
}

export { scheduleFingerprint };
