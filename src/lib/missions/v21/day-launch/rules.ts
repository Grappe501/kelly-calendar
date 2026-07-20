import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import type { CampaignDayCloseoutPersisted } from "@/lib/missions/v21/day-closeout/types";
import type { AttentionSeverity } from "@/lib/missions/v21/command-center/types";
import type { CampaignDayLaunchConfig } from "@/lib/missions/v21/day-launch/launch-config";
import type {
  CampaignDayLaunchAcknowledgementPersisted,
  CampaignDayLaunchReadiness,
  DepartureReadinessState,
  LaunchBlocker,
  OvernightChangeItem,
  PreparationLaunchImpact,
} from "@/lib/missions/v21/day-launch/types";
import {
  labelOvernightCategory,
  labelSeverity,
} from "@/lib/missions/v21/day-launch/labels";
import type { TomorrowReadinessStatus } from "@/lib/missions/v21/day-closeout/types";

export function acknowledgementImportKey(
  acknowledgementType: string,
  sourceType: string,
  sourceRecordId: string,
): string {
  return `${acknowledgementType}:${sourceType}:${sourceRecordId}`;
}

function ackStatus(
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[],
  importKey: string,
) {
  return acknowledgements.find((a) => a.importKey === importKey)?.status ?? null;
}

function departureOf(m: DayBriefingMissionSnapshot): string | null {
  return m.eventDepartureAt ?? m.travelPlan?.departureAt ?? null;
}

export function selectFirstMission(
  dayMissions: DayBriefingMissionSnapshot[],
): DayBriefingMissionSnapshot | null {
  if (dayMissions.length === 0) return null;
  return [...dayMissions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  )[0];
}

export function detectScheduleOverlaps(
  missions: DayBriefingMissionSnapshot[],
): Array<{ id: string; titles: string[]; missionIds: string[] }> {
  const sorted = [...missions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const out: Array<{ id: string; titles: string[]; missionIds: string[] }> = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        out.push({
          id: `overlap:${a.missionId}:${b.missionId}`,
          titles: [a.title, b.title],
          missionIds: [a.missionId, b.missionId],
        });
      }
    }
  }
  return out;
}

export function deriveDepartureReadiness(
  m: DayBriefingMissionSnapshot | null,
  config: CampaignDayLaunchConfig,
): DepartureReadinessState {
  if (!m) return "NOT_REQUIRED";
  if (!m.travelRequired) return "NOT_REQUIRED";
  const departure = departureOf(m);
  const destination = m.locationLabel;
  if (!departure || !destination) {
    return config.requireFirstMissionDepartureTime || !destination
      ? "BLOCKING"
      : "NEEDS_ATTENTION";
  }
  if (!m.travelPlan?.parkingInstructions && !m.preparation.parkingInstructions) {
    return "NEEDS_ATTENTION";
  }
  return "CONFIRMED";
}

export function derivePreparationLaunchImpact(
  m: DayBriefingMissionSnapshot | null,
): PreparationLaunchImpact {
  if (!m) return "USABLE";
  if (!m.preparation.exists || m.preparation.readiness === "NEEDS_ATTENTION") {
    return "BLOCKING_LAUNCH";
  }
  if (m.preparation.readiness === "DRAFT") return "NEEDS_REVIEW";
  const criticalTaskOpen = m.preparation.preparationTasks.some((t) => !t.completed);
  if (criticalTaskOpen) return "NEEDS_REVIEW";
  return "USABLE";
}

