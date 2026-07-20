import {
  DEFAULT_COMMAND_CENTER_CONFIG,
  type MissionCommandCenterConfig,
} from "@/lib/missions/v21/command-center/config";
import { rankAttentionItems } from "@/lib/missions/v21/command-center/attention-ranking";
import {
  detectExecutionExceptions,
  detectMissionAttention,
} from "@/lib/missions/v21/command-center/attention-rules";
import {
  missionMatchesSearch,
  type ParsedCommandCenterFilters,
} from "@/lib/missions/v21/command-center/filters";
import { abbreviateText } from "@/lib/missions/v21/command-center/labels";
import {
  formatRelativeAge,
  hoursBetween,
  isDueBeforeCampaignDay,
  isDueOnCampaignDay,
  isWithinRecentlyClosedWindow,
  isWithinUpcomingWindow,
  startsWithinPrepareRiskWindow,
} from "@/lib/missions/v21/command-center/time-windows";
import type {
  CommandCenterMissionSnapshot,
  MissionBlockedWorkItem,
  MissionCloseoutItem,
  MissionClosedItem,
  MissionCommandCenterViewModel,
  MissionCommandItem,
  MissionCommitmentWatchItem,
  MissionDebriefQueueItem,
  MissionFollowUpQueueItem,
  MissionPreparationRiskItem,
} from "@/lib/missions/v21/command-center/types";
import { labelMissionLifecyclePhase } from "@/lib/missions/v21/labels";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import {
  labelFollowUpActionPriority,
  labelFollowUpActionStatus,
  labelFollowUpSource,
} from "@/lib/missions/v21/follow-up/labels";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";

const OPEN = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

