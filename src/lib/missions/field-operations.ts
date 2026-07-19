/**
 * Step 7.2 — Field Operations (pure aggregation).
 * Answers: Who needs help right now?
 */

import type { MissionCard } from "@/lib/missions/mission-card";
import type { MissionTodayReadiness } from "@/lib/missions/today-readiness";
import type { MissionDayAction } from "@/lib/missions/mission-day-actions";

export type FieldHeat = "READY" | "BUSY" | "OVERLOADED" | "BLOCKED" | "UNKNOWN";

export type FieldEscalationLevel =
  | "LOCAL"
  | "REGIONAL"
  | "KELLY"
  | "CAMPAIGN_MANAGER"
  | "NONE";

export type FieldCheckIn = "ON_SITE" | "RUNNING_LATE" | "NEED_HELP" | "MISSION_COMPLETE";

export const FIELD_CHECKIN_LABELS: Record<FieldCheckIn, string> = {
  ON_SITE: "On Site",
  RUNNING_LATE: "Running Late",
  NEED_HELP: "Need Help",
  MISSION_COMPLETE: "Mission Complete",
};

/** Map field check-ins onto existing authenticated day-action mutations. */
export function fieldCheckInToDayAction(checkIn: FieldCheckIn): MissionDayAction {
  switch (checkIn) {
    case "ON_SITE":
      return "MARK_ARRIVED";
    case "RUNNING_LATE":
    case "NEED_HELP":
      return "NEEDS_ATTENTION";
    case "MISSION_COMPLETE":
      return "MARK_COMPLETE";
  }
}

export function isFieldCheckIn(value: string): value is FieldCheckIn {
  return (
    value === "ON_SITE" ||
    value === "RUNNING_LATE" ||
    value === "NEED_HELP" ||
    value === "MISSION_COMPLETE"
  );
}

export type FieldResourceStatus = {
  people: "READY" | "NEEDS_ATTENTION" | "BLOCKED" | "UNKNOWN";
  materials: "READY" | "NEEDS_ATTENTION" | "BLOCKED" | "UNKNOWN";
  transportation: "READY" | "NEEDS_ATTENTION" | "BLOCKED" | "UNKNOWN";
  communications: "READY" | "NEEDS_ATTENTION" | "BLOCKED" | "UNKNOWN";
  venue: "READY" | "NEEDS_ATTENTION" | "BLOCKED" | "UNKNOWN";
};

export type FieldTeamCard = {
  teamId: string;
  teamLabel: string;
  countyName: string | null;
  missionId: string;
  missionTitle: string;
  leaderLabel: string;
  backupLabel: string | null;
  statusLabel: string;
  missionStatus: string;
  readinessPercent: number | null;
  needs: string[];
  etaMinutes: number | null;
  heat: FieldHeat;
  escalation: FieldEscalationLevel;
  resources: FieldResourceStatus;
  ownership: {
    owner: string;
    backup: string | null;
    currentStatus: string;
    lastUpdateLabel: string;
    confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  };
  href: string;
  eventVersion: number;
  canCheckIn: boolean;
  /** Consumed from Volunteer Operations — not re-derived here. */
  volunteerSignals: {
    assignmentConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    staffingConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    openRoles: number;
    backupLeaderAvailable: "UNKNOWN";
    replacementOptions: "UNKNOWN";
  } | null;
  /** Consumed from Communications Operations — not owned here. */
  communicationsSignals: {
    talkingPointsStatus: string;
    eventMessagingStatus: string;
    messagingRisk: string;
    handoutStatus: "UNKNOWN";
    pressContactStatus: "UNKNOWN";
    localIssueBriefStatus: "UNKNOWN";
  } | null;
  /** Consumed from Logistics Operations — not owned here. */
  logisticsSignals: {
    assignedVehicle: string;
    travelConfidence: string;
    materialDeliveryStatus: string;
    venueAccess: string;
    setupReadiness: string;
    missionLogisticsReadiness: string;
  } | null;
};

