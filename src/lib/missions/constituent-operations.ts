/**
 * Step 7.9 — Voter & Constituent Operations (pure aggregation).
 * Answers: Who are we serving, where are we building support,
 * and what relationships require attention?
 *
 * Canonical owner of relationship facts for today’s permissioned missions.
 * Not a generic CRM or voter-file warehouse. Engagement scores, issue
 * resonance, and endorsement registries remain first-class Unknown.
 *
 * Doctrine: Data is collected only when it improves campaign execution.
 * No Person PII is projected — counts and statuses only.
 */

import type { MissionCard } from "@/lib/missions/mission-card";
import type { UnknownFact, KnownNumber } from "@/lib/missions/volunteer-operations";

export type ConstituentPlanSnapshot = {
  followupCount: number;
  followupOpenCount: number;
  followupOverdueCount: number;
  followupOwnerAssigned: boolean;
  meetVotersObjective: boolean;
  buildRelationshipsObjective: boolean;
  supportOrganizationObjective: boolean;
  reachTargetAudienceObjective: boolean;
  eventPeopleCount: number;
  eventOrganizationCount: number;
};

export type EngagementReadiness =
  | "ACTIVE"
  | "NEEDS_FOLLOW_UP"
  | "OVERDUE"
  | "PLANNED"
  | "NOT_REQUIRED"
  | "UNKNOWN";

export type ConstituentMissionRow = {
  missionId: string;
  missionTitle: string;
  countyName: string | null;
  whenLabel: string;
  href: string;
  engagement: EngagementReadiness;
  openFollowups: number;
  overdueFollowups: number;
  relationshipObjectives: number;
  peopleLinked: number;
  organizationsLinked: number;
  followupOwnerAssigned: boolean;
  relationshipBlockers: string[];
  voterEngagementStatus: UnknownFact;
};

export type ConstituentCountyRow = {
  countyName: string;
  slug: string;
  engagementCoverage: KnownNumber | UnknownFact;
  organizationalRelationships: KnownNumber;
  communityPartnerActivity: KnownNumber;
  outreachGaps: KnownNumber;
  engagementRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
};

export type ConstituentOperationsHome = {
  title: "VOTER & CONSTITUENT OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  communityEngagement: KnownNumber;
  highPriorityFollowups: KnownNumber;
  relationshipRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  targetConstituencies: UnknownFact;
  outreachCoverage: KnownNumber | UnknownFact;
  engagementMomentum: UnknownFact;
  missionRows: ConstituentMissionRow[];
  countyRows: ConstituentCountyRow[];
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    communityEngagement: number;
    highPriorityFollowups: number;
    relationshipRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    targetConstituenciesStatus: "unknown";
    outreachCoverageStatus: "known" | "unknown";
    outreachCoverageValue: number | null;
    engagementMomentumStatus: "unknown";
    overdueFollowups: number;
    topFollowups: Array<{ label: string; detail: string; href: string }>;
    briefingLine: string;
  };
  countyFeed: ConstituentCountyRow[];
  fieldFeed: {
    missions: Array<{
      missionId: string;
      assignedOutreachTargets: KnownNumber | UnknownFact;
      constituentFollowups: KnownNumber;
      neighborhoodEngagementNeeds: EngagementReadiness;
    }>;
  };
  volunteerFeed: {
    outreachAssignments: KnownNumber;
    canvassingRelationships: UnknownFact;
    constituentCallbacks: KnownNumber;
  };
  communicationsFeed: {
    issueResonance: UnknownFact;
    constituentFeedbackThemes: UnknownFact;
    messagingEffectivenessByAudience: UnknownFact;
  };
};

export type ConstituentMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  constituent: ConstituentPlanSnapshot | null;
};

const VOTER_STATUS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Voter engagement status is Unknown — Voter & Constituent Operations is not a voter-file CRM.",
};

const TARGET_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Target constituencies are Unknown — no constituency targeting registry yet.",
};

const MOMENTUM_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Engagement momentum is Unknown — multi-day relationship trends not implemented.",
};

const ISSUE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Issue resonance is Unknown — constituent feedback themes not modeled yet.",
};

const FEEDBACK_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Constituent feedback themes are Unknown — no feedback ledger surface yet.",
};

const MSG_EFFECT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Messaging effectiveness by audience is Unknown — Communications owns plans; audience lift is not tracked here.",
};

const CANVASS_REL_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Canvassing relationships are Unknown — person-level door lists are not projected.",
};

const ENDORSEMENT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Endorsement registry is Unknown — organization links are presence counts, not endorsement status.",
};

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function emptyConstituent(): ConstituentPlanSnapshot {
  return {
    followupCount: 0,
    followupOpenCount: 0,
    followupOverdueCount: 0,
    followupOwnerAssigned: false,
    meetVotersObjective: false,
    buildRelationshipsObjective: false,
    supportOrganizationObjective: false,
    reachTargetAudienceObjective: false,
    eventPeopleCount: 0,
    eventOrganizationCount: 0,
  };
}