function formatWhenLabel(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function ownerLabel(action: CommandCenterMissionSnapshot["followUp"]["actions"][number]): string {
  if (action.ownerType === "UNASSIGNED") return "Unassigned";
  return action.ownerName?.trim() || action.ownerType;
}

function relatedLabel(action: CommandCenterMissionSnapshot["followUp"]["actions"][number]): string | null {
  const parts = [action.relatedPersonName, action.relatedOrganizationName].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function commitmentText(action: CommandCenterMissionSnapshot["followUp"]["actions"][number]): string {
  const snap = action.sourceSnapshot;
  if (snap && typeof snap.originalText === "string" && snap.originalText.trim()) {
    return snap.originalText.trim();
  }
  return action.title;
}

function execStatusPriority(status: string | null): number {
  switch (status) {
    case "IN_PROGRESS":
      return 0;
    case "ARRIVED":
      return 1;
    case "NOT_STARTED":
      return 2;
    case "COMPLETED":
      return 3;
    default:
      return 4;
  }
}

function toCommandItem(
  mission: CommandCenterMissionSnapshot,
  timeZone: string,
): MissionCommandItem {
  const primary = primaryActionForPhase(mission.missionId, mission.lifecyclePhase, {
    debriefStatus: mission.debrief.status,
    followUpStatus: mission.followUp.status,
  });
  const urgentOpenCount = mission.followUp.actions.filter(
    (a) => OPEN.has(a.status) && a.priority === "URGENT",
  ).length;

  let primaryHref = primary.href;
  let primaryActionLabel = primary.label;
  if (mission.lifecyclePhase === "EXECUTE") {
    primaryHref = `/system/missions/${mission.missionId}/execute`;
    primaryActionLabel = "Open Execute Mode";
  } else if (
    mission.lifecyclePhase === "PREPARE" ||
    mission.lifecyclePhase === "TRAVEL"
  ) {
    const ready = mission.preparation.readiness === "READY";
    primaryHref = `/system/missions/${mission.missionId}/prepare`;
    primaryActionLabel = ready ? "Review Brief" : "Prepare Mission";
  }

  return {
    missionId: mission.missionId,
    title: mission.title,
    startsAt: mission.startsAt,
    endsAt: mission.endsAt,
    whenLabel: formatWhenLabel(mission.startsAt, mission.endsAt, timeZone),
    locationLabel: mission.locationLabel,
    lifecyclePhase: mission.lifecyclePhase,
    lifecyclePhaseLabel: labelMissionLifecyclePhase(mission.lifecyclePhase),
    operationalStatus: mission.operationalStatus,
    preparationReadiness: mission.preparation.readiness,
    executionStatus: mission.execution.status,
    keyMessage: abbreviateText(mission.preparation.keyMessage),
    travelRequired: mission.travelRequired,
    arrivedAt: mission.execution.arrivedAt,
    startedAt: mission.execution.startedAt,
    urgentOpenCount,
    primaryHref,
    primaryActionLabel,
  };
}

function preparationGaps(mission: CommandCenterMissionSnapshot): string[] {
  const gaps: string[] = [];
  if (!mission.preparation.exists) gaps.push("No preparation record");
  else {
    if (
      mission.preparation.readiness === "DRAFT" ||
      mission.preparation.readiness === "NEEDS_ATTENTION"
    ) {
      gaps.push(`Readiness: ${mission.preparation.readiness}`);
    }
    if (!mission.preparation.keyMessage) gaps.push("No key message");
    if (!mission.preparation.strategicPurpose) gaps.push("No strategic purpose");
  }
  return gaps;
}

function buildFollowUpItem(
  mission: CommandCenterMissionSnapshot,
  action: CommandCenterMissionSnapshot["followUp"]["actions"][number],
  now: Date,
  timeZone: string,
  bucket: MissionFollowUpQueueItem["bucket"],
): MissionFollowUpQueueItem {
  let dueLabel = "No due date";
  if (action.dueAt) {
    if (isDueBeforeCampaignDay(action.dueAt, now, timeZone)) dueLabel = "Overdue";
    else if (isDueOnCampaignDay(action.dueAt, now, timeZone)) dueLabel = "Due today";
    else dueLabel = `Due ${campaignDateKey(action.dueAt, timeZone)}`;
  }
  return {
    actionId: action.id,
    missionId: mission.missionId,
    missionTitle: mission.title,
    title: action.title,
    sourceType: action.sourceType,
    sourceLabel: labelFollowUpSource(action.sourceType),
    status: action.status,
    statusLabel: labelFollowUpActionStatus(action.status),
    priority: action.priority,
    ownerLabel: ownerLabel(action),
    dueAt: action.dueAt,
    dueLabel,
    relatedLabel: relatedLabel(action),
    href: `/system/missions/${mission.missionId}/follow-up`,
    bucket,
  };
}

export function buildCommandCenterViewModel(input: {
  missions: CommandCenterMissionSnapshot[];
  now: Date;
  campaignTimezone: string;
  filters: ParsedCommandCenterFilters;
  config?: MissionCommandCenterConfig;
}): MissionCommandCenterViewModel {
  const config = input.config ?? DEFAULT_COMMAND_CENTER_CONFIG;
  const { now, campaignTimezone: tz, filters } = input;
  const todayKey = campaignDateKey(now, tz);

  let missions = input.missions.filter((m) =>
    missionMatchesSearch(
      [
        m.title,
        m.locationLabel,
        m.missionId,
        ...m.followUp.actions.flatMap((a) => [
          a.relatedPersonName,
          a.relatedOrganizationName,
          a.ownerName,
        ]),
      ],
      filters.search,
    ),
  );
  if (filters.phase) {
    missions = missions.filter((m) => m.lifecyclePhase === filters.phase);
  }

  const attentionRaw = missions.flatMap((m) =>
    detectMissionAttention(m, now, config, tz),
  );
  const immediateAttention = rankAttentionItems(attentionRaw);

  const activeNow = missions
    .filter((m) => {
      if (m.lifecyclePhase === "EXECUTE") return true;
      const st = m.execution.status;
      return st === "ARRIVED" || st === "IN_PROGRESS";
    })
    .map((m) => toCommandItem(m, tz))
    .sort((a, b) => {
      const p =
        execStatusPriority(a.executionStatus) -
        execStatusPriority(b.executionStatus);
      if (p !== 0) return p;
      const t = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (t !== 0) return t;
      return a.missionId.localeCompare(b.missionId);
    });

  const comingNext = missions
    .filter(
      (m) =>
        m.lifecyclePhase !== "COMPLETE" &&
        isWithinUpcomingWindow(m.startsAt, now, tz, config) &&
        new Date(m.startsAt).getTime() > now.getTime() &&
        m.lifecyclePhase !== "EXECUTE",
    )
    .map((m) => toCommandItem(m, tz))
    .sort((a, b) => {
      const t = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (t !== 0) return t;
      return a.missionId.localeCompare(b.missionId);
    });

  const preparationRisk: MissionPreparationRiskItem[] = missions
    .filter(
      (m) =>
        startsWithinPrepareRiskWindow(m.startsAt, now, config) &&
        m.lifecyclePhase !== "COMPLETE" &&
        m.lifecyclePhase !== "EXECUTE" &&
        (!m.preparation.exists ||
          m.preparation.readiness === "DRAFT" ||
          m.preparation.readiness === "NEEDS_ATTENTION" ||
          !m.preparation.keyMessage ||
          !m.preparation.strategicPurpose),
    )
    .map((m) => ({
      missionId: m.missionId,
      title: m.title,
      startsAt: m.startsAt,
      whenLabel: formatWhenLabel(m.startsAt, m.endsAt, tz),
      readiness: m.preparation.readiness,
      gaps: preparationGaps(m),
      hoursUntilStart: Math.max(0, Math.floor(hoursBetween(now, new Date(m.startsAt)))),
      href: `/system/missions/${m.missionId}/prepare`,
    }))
    .sort((a, b) => {
      const t = a.hoursUntilStart - b.hoursUntilStart;
      if (t !== 0) return t;
      return a.missionId.localeCompare(b.missionId);
    });

  const executionExceptions = missions.flatMap((m) =>
    detectExecutionExceptions(m, now, config),
  );

  const debriefQueue: MissionDebriefQueueItem[] = [];
  for (const m of missions) {
    const execDone =
      m.execution.status === "COMPLETED" ||
      (m.lifecyclePhase === "DEBRIEF" && Boolean(m.execution.endedAt));
    if (!execDone && m.debrief.status !== "COMPLETED" && m.debrief.status !== "APPROVED") {
      continue;
    }
    if (m.followUp.status === "CLOSED") continue;

    let group: MissionDebriefQueueItem["group"] | null = null;
    let groupLabel = "";
    let primaryActionLabel = "Open Debrief";
    let href = `/system/missions/${m.missionId}/debrief`;

    if (!m.debrief.exists || m.debrief.status === "NOT_STARTED" || m.debrief.status == null) {
      if (!execDone) continue;
      group = "NOT_STARTED";
      groupLabel = "Not started";
      primaryActionLabel = "Start Debrief";
    } else if (m.debrief.status === "IN_PROGRESS") {
      group = "IN_PROGRESS";
      groupLabel = "In progress";
      primaryActionLabel = "Continue Debrief";
    } else if (m.debrief.status === "COMPLETED") {
      group = "READY_FOR_APPROVAL";
      groupLabel = "Ready for approval";
      primaryActionLabel = "Review for Approval";
    } else if (
      m.debrief.status === "APPROVED" &&
      m.debrief.approvedFollowUpCount > 0 &&
      (!m.followUp.exists || m.followUp.status === "NOT_STARTED")
    ) {
      group = "APPROVED_NEEDS_FOLLOW_UP";
      groupLabel = "Approved — Follow-up not built";
      primaryActionLabel = "Open Follow-up";
      href = `/system/missions/${m.missionId}/follow-up`;
    } else {
      continue;
    }

    const sortAt =
      m.execution.endedAt ?? m.debrief.completedAt ?? m.endsAt;
    debriefQueue.push({
      missionId: m.missionId,
      title: m.title,
      eventWhenLabel: formatWhenLabel(m.startsAt, m.endsAt, tz),
      debriefStatus: m.debrief.status,
      outcomeAssessment: m.debrief.outcomeAssessment,
      group,
      groupLabel,
      approvedFollowUpCount: m.debrief.approvedFollowUpCount,
      ageLabel: formatRelativeAge(m.execution.endedAt, now),
      href,
      primaryActionLabel,
      sortAt,
    });
  }
  const groupPriority: Record<MissionDebriefQueueItem["group"], number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 1,
    READY_FOR_APPROVAL: 2,
    APPROVED_NEEDS_FOLLOW_UP: 3,
  };
  debriefQueue.sort((a, b) => {
    const g = groupPriority[a.group] - groupPriority[b.group];
    if (g !== 0) return g;
    const t = new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime();
    if (t !== 0) return t;
    return a.missionId.localeCompare(b.missionId);
  });

  const followUpAccountability: MissionFollowUpQueueItem[] = [];
  const commitments: MissionCommitmentWatchItem[] = [];
  const blockedWork: MissionBlockedWorkItem[] = [];

  for (const m of missions) {
    for (const action of m.followUp.actions) {
      if (!OPEN.has(action.status)) continue;

      let bucket: MissionFollowUpQueueItem["bucket"] | null = null;
      if (action.status === "BLOCKED") bucket = "BLOCKED";
      else if (
        action.ownerType === "UNASSIGNED" &&
        (action.priority === "URGENT" || action.priority === "IMPORTANT")
      ) {
        bucket = "UNASSIGNED";
      } else if (
        action.status === "WAITING" &&
        action.nextCheckAt &&
        new Date(action.nextCheckAt).getTime() <= now.getTime()
      ) {
        bucket = "WAITING_REVIEW";
      } else if (action.dueAt && isDueBeforeCampaignDay(action.dueAt, now, tz)) {
        bucket = "OVERDUE";
      } else if (action.dueAt && isDueOnCampaignDay(action.dueAt, now, tz)) {
        bucket = "DUE_TODAY";
      } else if (action.priority === "URGENT") {
        bucket = "URGENT";
      }

      if (bucket) {
        followUpAccountability.push(buildFollowUpItem(m, action, now, tz, bucket));
      }

      if (action.sourceType === "EXECUTE_COMMITMENT") {
        let cBucket: MissionFollowUpQueueItem["bucket"] = "URGENT";
        if (action.status === "BLOCKED") cBucket = "BLOCKED";
        else if (action.ownerType === "UNASSIGNED") cBucket = "UNASSIGNED";
        else if (
          action.status === "WAITING" &&
          action.nextCheckAt &&
          new Date(action.nextCheckAt).getTime() <= now.getTime()
        ) {
          cBucket = "WAITING_REVIEW";
        } else if (action.dueAt && isDueBeforeCampaignDay(action.dueAt, now, tz)) {
          cBucket = "OVERDUE";
        } else if (action.dueAt && isDueOnCampaignDay(action.dueAt, now, tz)) {
          cBucket = "DUE_TODAY";
        } else if (
          action.status === "WAITING" &&
          (!action.nextCheckAt ||
            new Date(action.nextCheckAt).getTime() > now.getTime())
        ) {
          cBucket = "WAITING_REVIEW";
        }
        // Only surface unresolved commitments in watch (overdue/today/blocked/unassigned/waiting review)
        if (
          cBucket === "OVERDUE" ||
          cBucket === "DUE_TODAY" ||
          cBucket === "BLOCKED" ||
          cBucket === "UNASSIGNED" ||
          (cBucket === "WAITING_REVIEW" &&
            action.nextCheckAt &&
            new Date(action.nextCheckAt).getTime() <= now.getTime())
        ) {
          commitments.push({
            ...buildFollowUpItem(m, action, now, tz, cBucket),
            commitmentText: commitmentText(action),
          });
        }
      }

      if (action.status === "BLOCKED") {
        blockedWork.push({
          actionId: action.id,
          missionId: m.missionId,
          missionTitle: m.title,
          title: action.title,
          blockedReason: action.blockedReason,
          ownerLabel: ownerLabel(action),
          priority: action.priority,
          href: `/system/missions/${m.missionId}/follow-up`,
        });
      }
    }
  }

  const bucketRank: Record<MissionFollowUpQueueItem["bucket"], number> = {
    OVERDUE: 0,
    BLOCKED: 1,
    UNASSIGNED: 2,
    DUE_TODAY: 3,
    URGENT: 4,
    WAITING_REVIEW: 5,
  };
  const sortFu = (a: MissionFollowUpQueueItem, b: MissionFollowUpQueueItem) => {
    const br = bucketRank[a.bucket] - bucketRank[b.bucket];
    if (br !== 0) return br;
    const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.actionId.localeCompare(b.actionId);
  };
  followUpAccountability.sort(sortFu);
  commitments.sort(sortFu);
  blockedWork.sort((a, b) => {
    const pr = labelFollowUpActionPriority(a.priority).localeCompare(
      labelFollowUpActionPriority(b.priority),
    );
    // Prefer URGENT first via priority enum order
    const order = { URGENT: 0, IMPORTANT: 1, NORMAL: 2 } as const;
    const po = order[a.priority] - order[b.priority];
    if (po !== 0) return po;
    if (pr !== 0) return pr;
    return a.actionId.localeCompare(b.actionId);
  });

  const readyToClose: MissionCloseoutItem[] = missions
    .filter(
      (m) =>
        m.followUp.status === "READY_TO_CLOSE" && !m.followUp.closedAt,
    )
    .map((m) => {
      const actions = m.followUp.actions;
      return {
        missionId: m.missionId,
        title: m.title,
        eventWhenLabel: formatWhenLabel(m.startsAt, m.endsAt, tz),
        outcomeAssessment: m.debrief.outcomeAssessment,
        completedCount: actions.filter((a) => a.status === "COMPLETED").length,
        cancelledCount: actions.filter((a) => a.status === "CANCELLED").length,
        closeoutSummaryPresent: Boolean(m.followUp.closeoutSummary?.trim()),
        readySince: m.followUp.completedAt,
        href: `/system/missions/${m.missionId}/follow-up`,
      };
    })
    .sort((a, b) => {
      const at = a.readySince ? new Date(a.readySince).getTime() : 0;
      const bt = b.readySince ? new Date(b.readySince).getTime() : 0;
      if (at !== bt) return at - bt;
      return a.missionId.localeCompare(b.missionId);
    });

  const recentlyClosed: MissionClosedItem[] = missions
    .filter(
      (m) =>
        m.followUp.status === "CLOSED" &&
        m.followUp.closedAt &&
        isWithinRecentlyClosedWindow(m.followUp.closedAt, now, tz, config),
    )
    .map((m) => ({
      missionId: m.missionId,
      title: m.title,
      eventWhenLabel: formatWhenLabel(m.startsAt, m.endsAt, tz),
      outcomeAssessment: m.debrief.outcomeAssessment,
      closedAt: m.followUp.closedAt!,
      closedBy: m.followUp.closedByUserId,
      completedCommitments: m.followUp.actions.filter(
        (a) =>
          a.sourceType === "EXECUTE_COMMITMENT" && a.status === "COMPLETED",
      ).length,
      reportHref: `/system/missions/${m.missionId}/follow-up/report`,
    }))
    .sort((a, b) => {
      const t = new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime();
      if (t !== 0) return t;
      return a.missionId.localeCompare(b.missionId);
    });

  const openFollowUps = missions.reduce(
    (n, m) => n + m.followUp.actions.filter((a) => OPEN.has(a.status)).length,
    0,
  );
  const overdueCommitments = commitments.filter((c) => c.bucket === "OVERDUE").length;
  const upcomingSevenDays = missions.filter((m) => {
    const startKey = campaignDateKey(m.startsAt, tz);
    const endSeven = (() => {
      const [y, mo, d] = todayKey.split("-").map(Number);
      const utc = new Date(Date.UTC(y, mo - 1, d));
      utc.setUTCDate(utc.getUTCDate() + 7);
      return utc.toISOString().slice(0, 10);
    })();
    return startKey >= todayKey && startKey <= endSeven;
  }).length;

  const summary = {
    activeNow: activeNow.length,
    needsAttention: immediateAttention.length,
    upcomingSevenDays,
    preparationRisk: preparationRisk.length,
    debriefPending: debriefQueue.filter(
      (d) => d.group === "NOT_STARTED" || d.group === "IN_PROGRESS",
    ).length,
    debriefAwaitingApproval: debriefQueue.filter(
      (d) => d.group === "READY_FOR_APPROVAL",
    ).length,
    openFollowUps,
    overdueCommitments,
    blockedActions: blockedWork.length,
    readyToClose: readyToClose.length,
    recentlyClosed: recentlyClosed.length,
  };

  const limits = config.sectionLimits;
  const view = filters.activeView;
  const expand =
    view === "overview"
      ? null
      : view;

  function capped<T>(rows: T[], limit: number, expandKey: string | null): T[] {
    if (expand && expandKey && expand === expandKey) return rows;
    if (view !== "overview" && expandKey && view === expandKey) return rows;
    return rows.slice(0, limit);
  }

  // Map filtered views to fuller queues
  const attentionLimit =
    view === "attention" ? 100 : limits.immediateAttention;
  const prepLimit = view === "prepare" ? 100 : limits.preparationRisk;
  const execLimit = view === "execute" ? 100 : limits.activeNow;
  const debriefLimit = view === "debrief" ? 100 : limits.debriefQueue;
  const fuLimit = view === "follow-up" ? 100 : limits.followUpAccountability;
  const closeLimit = view === "closeout" ? 100 : limits.readyToClose;

  void capped; // keep helper available for clarity
  void expand;

  return {
    generatedAt: now.toISOString(),
    campaignDate: todayKey,
    campaignTimezone: tz,
    config,
    summary,
    immediateAttention: immediateAttention.slice(0, attentionLimit),
    activeNow: activeNow.slice(0, execLimit),
    comingNext: comingNext.slice(0, limits.comingNext),
    preparationRisk: preparationRisk.slice(0, prepLimit),
    executionExceptions: executionExceptions.slice(
      0,
      limits.executionExceptions,
    ),
    debriefQueue: debriefQueue.slice(0, debriefLimit),
    followUpAccountability: followUpAccountability.slice(0, fuLimit),
    commitments: commitments.slice(0, limits.commitments),
    blockedWork: blockedWork.slice(0, limits.blockedWork),
    readyToClose: readyToClose.slice(0, closeLimit),
    recentlyClosed: recentlyClosed.slice(0, limits.recentlyClosed),
    filters: {
      activeView: filters.activeView,
      phase: filters.phase,
      search: filters.search,
    },
    isolation: {
      readOnly: true,
      mutatesRecords: false,
      eventScheduleEditableHere: false,
    },
  };
}