export function buildOvernightChanges(input: {
  priorCloseout: CampaignDayCloseoutPersisted | null;
  priorCloseoutExists: boolean;
  priorTomorrowReadiness: TomorrowReadinessStatus | null;
  currentDerivedReadiness: CampaignDayLaunchReadiness;
  dayMissions: DayBriefingMissionSnapshot[];
  firstMission: DayBriefingMissionSnapshot | null;
  overlaps: Array<{ id: string; titles: string[]; missionIds: string[] }>;
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[];
  baselineAt: string | null;
}): OvernightChangeItem[] {
  const items: OvernightChangeItem[] = [];
  const acks = input.acknowledgements;

  if (!input.priorCloseoutExists) {
    const key = acknowledgementImportKey(
      "OVERNIGHT_CHANGE",
      "PRIOR_DAY_CLOSEOUT",
      "missing",
    );
    items.push({
      id: key,
      category: "CLOSEOUT",
      categoryLabel: labelOvernightCategory("CLOSEOUT"),
      title: "The prior campaign day was not formally closed out.",
      missionId: null,
      missionTitle: null,
      previousValue: null,
      currentValue: "No signed-off prior-day baseline is available.",
      changeAt: null,
      severity: "HIGH",
      severityLabel: labelSeverity("HIGH"),
      href: null,
      acknowledgementImportKey: key,
      acknowledgementStatus: ackStatus(acks, key),
    });
  } else if (
    input.priorTomorrowReadiness &&
    input.priorTomorrowReadiness !== "NOT_ASSESSED" &&
    input.currentDerivedReadiness !== "NOT_ASSESSED" &&
    mapCloseoutToLaunch(input.priorTomorrowReadiness) !==
      input.currentDerivedReadiness
  ) {
    const key = acknowledgementImportKey(
      "OVERNIGHT_CHANGE",
      "PRIOR_DAY_CLOSEOUT",
      "readiness-drift",
    );
    items.push({
      id: key,
      category: "PREPARATION",
      categoryLabel: labelOvernightCategory("PREPARATION"),
      title: "Prior Closeout tomorrow readiness differs from current morning state.",
      missionId: null,
      missionTitle: null,
      previousValue: `Last night: ${input.priorTomorrowReadiness}`,
      currentValue: `Current morning: ${input.currentDerivedReadiness}`,
      changeAt: input.baselineAt,
      severity: "HIGH",
      severityLabel: labelSeverity("HIGH"),
      href: null,
      acknowledgementImportKey: key,
      acknowledgementStatus: ackStatus(acks, key),
    });
  }

  const first = input.firstMission;
  if (first) {
    if (!first.preparation.exists || first.preparation.readiness === "NEEDS_ATTENTION") {
      const key = acknowledgementImportKey(
        "FIRST_MISSION_PREPARATION",
        "MISSION_PREPARATION",
        first.missionId,
      );
      items.push({
        id: key,
        category: "PREPARATION",
        categoryLabel: labelOvernightCategory("PREPARATION"),
        title: `First Mission preparation needs attention: ${first.title}`,
        missionId: first.missionId,
        missionTitle: first.title,
        previousValue: input.priorTomorrowReadiness,
        currentValue: first.preparation.readiness ?? "absent",
        changeAt: null,
        severity: "CRITICAL",
        severityLabel: labelSeverity("CRITICAL"),
        href: `/system/missions/${first.missionId}/prepare`,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
      });
    }
    if (first.travelRequired && !departureOf(first)) {
      const key = acknowledgementImportKey(
        "TRAVEL",
        "CAMPAIGN_MISSION",
        first.missionId,
      );
      items.push({
        id: key,
        category: "TRAVEL",
        categoryLabel: labelOvernightCategory("TRAVEL"),
        title: `Departure time not set for ${first.title}`,
        missionId: first.missionId,
        missionTitle: first.title,
        previousValue: null,
        currentValue: "Departure time not set",
        changeAt: null,
        severity: "CRITICAL",
        severityLabel: labelSeverity("CRITICAL"),
        href: `/system/missions/${first.missionId}/prepare`,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
      });
    }
    if (first.operationalStatus === "CANCELLED") {
      const key = acknowledgementImportKey(
        "OVERNIGHT_CHANGE",
        "CAMPAIGN_MISSION",
        `${first.missionId}:cancelled`,
      );
      items.push({
        id: key,
        category: "MISSION_REMOVED",
        categoryLabel: labelOvernightCategory("MISSION_REMOVED"),
        title: `First Mission is cancelled: ${first.title}`,
        missionId: first.missionId,
        missionTitle: first.title,
        previousValue: null,
        currentValue: "CANCELLED",
        changeAt: null,
        severity: "CRITICAL",
        severityLabel: labelSeverity("CRITICAL"),
        href: `/system/missions/${first.missionId}`,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
      });
    }
  }

  for (const o of input.overlaps) {
    const key = acknowledgementImportKey(
      "SCHEDULE_CONFLICT",
      "COMMAND_CENTER_RULE",
      o.id,
    );
    items.push({
      id: key,
      category: "SCHEDULE",
      categoryLabel: labelOvernightCategory("SCHEDULE"),
      title: `Schedule overlap: ${o.titles.join(" / ")}`,
      missionId: o.missionIds[0] ?? null,
      missionTitle: o.titles[0] ?? null,
      previousValue: null,
      currentValue: o.titles.join(" overlaps "),
      changeAt: null,
      severity: "CRITICAL",
      severityLabel: labelSeverity("CRITICAL"),
      href: "/calendar",
      acknowledgementImportKey: key,
      acknowledgementStatus: ackStatus(acks, key),
    });
  }

  return items.sort((a, b) => a.id.localeCompare(b.id));
}

function mapCloseoutToLaunch(
  value: TomorrowReadinessStatus,
): CampaignDayLaunchReadiness {
  switch (value) {
    case "READY":
      return "READY";
    case "NEEDS_ATTENTION":
      return "NOT_READY";
    case "NOT_READY":
      return "NOT_READY";
    case "NO_MISSIONS_SCHEDULED":
      return "NO_MISSIONS_SCHEDULED";
    default:
      return "NOT_ASSESSED";
  }
}

