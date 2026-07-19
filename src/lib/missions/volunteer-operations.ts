/**
 * Step 7.4 — Volunteer Operations (pure aggregation).
 * Answers: Do we have enough people to execute the plan?
 *
 * Canonical owner of volunteer capacity / assignment fill facts.
 * Roster availability, skills, certifications, reliability remain Unknown
 * until those sub-surfaces exist (Unknown is first-class — not zero).
 */

import type { MissionCard } from "@/lib/missions/mission-card";

/** First-class Unknown — not zero, false, empty, or assumed. */
export type UnknownFact = {
  status: "unknown";
  value: null;
  reason: string;
};

export type KnownNumber = {
  status: "known";
  value: number;
  note?: string;
};

export type OperationalNumber = KnownNumber | UnknownFact;

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type VolunteerMissionCapacity = {
  missionId: string;
  missionTitle: string;
  countyName: string | null;
  whenLabel: string;
  href: string;
  requiredRoles: number;
  assignedRoles: number;
  openRoles: number;
  staffingPlanDefined: boolean;
  volunteerLeadAssigned: boolean;
  assignmentConfidence: ConfidenceLevel;
  staffingConfidence: ConfidenceLevel;
  backupLeaderAvailable: UnknownFact;
  replacementOptions: UnknownFact;
};

export type VolunteerCountyCapacity = {
  countyName: string;
  slug: string;
  /** Mission role fill — known when staffing plan exists; else Unknown. */
  volunteerCapacity: OperationalNumber;
  /** Coordinator/bench registry not implemented → Unknown. */
  leadershipDepth: OperationalNumber;
  openRoles: KnownNumber;
  coverage: {
    status: "known" | "unknown";
    filled: number | null;
    required: number | null;
    percent: number | null;
    reason?: string;
  };
  benchStrength: UnknownFact;
  hasVolunteerCoordinator: boolean | null;
  recruitmentPriority: "CRITICAL" | "HIGH" | "WATCH" | "NONE";
};

export type VolunteerOperationsHome = {
  title: "VOLUNTEER OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  /** Pool availability — Unknown until roster exists. */
  availableVolunteers: UnknownFact;
  assignedToday: KnownNumber;
  openPositions: KnownNumber;
  criticalVacancies: KnownNumber;
  leadershipBench: UnknownFact;
  recruitmentPriority: Array<{
    countyName: string;
    openRoles: number;
    priority: "CRITICAL" | "HIGH" | "WATCH";
    href: string;
  }>;
  missionCapacity: VolunteerMissionCapacity[];
  countyCapacity: VolunteerCountyCapacity[];
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    assignedToday: number;
    openPositions: number;
    criticalVacancies: number;
    understaffedMissions: number;
    countiesWithoutCoordinator: number | null;
    countiesWithoutCoordinatorStatus: "known" | "unknown";
    unassignedTrainedCanvassers: null;
    unassignedTrainedCanvassersStatus: "unknown";
    topVacancies: Array<{ label: string; detail: string; href: string }>;
    briefingLine: string;
  };
  countyFeed: VolunteerCountyCapacity[];
  fieldFeed: {
    missions: Array<{
      missionId: string;
      assignmentConfidence: ConfidenceLevel;
      staffingConfidence: ConfidenceLevel;
      openRoles: number;
      staffingPlanDefined: boolean;
      volunteerLeadAssigned: boolean;
      backupLeaderAvailable: UnknownFact;
      replacementOptions: UnknownFact;
    }>;
  };
  /** Consumed from Communications Operations — never owned here. */
  communicationsConsume: {
    currentCampaignMessage: UnknownFact;
    approvedLiterature: UnknownFact;
    canvassingScriptVersion: UnknownFact;
    trainingReminders: UnknownFact;
    talkingPointsPlanReadyMissions: number;
  } | null;
};

export type VolunteerMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  staffAssignedCount: number;
  staffRequiredCount: number;
  volunteerLeadAssigned?: boolean;
};

export function countySlugFromName(countyName: string): string {
  return countyName
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export function deriveStaffingConfidence(input: {
  staffingPlanDefined: boolean;
  assigned: number;
  required: number;
}): ConfidenceLevel {
  if (!input.staffingPlanDefined) return "UNKNOWN";
  if (input.required <= 0) return "UNKNOWN";
  const ratio = input.assigned / input.required;
  if (ratio >= 1) return "HIGH";
  if (ratio >= 0.67) return "MEDIUM";
  if (ratio > 0) return "LOW";
  return "LOW";
}

export function deriveAssignmentConfidence(input: {
  staffingPlanDefined: boolean;
  assigned: number;
  required: number;
  volunteerLeadAssigned: boolean;
}): ConfidenceLevel {
  if (!input.staffingPlanDefined) return "UNKNOWN";
  const staffing = deriveStaffingConfidence(input);
  if (staffing === "HIGH" && input.volunteerLeadAssigned) return "HIGH";
  if (staffing === "HIGH") return "MEDIUM";
  return staffing;
}

const ROSTER_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Volunteer roster availability is not yet available because its owning sub-surface has not been implemented.",
};