export type HelpQueueItem = {
  id: string;
  severity: "CRITICAL" | "HIGH" | "WATCH" | "READY";
  countyLabel: string;
  detail: string;
  missionId: string;
  href: string;
};

export type OperationalHeatRow = {
  countyName: string;
  heat: FieldHeat;
  missionCount: number;
  needsAttentionCount: number;
  blockedCount: number;
};

export type FieldOperationsHome = {
  title: "FIELD OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  activeMissions: number;
  teamsInField: number;
  needAttention: number;
  blocked: number;
  unassigned: number;
  nextEscalation: {
    countyLabel: string;
    detail: string;
    href: string | null;
  } | null;
  helpQueue: HelpQueueItem[];
  teamCards: FieldTeamCard[];
  operationalHeat: OperationalHeatRow[];
  /** Compact feed for Executive Command — no duplicate engines. */
  executiveFeed: {
    teamsNeedingAttention: number;
    countiesWithoutLeader: number;
    understaffedMissions: number;
    blockedMissions: number;
    topHelpItems: Array<{ countyLabel: string; detail: string }>;
    briefingLine: string;
  };
};

export type FieldVolunteerMissionSignal = {
  missionId: string;
  assignmentConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  staffingConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  openRoles: number;
};

export type FieldCommunicationsMissionSignal = {
  missionId: string;
  talkingPointsStatus: string;
  eventMessagingStatus: string;
  messagingRisk: string;
};

export type FieldLogisticsMissionSignal = {
  missionId: string;
  assignedVehicle: string;
  travelConfidence: string;
  materialDeliveryStatus: string;
  venueAccess: string;
  setupReadiness: string;
  missionLogisticsReadiness: string;
};

export type FieldMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  staffAssignedCount: number;
  staffRequiredCount: number;
  readiness: MissionTodayReadiness | null;
};

function categoryState(
  readiness: MissionTodayReadiness | null,
  category: MissionTodayReadiness["categories"][number]["category"],
): FieldResourceStatus[keyof FieldResourceStatus] {
  const row = readiness?.categories.find((c) => c.category === category);
  if (!row) return "UNKNOWN";
  return row.state;
}

export function deriveFieldHeat(input: {
  missionStatus: string;
  readinessState: string | null;
  staffGap: boolean;
  needsAttention: boolean;
  blocked: boolean;
}): FieldHeat {
  if (input.blocked) return "BLOCKED";
  if (input.staffGap && input.needsAttention) return "OVERLOADED";
  if (input.needsAttention || input.missionStatus === "NEEDS_ATTENTION") {
    return "BUSY";
  }
  if (input.readinessState === "READY" || input.missionStatus === "IN_PROGRESS") {
    return "READY";
  }
  if (input.readinessState === "UNKNOWN" || !input.readinessState) return "UNKNOWN";
  return "BUSY";
}

export function deriveFieldEscalation(input: {
  blocked: boolean;
  staffGap: boolean;
  readinessState: string | null;
  confirmationNeedsAttention: boolean;
}): FieldEscalationLevel {
  if (input.blocked && input.staffGap) return "CAMPAIGN_MANAGER";
  if (input.blocked) return "KELLY";
  if (input.staffGap && input.confirmationNeedsAttention) return "REGIONAL";
  if (input.staffGap || input.confirmationNeedsAttention) return "LOCAL";
  if (input.readinessState === "NEEDS_ATTENTION") return "LOCAL";
  return "NONE";
}

function needsFromMission(input: FieldMissionInput): string[] {
  const needs: string[] = [];
  if (
    input.staffRequiredCount > 0 &&
    input.staffAssignedCount < input.staffRequiredCount
  ) {
    needs.push("Volunteer");
  }
  const travel = input.readiness?.categories.find((c) => c.category === "Travel");
  if (travel?.state === "BLOCKED" || travel?.state === "NEEDS_ATTENTION") {
    needs.push("Driver");
  }
  const materials = input.readiness?.categories.find((c) => c.category === "Materials");
  if (materials?.state === "BLOCKED" || materials?.state === "NEEDS_ATTENTION") {
    needs.push("Materials");
  }
  return needs;
}

