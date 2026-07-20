import {
  DEFAULT_DAY_BRIEFING_CONFIG,
  type CampaignDayBriefingConfig,
} from "@/lib/missions/v21/day-briefing/briefing-config";
import {
  addDaysToDateKey,
  classifyBriefingDay,
  formatCampaignTime,
  formatFullCampaignDate,
} from "@/lib/missions/v21/day-briefing/briefing-date";
import {
  labelAttentionSeverity,
  labelBriefingStatus,
  labelEndOfDayStatus,
  labelRiskCategory,
  labelTimelineType,
} from "@/lib/missions/v21/day-briefing/labels";
import type {
  BriefingAttentionItem,
  CampaignDayActionItem,
  CampaignDayBriefingStatus,
  CampaignDayBriefingViewModel,
  CampaignDayDecisionItem,
  CampaignDayEndOfDayStatus,
  CampaignDayOrganizationItem,
  CampaignDayPersonItem,
  CampaignDayPreparationItem,
  CampaignDayPrimaryMission,
  CampaignDayResponsibilityItem,
  CampaignDayRiskItem,
  CampaignDayTimelineEntry,
  CampaignDayTravelLeg,
  DayBriefingMissionSnapshot,
} from "@/lib/missions/v21/day-briefing/types";
import { detectMissionAttention } from "@/lib/missions/v21/command-center/attention-rules";
import { rankAttentionItems } from "@/lib/missions/v21/command-center/attention-ranking";
import { DEFAULT_COMMAND_CENTER_CONFIG } from "@/lib/missions/v21/command-center/config";
import { labelMissionLifecyclePhase } from "@/lib/missions/v21/labels";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";
import {
  labelFollowUpActionStatus,
} from "@/lib/missions/v21/follow-up/labels";
import { formatRelativeAge } from "@/lib/missions/v21/command-center/time-windows";
import {
  isDueBeforeCampaignDay,
  isDueOnCampaignDay,
} from "@/lib/missions/v21/command-center/time-windows";

const OPEN = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

const TIMELINE_TYPE_RANK: Record<CampaignDayTimelineEntry["type"], number> = {
  DEPARTURE: 1,
  MISSION_START: 2,
  ARRIVAL_TARGET: 3,
  PREPARATION_DUE: 4,
  FOLLOW_UP_DUE: 5,
  APPROVAL_REQUIRED: 6,
  MISSION_END: 7,
  INTERNAL: 8,
};

function prepNotReady(m: DayBriefingMissionSnapshot): boolean {
  return (
    !m.preparation.exists ||
    m.preparation.readiness === "DRAFT" ||
    m.preparation.readiness === "NEEDS_ATTENTION" ||
    m.preparation.readiness == null
  );
}

function selectPrimaryMissionId(
  dayMissions: DayBriefingMissionSnapshot[],
  allForSelector: DayBriefingMissionSnapshot[],
  briefingDate: string,
  now: Date,
  timeZone: string,
  isToday: boolean,
  isPast: boolean,
): string | null {
  if (isToday) {
    const selection = selectTodaysMission(
      allForSelector.map((m) => ({
        id: m.missionId,
        startsAt: m.startsAt,
        endsAt: m.endsAt,
        lifecyclePhase: m.lifecyclePhase,
      })),
      { now, timezone: timeZone },
    );
    return selection.primaryId;
  }

  if (dayMissions.length === 0) return null;

  if (isPast) {
    const executed = dayMissions.filter(
      (m) =>
        m.execution.status === "IN_PROGRESS" ||
        m.execution.status === "COMPLETED" ||
        m.execution.status === "ARRIVED",
    );
    if (executed.length === 1) return executed[0].missionId;
    if (executed.length > 1) {
      return [...executed].sort((a, b) => {
        const t = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        if (t !== 0) return t;
        return a.missionId.localeCompare(b.missionId);
      })[0].missionId;
    }
  }

  return [...dayMissions].sort((a, b) => {
    const t = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (t !== 0) return t;
    return a.missionId.localeCompare(b.missionId);
  })[0].missionId;
}

function deriveBriefingStatus(
  dayMissions: DayBriefingMissionSnapshot[],
  prepRiskCount: number,
  now: Date,
  isFuture: boolean,
): CampaignDayBriefingStatus {
  if (dayMissions.length === 0) return "NO_SCHEDULED_MISSIONS";
  const active = dayMissions.some(
    (m) =>
      m.execution.status === "ARRIVED" ||
      m.execution.status === "IN_PROGRESS" ||
      m.lifecyclePhase === "EXECUTE",
  );
  if (active && !isFuture) return "ACTIVE_DAY";
  const allEnded = dayMissions.every(
    (m) => new Date(m.endsAt).getTime() < now.getTime(),
  );
  if (allEnded && !isFuture) return "DAY_COMPLETE";
  if (prepRiskCount > 0) return "NEEDS_PREPARATION";
  return "READY_TO_REVIEW";
}

function buildPrimaryCard(
  m: DayBriefingMissionSnapshot,
  timeZone: string,
): CampaignDayPrimaryMission {
  const primary = primaryActionForPhase(m.missionId, m.lifecyclePhase, {
    debriefStatus: m.debrief.status,
    followUpStatus: m.followUp.status,
  });
  const whoToFind = m.preparation.peopleBriefings
    .map((p) => p.name)
    .filter(Boolean)
    .slice(0, 6);
  const cannotForget = [
    ...m.preparation.commitmentsToAvoid.map((t) => `Avoid: ${t}`),
    ...m.preparation.sensitivities.map((t) => `Sensitivity: ${t}`),
    ...m.preparation.materialsNeeded.map((t) => `Bring: ${t}`),
  ].slice(0, 6);

  return {
    missionId: m.missionId,
    title: m.title,
    whenLabel: m.isAllDay
      ? "All day"
      : `${formatCampaignTime(m.startsAt, timeZone)} – ${formatCampaignTime(m.endsAt, timeZone)}`,
    locationLabel: m.locationLabel,
    lifecyclePhase: m.lifecyclePhase,
    lifecyclePhaseLabel: labelMissionLifecyclePhase(m.lifecyclePhase),
    operationalStatus: m.operationalStatus,
    preparationReadiness: m.preparation.readiness,
    objective: m.objective,
    strategicPurpose: m.preparation.strategicPurpose,
    keyMessage: m.preparation.keyMessage,
    successCriteria: m.successCriteria,
    whoToFind,
    cannotForget,
    primaryHref: primary.href,
    primaryActionLabel: primary.label,
    secondaryHref: `/system/missions/${m.missionId}`,
    secondaryActionLabel: "Open Mission Record",
  };
}