const BENCH_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Leadership bench / certified backup pool is not yet available because its owning sub-surface has not been implemented.",
};

const BACKUP_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Backup leader availability is Unknown — Volunteer Operations does not yet own a replacement bench.",
};

const REPLACEMENT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Replacement options are Unknown — no volunteer matching surface yet.",
};

export function buildVolunteerMissionCapacity(
  input: VolunteerMissionInput,
): VolunteerMissionCapacity {
  const required = Math.max(0, input.staffRequiredCount);
  const assigned = Math.max(0, input.staffAssignedCount);
  const staffingPlanDefined = required > 0;
  const openRoles = staffingPlanDefined ? Math.max(0, required - assigned) : 0;
  const volunteerLeadAssigned = Boolean(input.volunteerLeadAssigned);
  const staffingConfidence = deriveStaffingConfidence({
    staffingPlanDefined,
    assigned,
    required,
  });
  const assignmentConfidence = deriveAssignmentConfidence({
    staffingPlanDefined,
    assigned,
    required,
    volunteerLeadAssigned,
  });

  return {
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    countyName: input.countyName,
    whenLabel: input.mission.whenLabel,
    href: `/calendar?event=${input.mission.missionId}`,
    requiredRoles: required,
    assignedRoles: assigned,
    openRoles,
    staffingPlanDefined,
    volunteerLeadAssigned,
    assignmentConfidence,
    staffingConfidence,
    backupLeaderAvailable: BACKUP_UNKNOWN,
    replacementOptions: REPLACEMENT_UNKNOWN,
  };
}

function buildCountyCapacity(
  countyName: string,
  missions: VolunteerMissionCapacity[],
): VolunteerCountyCapacity {
  const withPlan = missions.filter((m) => m.staffingPlanDefined);
  const openRoles = missions.reduce((sum, m) => sum + m.openRoles, 0);
  const filled = withPlan.reduce((sum, m) => sum + m.assignedRoles, 0);
  const required = withPlan.reduce((sum, m) => sum + m.requiredRoles, 0);
  const leads = missions.filter((m) => m.volunteerLeadAssigned).length;

  let volunteerCapacity: OperationalNumber;
  let coverage: VolunteerCountyCapacity["coverage"];

  if (withPlan.length === 0) {
    volunteerCapacity = {
      status: "unknown",
      value: null,
      reason:
        missions.length === 0
          ? "No missions today — capacity not assessed (Unknown, not zero)."
          : "Staffing plan not defined on today’s missions — fill capacity is Unknown.",
    };
    coverage = {
      status: "unknown",
      filled: null,
      required: null,
      percent: null,
      reason: volunteerCapacity.reason,
    };
  } else {
    const percent = required > 0 ? Math.round((filled / required) * 100) : null;
    volunteerCapacity = {
      status: "known",
      value: percent ?? 0,
      note: `${filled}/${required} roles filled (${percent ?? 0}%)`,
    };
    coverage = {
      status: "known",
      filled,
      required,
      percent,
    };
  }

  const leadershipDepth: OperationalNumber =
    missions.length === 0
      ? {
          status: "unknown",
          value: null,
          reason:
            "No county volunteer coordinator registry yet — leadership depth is Unknown.",
        }
      : leads > 0
        ? {
            status: "known",
            value: leads,
            note: `${leads} mission(s) with volunteer lead assigned`,
          }
        : {
            status: "unknown",
            value: null,
            reason:
              "Volunteer lead roles not assigned; county coordinator registry not implemented.",
          };

  let recruitmentPriority: VolunteerCountyCapacity["recruitmentPriority"] = "NONE";
  if (openRoles >= 3) recruitmentPriority = "CRITICAL";
  else if (openRoles >= 1) recruitmentPriority = "HIGH";
  else if (withPlan.length === 0 && missions.length > 0) recruitmentPriority = "WATCH";

  return {
    countyName,
    slug: countySlugFromName(countyName),
    volunteerCapacity,
    leadershipDepth,
    openRoles: { status: "known", value: openRoles },
    coverage,
    benchStrength: BENCH_UNKNOWN,
    hasVolunteerCoordinator: null,
    recruitmentPriority,
  };
}

