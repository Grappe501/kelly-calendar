import {
  addDaysToDateKey,
  classifyFieldOpsDay,
  formatCampaignTime,
  formatFullCampaignDate,
} from "@/lib/missions/v21/field-ops/field-ops-date";
import {
  labelFieldOpsReadiness,
  labelFieldOpsSessionStatus,
} from "@/lib/missions/v21/field-ops/labels";
import {
  DEFAULT_FIELD_OPS_CONFIG,
  type FieldOpsConfig,
} from "@/lib/missions/v21/field-ops/field-ops-config";
import {
  deriveFieldOpsReadiness,
  evaluateFieldOpsFindings,
  logisticsFingerprint,
  scheduleFingerprint,
  travelFingerprint,
} from "@/lib/missions/v21/field-ops/readiness";
import type {
  DayFieldOpsBoardView,
  FieldOpsMissionContext,
  MissionFieldOpsSessionPersisted,
  MissionFieldOpsWorkspaceView,
} from "@/lib/missions/v21/field-ops/types";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";

export function buildMissionFieldOpsWorkspaceView(input: {
  context: FieldOpsMissionContext;
  session: MissionFieldOpsSessionPersisted | null;
  config?: FieldOpsConfig;
}): MissionFieldOpsWorkspaceView {
  const config = input.config ?? DEFAULT_FIELD_OPS_CONFIG;
  const { context: ctx, session } = input;
  const findings = evaluateFieldOpsFindings({ context: ctx, session, config });
  const derived = deriveFieldOpsReadiness({ context: ctx, session, findings });
  const items = (ctx.pack?.items ?? [])
    .filter((item) => !["CANCELLED", "NOT_APPLICABLE"].includes(item.status))
    .slice(0, config.sectionLimits.items)
    .map((item) => ({
      ...item,
      confirmation:
        session?.confirmations.find((c) => c.logisticsItemId === item.id) ??
        null,
      d12StatusDoesNotImplyPresence: true as const,
    }));

  return {
    mission: {
      missionId: ctx.missionId,
      title: ctx.title,
      whenLabel: `${formatCampaignTime(ctx.startsAt, ctx.timezone, { includeDate: true })} – ${formatCampaignTime(ctx.endsAt, ctx.timezone)}`,
      locationLabel: ctx.locationLabel,
      campaignDateKey: ctx.campaignDateKey,
      lifecyclePhase: ctx.lifecyclePhase,
      operationalStatus: ctx.operationalStatus,
      executionStatus: ctx.executionStatus,
      materialsIndicated: ctx.materialsIndicated,
      isCancelled: ctx.isCancelled,
      href: `/system/missions/${ctx.missionId}`,
      prepareHref: `/system/missions/${ctx.missionId}/prepare`,
      executeHref: `/system/missions/${ctx.missionId}/execute`,
      logisticsHref: `/system/missions/${ctx.missionId}/logistics`,
      travelHref: `/system/missions/${ctx.missionId}/travel`,
    },
    session: {
      exists: Boolean(session),
      id: session?.id ?? null,
      status: session?.status ?? "OPEN",
      statusLabel: labelFieldOpsSessionStatus(session?.status ?? "OPEN"),
      readinessState: session?.readinessState ?? "NOT_ASSESSED",
      readinessStateLabel: labelFieldOpsReadiness(
        session?.readinessState ?? "NOT_ASSESSED",
      ),
      derivedReadiness: derived,
      derivedReadinessLabel: labelFieldOpsReadiness(derived),
      fieldLeadName: session?.fieldLeadName ?? null,
      locationLabel: session?.locationLabel ?? null,
      contextNote: session?.contextNote ?? null,
      checkInAt: session?.checkInAt ?? null,
      readinessConfirmedAt: session?.readinessConfirmedAt ?? null,
      wrapStartedAt: session?.wrapStartedAt ?? null,
      closedAt: session?.closedAt ?? null,
      acceptedRiskSummary: session?.acceptedRiskSummary ?? null,
      fieldNotes: session?.fieldNotes ?? null,
      internalNotes: session?.internalNotes ?? null,
      expectedUpdatedAt: session?.updatedAt ?? null,
      confirmations: session?.confirmations ?? [],
      acknowledgements: session?.acknowledgements ?? [],
    },
    logisticsItems: items,
    findings,
    blockerCount: findings.filter(
      (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
    ).length,
    warningCount: findings.filter(
      (f) => f.severity === "WARNING" && !f.clearsForReadiness,
    ).length,
    boundaryMessage:
      "Field readiness does not start or complete this Mission. Field Ops does not change Execute, Prepare, logistics packing/handoff status, travel, launch, or Closeout.",
    isolation: {
      mutatesMissionLifecycle: false,
      mutatesExecuteStatus: false,
      mutatesLogisticsItemStatus: false,
      startsExecution: false,
    },
  };
}

export function buildDayFieldOpsBoardView(input: {
  campaignDate: string;
  now: Date;
  campaignTimezone: string;
  missions: FieldOpsMissionContext[];
  sessionsByMissionId: Map<string, MissionFieldOpsSessionPersisted>;
  config?: FieldOpsConfig;
}): DayFieldOpsBoardView {
  const config = input.config ?? DEFAULT_FIELD_OPS_CONFIG;
  const { campaignDate: dateKey, campaignTimezone: tz } = input;
  const day = classifyFieldOpsDay(dateKey, input.now, tz);
  const sorted = [...input.missions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );
  const firstId = sorted[0]?.missionId ?? null;
  const primaryId = selectTodaysMission(
    sorted.map((m) => ({
      id: m.missionId,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      lifecyclePhase: m.lifecyclePhase as never,
    })),
    { now: input.now, timezone: tz },
  ).primaryId;

  const missions = sorted.map((m) => {
    const session = input.sessionsByMissionId.get(m.missionId) ?? null;
    const findings = evaluateFieldOpsFindings({
      context: m,
      session,
      config,
    });
    const readiness = deriveFieldOpsReadiness({
      context: m,
      session,
      findings,
    });
    const critical = (m.pack?.items ?? []).filter(
      (i) =>
        i.criticality === "CRITICAL" &&
        !["CANCELLED", "NOT_APPLICABLE"].includes(i.status),
    );
    const criticalUnconfirmedCount = critical.filter(
      (i) => !session?.confirmations.some((c) => c.logisticsItemId === i.id),
    ).length;
    const outstandingReturnCount = (m.pack?.items ?? []).filter(
      (i) =>
        i.returnRequired &&
        !["CANCELLED", "NOT_APPLICABLE"].includes(i.status) &&
        !session?.confirmations.some(
          (c) =>
            c.logisticsItemId === i.id &&
            ["RETURNED", "NOT_APPLICABLE"].includes(c.state),
        ),
    ).length;
    return {
      missionId: m.missionId,
      title: m.title,
      whenLabel: formatCampaignTime(m.startsAt, tz, { includeDate: false }),
      locationLabel: m.locationLabel,
      isFirst: m.missionId === firstId,
      isPrimary: m.missionId === primaryId,
      isCancelled: m.isCancelled,
      sessionExists: Boolean(session && !["CANCELLED"].includes(session.status)),
      sessionStatus: session?.status ?? null,
      readiness,
      readinessLabel: labelFieldOpsReadiness(readiness),
      criticalUnconfirmedCount,
      outstandingReturnCount,
      blockerCount: findings.filter(
        (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
      ).length,
      warningCount: findings.filter(
        (f) => f.severity === "WARNING" && !f.clearsForReadiness,
      ).length,
      findings: findings.slice(0, config.sectionLimits.findings),
      href: `/system/missions/${m.missionId}/field-ops`,
      logisticsHref: `/system/missions/${m.missionId}/logistics`,
      executeHref: `/system/missions/${m.missionId}/execute`,
    };
  });

  const withSessionCount = missions.filter((m) => m.sessionExists).length;
  const prev = addDaysToDateKey(dateKey, -1);
  const next = addDaysToDateKey(dateKey, 1);

  return {
    campaignDate: dateKey,
    dateLabel: formatFullCampaignDate(dateKey, tz),
    timezone: tz,
    generatedAt: input.now.toISOString(),
    ...day,
    summary: {
      missionCount: missions.length,
      withSessionCount,
      withoutSessionCount: missions.length - withSessionCount,
      blockerCount: missions.reduce((n, m) => n + m.blockerCount, 0),
      warningCount: missions.reduce((n, m) => n + m.warningCount, 0),
      firstMissionTitle: missions.find((m) => m.isFirst)?.title ?? null,
      primaryMissionTitle: missions.find((m) => m.isPrimary)?.title ?? null,
    },
    missions: missions.slice(0, config.sectionLimits.dayMissions),
    navigation: {
      todayHref: "/system/briefing/field-ops",
      briefingHref: `/system/briefing/${dateKey}`,
      launchHref: `/system/briefing/${dateKey}/launch`,
      logisticsHref: `/system/briefing/${dateKey}/logistics`,
      movementHref: `/system/briefing/${dateKey}/movement`,
      closeoutHref: `/system/briefing/${dateKey}/closeout`,
      commandCenterHref: "/system/missions/command-center",
      todaysMissionHref: "/",
      reportHref: `/system/briefing/${dateKey}/field-ops/report`,
      previousHref: `/system/briefing/${prev}/field-ops`,
      nextHref: `/system/briefing/${next}/field-ops`,
    },
    isolation: {
      mutatesMissionLifecycle: false,
      startsExecution: false,
      launchesCampaignDay: false,
    },
  };
}

export { scheduleFingerprint, travelFingerprint, logisticsFingerprint };