export function buildFieldTeamCard(
  input: FieldMissionInput,
  volunteerSignal?: FieldVolunteerMissionSignal | null,
  communicationsSignal?: FieldCommunicationsMissionSignal | null,
  logisticsSignal?: FieldLogisticsMissionSignal | null,
): FieldTeamCard {
  const { mission } = input;
  const county = input.countyName?.trim() || null;
  const teamLabel = county ? `${county} County` : mission.ownerLabel || "Field team";
  const blocked = mission.todayReadiness.state === "BLOCKED";
  const needsAttention =
    mission.todayReadiness.state === "NEEDS_ATTENTION" ||
    mission.missionStatus === "NEEDS_ATTENTION";
  const staffGap =
    input.staffRequiredCount > 0 &&
    input.staffAssignedCount < input.staffRequiredCount;
  const heat = deriveFieldHeat({
    missionStatus: mission.missionStatus,
    readinessState: mission.todayReadiness.state,
    staffGap,
    needsAttention,
    blocked,
  });
  const escalation = deriveFieldEscalation({
    blocked,
    staffGap,
    readinessState: mission.todayReadiness.state,
    confirmationNeedsAttention: mission.confirmationStatus === "NEEDS_ATTENTION",
  });
  const needs = needsFromMission(input);
  const owner = mission.ownerLabel || "Unassigned";
  const unassignedOwner = !mission.ownerLabel || owner === "Unassigned";

  return {
    teamId: `team-${mission.missionId}`,
    teamLabel,
    countyName: county,
    missionId: mission.missionId,
    missionTitle: mission.title,
    leaderLabel: owner,
    backupLabel: null,
    statusLabel: mission.missionStatusPresentation.label,
    missionStatus: mission.missionStatus,
    readinessPercent: mission.readinessScore,
    needs,
    etaMinutes: mission.timeline?.driveMinutes ?? null,
    heat,
    escalation,
    resources: {
      people: categoryState(input.readiness ?? mission.todayReadiness, "People"),
      materials: categoryState(input.readiness ?? mission.todayReadiness, "Materials"),
      transportation: categoryState(input.readiness ?? mission.todayReadiness, "Travel"),
      communications: categoryState(
        input.readiness ?? mission.todayReadiness,
        "Communications",
      ),
      venue: categoryState(input.readiness ?? mission.todayReadiness, "Location"),
    },
    ownership: {
      owner: unassignedOwner ? "Unassigned" : owner,
      backup: null,
      currentStatus: mission.missionStatusPresentation.label,
      lastUpdateLabel: "Live mission state",
      confidence:
        mission.todayReadiness.state === "UNKNOWN"
          ? "UNKNOWN"
          : mission.readinessScore != null && mission.readinessScore >= 80
            ? "HIGH"
            : mission.readinessScore != null && mission.readinessScore >= 50
              ? "MEDIUM"
              : "LOW",
    },
    href: `/calendar?event=${mission.missionId}`,
    eventVersion: mission.eventVersion,
    canCheckIn: mission.canMutateDayActions,
    volunteerSignals: volunteerSignal
      ? {
          assignmentConfidence: volunteerSignal.assignmentConfidence,
          staffingConfidence: volunteerSignal.staffingConfidence,
          openRoles: volunteerSignal.openRoles,
          backupLeaderAvailable: "UNKNOWN",
          replacementOptions: "UNKNOWN",
        }
      : null,
    communicationsSignals: communicationsSignal
      ? {
          talkingPointsStatus: communicationsSignal.talkingPointsStatus,
          eventMessagingStatus: communicationsSignal.eventMessagingStatus,
          messagingRisk: communicationsSignal.messagingRisk,
          handoutStatus: "UNKNOWN",
          pressContactStatus: "UNKNOWN",
          localIssueBriefStatus: "UNKNOWN",
        }
      : null,
    logisticsSignals: logisticsSignal
      ? {
          assignedVehicle: logisticsSignal.assignedVehicle,
          travelConfidence: logisticsSignal.travelConfidence,
          materialDeliveryStatus: logisticsSignal.materialDeliveryStatus,
          venueAccess: logisticsSignal.venueAccess,
          setupReadiness: logisticsSignal.setupReadiness,
          missionLogisticsReadiness: logisticsSignal.missionLogisticsReadiness,
        }
      : null,
  };
}