export function buildLaunchBlockers(input: {
  dayMissions: DayBriefingMissionSnapshot[];
  firstMission: DayBriefingMissionSnapshot | null;
  departureState: DepartureReadinessState;
  prepImpact: PreparationLaunchImpact;
  overlaps: Array<{ id: string; titles: string[]; missionIds: string[] }>;
  urgentUnownedCarryForward: number;
  unacknowledgedCritical: number;
  priorCloseoutMissing: boolean;
  requirePriorCloseoutReview: boolean;
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[];
}): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];
  const acks = input.acknowledgements;

  if (input.priorCloseoutMissing && input.requirePriorCloseoutReview) {
    const key = acknowledgementImportKey(
      "OVERNIGHT_CHANGE",
      "PRIOR_DAY_CLOSEOUT",
      "missing",
    );
    blockers.push({
      id: key,
      title: "Prior day Closeout missing",
      explanation:
        "The prior campaign day was not formally closed out. Acknowledge the missing baseline before launch.",
      missionId: null,
      acknowledgementImportKey: key,
      acknowledgementStatus: ackStatus(acks, key),
      href: null,
    });
  }

  const first = input.firstMission;
  if (first) {
    if (!first.startsAt) {
      const key = acknowledgementImportKey(
        "FIRST_MISSION_PREPARATION",
        "CAMPAIGN_MISSION",
        `${first.missionId}:start`,
      );
      blockers.push({
        id: key,
        title: "First Mission start time missing",
        explanation: `${first.title} has no usable start time.`,
        missionId: first.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
        href: `/system/missions/${first.missionId}`,
      });
    }
    if (!first.locationLabel && !first.isAllDay) {
      const key = acknowledgementImportKey(
        "FIRST_MISSION_PREPARATION",
        "CAMPAIGN_MISSION",
        `${first.missionId}:location`,
      );
      blockers.push({
        id: key,
        title: "First Mission location missing",
        explanation: `${first.title} has no location for an in-person schedule.`,
        missionId: first.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
        href: `/system/missions/${first.missionId}`,
      });
    }
    if (input.prepImpact === "BLOCKING_LAUNCH") {
      const key = acknowledgementImportKey(
        "FIRST_MISSION_PREPARATION",
        "MISSION_PREPARATION",
        first.missionId,
      );
      blockers.push({
        id: key,
        title: "First Mission preparation is not usable",
        explanation:
          "Preparation is absent or marked Needs Attention for the first Mission.",
        missionId: first.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
        href: `/system/missions/${first.missionId}/prepare`,
      });
    }
    if (input.departureState === "BLOCKING") {
      const key = acknowledgementImportKey(
        "TRAVEL",
        "CAMPAIGN_MISSION",
        first.missionId,
      );
      blockers.push({
        id: key,
        title: "First departure plan is incomplete",
        explanation:
          "Travel is required but departure time or destination is not prepared.",
        missionId: first.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(acks, key),
        href: `/system/missions/${first.missionId}/prepare`,
      });
    }
  }

  for (const o of input.overlaps) {
    const key = acknowledgementImportKey(
      "SCHEDULE_CONFLICT",
      "COMMAND_CENTER_RULE",
      o.id,
    );
    blockers.push({
      id: key,
      title: "Unresolved schedule overlap",
      explanation: `${o.titles.join(" and ")} overlap.`,
      missionId: o.missionIds[0] ?? null,
      acknowledgementImportKey: key,
      acknowledgementStatus: ackStatus(acks, key),
      href: "/calendar",
    });
  }

  if (input.urgentUnownedCarryForward > 0) {
    const key = acknowledgementImportKey(
      "CARRY_FORWARD",
      "CARRY_FORWARD_ITEM",
      "unowned-urgent",
    );
    blockers.push({
      id: key,
      title: "Urgent carry-forward lacks an owner",
      explanation: `${input.urgentUnownedCarryForward} urgent carry-forward item(s) need an owner.`,
      missionId: null,
      acknowledgementImportKey: key,
      acknowledgementStatus: ackStatus(acks, key),
      href: null,
    });
  }

  return blockers;
}

export function deriveLaunchReadiness(input: {
  dayMissionCount: number;
  blockers: LaunchBlocker[];
}): CampaignDayLaunchReadiness {
  if (input.dayMissionCount === 0) return "NO_MISSIONS_SCHEDULED";

  const openOrAckOnly = input.blockers.filter((b) => {
    const s = b.acknowledgementStatus;
    return !s || s === "OPEN" || s === "ACKNOWLEDGED";
  });
  const accepted = input.blockers.filter(
    (b) => b.acknowledgementStatus === "ACCEPTED_RISK",
  );
  const cleared = input.blockers.filter((b) =>
    ["RESOLVED", "NOT_APPLICABLE", "ACCEPTED_RISK"].includes(
      b.acknowledgementStatus ?? "",
    ),
  );

  if (openOrAckOnly.length > 0) return "NOT_READY";
  if (accepted.length > 0 && cleared.length === input.blockers.length) {
    return "READY_WITH_ACCEPTED_RISK";
  }
  if (input.blockers.length === 0 || cleared.length === input.blockers.length) {
    return "READY";
  }
  return "NOT_READY";
}