function detectOverlaps(
  dayMissions: DayBriefingMissionSnapshot[],
  timeZone: string,
): CampaignDayRiskItem[] {
  const risks: CampaignDayRiskItem[] = [];
  const timed = dayMissions.filter((m) => !m.isAllDay);
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      const aStart = new Date(a.startsAt).getTime();
      const aEnd = new Date(a.endsAt).getTime();
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        const overlapStart = new Date(Math.max(aStart, bStart)).toISOString();
        const overlapEnd = new Date(Math.min(aEnd, bEnd)).toISOString();
        risks.push({
          id: `overlap:${a.missionId}:${b.missionId}`,
          category: "SCHEDULE",
          categoryLabel: labelRiskCategory("SCHEDULE"),
          missionId: a.missionId,
          missionTitle: a.title,
          issue: `Schedule overlap between “${a.title}” and “${b.title}” from ${formatCampaignTime(overlapStart, timeZone)} to ${formatCampaignTime(overlapEnd, timeZone)}. Locations: ${a.locationLabel ?? "Location unknown"} / ${b.locationLabel ?? "Location unknown"}.`,
          severity: "HIGH",
          severityLabel: labelAttentionSeverity("HIGH"),
          timeContext: "Schedule overlap",
          href: `/system/missions/${a.missionId}`,
        });
      }
    }
  }
  return risks;
}