export function buildFieldOperationsHome(input: {
  date: string;
  timezone: string;
  now?: Date;
  missions: FieldMissionInput[];
  volunteerFieldFeed?: FieldVolunteerMissionSignal[] | null;
  communicationsFieldFeed?: FieldCommunicationsMissionSignal[] | null;
  logisticsFieldFeed?: FieldLogisticsMissionSignal[] | null;
}): FieldOperationsHome {
  const now = input.now ?? new Date();
  const volByMission = new Map(
    (input.volunteerFieldFeed ?? []).map((v) => [v.missionId, v]),
  );
  const commsByMission = new Map(
    (input.communicationsFieldFeed ?? []).map((c) => [c.missionId, c]),
  );
  const logisticsByMission = new Map(
    (input.logisticsFieldFeed ?? []).map((l) => [l.missionId, l]),
  );
  const cards = input.missions
    .map((m) =>
      buildFieldTeamCard(
        m,
        volByMission.get(m.mission.missionId) ?? null,
        commsByMission.get(m.mission.missionId) ?? null,
        logisticsByMission.get(m.mission.missionId) ?? null,
      ),
    )
    .filter((c) => c.missionStatus !== "COMPLETE")
    .sort((a, b) => {
      const rank = (h: FieldHeat) =>
        h === "BLOCKED" ? 0 : h === "OVERLOADED" ? 1 : h === "BUSY" ? 2 : h === "UNKNOWN" ? 3 : 4;
      return rank(a.heat) - rank(b.heat);
    });

  const allCards = input.missions.map((m) =>
    buildFieldTeamCard(
      m,
      volByMission.get(m.mission.missionId) ?? null,
      commsByMission.get(m.mission.missionId) ?? null,
      logisticsByMission.get(m.mission.missionId) ?? null,
    ),
  );
  const activeMissions = allCards.filter((c) => c.missionStatus !== "COMPLETE").length;
  const needAttention = allCards.filter(
    (c) => c.heat === "BUSY" || c.heat === "OVERLOADED" || c.heat === "UNKNOWN",
  ).length;
  const blocked = allCards.filter((c) => c.heat === "BLOCKED").length;
  const unassigned = allCards.filter(
    (c) =>
      c.ownership.owner === "Unassigned" ||
      c.needs.includes("Volunteer") ||
      (c.resources.people !== "READY" && c.resources.people !== "UNKNOWN"),
  ).length;

  const counties = new Set(
    allCards.map((c) => c.countyName).filter((n): n is string => Boolean(n)),
  );

  const helpQueue: HelpQueueItem[] = cards
    .filter((c) => c.heat !== "READY")
    .slice(0, 12)
    .map((c) => ({
      id: `help-${c.missionId}`,
      severity:
        c.heat === "BLOCKED"
          ? "CRITICAL"
          : c.heat === "OVERLOADED"
            ? "HIGH"
            : c.heat === "READY"
              ? "READY"
              : "WATCH",
      countyLabel: c.countyName || c.teamLabel,
      detail:
        c.needs.length > 0
          ? c.needs.join(", ")
          : c.ownership.owner === "Unassigned"
            ? "No leader assigned"
            : c.heat === "BLOCKED"
              ? "Blocked"
              : "Needs attention",
      missionId: c.missionId,
      href: c.href,
    }));

  // Ready teams also appear as green in the queue for orientation
  for (const c of allCards.filter((x) => x.heat === "READY").slice(0, 3)) {
    helpQueue.push({
      id: `ready-${c.missionId}`,
      severity: "READY",
      countyLabel: c.countyName || c.teamLabel,
      detail: "Ready",
      missionId: c.missionId,
      href: c.href,
    });
  }

  const heatMap = new Map<string, OperationalHeatRow>();
  for (const card of allCards) {
    const key = card.countyName || "Unspecified";
    const row = heatMap.get(key) ?? {
      countyName: key,
      heat: "UNKNOWN" as FieldHeat,
      missionCount: 0,
      needsAttentionCount: 0,
      blockedCount: 0,
    };
    row.missionCount += 1;
    if (card.heat === "BLOCKED") row.blockedCount += 1;
    if (card.heat === "BUSY" || card.heat === "OVERLOADED") {
      row.needsAttentionCount += 1;
    }
    const rank = (h: FieldHeat) =>
      h === "BLOCKED" ? 0 : h === "OVERLOADED" ? 1 : h === "BUSY" ? 2 : h === "UNKNOWN" ? 3 : 4;
    if (rank(card.heat) < rank(row.heat)) row.heat = card.heat;
    heatMap.set(key, row);
  }

  const next = helpQueue.find((h) => h.severity === "CRITICAL" || h.severity === "HIGH")
    ?? helpQueue.find((h) => h.severity === "WATCH")
    ?? null;

  const countiesWithoutLeader = allCards.filter(
    (c) => c.ownership.owner === "Unassigned",
  ).length;
  const understaffed = allCards.filter((c) => c.needs.includes("Volunteer")).length;
  const teamsNeedingAttention = allCards.filter(
    (c) => c.heat === "BLOCKED" || c.heat === "OVERLOADED" || c.heat === "BUSY",
  ).length;

  const briefingParts: string[] = [];
  if (teamsNeedingAttention > 0) {
    briefingParts.push(
      `${teamsNeedingAttention} field team${teamsNeedingAttention === 1 ? "" : "s"} need attention.`,
    );
  } else {
    briefingParts.push("No field teams currently flagged for attention.");
  }
  if (countiesWithoutLeader > 0) {
    briefingParts.push(
      `${countiesWithoutLeader} mission${countiesWithoutLeader === 1 ? "" : "s"} have no leader.`,
    );
  }
  if (understaffed > 0) {
    briefingParts.push(
      `${understaffed} event${understaffed === 1 ? "" : "s"} understaffed.`,
    );
  }
  if (blocked > 0) {
    briefingParts.push(`${blocked} blocked.`);
  }

  return {
    title: "FIELD OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    activeMissions,
    teamsInField: counties.size || activeMissions,
    needAttention,
    blocked,
    unassigned,
    nextEscalation: next
      ? {
          countyLabel: next.countyLabel,
          detail: next.detail,
          href: next.href,
        }
      : null,
    helpQueue,
    teamCards: cards,
    operationalHeat: [...heatMap.values()].sort((a, b) =>
      a.countyName.localeCompare(b.countyName),
    ),
    executiveFeed: {
      teamsNeedingAttention,
      countiesWithoutLeader,
      understaffedMissions: understaffed,
      blockedMissions: blocked,
      topHelpItems: helpQueue
        .filter((h) => h.severity !== "READY")
        .slice(0, 3)
        .map((h) => ({ countyLabel: h.countyLabel, detail: h.detail })),
      briefingLine: briefingParts.join(" "),
    },
  };
}

export function fieldOperationsForAdvisory(home: FieldOperationsHome) {
  return {
    date: home.date,
    activeMissions: home.activeMissions,
    teamsInField: home.teamsInField,
    needAttention: home.needAttention,
    blocked: home.blocked,
    unassigned: home.unassigned,
    nextEscalation: home.nextEscalation,
    helpQueue: home.helpQueue
      .filter((h) => h.severity !== "READY")
      .slice(0, 8)
      .map((h) => ({
        county: h.countyLabel,
        detail: h.detail,
        severity: h.severity,
      })),
    heat: home.operationalHeat.map((h) => ({
      county: h.countyName,
      heat: h.heat,
    })),
    executiveFeed: home.executiveFeed,
  };
}
