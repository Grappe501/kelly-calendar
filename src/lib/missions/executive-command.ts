/**
 * Step 7.1 — Executive Command Center (pure aggregation).
 * Morning briefing for: What does Kelly need to know in 60 seconds?
 */

import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { MissionCard } from "@/lib/missions/mission-card";

export type ExecutivePriority = {
  label: string;
  detail: string;
  href: string | null;
  urgency: "NOW" | "SOON" | "WATCH";
};

export type ExecutiveInboxItem = {
  id: string;
  category:
    | "CONFLICT"
    | "STAFFING"
    | "READINESS"
    | "FOLLOW_UP"
    | "APPROVAL"
    | "DEADLINE";
  title: string;
  detail: string;
  href: string | null;
  status: "actionable" | "unknown";
};

export type CountyOpsStatus = "ACTIVE_TODAY" | "UPCOMING" | "UNKNOWN";

export type CountyOpsRow = {
  countyName: string;
  status: CountyOpsStatus;
  missionCount: number;
};

export type RhythmBlock = {
  id: string;
  kind: "NOW" | "MISSION" | "TRAVEL" | "FOLLOW_UP" | "CLEAR";
  label: string;
  whenLabel: string | null;
  href: string | null;
  isCurrent: boolean;
};

export type ExecutiveCommand = {
  title: "EXECUTIVE COMMAND";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  completeness: CampaignBrief["completeness"];
  /** Section 1 — Today's Campaign */
  todaysCampaign: {
    topPriorities: ExecutivePriority[];
    whereKellyNeedsToBe: string | null;
    decisionsRequiringAttention: string[];
    planFailureRisks: string[];
  };
  /** Section 2 — Campaign Health */
  campaignHealth: {
    missionsTotal: number;
    missionsCompleted: number;
    missionsInProgress: number;
    missionsUpcoming: number;
    volunteersAssigned: { value: number | null; status: "known" | "unknown" };
    countiesActive: number;
    eventsToday: number;
    readinessScore: {
      ready: number;
      needsAttention: number;
      blocked: number;
      unknown: number;
      label: string;
    };
    operationalAlerts: string[];
  };
  /** Section 3 — Executive Inbox */
  executiveInbox: ExecutiveInboxItem[];
  /** Section 4 — Geographic Operations */
  geographic: {
    counties: CountyOpsRow[];
    unknownCountyMissions: number;
    note: string;
  };
  /** Section 5 — Campaign Rhythm */
  rhythm: RhythmBlock[];
  /** Section 6 — Deterministic executive briefing */
  executiveBriefing: {
    text: string;
    source: "deterministic_v1";
  };
};

function readinessLabel(brief: CampaignBrief): string {
  if (brief.missions.total === 0) return "No missions today";
  if (brief.readiness.blocked > 0) return "Blocked items need attention";
  if (brief.readiness.needsAttention > 0) return "Needs attention";
  if (brief.readiness.unknown > 0) return "Partial — some unknown";
  if (brief.readiness.ready === brief.missions.total) return "Ready";
  return "In progress";
}

/**
 * Deterministic one-minute executive briefing (no AI).
 */
export function buildDeterministicExecutiveBriefing(brief: CampaignBrief): string {
  if (brief.completeness === "empty_day") {
    return "No missions on today’s permissioned schedule. Use Add Mission or Calendar if activity is expected. No critical conflicts detected in this view.";
  }

  const parts: string[] = [];
  if (brief.topBlocker) {
    parts.push(`Priority risk: ${brief.topBlocker.message}.`);
  } else {
    parts.push("No critical blocker is flagged right now.");
  }

  if (brief.nextMission) {
    parts.push(
      `Next: ${brief.nextMission.title} (${brief.nextMission.whenLabel}) at ${brief.nextMission.whereLabel}.`,
    );
  } else {
    parts.push("No upcoming mission remaining today.");
  }

  if (brief.travel.nextMissionDriveMinutes != null) {
    parts.push(`Next travel about ${brief.travel.nextMissionDriveMinutes} minutes.`);
  } else if (brief.travel.knownDriveMinutes != null) {
    parts.push(`About ${brief.travel.knownDriveMinutes} minutes of planned drive time today.`);
  }

  if (brief.people.unassignedRoles > 0 || brief.people.staffingGapMissions > 0) {
    parts.push(
      brief.people.detail ||
        `${brief.people.staffingGapMissions} mission(s) need staffing attention.`,
    );
  }

  if (brief.conflicts.unresolvedCount > 0) {
    parts.push(
      `${brief.conflicts.unresolvedCount} schedule conflict(s) unresolved` +
        (brief.conflicts.topConflict
          ? ` — ${brief.conflicts.topConflict.explanation}.`
          : "."),
    );
  } else {
    parts.push("No critical schedule overlaps detected.");
  }

  if (brief.counties.names.length > 0) {
    parts.push(`Counties touched today: ${brief.counties.names.join(", ")}.`);
  }

  if (brief.completeness === "partial") {
    parts.push("Some readiness, travel, or county fields remain unknown.");
  }

  return parts.join(" ");
}