function relationshipObjectiveCount(snap: ConstituentPlanSnapshot): number {
  return [
    snap.meetVotersObjective,
    snap.buildRelationshipsObjective,
    snap.supportOrganizationObjective,
    snap.reachTargetAudienceObjective,
  ].filter(Boolean).length;
}

export function deriveEngagementReadiness(
  snap: ConstituentPlanSnapshot,
): EngagementReadiness {
  if (snap.followupOverdueCount > 0) return "OVERDUE";
  if (snap.followupOpenCount > 0) return "NEEDS_FOLLOW_UP";
  const objectives = relationshipObjectiveCount(snap);
  if (
    objectives > 0 ||
    snap.eventPeopleCount > 0 ||
    snap.eventOrganizationCount > 0
  ) {
    if (snap.followupCount > 0 && snap.followupOpenCount === 0) return "ACTIVE";
    return "PLANNED";
  }
  if (snap.followupCount === 0 && objectives === 0) return "NOT_REQUIRED";
  return "UNKNOWN";
}

function engagementRank(e: EngagementReadiness): number {
  return e === "OVERDUE"
    ? 0
    : e === "NEEDS_FOLLOW_UP"
      ? 1
      : e === "UNKNOWN"
        ? 2
        : e === "PLANNED"
          ? 3
          : e === "ACTIVE"
            ? 4
            : 5;
}

function riskFromEngagement(
  e: EngagementReadiness,
): ConstituentCountyRow["engagementRisk"] {
  if (e === "OVERDUE") return "CRITICAL";
  if (e === "NEEDS_FOLLOW_UP") return "HIGH";
  if (e === "UNKNOWN" || e === "PLANNED") return "WATCH";
  if (e === "ACTIVE") return "LOW";
  return "UNKNOWN";
}

export function buildConstituentMissionRow(
  input: ConstituentMissionInput,
): ConstituentMissionRow {
  const snap = input.constituent ?? emptyConstituent();
  const engagement = deriveEngagementReadiness(snap);
  const relationshipObjectives = relationshipObjectiveCount(snap);
  const relationshipBlockers: string[] = [];
  if (snap.followupOverdueCount > 0) {
    relationshipBlockers.push(
      `${snap.followupOverdueCount} overdue follow-up(s)`,
    );
  }
  if (snap.followupOpenCount > 0 && !snap.followupOwnerAssigned) {
    relationshipBlockers.push("Open follow-ups without FOLLOWUP_OWNER");
  }
  if (
    relationshipObjectives > 0 &&
    snap.eventPeopleCount === 0 &&
    snap.eventOrganizationCount === 0 &&
    snap.followupCount === 0
  ) {
    relationshipBlockers.push(
      "Relationship objectives set but no people/orgs/follow-ups linked",
    );
  }

  return {
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    countyName: input.countyName,
    whenLabel: input.mission.whenLabel,
    href: `/calendar?event=${input.mission.missionId}`,
    engagement,
    openFollowups: snap.followupOpenCount,
    overdueFollowups: snap.followupOverdueCount,
    relationshipObjectives,
    peopleLinked: snap.eventPeopleCount,
    organizationsLinked: snap.eventOrganizationCount,
    followupOwnerAssigned: snap.followupOwnerAssigned,
    relationshipBlockers,
    voterEngagementStatus: VOTER_STATUS_UNKNOWN,
  };
}

function buildCountyRow(
  countyName: string,
  missions: ConstituentMissionRow[],
): ConstituentCountyRow {
  let worst: EngagementReadiness =
    missions.length === 0 ? "UNKNOWN" : "NOT_REQUIRED";
  let overdue = 0;
  let open = 0;
  let orgs = 0;
  let withRelationshipSignal = 0;
  for (const m of missions) {
    if (engagementRank(m.engagement) < engagementRank(worst)) {
      worst = m.engagement;
    }
    overdue += m.overdueFollowups;
    open += m.openFollowups;
    orgs += m.organizationsLinked;
    if (
      m.relationshipObjectives > 0 ||
      m.peopleLinked > 0 ||
      m.organizationsLinked > 0 ||
      m.openFollowups > 0
    ) {
      withRelationshipSignal += 1;
    }
  }
  const engagementCoverage: KnownNumber | UnknownFact =
    missions.length === 0
      ? {
          status: "unknown",
          value: null,
          reason:
            "No missions today — engagement coverage Unknown (not zero).",
        }
      : {
          status: "known",
          value: withRelationshipSignal,
          note: `${withRelationshipSignal}/${missions.length} missions with relationship signals today`,
        };

  return {
    countyName,
    slug: countySlug(countyName),
    engagementCoverage,
    organizationalRelationships: {
      status: "known",
      value: orgs,
      note: "EventOrganization links today (not endorsements).",
    },
    communityPartnerActivity: {
      status: "known",
      value: orgs,
      note: "Same as org links — partner activity depth Unknown beyond presence.",
    },
    outreachGaps: {
      status: "known",
      value: overdue + open,
      note: "Open + overdue follow-ups as outreach gap proxy.",
    },
    engagementRisk: riskFromEngagement(worst),
  };
}

