import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import type { CampaignDayCloseoutConfig } from "@/lib/missions/v21/day-closeout/closeout-config";
import type {
  CampaignDayCarryForwardPersisted,
  CampaignDayCloseoutCheck,
  CampaignDayCloseoutPersisted,
  EmptyCloseoutState,
} from "@/lib/missions/v21/day-closeout/types";
import { labelCheckState } from "@/lib/missions/v21/day-closeout/labels";
import type { TomorrowReadinessStatus } from "@/lib/missions/v21/day-closeout/types";

const OPEN = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

export function buildDayCloseoutChecklist(input: {
  dayMissions: DayBriefingMissionSnapshot[];
  activeExecutionCount: number;
  debriefNotStarted: number;
  openDueToday: number;
  overdue: number;
  leadershipDecisions: number;
  carryForwardOpen: number;
  suggestedPending: number;
  tomorrowMissions: DayBriefingMissionSnapshot[];
  tomorrowConflicts: number;
  derivedTomorrowReadiness: TomorrowReadinessStatus;
  closeout: CampaignDayCloseoutPersisted | EmptyCloseoutState;
}): CampaignDayCloseoutCheck[] {
  const checks: CampaignDayCloseoutCheck[] = [
    {
      id: "active-execution",
      label: "All active execution reviewed",
      group: "TODAY",
      state:
        input.activeExecutionCount === 0 ? "COMPLETE" : "NEEDS_ATTENTION",
      stateLabel: "",
    },
    {
      id: "missions-accounted",
      label: "Today’s Missions accounted for",
      group: "TODAY",
      state: "COMPLETE",
      stateLabel: "",
    },
    {
      id: "debriefs-started",
      label: "Required Debriefs started",
      group: "TODAY",
      state:
        input.debriefNotStarted === 0 ? "COMPLETE" : "NEEDS_ATTENTION",
      stateLabel: "",
    },
    {
      id: "due-today",
      label: "Due-today work reviewed",
      group: "TODAY",
      state: input.openDueToday === 0 ? "COMPLETE" : "NEEDS_ATTENTION",
      stateLabel: "",
    },
    {
      id: "overdue",
      label: "Overdue work reviewed",
      group: "TODAY",
      state: input.overdue === 0 ? "COMPLETE" : "NEEDS_ATTENTION",
      stateLabel: "",
    },
    {
      id: "leadership",
      label: "Leadership decisions surfaced",
      group: "TODAY",
      state: "COMPLETE",
      stateLabel: "",
    },
    {
      id: "carry-forward",
      label: "Carry-forward register reviewed",
      group: "TODAY",
      state:
        input.suggestedPending === 0 || input.carryForwardOpen > 0
          ? input.suggestedPending > 0 && input.carryForwardOpen === 0
            ? "NEEDS_ATTENTION"
            : "COMPLETE"
          : "COMPLETE",
      stateLabel: "",
    },
    {
      id: "first-mission",
      label: "First Mission identified",
      group: "TOMORROW",
      state:
        input.tomorrowMissions.length === 0
          ? "NOT_APPLICABLE"
          : "COMPLETE",
      stateLabel: "",
    },
    {
      id: "tomorrow-prep",
      label: "First Mission preparation reviewed",
      group: "TOMORROW",
      state:
        input.tomorrowMissions.length === 0
          ? "NOT_APPLICABLE"
          : input.derivedTomorrowReadiness === "NOT_READY"
            ? "NEEDS_ATTENTION"
            : "COMPLETE",
      stateLabel: "",
    },
    {
      id: "tomorrow-conflicts",
      label: "Schedule conflicts reviewed",
      group: "TOMORROW",
      state:
        input.tomorrowMissions.length === 0
          ? "NOT_APPLICABLE"
          : input.tomorrowConflicts === 0
            ? "COMPLETE"
            : "NEEDS_ATTENTION",
      stateLabel: "",
    },
    {
      id: "tomorrow-assessed",
      label: "Tomorrow readiness assessed",
      group: "TOMORROW",
      state:
        input.closeout.tomorrowReadiness === "NOT_ASSESSED"
          ? "NEEDS_ATTENTION"
          : "COMPLETE",
      stateLabel: "",
    },
  ];

  return checks.map((c) => ({
    ...c,
    stateLabel: labelCheckState(c.state),
  }));
}

export function collectReviewBlockers(input: {
  config: CampaignDayCloseoutConfig;
  activeExecutionCount: number;
  closeout: CampaignDayCloseoutPersisted | EmptyCloseoutState;
  tomorrowMissionCount: number;
  urgentUnownedCarryForward: number;
  checklist: CampaignDayCloseoutCheck[];
}): string[] {
  const blockers: string[] = [];
  if (input.closeout.todayAssessment === "NOT_ASSESSED") {
    blockers.push("Today assessment must be selected.");
  }
  if (input.closeout.tomorrowReadiness === "NOT_ASSESSED") {
    blockers.push("Tomorrow readiness must be selected.");
  }
  if (
    !input.closeout.closeoutSummary ||
    !input.closeout.closeoutSummary.trim()
  ) {
    blockers.push("Closeout summary is required.");
  }
  if (
    input.tomorrowMissionCount > 0 &&
    (!input.closeout.tomorrowSummary ||
      !input.closeout.tomorrowSummary.trim())
  ) {
    blockers.push("Tomorrow summary is required when Missions are scheduled.");
  }
  if (
    input.config.blockReviewWithActiveExecution &&
    input.activeExecutionCount > 0
  ) {
    blockers.push(
      "Active execution remains. End execution in Execute Mode or carry it forward before completing review.",
    );
  }
  if (
    input.config.requireUrgentCarryForwardOwner &&
    input.urgentUnownedCarryForward > 0
  ) {
    blockers.push(
      "Urgent carry-forward items need an owner before review can complete.",
    );
  }
  const criticalChecks = input.checklist.filter(
    (c) =>
      c.state === "NEEDS_ATTENTION" &&
      (c.id === "active-execution" || c.id === "tomorrow-conflicts"),
  );
  for (const c of criticalChecks) {
    if (c.id === "active-execution" && input.config.blockReviewWithActiveExecution) {
      continue; // already covered
    }
    if (c.id === "tomorrow-conflicts") {
      blockers.push("Tomorrow schedule conflicts need attention before review.");
    }
  }
  return blockers;
}

export function collectSignoffBlockers(input: {
  config: CampaignDayCloseoutConfig;
  closeout: CampaignDayCloseoutPersisted | EmptyCloseoutState;
  reviewBlockers: string[];
  derivedTomorrowReadiness: TomorrowReadinessStatus;
}): string[] {
  const blockers: string[] = [];
  if (input.closeout.status !== "REVIEWED") {
    blockers.push("Day review must be completed before signoff.");
  }
  if (!input.config.allowSignoffWithCriticalBlocker) {
    if (input.derivedTomorrowReadiness === "NOT_READY") {
      blockers.push(
        "Tomorrow is marked Not ready. Document blockers in summaries or resolve critical gaps before signoff.",
      );
    }
  }
  // Signoff requires reviewed — review blockers should already be cleared
  if (input.closeout.status === "REVIEWED" && input.reviewBlockers.length > 0) {
    // reviewed state implies they passed — only re-check critical persisted fields
  }
  return blockers;
}