export function buildVolunteerOperationsHome(input: {
  date: string;
  timezone: string;
  missions: VolunteerMissionInput[];
  now?: Date;
  communicationsConsume?: VolunteerOperationsHome["communicationsConsume"];
}): VolunteerOperationsHome {
  const now = input.now ?? new Date();
  const missionCapacity = input.missions
    .map(buildVolunteerMissionCapacity)
    .sort((a, b) => b.openRoles - a.openRoles || a.missionTitle.localeCompare(b.missionTitle));

  const assignedToday = missionCapacity.reduce((s, m) => s + m.assignedRoles, 0);
  const openPositions = missionCapacity.reduce((s, m) => s + m.openRoles, 0);
  const criticalVacancies = missionCapacity.filter((m) => m.openRoles > 0).length;

  const byCounty = new Map<string, VolunteerMissionCapacity[]>();
  for (const m of missionCapacity) {
    const key = m.countyName?.trim() || "Unspecified";
    const list = byCounty.get(key) ?? [];
    list.push(m);
    byCounty.set(key, list);
  }

  const countyCapacity = [...byCounty.entries()]
    .map(([name, missions]) => buildCountyCapacity(name, missions))
    .sort((a, b) => b.openRoles.value - a.openRoles.value || a.countyName.localeCompare(b.countyName));

  const recruitmentPriority = countyCapacity
    .filter((c) => c.recruitmentPriority !== "NONE" && c.countyName !== "Unspecified")
    .map((c) => ({
      countyName: c.countyName,
      openRoles: c.openRoles.value,
      priority: c.recruitmentPriority as "CRITICAL" | "HIGH" | "WATCH",
      href: `/counties/${c.slug}`,
    }));

  const topVacancies = missionCapacity
    .filter((m) => m.openRoles > 0)
    .slice(0, 5)
    .map((m) => ({
      label: m.countyName || m.missionTitle,
      detail: `${m.openRoles} open role(s) · ${m.missionTitle}`,
      href: m.href,
    }));

  const briefingParts: string[] = [];
  if (criticalVacancies > 0) {
    briefingParts.push(
      `${criticalVacancies} event${criticalVacancies === 1 ? "" : "s"} understaffed.`,
    );
  } else if (missionCapacity.some((m) => m.staffingPlanDefined)) {
    briefingParts.push("No understaffed events in today’s permissioned staffing plans.");
  } else {
    briefingParts.push(
      "Staffing plans undefined on today’s missions — capacity remains Unknown, not zero.",
    );
  }
  if (openPositions > 0) {
    briefingParts.push(`${openPositions} open position${openPositions === 1 ? "" : "s"}.`);
  }
  briefingParts.push(
    "Available volunteer pool Unknown — roster surface not implemented.",
  );

  return {
    title: "VOLUNTEER OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    availableVolunteers: ROSTER_UNKNOWN,
    assignedToday: {
      status: "known",
      value: assignedToday,
      note: "Filled staff assignment slots today (not a volunteer CRM headcount).",
    },
    openPositions: {
      status: "known",
      value: openPositions,
      note: "Unfilled required roles across today’s missions.",
    },
    criticalVacancies: {
      status: "known",
      value: criticalVacancies,
      note: "Missions with at least one open required role.",
    },
    leadershipBench: BENCH_UNKNOWN,
    recruitmentPriority,
    missionCapacity,
    countyCapacity,
    unknowns: [
      {
        fact: "Available volunteers",
        reason: ROSTER_UNKNOWN.reason,
      },
      {
        fact: "Leadership bench",
        reason: BENCH_UNKNOWN.reason,
      },
      {
        fact: "Trained canvassers unassigned",
        reason:
          "Training / skill inventory is not yet available because its owning sub-surface has not been implemented.",
      },
      {
        fact: "County volunteer coordinators",
        reason:
          "Coordinator registry is not yet available — hasVolunteerCoordinator stays null (Unknown), not false.",
      },
    ],
    executiveFeed: {
      assignedToday,
      openPositions,
      criticalVacancies,
      understaffedMissions: criticalVacancies,
      countiesWithoutCoordinator: null,
      countiesWithoutCoordinatorStatus: "unknown",
      unassignedTrainedCanvassers: null,
      unassignedTrainedCanvassersStatus: "unknown",
      topVacancies,
      briefingLine: briefingParts.join(" "),
    },
    countyFeed: countyCapacity,
    fieldFeed: {
      missions: missionCapacity.map((m) => ({
        missionId: m.missionId,
        assignmentConfidence: m.assignmentConfidence,
        staffingConfidence: m.staffingConfidence,
        openRoles: m.openRoles,
        staffingPlanDefined: m.staffingPlanDefined,
        volunteerLeadAssigned: m.volunteerLeadAssigned,
        backupLeaderAvailable: m.backupLeaderAvailable,
        replacementOptions: m.replacementOptions,
      })),
    },
    communicationsConsume: input.communicationsConsume ?? null,
  };
}

export function volunteerOperationsForAdvisory(home: VolunteerOperationsHome) {
  return {
    date: home.date,
    assignedToday: home.assignedToday,
    openPositions: home.openPositions,
    criticalVacancies: home.criticalVacancies,
    availableVolunteers: home.availableVolunteers,
    leadershipBench: home.leadershipBench,
    recruitmentPriority: home.recruitmentPriority.slice(0, 8),
    topVacancies: home.executiveFeed.topVacancies,
    unknowns: home.unknowns,
    executiveFeed: home.executiveFeed,
  };
}

export function countyVolunteerFact(
  feed: VolunteerCountyCapacity[] | null | undefined,
  countyName: string,
): VolunteerCountyCapacity | null {
  if (!feed) return null;
  const key = countyName.trim().toLowerCase();
  return feed.find((c) => c.countyName.toLowerCase() === key) ?? null;
}