export function buildConstituentOperationsHome(input: {
  date: string;
  timezone: string;
  missions: ConstituentMissionInput[];
  now?: Date;
}): ConstituentOperationsHome {
  const now = input.now ?? new Date();
  const missionRows = input.missions
    .map(buildConstituentMissionRow)
    .sort(
      (a, b) =>
        engagementRank(a.engagement) - engagementRank(b.engagement) ||
        b.overdueFollowups - a.overdueFollowups ||
        a.missionTitle.localeCompare(b.missionTitle),
    );

  const overdueFollowups = missionRows.reduce(
    (s, m) => s + m.overdueFollowups,
    0,
  );
  const openFollowups = missionRows.reduce((s, m) => s + m.openFollowups, 0);
  const highPriorityFollowups = overdueFollowups + openFollowups;
  const communityEngagement = missionRows.filter(
    (m) =>
      m.engagement === "ACTIVE" ||
      m.engagement === "PLANNED" ||
      m.peopleLinked > 0 ||
      m.organizationsLinked > 0,
  ).length;
  const missionsWithSignals = missionRows.filter(
    (m) =>
      m.relationshipObjectives > 0 ||
      m.peopleLinked > 0 ||
      m.organizationsLinked > 0 ||
      m.openFollowups > 0 ||
      m.overdueFollowups > 0,
  ).length;

  let relationshipRisk: ConstituentOperationsHome["relationshipRisk"] =
    "UNKNOWN";
  if (overdueFollowups > 0) relationshipRisk = "CRITICAL";
  else if (openFollowups > 0) relationshipRisk = "HIGH";
  else if (missionsWithSignals > 0) relationshipRisk = "WATCH";
  else if (missionRows.length > 0) relationshipRisk = "LOW";

  const byCounty = new Map<string, ConstituentMissionRow[]>();
  for (const m of missionRows) {
    const key = m.countyName?.trim() || "Unspecified";
    const list = byCounty.get(key) ?? [];
    list.push(m);
    byCounty.set(key, list);
  }
  const countyRows = [...byCounty.entries()]
    .map(([name, rows]) => buildCountyRow(name, rows))
    .sort(
      (a, b) =>
        engagementRank(
          a.engagementRisk === "CRITICAL"
            ? "OVERDUE"
            : a.engagementRisk === "HIGH"
              ? "NEEDS_FOLLOW_UP"
              : a.engagementRisk === "WATCH"
                ? "PLANNED"
                : a.engagementRisk === "LOW"
                  ? "ACTIVE"
                  : "UNKNOWN",
        ) -
          engagementRank(
            b.engagementRisk === "CRITICAL"
              ? "OVERDUE"
              : b.engagementRisk === "HIGH"
                ? "NEEDS_FOLLOW_UP"
                : b.engagementRisk === "WATCH"
                  ? "PLANNED"
                  : b.engagementRisk === "LOW"
                    ? "ACTIVE"
                    : "UNKNOWN",
          ) || a.countyName.localeCompare(b.countyName),
    );

  const topFollowups = missionRows
    .filter((m) => m.overdueFollowups > 0 || m.openFollowups > 0)
    .slice(0, 5)
    .map((m) => ({
      label: m.countyName || m.missionTitle,
      detail:
        m.relationshipBlockers[0] ??
        `${m.openFollowups} open / ${m.overdueFollowups} overdue · ${m.missionTitle}`,
      href: m.href,
    }));

  const briefingParts: string[] = [];
  if (overdueFollowups > 0) {
    briefingParts.push(
      `${overdueFollowups} overdue follow-up${overdueFollowups === 1 ? "" : "s"}.`,
    );
  }
  if (openFollowups > 0) {
    briefingParts.push(
      `${openFollowups} open follow-up${openFollowups === 1 ? "" : "s"} need attention.`,
    );
  }
  if (communityEngagement > 0) {
    briefingParts.push(
      `${communityEngagement} mission${communityEngagement === 1 ? "" : "s"} with community engagement signals.`,
    );
  }
  if (briefingParts.length === 0) {
    briefingParts.push(
      missionRows.length > 0
        ? "No open follow-ups flagged; voter engagement status remains Unknown."
        : "No missions today — constituent relationships Unknown, not empty.",
    );
  }
  briefingParts.push(
    "Target constituencies and engagement momentum Unknown — not a CRM.",
  );

  const outreachCoverage: KnownNumber | UnknownFact =
    missionRows.length === 0
      ? {
          status: "unknown",
          value: null,
          reason:
            "Outreach coverage Unknown with no permissioned missions today.",
        }
      : {
          status: "known",
          value: missionsWithSignals,
          note: `${missionsWithSignals}/${missionRows.length} missions with relationship signals`,
        };

  return {
    title: "VOTER & CONSTITUENT OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    communityEngagement: {
      status: "known",
      value: communityEngagement,
      note: "Missions with ACTIVE/PLANNED engagement or linked people/orgs.",
    },
    highPriorityFollowups: {
      status: "known",
      value: highPriorityFollowups,
      note: "Open + overdue EventFollowup rows today.",
    },
    relationshipRisk,
    targetConstituencies: TARGET_UNKNOWN,
    outreachCoverage,
    engagementMomentum: MOMENTUM_UNKNOWN,
    missionRows,
    countyRows,
    unknowns: [
      { fact: "Voter engagement status", reason: VOTER_STATUS_UNKNOWN.reason },
      { fact: "Target constituencies", reason: TARGET_UNKNOWN.reason },
      { fact: "Engagement momentum", reason: MOMENTUM_UNKNOWN.reason },
      { fact: "Endorsements", reason: ENDORSEMENT_UNKNOWN.reason },
      { fact: "Issue interests / resonance", reason: ISSUE_UNKNOWN.reason },
      {
        fact: "Outreach cadence plans",
        reason:
          "Cadence schedules are Unknown — follow-up due dates are task timing, not a cadence engine.",
      },
      {
        fact: "Person / voter CRM profiles",
        reason:
          "Person records are not projected into Constituent Operations — counts only, no PII.",
      },
    ],
    executiveFeed: {
      communityEngagement,
      highPriorityFollowups,
      relationshipRisk,
      targetConstituenciesStatus: "unknown",
      outreachCoverageStatus: outreachCoverage.status,
      outreachCoverageValue:
        outreachCoverage.status === "known" ? outreachCoverage.value : null,
      engagementMomentumStatus: "unknown",
      overdueFollowups,
      topFollowups,
      briefingLine: briefingParts.join(" "),
    },
    countyFeed: countyRows,
    fieldFeed: {
      missions: missionRows.map((m) => ({
        missionId: m.missionId,
        assignedOutreachTargets:
          m.peopleLinked + m.organizationsLinked > 0
            ? {
                status: "known" as const,
                value: m.peopleLinked + m.organizationsLinked,
                note: "Linked people + orgs (not a turf list).",
              }
            : {
                status: "unknown" as const,
                value: null,
                reason:
                  "No linked people/orgs on this mission — outreach targets Unknown.",
              },
        constituentFollowups: {
          status: "known",
          value: m.openFollowups + m.overdueFollowups,
          note: "Open + overdue follow-ups for this mission.",
        },
        neighborhoodEngagementNeeds: m.engagement,
      })),
    },
    volunteerFeed: {
      outreachAssignments: {
        status: "known",
        value: openFollowups + overdueFollowups,
        note: "Follow-ups as outreach assignment proxy (not volunteer CRM tasks).",
      },
      canvassingRelationships: CANVASS_REL_UNKNOWN,
      constituentCallbacks: {
        status: "known",
        value: overdueFollowups,
        note: "Overdue follow-ups as callback pressure.",
      },
    },
    communicationsFeed: {
      issueResonance: ISSUE_UNKNOWN,
      constituentFeedbackThemes: FEEDBACK_UNKNOWN,
      messagingEffectivenessByAudience: MSG_EFFECT_UNKNOWN,
    },
  };
}

export function constituentOperationsForAdvisory(
  home: ConstituentOperationsHome,
) {
  return {
    date: home.date,
    communityEngagement: home.communityEngagement,
    highPriorityFollowups: home.highPriorityFollowups,
    relationshipRisk: home.relationshipRisk,
    targetConstituencies: home.targetConstituencies,
    outreachCoverage: home.outreachCoverage,
    engagementMomentum: home.engagementMomentum,
    executiveFeed: home.executiveFeed,
    unknowns: home.unknowns,
    sample: home.missionRows.slice(0, 6).map((m) => ({
      mission: m.missionTitle,
      engagement: m.engagement,
      openFollowups: m.openFollowups,
      overdueFollowups: m.overdueFollowups,
    })),
  };
}

export function countyConstituentFact(
  feed: ConstituentCountyRow[] | null | undefined,
  countyName: string,
): ConstituentCountyRow | null {
  if (!feed) return null;
  const key = countyName.trim().toLowerCase();
  return feed.find((c) => c.countyName.toLowerCase() === key) ?? null;
}