export function buildExecutiveCommand(input: {
  brief: CampaignBrief;
  missions: MissionCard[];
  countiesByMission?: Array<{ missionId: string; countyName: string | null }>;
  now?: Date;
}): ExecutiveCommand {
  const brief = input.brief;
  const now = input.now ?? new Date();
  const upcoming = input.missions
    .filter((m) => new Date(m.endsAt).getTime() >= now.getTime())
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const topPriorities: ExecutivePriority[] = [];
  if (brief.topBlocker) {
    topPriorities.push({
      label: "Resolve top blocker",
      detail: brief.topBlocker.message,
      href: brief.topBlocker.href,
      urgency: "NOW",
    });
  }
  if (brief.nextMission) {
    topPriorities.push({
      label: "Next mission",
      detail: `${brief.nextMission.title} · ${brief.nextMission.whenLabel} · ${brief.nextMission.whereLabel}`,
      href: brief.nextMission.href,
      urgency: brief.topBlocker ? "SOON" : "NOW",
    });
  }
  if (brief.requiredAction) {
    topPriorities.push({
      label: "Required action",
      detail: brief.requiredAction.label,
      href: brief.requiredAction.href,
      urgency: "SOON",
    });
  }
  if (topPriorities.length === 0) {
    topPriorities.push({
      label: "Day is clear",
      detail: "No permissioned missions require action right now.",
      href: "/add",
      urgency: "WATCH",
    });
  }

  const decisions: string[] = [];
  if (brief.conflicts.unresolvedCount > 0) {
    decisions.push("Resolve or acknowledge schedule conflicts");
  }
  if (brief.people.staffingGapMissions > 0) {
    decisions.push("Fill staffing gaps before mission start");
  }
  if (brief.readiness.blocked > 0) {
    decisions.push("Clear blocked readiness items");
  }
  if (decisions.length === 0 && brief.nextMission) {
    decisions.push("Confirm next mission is ready to execute");
  }

  const planFailureRisks: string[] = [];
  if (brief.topBlocker) planFailureRisks.push(brief.topBlocker.message);
  if (brief.conflicts.criticalCount > 0) {
    planFailureRisks.push("High/critical schedule conflicts remain");
  }
  if (brief.travel.knownDriveMinutesPartial) {
    planFailureRisks.push("Travel times incomplete for some missions");
  }
  if (planFailureRisks.length === 0 && brief.completeness !== "empty_day") {
    planFailureRisks.push("No acute failure risks flagged in this view");
  }

  const inbox: ExecutiveInboxItem[] = [];
  if (brief.conflicts.topConflict) {
    inbox.push({
      id: "inbox-conflict",
      category: "CONFLICT",
      title: "Schedule conflict",
      detail: brief.conflicts.topConflict.explanation,
      href: brief.conflicts.topConflict.href,
      status: "actionable",
    });
  }
  if (brief.people.detail) {
    inbox.push({
      id: "inbox-staffing",
      category: "STAFFING",
      title: "Staffing gap",
      detail: brief.people.detail,
      href: brief.nextMission?.href ?? "/",
      status: "actionable",
    });
  }
  if (brief.topBlocker) {
    inbox.push({
      id: "inbox-readiness",
      category: "READINESS",
      title: "Readiness attention",
      detail: brief.topBlocker.message,
      href: brief.topBlocker.href,
      status: "actionable",
    });
  }
  if (brief.followUp.detail) {
    inbox.push({
      id: "inbox-followup",
      category: "FOLLOW_UP",
      title: "Follow-up outstanding",
      detail: brief.followUp.detail,
      href: brief.followUp.href,
      status: "actionable",
    });
  }
  inbox.push({
    id: "inbox-approvals",
    category: "APPROVAL",
    title: "Approvals waiting",
    detail: "Approval queue not yet wired to Executive Command.",
    href: null,
    status: "unknown",
  });
  inbox.push({
    id: "inbox-media",
    category: "DEADLINE",
    title: "Media deadlines",
    detail: "Media deadline feed not available in this increment.",
    href: null,
    status: "unknown",
  });
  inbox.push({
    id: "inbox-filing",
    category: "DEADLINE",
    title: "Filing deadlines",
    detail: "Filing/compliance deadline feed not available in this increment.",
    href: null,
    status: "unknown",
  });

  const countyMap = new Map<string, number>();
  for (const row of input.countiesByMission ?? []) {
    const name = row.countyName?.trim();
    if (!name) continue;
    countyMap.set(name, (countyMap.get(name) ?? 0) + 1);
  }
  for (const name of brief.counties.names) {
    if (!countyMap.has(name)) countyMap.set(name, 1);
  }
  const counties: CountyOpsRow[] = [...countyMap.entries()]
    .map(([countyName, missionCount]) => ({
      countyName,
      status: "ACTIVE_TODAY" as const,
      missionCount,
    }))
    .sort((a, b) => a.countyName.localeCompare(b.countyName));

  const rhythm: RhythmBlock[] = [
    {
      id: "now",
      kind: "NOW",
      label: "NOW",
      whenLabel: null,
      href: "/command",
      isCurrent: true,
    },
  ];
  for (const mission of upcoming.slice(0, 6)) {
    if (
      mission.timeline?.leaveByAt &&
      new Date(mission.timeline.leaveByAt).getTime() > now.getTime()
    ) {
      rhythm.push({
        id: `travel-${mission.missionId}`,
        kind: "TRAVEL",
        label: `Leave for ${mission.title}`,
        whenLabel: mission.leaveBy.status === "computed" && mission.leaveBy.leaveByAt
          ? new Intl.DateTimeFormat("en-US", {
              timeZone: brief.timezone,
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(mission.leaveBy.leaveByAt))
          : null,
        href: `/calendar?event=${mission.missionId}`,
        isCurrent: false,
      });
    }
    rhythm.push({
      id: `mission-${mission.missionId}`,
      kind: "MISSION",
      label: mission.title,
      whenLabel: mission.whenLabel,
      href: `/calendar?event=${mission.missionId}`,
      isCurrent: mission.isNext || mission.missionId === brief.nextMission?.missionId,
    });
  }
  if (brief.followUp.outstandingCount > 0) {
    rhythm.push({
      id: "evening-followup",
      kind: "FOLLOW_UP",
      label: "Evening follow-up",
      whenLabel: null,
      href: brief.followUp.href,
      isCurrent: false,
    });
  }
  if (rhythm.length === 1) {
    rhythm.push({
      id: "clear",
      kind: "CLEAR",
      label: "No further execution blocks today",
      whenLabel: null,
      href: "/calendar",
      isCurrent: false,
    });
  }

  const alerts: string[] = [];
  if (brief.readiness.blocked > 0) {
    alerts.push(`${brief.readiness.blocked} blocked mission(s)`);
  }
  if (brief.conflicts.unresolvedCount > 0) {
    alerts.push(`${brief.conflicts.unresolvedCount} conflict(s)`);
  }
  if (brief.people.staffingGapMissions > 0) {
    alerts.push(`${brief.people.staffingGapMissions} staffing gap(s)`);
  }

  return {
    title: "EXECUTIVE COMMAND",
    date: brief.date,
    timezone: brief.timezone,
    lastUpdatedAt: now.toISOString(),
    completeness: brief.completeness,
    todaysCampaign: {
      topPriorities: topPriorities.slice(0, 4),
      whereKellyNeedsToBe: brief.nextMission
        ? `${brief.nextMission.whereLabel} · ${brief.nextMission.whenLabel}`
        : null,
      decisionsRequiringAttention: decisions,
      planFailureRisks,
    },
    campaignHealth: {
      missionsTotal: brief.missions.total,
      missionsCompleted: brief.missions.completed,
      missionsInProgress: brief.missions.inProgress,
      missionsUpcoming: upcoming.length,
      volunteersAssigned: { value: null, status: "unknown" },
      countiesActive: brief.counties.names.length,
      eventsToday: brief.missions.total,
      readinessScore: {
        ready: brief.readiness.ready,
        needsAttention: brief.readiness.needsAttention,
        blocked: brief.readiness.blocked,
        unknown: brief.readiness.unknown,
        label: readinessLabel(brief),
      },
      operationalAlerts: alerts,
    },
    executiveInbox: inbox,
    geographic: {
      counties,
      unknownCountyMissions: brief.counties.unknownCountyMissions,
      note: "County map shows permissioned missions today. Statewide volunteer heatmaps arrive with County / Field Operations workstreams.",
    },
    rhythm,
    executiveBriefing: {
      text: buildDeterministicExecutiveBriefing(brief),
      source: "deterministic_v1",
    },
  };
}

export function executiveCommandForAdvisory(command: ExecutiveCommand) {
  return {
    date: command.date,
    completeness: command.completeness,
    priorities: command.todaysCampaign.topPriorities.map((p) => p.label),
    where: command.todaysCampaign.whereKellyNeedsToBe,
    risks: command.todaysCampaign.planFailureRisks,
    health: {
      total: command.campaignHealth.missionsTotal,
      completed: command.campaignHealth.missionsCompleted,
      inProgress: command.campaignHealth.missionsInProgress,
      upcoming: command.campaignHealth.missionsUpcoming,
      countiesActive: command.campaignHealth.countiesActive,
      readiness: command.campaignHealth.readinessScore.label,
      alerts: command.campaignHealth.operationalAlerts,
      volunteersAssigned: "unknown",
    },
    inboxActionable: command.executiveInbox
      .filter((i) => i.status === "actionable")
      .map((i) => i.title),
    counties: command.geographic.counties.map((c) => c.countyName),
    briefing: command.executiveBriefing.text,
  };
}