export function buildCampaignDayBriefingViewModel(input: {
  briefingDate: string;
  now: Date;
  campaignTimezone: string;
  dayMissions: DayBriefingMissionSnapshot[];
  /** Broader set for Today’s Mission selector (active phases nearby). */
  selectorMissions: DayBriefingMissionSnapshot[];
  /** Unresolved follow-up / overdue work not necessarily scheduled today. */
  operationalMissions: DayBriefingMissionSnapshot[];
  tomorrowMissions: DayBriefingMissionSnapshot[];
  config?: CampaignDayBriefingConfig;
}): CampaignDayBriefingViewModel {
  const config = input.config ?? DEFAULT_DAY_BRIEFING_CONFIG;
  const tz = input.campaignTimezone;
  const { briefingDate, now } = input;
  const { isToday, isPast, isFuture } = classifyBriefingDay(
    briefingDate,
    now,
    tz,
  );
  const limits = config.sectionLimits;

  const dayMissions = [...input.dayMissions].sort((a, b) => {
    const t = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (t !== 0) return t;
    return a.missionId.localeCompare(b.missionId);
  });

  const primaryId = selectPrimaryMissionId(
    dayMissions,
    input.selectorMissions.length ? input.selectorMissions : dayMissions,
    briefingDate,
    now,
    tz,
    isToday,
    isPast,
  );
  const primaryMission = primaryId
    ? buildPrimaryCard(
        dayMissions.find((m) => m.missionId === primaryId) ??
          input.selectorMissions.find((m) => m.missionId === primaryId)!,
        tz,
      )
    : null;

  // —— Preparation ——
  const preparationAll: CampaignDayPreparationItem[] = [];
  for (const m of dayMissions) {
    const baseHref = `/system/missions/${m.missionId}/prepare`;
    if (!m.preparation.exists) {
      preparationAll.push({
        id: `${m.missionId}:no-prep`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "No preparation record",
        stateLabel: "Missing",
        ownerLabel: null,
        timeContext: `Starts ${formatCampaignTime(m.startsAt, tz, { includeDate: true })}`,
        rank: 1,
        href: baseHref,
      });
      continue;
    }
    if (m.preparation.readiness === "NEEDS_ATTENTION") {
      preparationAll.push({
        id: `${m.missionId}:needs-attention`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "Preparation marked Needs Attention",
        stateLabel: "Needs Attention",
        ownerLabel: null,
        timeContext: null,
        rank: 1,
        href: baseHref,
      });
    }
    if (m.preparation.readiness === "DRAFT") {
      preparationAll.push({
        id: `${m.missionId}:draft`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "Preparation still draft",
        stateLabel: "Draft",
        ownerLabel: null,
        timeContext: null,
        rank: 1,
        href: baseHref,
      });
    }
    if (!m.preparation.keyMessage) {
      preparationAll.push({
        id: `${m.missionId}:key-message`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "No key message has been prepared",
        stateLabel: "Missing",
        ownerLabel: null,
        timeContext: null,
        rank: 4,
        href: baseHref,
      });
    }
    if (!m.preparation.strategicPurpose) {
      preparationAll.push({
        id: `${m.missionId}:purpose`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "No strategic purpose has been prepared",
        stateLabel: "Missing",
        ownerLabel: null,
        timeContext: null,
        rank: 5,
        href: baseHref,
      });
    }
    if (
      !m.preparation.arrivalInstructions &&
      !m.travelPlan?.parkingInstructions &&
      !m.preparation.parkingInstructions
    ) {
      preparationAll.push({
        id: `${m.missionId}:logistics`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "Critical logistics missing (arrival or parking)",
        stateLabel: "Missing",
        ownerLabel: null,
        timeContext: null,
        rank: 2,
        href: baseHref,
      });
    }
    if (m.preparation.peopleBriefings.length === 0) {
      preparationAll.push({
        id: `${m.missionId}:people`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "No people briefing has been entered",
        stateLabel: "Missing",
        ownerLabel: null,
        timeContext: null,
        rank: 6,
        href: baseHref,
      });
    }
    if (m.preparation.organizationBriefings.length === 0) {
      preparationAll.push({
        id: `${m.missionId}:orgs`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: "No organization briefing has been entered",
        stateLabel: "Missing",
        ownerLabel: null,
        timeContext: null,
        rank: 6,
        href: baseHref,
      });
    }
    for (const task of m.preparation.preparationTasks.filter((t) => !t.completed)) {
      preparationAll.push({
        id: `${m.missionId}:task:${task.id}`,
        missionId: m.missionId,
        missionTitle: m.title,
        requirement: task.label,
        stateLabel: "Incomplete",
        ownerLabel: task.owner,
        timeContext: task.dueAt
          ? `Due ${formatCampaignTime(task.dueAt, tz, { includeDate: true })}`
          : null,
        rank: 7,
        href: baseHref,
      });
    }
  }
  preparationAll.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const am = dayMissions.find((m) => m.missionId === a.missionId);
    const bm = dayMissions.find((m) => m.missionId === b.missionId);
    const at = am ? new Date(am.startsAt).getTime() : 0;
    const bt = bm ? new Date(bm.startsAt).getTime() : 0;
    if (at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });

  // —— Travel ——
  const travel: CampaignDayTravelLeg[] = dayMissions.map((m) => {
    const departureAt =
      m.travelPlan?.departureAt ?? m.eventDepartureAt ?? null;
    const arrivalTargetAt =
      m.travelPlan?.targetArrivalAt ?? m.eventArrivalAt ?? null;
    const missingDeparture = !departureAt;
    let stateLabel = "Prepared";
    if (missingDeparture && !arrivalTargetAt) stateLabel = "Needs review";
    else if (missingDeparture) stateLabel = "Missing departure time";
    else if (!m.locationLabel) stateLabel = "Missing destination detail";
    return {
      id: `travel:${m.missionId}`,
      missionId: m.missionId,
      missionTitle: m.title,
      destinationLabel: m.locationLabel,
      departureAt,
      departureLabel: departureAt
        ? formatCampaignTime(departureAt, tz)
        : null,
      arrivalTargetAt,
      arrivalTargetLabel: arrivalTargetAt
        ? formatCampaignTime(arrivalTargetAt, tz)
        : null,
      durationMinutes: m.travelPlan?.estimatedDurationMinutes ?? null,
      parking:
        m.travelPlan?.parkingInstructions ??
        m.preparation.parkingInstructions ??
        null,
      arrivalInstructions: m.preparation.arrivalInstructions,
      accessibilityNotes: m.preparation.accessibilityNotes,
      stateLabel,
      missingDeparture,
      href: `/system/missions/${m.missionId}/prepare`,
    };
  });

  // —— Timeline ——
  const timelineAll: CampaignDayTimelineEntry[] = [];
  for (const m of dayMissions) {
    const dep = m.travelPlan?.departureAt ?? m.eventDepartureAt;
    if (dep) {
      timelineAll.push({
        id: `tl:dep:${m.missionId}`,
        type: "DEPARTURE",
        typeLabel: labelTimelineType("DEPARTURE"),
        sortAt: dep,
        isAllDay: false,
        timeLabel: formatCampaignTime(dep, tz),
        title: `Leave for ${m.title}`,
        locationLabel: m.locationLabel,
        statusLabel: null,
        missionId: m.missionId,
        href: `/system/missions/${m.missionId}/prepare`,
        severity: null,
        severityLabel: null,
        sourceLabel: "From Calendar",
      });
    }
    const arr = m.travelPlan?.targetArrivalAt ?? m.eventArrivalAt;
    if (arr) {
      timelineAll.push({
        id: `tl:arr:${m.missionId}`,
        type: "ARRIVAL_TARGET",
        typeLabel: labelTimelineType("ARRIVAL_TARGET"),
        sortAt: arr,
        isAllDay: false,
        timeLabel: formatCampaignTime(arr, tz),
        title: `Arrival target — ${m.title}`,
        locationLabel: m.locationLabel,
        statusLabel: null,
        missionId: m.missionId,
        href: `/system/missions/${m.missionId}/prepare`,
        severity: null,
        severityLabel: null,
        sourceLabel: "From Calendar",
      });
    }
    timelineAll.push({
      id: `tl:start:${m.missionId}`,
      type: "MISSION_START",
      typeLabel: labelTimelineType("MISSION_START"),
      sortAt: m.isAllDay ? null : m.startsAt,
      isAllDay: m.isAllDay,
      timeLabel: m.isAllDay ? "All day" : formatCampaignTime(m.startsAt, tz),
      title: m.title,
      locationLabel: m.locationLabel,
      statusLabel: labelMissionLifecyclePhase(m.lifecyclePhase),
      missionId: m.missionId,
      href: `/system/missions/${m.missionId}`,
      severity: null,
      severityLabel: null,
      sourceLabel: "From Calendar",
    });
    if (!m.isAllDay) {
      timelineAll.push({
        id: `tl:end:${m.missionId}`,
        type: "MISSION_END",
        typeLabel: labelTimelineType("MISSION_END"),
        sortAt: m.endsAt,
        isAllDay: false,
        timeLabel: formatCampaignTime(m.endsAt, tz),
        title: `End — ${m.title}`,
        locationLabel: m.locationLabel,
        statusLabel: null,
        missionId: m.missionId,
        href: `/system/missions/${m.missionId}`,
        severity: null,
        severityLabel: null,
        sourceLabel: "From Calendar",
      });
    }
  }

  // —— Due / overdue from operational missions ——
  const dueTodayAll: CampaignDayActionItem[] = [];
  const overdueAll: CampaignDayActionItem[] = [];
  const seenAction = new Set<string>();

  for (const m of [...dayMissions, ...input.operationalMissions]) {
    for (const action of m.followUp.actions) {
      if (!OPEN.has(action.status)) continue;
      if (seenAction.has(action.id)) continue;
      seenAction.add(action.id);

      const ownerLabel =
        action.ownerType === "UNASSIGNED"
          ? "No owner is assigned"
          : action.ownerName?.trim() || action.ownerType;

      const dueOnToday =
        (action.dueAt && isDueOnCampaignDay(action.dueAt, now, tz)) ||
        (action.nextCheckAt &&
          action.status === "WAITING" &&
          isDueOnCampaignDay(action.nextCheckAt, now, tz));
      const overdue =
        action.dueAt != null && isDueBeforeCampaignDay(action.dueAt, now, tz);

      const sourceGroup =
        action.sourceType === "EXECUTE_COMMITMENT"
          ? "COMMITMENTS"
          : action.sourceType === "UNRESOLVED_QUESTION"
            ? "QUESTIONS"
            : "MISSION_FOLLOW_UP";

      const item: CampaignDayActionItem = {
        id: action.id,
        title: action.title,
        missionId: m.missionId,
        missionTitle: m.title,
        ownerLabel,
        dueAt: action.dueAt ?? action.nextCheckAt,
        dueLabel: action.dueAt
          ? overdue
            ? `Overdue · ${campaignDateKey(action.dueAt, tz)}`
            : isDueOnCampaignDay(action.dueAt, now, tz)
              ? "Due today"
              : `Due ${campaignDateKey(action.dueAt, tz)}`
          : action.nextCheckAt
            ? "Next check today"
            : "No due date",
        priority: action.priority,
        status: action.status,
        statusLabel: labelFollowUpActionStatus(action.status),
        sourceGroup,
        relatedLabel: [action.relatedPersonName, action.relatedOrganizationName]
          .filter(Boolean)
          .join(" · ") || null,
        href: `/system/missions/${m.missionId}/follow-up`,
        overdueByDays: null,
      };

      if (overdue) {
        const dueKey = campaignDateKey(action.dueAt!, tz);
        const todayKey = campaignDateKey(now, tz);
        const [dy, dm, dd] = dueKey.split("-").map(Number);
        const [ty, tm, td] = todayKey.split("-").map(Number);
        const days = Math.round(
          (Date.UTC(ty, tm - 1, td) - Date.UTC(dy, dm - 1, dd)) / 86_400_000,
        );
        item.overdueByDays = days;
        item.dueLabel = `Overdue by ${days} day${days === 1 ? "" : "s"}`;
        overdueAll.push(item);
      } else if (dueOnToday || (isToday && dueOnToday)) {
        dueTodayAll.push(item);
      } else if (
        action.dueAt &&
        campaignDateKey(action.dueAt, tz) === briefingDate
      ) {
        // Briefing for a specific day: show actions due on that day
        dueTodayAll.push({
          ...item,
          dueLabel: "Due this briefing day",
        });
      } else if (
        action.nextCheckAt &&
        action.status === "WAITING" &&
        campaignDateKey(action.nextCheckAt, tz) === briefingDate
      ) {
        dueTodayAll.push({
          ...item,
          dueLabel: "Next check this briefing day",
        });
      }
    }

    // Prep tasks due on briefing date
    for (const task of m.preparation.preparationTasks) {
      if (task.completed || !task.dueAt) continue;
      if (campaignDateKey(task.dueAt, tz) !== briefingDate) continue;
      dueTodayAll.push({
        id: `prep-task:${m.missionId}:${task.id}`,
        title: task.label,
        missionId: m.missionId,
        missionTitle: m.title,
        ownerLabel: task.owner ?? "No owner is assigned",
        dueAt: task.dueAt,
        dueLabel: "Due this briefing day",
        priority: null,
        status: "OPEN",
        statusLabel: "Incomplete",
        sourceGroup: "PREPARATION",
        relatedLabel: null,
        href: `/system/missions/${m.missionId}/prepare`,
        overdueByDays: null,
      });
    }
  }

  const overdueRank = (a: CampaignDayActionItem): number => {
    if (a.sourceGroup === "COMMITMENTS" && a.priority === "URGENT") return 1;
    if (a.sourceGroup === "COMMITMENTS" && a.priority === "IMPORTANT") return 2;
    if (a.priority === "URGENT") return 3;
    if (a.priority === "IMPORTANT") return 4;
    return 8;
  };
  overdueAll.sort((a, b) => {
    const r = overdueRank(a) - overdueRank(b);
    if (r !== 0) return r;
    const ad = a.dueAt ? new Date(a.dueAt).getTime() : 0;
    const bd = b.dueAt ? new Date(b.dueAt).getTime() : 0;
    if (ad !== bd) return ad - bd;
    return a.id.localeCompare(b.id);
  });
  dueTodayAll.sort((a, b) => {
    const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.id.localeCompare(b.id);
  });

  // —— Leadership decisions ——
  const decisionsAll: CampaignDayDecisionItem[] = [];
  for (const m of [...dayMissions, ...input.operationalMissions]) {
    if (m.debrief.status === "COMPLETED") {
      decisionsAll.push({
        id: `dec:debrief:${m.missionId}`,
        reason: "DEBRIEF_APPROVAL_REQUIRED",
        label: "Debrief awaiting approval",
        explanation: `Debrief for “${m.title}” is completed and waiting for authorized approval.`,
        missionId: m.missionId,
        missionTitle: m.title,
        ageLabel: formatRelativeAge(m.debrief.completedAt, now),
        severity: "NORMAL",
        severityLabel: labelAttentionSeverity("NORMAL"),
        requiredPermission: "Debrief approval",
        href: `/system/missions/${m.missionId}/debrief`,
      });
    }
    if (m.followUp.status === "READY_TO_CLOSE" && !m.followUp.closedAt) {
      decisionsAll.push({
        id: `dec:close:${m.missionId}`,
        reason: "MISSION_CLOSEOUT_REVIEW",
        label: "Mission ready for closeout",
        explanation: `Follow-up workspace for “${m.title}” is ready to close.`,
        missionId: m.missionId,
        missionTitle: m.title,
        ageLabel: null,
        severity: "HIGH",
        severityLabel: labelAttentionSeverity("HIGH"),
        requiredPermission: "Mission closeout",
        href: `/system/missions/${m.missionId}/follow-up`,
      });
    }
    if (m.preparation.readiness === "NEEDS_ATTENTION") {
      decisionsAll.push({
        id: `dec:prep:${m.missionId}`,
        reason: "PREPARATION_LEADERSHIP_REVIEW",
        label: "Preparation needs leadership review",
        explanation: `Preparation for “${m.title}” is marked Needs Attention.`,
        missionId: m.missionId,
        missionTitle: m.title,
        ageLabel: null,
        severity: "HIGH",
        severityLabel: labelAttentionSeverity("HIGH"),
        requiredPermission: "Preparation review",
        href: `/system/missions/${m.missionId}/prepare`,
      });
    }
    for (const action of m.followUp.actions) {
      if (action.status === "BLOCKED" && action.priority === "URGENT") {
        decisionsAll.push({
          id: `dec:block:${action.id}`,
          reason: "FOLLOW_UP_BLOCKER_APPROVAL",
          label: "Blocked Follow-up needs decision",
          explanation: action.blockedReason
            ? `Blocked: ${action.blockedReason}`
            : `Urgent Follow-up is blocked: ${action.title}`,
          missionId: m.missionId,
          missionTitle: m.title,
          ageLabel: null,
          severity: "CRITICAL",
          severityLabel: labelAttentionSeverity("CRITICAL"),
          requiredPermission: "Follow-up management",
          href: `/system/missions/${m.missionId}/follow-up`,
        });
      }
    }
    if (
      m.followUp.exists &&
      m.followUp.status !== "NOT_STARTED" &&
      m.debrief.status !== "APPROVED"
    ) {
      decisionsAll.push({
        id: `dec:integrity:${m.missionId}`,
        reason: "RECORD_INTEGRITY_REVIEW",
        label: "Record review needed",
        explanation:
          "Follow-up workspace exists without an approved Debrief.",
        missionId: m.missionId,
        missionTitle: m.title,
        ageLabel: null,
        severity: "NORMAL",
        severityLabel: labelAttentionSeverity("NORMAL"),
        requiredPermission: "Mission record review",
        href: `/system/missions/${m.missionId}`,
      });
    }
  }

  const overlaps = detectOverlaps(dayMissions, tz);
  for (const o of overlaps) {
    decisionsAll.push({
      id: `dec:${o.id}`,
      reason: "SCHEDULE_CONFLICT_REVIEW",
      label: "Schedule overlap",
      explanation: o.issue,
      missionId: o.missionId,
      missionTitle: o.missionTitle,
      ageLabel: null,
      severity: "HIGH",
      severityLabel: labelAttentionSeverity("HIGH"),
      requiredPermission: "Schedule review",
      href: o.href,
    });
  }

  // Deduplicate decisions by id
  const decisionsDedup = [
    ...new Map(decisionsAll.map((d) => [d.id, d])).values(),
  ];

  // —— Risks (Command Center attention + overlaps + integrity) ——
  const riskMissions = isFuture ? dayMissions : [...dayMissions, ...input.operationalMissions];
  const attention = rankAttentionItems(
    riskMissions.flatMap((m) =>
      detectMissionAttention(
        {
          missionId: m.missionId,
          title: m.title,
          startsAt: m.startsAt,
          endsAt: m.endsAt,
          timezone: m.timezone,
          locationLabel: m.locationLabel,
          lifecyclePhase: m.lifecyclePhase,
          operationalStatus: m.operationalStatus,
          travelRequired: m.travelRequired,
          objective: m.objective,
          preparation: {
            exists: m.preparation.exists,
            readiness: m.preparation.readiness,
            strategicPurpose: m.preparation.strategicPurpose,
            keyMessage: m.preparation.keyMessage,
          },
          execution: {
            exists: m.execution.exists,
            status: m.execution.status,
            arrivedAt: m.execution.arrivedAt,
            startedAt: m.execution.startedAt,
            endedAt: m.execution.endedAt,
            observationCount: 0,
            commitmentCount: 0,
            followUpCount: 0,
          },
          debrief: {
            exists: m.debrief.exists,
            status: m.debrief.status,
            outcomeAssessment: m.debrief.outcomeAssessment,
            approvedFollowUpCount: 0,
            completedAt: m.debrief.completedAt,
            approvedAt: m.debrief.approvedAt,
          },
          followUp: {
            exists: m.followUp.exists,
            status: m.followUp.status,
            completedAt: null,
            closedAt: m.followUp.closedAt,
            closedByUserId: null,
            closeoutSummary: null,
            actions: m.followUp.actions.map((a) => ({
              ...a,
              waitingReason: null,
              sourceSnapshot: null,
            })),
          },
        },
        now,
        DEFAULT_COMMAND_CENTER_CONFIG,
        tz,
      ),
    ),
  );

  // Future: strip execution-as-actual fabricated appearance — filter execution attention for future days
  const attentionFiltered = isFuture
    ? attention.filter(
        (a) =>
          a.reason !== "EXECUTION_NOT_STARTED" &&
          a.reason !== "EXECUTION_OVERRUN" &&
          a.reason !== "ARRIVED_NOT_BEGUN",
      )
    : attention;

  const risksAll: CampaignDayRiskItem[] = [
    ...overlaps,
    ...attentionFiltered.map((a) => {
      let category: CampaignDayRiskItem["category"] = "FOLLOW_UP";
      if (a.reason.startsWith("EXECUTION")) category = "EXECUTION";
      else if (a.reason.startsWith("PREPARATION")) category = "PREPARATION";
      else if (a.reason.startsWith("DEBRIEF")) category = "DEBRIEF";
      else if (a.reason.includes("COMMITMENT")) category = "COMMITMENT";
      else if (a.reason === "RECORD_INTEGRITY_REVIEW") category = "DATA_INTEGRITY";
      else if (a.reason.includes("APPROVAL")) category = "APPROVAL";
      return {
        id: `risk:${a.id}`,
        category,
        categoryLabel: labelRiskCategory(category),
        missionId: a.missionId,
        missionTitle: a.missionTitle,
        issue: a.explanation,
        severity: a.severity,
        severityLabel: a.severityLabel,
        timeContext: a.timeContext,
        href: a.href,
      };
    }),
  ];

  // Future integrity: execution exists for future mission
  if (isFuture) {
    for (const m of dayMissions) {
      if (m.execution.exists) {
        risksAll.push({
          id: `risk:future-exec:${m.missionId}`,
          category: "DATA_INTEGRITY",
          categoryLabel: labelRiskCategory("DATA_INTEGRITY"),
          missionId: m.missionId,
          missionTitle: m.title,
          issue:
            "Execution record exists for a future Mission. Record review needed.",
          severity: "NORMAL",
          severityLabel: labelAttentionSeverity("NORMAL"),
          timeContext: null,
          href: `/system/missions/${m.missionId}`,
        });
      }
    }
  }

  // Add follow-up dues to timeline for briefing date
  for (const item of dueTodayAll) {
    if (!item.dueAt) continue;
    timelineAll.push({
      id: `tl:fu:${item.id}`,
      type: item.sourceGroup === "APPROVALS" ? "APPROVAL_REQUIRED" : "FOLLOW_UP_DUE",
      typeLabel: labelTimelineType(
        item.sourceGroup === "APPROVALS" ? "APPROVAL_REQUIRED" : "FOLLOW_UP_DUE",
      ),
      sortAt: item.dueAt,
      isAllDay: false,
      timeLabel: formatCampaignTime(item.dueAt, tz),
      title: item.title,
      locationLabel: null,
      statusLabel: item.statusLabel,
      missionId: item.missionId,
      href: item.href,
      severity: item.priority === "URGENT" ? "HIGH" : null,
      severityLabel:
        item.priority === "URGENT" ? labelAttentionSeverity("HIGH") : null,
      sourceLabel: "From Follow-up",
    });
  }

  for (const d of decisionsDedup.filter(
    (x) => x.reason === "DEBRIEF_APPROVAL_REQUIRED",
  )) {
    timelineAll.push({
      id: `tl:appr:${d.id}`,
      type: "APPROVAL_REQUIRED",
      typeLabel: labelTimelineType("APPROVAL_REQUIRED"),
      sortAt: null,
      isAllDay: true,
      timeLabel: "All day",
      title: d.label,
      locationLabel: null,
      statusLabel: null,
      missionId: d.missionId,
      href: d.href,
      severity: d.severity,
      severityLabel: d.severityLabel,
      sourceLabel: "From Debrief",
    });
  }

  timelineAll.sort((a, b) => {
    if (a.sortAt && b.sortAt) {
      const t = new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime();
      if (t !== 0) return t;
      const tr = TIMELINE_TYPE_RANK[a.type] - TIMELINE_TYPE_RANK[b.type];
      if (tr !== 0) return tr;
      return a.id.localeCompare(b.id);
    }
    if (a.sortAt && !b.sortAt) return -1;
    if (!a.sortAt && b.sortAt) return 1;
    const tr = TIMELINE_TYPE_RANK[a.type] - TIMELINE_TYPE_RANK[b.type];
    if (tr !== 0) return tr;
    return a.id.localeCompare(b.id);
  });

  // —— Messages / people / orgs ——
  const missionMessages = dayMissions.map((m) => ({
    missionId: m.missionId,
    missionTitle: m.title,
    keyMessage: m.preparation.keyMessage,
    desiredImpression: m.preparation.desiredImpression,
    openingApproach: m.preparation.openingApproach,
    closingApproach: m.preparation.closingApproach,
    questionsToAsk: m.preparation.questionsToAsk,
    commitmentsToAvoid: m.preparation.commitmentsToAvoid,
    sensitivities: m.preparation.sensitivities,
    href: `/system/missions/${m.missionId}/prepare`,
  }));

  const peopleRaw: CampaignDayPersonItem[] = [];
  for (const m of dayMissions) {
    for (const p of m.preparation.peopleBriefings) {
      peopleRaw.push({
        id: `${m.missionId}:${p.id}`,
        name: p.name,
        role: p.roleOrTitle,
        organization: p.organization,
        missionId: m.missionId,
        missionTitle: m.title,
        whyTheyMatter: p.whyTheyMatter,
        conversationGoal: p.conversationGoal,
        appearsInMissionCount: 1,
        stableId: p.linkedPersonId,
        href: `/system/missions/${m.missionId}/prepare`,
      });
    }
  }
  const stableCounts = new Map<string, number>();
  for (const p of peopleRaw) {
    if (!p.stableId) continue;
    stableCounts.set(p.stableId, (stableCounts.get(p.stableId) ?? 0) + 1);
  }
  const people = peopleRaw.map((p) => ({
    ...p,
    appearsInMissionCount: p.stableId
      ? (stableCounts.get(p.stableId) ?? 1)
      : 1,
  }));

  const orgRaw: CampaignDayOrganizationItem[] = [];
  for (const m of dayMissions) {
    for (const o of m.preparation.organizationBriefings) {
      orgRaw.push({
        id: `${m.missionId}:${o.id}`,
        name: o.name,
        missionId: m.missionId,
        missionTitle: m.title,
        whyItMatters: o.relationshipToMission,
        desiredOutcome: o.desiredOutcome,
        appearsInMissionCount: 1,
        href: `/system/missions/${m.missionId}/prepare`,
      });
    }
  }
  const orgNameCounts = new Map<string, number>();
  // Only flag duplicates with same name across missions (informational; no merge)
  for (const o of orgRaw) {
    const key = o.name.trim().toLowerCase();
    orgNameCounts.set(key, (orgNameCounts.get(key) ?? 0) + 1);
  }
  const organizations = orgRaw.map((o) => ({
    ...o,
    appearsInMissionCount: orgNameCounts.get(o.name.trim().toLowerCase()) ?? 1,
  }));

  // —— End of day ——
  const endOfDayAll: CampaignDayResponsibilityItem[] = [];
  if (!isFuture) {
    for (const m of dayMissions) {
      if (
        m.execution.status === "IN_PROGRESS" ||
        m.execution.status === "ARRIVED"
      ) {
        endOfDayAll.push({
          id: `eod:exec:${m.missionId}`,
          reason: "EXECUTION_STILL_ACTIVE",
          label: "End active Mission execution",
          missionId: m.missionId,
          missionTitle: m.title,
          actionLabel: "Open Execute Mode",
          href: `/system/missions/${m.missionId}/execute`,
          severity: "CRITICAL",
          severityLabel: labelAttentionSeverity("CRITICAL"),
        });
      }
      if (
        m.execution.status === "COMPLETED" &&
        (!m.debrief.exists || m.debrief.status === "NOT_STARTED")
      ) {
        endOfDayAll.push({
          id: `eod:deb:${m.missionId}`,
          reason: "DEBRIEF_NOT_STARTED",
          label: "Complete same-day Debrief",
          missionId: m.missionId,
          missionTitle: m.title,
          actionLabel: "Start Debrief",
          href: `/system/missions/${m.missionId}/debrief`,
          severity: "HIGH",
          severityLabel: labelAttentionSeverity("HIGH"),
        });
      }
      if (m.debrief.status === "IN_PROGRESS") {
        endOfDayAll.push({
          id: `eod:debi:${m.missionId}`,
          reason: "DEBRIEF_IN_PROGRESS",
          label: "Continue Debrief before day close",
          missionId: m.missionId,
          missionTitle: m.title,
          actionLabel: "Continue Debrief",
          href: `/system/missions/${m.missionId}/debrief`,
          severity: "HIGH",
          severityLabel: labelAttentionSeverity("HIGH"),
        });
      }
    }
    for (const a of dueTodayAll) {
      endOfDayAll.push({
        id: `eod:due:${a.id}`,
        reason: "DUE_ACTION_OPEN",
        label: `Review due-today work: ${a.title}`,
        missionId: a.missionId,
        missionTitle: a.missionTitle,
        actionLabel: "Open Follow-up",
        href: a.href,
        severity: a.priority === "URGENT" ? "HIGH" : "NORMAL",
        severityLabel: labelAttentionSeverity(
          a.priority === "URGENT" ? "HIGH" : "NORMAL",
        ),
      });
    }
    for (const a of overdueAll.filter((x) => x.priority === "URGENT").slice(0, 3)) {
      if (a.ownerLabel === "No owner is assigned") {
        endOfDayAll.push({
          id: `eod:unown:${a.id}`,
          reason: "URGENT_ACTION_UNASSIGNED",
          label: `Assign unowned urgent follow-up: ${a.title}`,
          missionId: a.missionId,
          missionTitle: a.missionTitle,
          actionLabel: "Open Follow-up",
          href: a.href,
          severity: "CRITICAL",
          severityLabel: labelAttentionSeverity("CRITICAL"),
        });
      }
    }
    if (decisionsDedup.length) {
      endOfDayAll.push({
        id: "eod:leadership",
        reason: "LEADERSHIP_DECISION_PENDING",
        label: "Resolve pending leadership decisions",
        missionId: null,
        missionTitle: null,
        actionLabel: "Review decisions below",
        href: "#leadership-decisions",
        severity: "HIGH",
        severityLabel: labelAttentionSeverity("HIGH"),
      });
    }
  }

  // Tomorrow preview
  let tomorrowPreview: CampaignDayBriefingViewModel["tomorrowPreview"] = null;
  if (config.tomorrowPreviewEnabled) {
    const tomorrowKey = addDaysToDateKey(briefingDate, 1);
    const tMissions = [...input.tomorrowMissions].sort((a, b) => {
      const t = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (t !== 0) return t;
      return a.missionId.localeCompare(b.missionId);
    });
    const first = tMissions[0] ?? null;
    const dep =
      first?.travelPlan?.departureAt ?? first?.eventDepartureAt ?? null;
    const dueTomorrowCount = input.operationalMissions.reduce((n, m) => {
      return (
        n +
        m.followUp.actions.filter(
          (a) =>
            OPEN.has(a.status) &&
            a.dueAt &&
            campaignDateKey(a.dueAt, tz) === tomorrowKey,
        ).length
      );
    }, 0);

    if (first && prepNotReady(first) && isToday) {
      endOfDayAll.push({
        id: `eod:tmr-prep:${first.missionId}`,
        reason: "TOMORROW_PREPARATION_NOT_READY",
        label: "Prepare tomorrow’s first Mission",
        missionId: first.missionId,
        missionTitle: first.title,
        actionLabel: "Open Prepare Mode",
        href: `/system/missions/${first.missionId}/prepare`,
        severity: "HIGH",
        severityLabel: labelAttentionSeverity("HIGH"),
      });
    }
    if (first && !dep && isToday) {
      endOfDayAll.push({
        id: `eod:tmr-dep:${first.missionId}`,
        reason: "TOMORROW_DEPARTURE_NOT_SET",
        label: "Set tomorrow’s departure plan",
        missionId: first.missionId,
        missionTitle: first.title,
        actionLabel: "Open Prepare Mode",
        href: `/system/missions/${first.missionId}/prepare`,
        severity: "NORMAL",
        severityLabel: labelAttentionSeverity("NORMAL"),
      });
    }

    tomorrowPreview = {
      dateKey: tomorrowKey,
      firstMissionId: first?.missionId ?? null,
      firstMissionTitle: first?.title ?? null,
      firstMissionTimeLabel: first
        ? first.isAllDay
          ? "All day"
          : formatCampaignTime(first.startsAt, tz)
        : null,
      locationLabel: first?.locationLabel ?? null,
      preparationReadiness: first?.preparation.readiness ?? null,
      departureLabel: dep ? formatCampaignTime(dep, tz) : null,
      missingDeparture: Boolean(first && !dep),
      preparationGap: first && prepNotReady(first)
        ? "Preparation needs attention"
        : first && !first.preparation.keyMessage
          ? "No key message has been prepared"
          : null,
      dueTomorrowCount,
      briefingHref: `/system/briefing/${tomorrowKey}`,
    };
  }

  let endOfDayStatus: CampaignDayEndOfDayStatus = "CLEAR";
  if (
    endOfDayAll.some((e) => e.reason === "EXECUTION_STILL_ACTIVE")
  ) {
    endOfDayStatus = "ACTIVE_EXECUTION_REMAINS";
  } else if (decisionsDedup.length > 0) {
    endOfDayStatus = "LEADERSHIP_REVIEW_REMAINS";
  } else if (endOfDayAll.length > 0 || dueTodayAll.length > 0) {
    endOfDayStatus = "WORK_REMAINS";
  }

  const prepRiskCount = preparationAll.filter((p) => p.rank <= 4).length;
  const briefingStatus = deriveBriefingStatus(
    dayMissions,
    prepRiskCount,
    now,
    isFuture,
  );

  const timedStarts = dayMissions.filter((m) => !m.isAllDay);
  const firstMission = timedStarts[0] ?? dayMissions[0] ?? null;
  const finalMission =
    timedStarts[timedStarts.length - 1] ??
    dayMissions[dayMissions.length - 1] ??
    null;
  const firstDeparture = travel.find((t) => t.departureAt)?.departureAt ?? null;

  const topAttention: BriefingAttentionItem | null = attentionFiltered[0]
    ? {
        id: attentionFiltered[0].id,
        label: attentionFiltered[0].label,
        severity: attentionFiltered[0].severity,
        severityLabel: attentionFiltered[0].severityLabel,
        explanation: attentionFiltered[0].explanation,
        href: attentionFiltered[0].href,
        missionId: attentionFiltered[0].missionId,
      }
    : overlaps[0]
      ? {
          id: overlaps[0].id,
          label: "Schedule overlap",
          severity: "HIGH",
          severityLabel: labelAttentionSeverity("HIGH"),
          explanation: overlaps[0].issue,
          href: overlaps[0].href,
          missionId: overlaps[0].missionId,
        }
      : null;

  const sentences: string[] = [];
  if (dayMissions.length === 0) {
    sentences.push(
      "No Missions are scheduled today. Campaign responsibility remains in follow-up, approvals, and preparation for upcoming events.",
    );
  } else {
    const n = dayMissions.length;
    sentences.push(
      `Kelly has ${n} Mission${n === 1 ? "" : "s"} scheduled for this campaign day.`,
    );
    if (firstMission && !firstMission.isAllDay) {
      sentences.push(
        `The first begins at ${formatCampaignTime(firstMission.startsAt, tz)}${
          firstMission.locationLabel ? ` in ${firstMission.locationLabel}` : ""
        }.`,
      );
    } else if (firstMission?.isAllDay) {
      sentences.push(
        `The first Mission is all day${
          firstMission.locationLabel ? ` in ${firstMission.locationLabel}` : ""
        }.`,
      );
    }
    if (primaryMission) {
      sentences.push(`The primary Mission is ${primaryMission.title}.`);
    }
    const bits: string[] = [];
    if (prepRiskCount > 0) {
      bits.push(
        `${prepRiskCount} preparation issue${prepRiskCount === 1 ? "" : "s"}`,
      );
    }
    if (dueTodayAll.length > 0) {
      bits.push(
        `${dueTodayAll.length} due commitment${dueTodayAll.length === 1 ? "" : "s"} or action${dueTodayAll.length === 1 ? "" : "s"}`,
      );
    }
    if (overdueAll.length > 0) {
      bits.push(
        `${overdueAll.length} overdue responsibilit${overdueAll.length === 1 ? "y" : "ies"}`,
      );
    }
    if (bits.length) {
      sentences.push(`${bits.join(" and ")} require attention.`);
    }
  }

  const todayKey = campaignDateKey(now, tz);
  const prev = addDaysToDateKey(briefingDate, -1);
  const next = addDaysToDateKey(briefingDate, 1);
  const earliest = addDaysToDateKey(todayKey, -config.allowedPastDays);
  const latest = addDaysToDateKey(todayKey, config.allowedFutureDays);

  let dayKindLabel: string | null = null;
  if (isPast) dayKindLabel = "Historical briefing";
  if (isFuture) dayKindLabel = "Future briefing";

  const historicalDisclaimer = isPast
    ? `This historical briefing reflects the current state of campaign records for ${formatFullCampaignDate(briefingDate, tz)}, not a preserved snapshot from that date.`
    : isFuture
      ? null
      : null;

  const sourceMissionPool = [
    ...new Map(
      [...dayMissions, ...input.operationalMissions, ...input.tomorrowMissions].map(
        (m) => [m.missionId, m],
      ),
    ).values(),
  ];

  return {
    briefingDate,
    campaignDateLabel: formatFullCampaignDate(briefingDate, tz),
    campaignTimezone: tz,
    generatedAt: now.toISOString(),
    briefingStatus,
    briefingStatusLabel: labelBriefingStatus(briefingStatus),
    dayKindLabel,
    isToday,
    isPast,
    isFuture,
    historicalDisclaimer:
      historicalDisclaimer ??
      (isPast
        ? `This briefing reflects current records for ${formatFullCampaignDate(briefingDate, tz)}.`
        : null),
    staleWarningMinutes: config.staleWarningMinutes,
    config,
    executiveSummary: {
      sentences,
      scheduledMissionCount: dayMissions.length,
      primaryMissionId: primaryMission?.missionId ?? null,
      primaryMissionTitle: primaryMission?.title ?? null,
      firstMissionTime: firstMission
        ? firstMission.isAllDay
          ? "All day"
          : formatCampaignTime(firstMission.startsAt, tz)
        : null,
      finalMissionTime: finalMission
        ? finalMission.isAllDay
          ? "All day"
          : formatCampaignTime(finalMission.endsAt, tz)
        : null,
      firstDepartureTime: firstDeparture
        ? formatCampaignTime(firstDeparture, tz)
        : null,
      preparationRiskCount: prepRiskCount,
      dueTodayCount: dueTodayAll.length,
      overdueCount: overdueAll.length,
      leadershipDecisionCount: decisionsDedup.length,
      topAttentionItem: topAttention,
    },
    primaryMission,
    timeline: timelineAll.slice(0, limits.timeline),
    timelineTotal: timelineAll.length,
    travel: travel.slice(0, limits.travelLegs),
    preparation: preparationAll.slice(0, limits.preparation),
    preparationTotal: preparationAll.length,
    missionMessages: missionMessages.slice(0, limits.missionMessages),
    people: people.slice(0, limits.people),
    peopleTotal: people.length,
    organizations: organizations.slice(0, limits.organizations),
    organizationsTotal: organizations.length,
    dueToday: dueTodayAll.slice(0, limits.dueToday),
    dueTodayTotal: dueTodayAll.length,
    overdue: overdueAll.slice(0, limits.overdue),
    overdueTotal: overdueAll.length,
    leadershipDecisions: decisionsDedup.slice(0, limits.leadershipDecisions),
    leadershipDecisionsTotal: decisionsDedup.length,
    risks: risksAll.slice(0, limits.risks),
    risksTotal: risksAll.length,
    endOfDay: endOfDayAll.slice(0, limits.endOfDay),
    endOfDayStatus,
    endOfDayStatusLabel: labelEndOfDayStatus(endOfDayStatus),
    tomorrowPreview,
    navigation: {
      previousDate: prev >= earliest ? prev : null,
      nextDate: next <= latest ? next : null,
      todayDate: todayKey,
      todayHref: "/system/briefing/today",
      previousHref: prev >= earliest ? `/system/briefing/${prev}` : null,
      nextHref: next <= latest ? `/system/briefing/${next}` : null,
      commandCenterHref: "/system/missions/command-center",
      calendarHref: "/calendar",
      todaysMissionHref: "/",
    },
    sourceStatus: {
      missionCount: dayMissions.length,
      preparationCount: dayMissions.filter((m) => m.preparation.exists).length,
      executionCount: dayMissions.filter((m) => m.execution.exists).length,
      debriefCount: dayMissions.filter((m) => m.debrief.exists).length,
      followUpActionCount: sourceMissionPool.reduce(
        (n, m) => n + m.followUp.actions.length,
        0,
      ),
      lastRefreshedAt: now.toISOString(),
      historicalSnapshot: false,
    },
    isolation: {
      readOnly: true,
      mutatesRecords: false,
      eventScheduleEditableHere: false,
    },
  };
}
