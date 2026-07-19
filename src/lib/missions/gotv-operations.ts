/**
 * Phase 2.4 — GOTV Operations (pure orchestration).
 * Answers: Are we converting support into turnout?
 *
 * Coordinates County, Volunteer, Constituent, Communications, Logistics,
 * and Field — does not replicate those domains. Not a voter database.
 *
 * Doctrine: Capabilities coordinate execution across operational domains;
 * they do not replicate those domains.
 */

import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import {
  combineOperationalReadiness,
  type DomainReadiness,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { UnknownFact } from "@/lib/missions/volunteer-operations";

export type GotvActivityKind =
  | "CANVASS"
  | "PHONE_BANK"
  | "CHASE"
  | "EARLY_VOTE"
  | "ELECTION_DAY"
  | "POLL_WATCH"
  | "GOTV_RALLY"
  | "GOTV_OTHER"
  | "NOT_GOTV";

export type GotvReadinessDomain =
  | "PlanPhase"
  | "TurfCoverage"
  | "VolunteerDeployment"
  | "CountyPriority"
  | "LogisticsStaging"
  | "Messaging";

export type GotvDomainCell = {
  domain: GotvReadinessDomain;
  state: DomainReadiness;
  source: string;
  detail: string;
};

export type GotvActivityRow = {
  missionId: string;
  missionTitle: string;
  whenLabel: string;
  href: string;
  kind: GotvActivityKind;
  countyName: string | null;
  domains: GotvDomainCell[];
  deploymentReadiness: DomainReadiness;
  objectives: string;
};

export type GotvCountySignal = {
  countyName: string;
  slug: string;
  turfCoverage: DomainReadiness | "UNKNOWN";
  deploymentReadiness: DomainReadiness;
  neighborhoodExecution: DomainReadiness;
  localElectionActivity: DomainReadiness;
  activityCount: number;
};

export type GotvOperationsHome = {
  title: "GOTV OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  doctrine: "coordinates execution across domains — does not replicate them";
  gotvReadiness: DomainReadiness;
  todaysDeployment: number;
  coverageGaps: KnownOrUnknown;
  priorityCounties: string[];
  electionTimeline: UnknownFact;
  turnoutRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  activityRows: GotvActivityRow[];
  readinessDomains: GotvDomainCell[];
  countySignals: GotvCountySignal[];
  unknowns: Array<{ fact: string; reason: string }>;
  candidateFeed: {
    gotvSupportingStops: number;
    priorityCountyVisits: string[];
    rallyObjectives: string[];
    turnoutMessagingFocus: UnknownFact;
    preparationStatus: DomainReadiness;
    briefingLine: string;
  };
  countyFeed: GotvCountySignal[];
  volunteerFeed: {
    canvassAssignments: KnownOrUnknown;
    phoneBankAssignments: KnownOrUnknown;
    pollWorkerAssignments: KnownOrUnknown;
    stagingLocations: UnknownFact;
    deploymentMissions: number;
    briefingLine: string;
  };
  communicationsFeed: {
    gotvMessagingStatus: "unknown";
    electionRemindersStatus: "unknown";
    volunteerCommunicationsStatus: "unknown";
    rapidResponseNeeds: number;
    gotvActivityCount: number;
    briefingLine: string;
  };
  intelligenceFeed: {
    deploymentTrendsStatus: "unknown";
    turnoutRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    coverageImbalanceSignal: boolean;
    executionBottlenecks: number;
    briefingLine: string;
  };
  executiveFeed: {
    gotvReadiness: DomainReadiness;
    todaysDeployment: number;
    coverageGapsStatus: "known" | "unknown";
    coverageGapsValue: number | null;
    priorityCounties: string[];
    electionTimelineStatus: "unknown";
    turnoutRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    activitiesAtRisk: number;
    briefingLine: string;
  };
};

type KnownOrUnknown =
  | { status: "known"; value: number }
  | { status: "unknown"; value: null; reason: string };

const TIMELINE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Election timeline phases are Unknown — GOTV owns the phase workflow surface; no election-day clock registry yet.",
};

const TURNOUT_MSG_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Turnout messaging focus is Unknown — Communications owns plan rows; GOTV messaging package not confirmed.",
};

const STAGING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Staging locations are Unknown — Logistics owns venue facts; GOTV deployment staging registry not implemented.",
};

const VOTER_FILE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Voter registration / turf universe is Unknown — GOTV is not a voter database.",
};

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export function classifyGotvActivity(input: {
  title: string;
}): GotvActivityKind {
  const t = input.title.toLowerCase();
  if (/\bcanvass\b|\bdoor[- ]knock\b|\bdoors\b/.test(t)) return "CANVASS";
  if (/\bphone bank\b|\bphonebank\b|\bdialer\b/.test(t)) return "PHONE_BANK";
  if (/\bchase\b|\bvbm chase\b|\bballot chase\b/.test(t)) return "CHASE";
  if (/\bearly vote\b|\bearly voting\b|\bevp\b/.test(t)) return "EARLY_VOTE";
  if (/\belection day\b|\be-day\b|\beday\b/.test(t)) return "ELECTION_DAY";
  if (/\bpoll watch\b|\bpollwatcher\b|\bpoll watcher\b/.test(t)) {
    return "POLL_WATCH";
  }
  if (/\bgotv rally\b|\bturnout rally\b/.test(t)) return "GOTV_RALLY";
  if (/\bgotv\b|\bget out the vote\b|\bturnout\b/.test(t)) return "GOTV_OTHER";
  return "NOT_GOTV";
}

function mapSchedule(mission: MissionCard): DomainReadiness {
  const state = mission.todayReadiness.state;
  if (state === "READY") return "READY";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapVolunteerDeployment(
  kind: GotvActivityKind,
  volunteer?: VolunteerOperationsHome["fieldFeed"]["missions"][number],
): DomainReadiness {
  if (kind === "NOT_GOTV") return "NOT_REQUIRED";
  if (!volunteer) return "UNKNOWN";
  if (volunteer.openRoles > 0 && !volunteer.volunteerLeadAssigned) {
    return "BLOCKED";
  }
  if (volunteer.openRoles > 0) return "NEEDS_ATTENTION";
  if (volunteer.volunteerLeadAssigned && volunteer.staffingPlanDefined) {
    return "READY";
  }
  if (volunteer.volunteerLeadAssigned) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCountyPriority(
  kind: GotvActivityKind,
  countyName: string | null,
  countyFeed: CountyOperationsHome["executiveFeed"] | null,
): DomainReadiness {
  if (kind === "NOT_GOTV") return "NOT_REQUIRED";
  if (!countyName) return "NEEDS_ATTENTION";
  if (!countyFeed) return "UNKNOWN";
  if (countyFeed.needsImmediate > 0) {
    const weak = countyFeed.topWeak.some(
      (w) => w.countyName.toLowerCase() === countyName.toLowerCase(),
    );
    if (weak) return "NEEDS_ATTENTION";
  }
  return "READY";
}

function mapLogisticsStaging(
  kind: GotvActivityKind,
  logistics?: LogisticsOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_GOTV" || kind === "PHONE_BANK") return "NOT_REQUIRED";
  if (!logistics) return "UNKNOWN";
  return logistics.missionReadiness;
}

function mapMessaging(
  kind: GotvActivityKind,
  communications?: CommunicationsOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_GOTV") return "NOT_REQUIRED";
  if (!communications) return "UNKNOWN";
  if (communications.talkingPointsReady) return "READY";
  if (communications.hasTalkingPoints || communications.planDefined) {
    if (communications.messagingRisk === "CRITICAL") return "BLOCKED";
    return "NEEDS_ATTENTION";
  }
  return "UNKNOWN";
}

function mapTurfCoverage(kind: GotvActivityKind): DomainReadiness {
  if (kind === "NOT_GOTV") return "NOT_REQUIRED";
  if (kind === "CANVASS" || kind === "CHASE" || kind === "EARLY_VOTE") {
    return "UNKNOWN";
  }
  return "NOT_REQUIRED";
}

function mapPlanPhase(kind: GotvActivityKind, schedule: DomainReadiness): DomainReadiness {
  if (kind === "NOT_GOTV") return "NOT_REQUIRED";
  return schedule;
}

function buildActivityDomains(input: {
  mission: MissionCard;
  kind: GotvActivityKind;
  countyName: string | null;
  volunteer?: VolunteerOperationsHome["fieldFeed"]["missions"][number];
  logistics?: LogisticsOperationsHome["missionRows"][number];
  communications?: CommunicationsOperationsHome["missionRows"][number];
  countyFeed: CountyOperationsHome["executiveFeed"] | null;
}): GotvDomainCell[] {
  const schedule = mapSchedule(input.mission);
  return [
    {
      domain: "PlanPhase",
      state: mapPlanPhase(input.kind, schedule),
      source: "GOTV Operations + Calendar",
      detail:
        input.kind === "NOT_GOTV"
          ? "Not a GOTV activity."
          : `Plan/phase readiness ${mapPlanPhase(input.kind, schedule)}`,
    },
    {
      domain: "TurfCoverage",
      state: mapTurfCoverage(input.kind),
      source: "GOTV Operations",
      detail:
        mapTurfCoverage(input.kind) === "UNKNOWN"
          ? VOTER_FILE_UNKNOWN.reason
          : `Turf coverage ${mapTurfCoverage(input.kind)}`,
    },
    {
      domain: "VolunteerDeployment",
      state: mapVolunteerDeployment(input.kind, input.volunteer),
      source: "Volunteer Operations (consumed)",
      detail: `Volunteer deployment ${mapVolunteerDeployment(input.kind, input.volunteer)}`,
    },
    {
      domain: "CountyPriority",
      state: mapCountyPriority(input.kind, input.countyName, input.countyFeed),
      source: "County Operations (consumed)",
      detail: input.countyName
        ? `County priority signal for ${input.countyName}`
        : "County Unknown — priority incomplete.",
    },
    {
      domain: "LogisticsStaging",
      state: mapLogisticsStaging(input.kind, input.logistics),
      source: "Logistics Operations (consumed)",
      detail: `Staging / logistics ${mapLogisticsStaging(input.kind, input.logistics)}`,
    },
    {
      domain: "Messaging",
      state: mapMessaging(input.kind, input.communications),
      source: "Communications Operations (consumed)",
      detail: `GOTV messaging ${mapMessaging(input.kind, input.communications)}`,
    },
  ];
}

function dayDomains(rows: GotvActivityRow[]): GotvDomainCell[] {
  const order: GotvReadinessDomain[] = [
    "PlanPhase",
    "TurfCoverage",
    "VolunteerDeployment",
    "CountyPriority",
    "LogisticsStaging",
    "Messaging",
  ];
  const gotv = rows.filter((r) => r.kind !== "NOT_GOTV");
  return order.map((domain) => {
    if (gotv.length === 0) {
      return {
        domain,
        state: "NOT_REQUIRED" as DomainReadiness,
        source: "GOTV Operations",
        detail: "No GOTV activities today — domain not required.",
      };
    }
    const states = gotv.map(
      (r) => r.domains.find((d) => d.domain === domain)?.state ?? "UNKNOWN",
    );
    const state = combineOperationalReadiness(states);
    const sample = gotv[0]?.domains.find((d) => d.domain === domain);
    return {
      domain,
      state,
      source: sample?.source ?? "GOTV Operations",
      detail: sample?.detail ?? `${domain} ${state}`,
    };
  });
}

function objectivesFor(kind: GotvActivityKind, title: string): string {
  switch (kind) {
    case "CANVASS":
      return `Daily turnout objective: canvass turf — ${title}`;
    case "PHONE_BANK":
      return `Daily turnout objective: phone bank — ${title}`;
    case "CHASE":
      return `Daily turnout objective: chase outstanding ballots — ${title}`;
    case "EARLY_VOTE":
      return `Daily turnout objective: early-vote operations — ${title}`;
    case "ELECTION_DAY":
      return `Daily turnout objective: Election Day operations — ${title}`;
    case "POLL_WATCH":
      return `Daily turnout objective: poll-watching coordination — ${title}`;
    case "GOTV_RALLY":
      return `Daily turnout objective: GOTV rally — ${title}`;
    case "GOTV_OTHER":
      return `Daily turnout objective: GOTV activity — ${title}`;
    default:
      return "Not a GOTV objective.";
  }
}

function deriveTurnoutRisk(input: {
  activitiesAtRisk: number;
  fieldHeat?: FieldOperationsHome["executiveFeed"] | null;
  volunteer?: VolunteerOperationsHome["executiveFeed"] | null;
  gotvCount: number;
}): GotvOperationsHome["turnoutRisk"] {
  if (input.gotvCount === 0) return "UNKNOWN";
  if (input.activitiesAtRisk > 2 || (input.fieldHeat?.blockedMissions ?? 0) > 0) {
    return "CRITICAL";
  }
  if (
    input.activitiesAtRisk > 0 ||
    (input.volunteer?.criticalVacancies ?? 0) > 0 ||
    (input.fieldHeat?.teamsNeedingAttention ?? 0) > 0
  ) {
    return "HIGH";
  }
  return "WATCH";
}

export function buildGotvOperationsHome(input: {
  brief: CampaignBrief;
  missions: MissionCard[];
  countiesByMission: Array<{ missionId: string; countyName: string | null }>;
  counties: CountyOperationsHome;
  volunteers: VolunteerOperationsHome;
  communications: CommunicationsOperationsHome;
  logistics: LogisticsOperationsHome;
  field: FieldOperationsHome;
  now?: Date;
}): GotvOperationsHome {
  const now = input.now ?? new Date();
  const volunteerById = new Map(
    input.volunteers.fieldFeed.missions.map((m) => [m.missionId, m]),
  );
  const logisticsById = new Map(
    input.logistics.missionRows.map((m) => [m.missionId, m]),
  );
  const commsById = new Map(
    input.communications.missionRows.map((m) => [m.missionId, m]),
  );

  const activityRows: GotvActivityRow[] = input.missions.map((mission) => {
    const kind = classifyGotvActivity({ title: mission.title });
    const countyName =
      input.countiesByMission.find((c) => c.missionId === mission.missionId)
        ?.countyName ?? null;
    const domains = buildActivityDomains({
      mission,
      kind,
      countyName,
      volunteer: volunteerById.get(mission.missionId),
      logistics: logisticsById.get(mission.missionId),
      communications: commsById.get(mission.missionId),
      countyFeed: input.counties.executiveFeed,
    });
    const deploymentReadiness = combineOperationalReadiness(
      domains.map((d) => d.state),
    );

    return {
      missionId: mission.missionId,
      missionTitle: mission.title,
      whenLabel: mission.whenLabel,
      href: `/calendar?event=${mission.missionId}`,
      kind,
      countyName,
      domains,
      deploymentReadiness,
      objectives: objectivesFor(kind, mission.title),
    };
  });

  const gotvRows = activityRows.filter((r) => r.kind !== "NOT_GOTV");
  const readinessDomains = dayDomains(activityRows);
  const gotvReadiness =
    gotvRows.length === 0
      ? ("NOT_REQUIRED" as DomainReadiness)
      : combineOperationalReadiness(readinessDomains.map((d) => d.state));

  const activitiesAtRisk = gotvRows.filter(
    (r) =>
      r.deploymentReadiness === "BLOCKED" ||
      r.deploymentReadiness === "NEEDS_ATTENTION" ||
      r.deploymentReadiness === "UNKNOWN",
  ).length;

  const countyMap = new Map<string, GotvActivityRow[]>();
  for (const row of gotvRows) {
    const key = row.countyName ?? "Unknown";
    const list = countyMap.get(key) ?? [];
    list.push(row);
    countyMap.set(key, list);
  }

  const countySignals: GotvCountySignal[] = [...countyMap.entries()].map(
    ([countyName, rows]) => {
      const deploymentReadiness = combineOperationalReadiness(
        rows.map((r) => r.deploymentReadiness),
      );
      const turf = combineOperationalReadiness(
        rows.map(
          (r) =>
            r.domains.find((d) => d.domain === "TurfCoverage")?.state ??
            "NOT_REQUIRED",
        ),
      );
      return {
        countyName,
        slug: countySlug(countyName),
        turfCoverage: turf === "NOT_REQUIRED" ? "UNKNOWN" : turf,
        deploymentReadiness,
        neighborhoodExecution: deploymentReadiness,
        localElectionActivity: deploymentReadiness,
        activityCount: rows.length,
      };
    },
  );

  const priorityCounties = [
    ...new Set([
      ...input.counties.executiveFeed.topWeak.map((w) => w.countyName),
      ...countySignals
        .filter(
          (c) =>
            c.deploymentReadiness === "BLOCKED" ||
            c.deploymentReadiness === "NEEDS_ATTENTION",
        )
        .map((c) => c.countyName),
    ]),
  ].slice(0, 6);

  const coverageGapsUnknown: KnownOrUnknown = {
    status: "unknown",
    value: null,
    reason:
      "Coverage gaps are Unknown — turf universe / doors completed are not modeled; GOTV is not a voter file.",
  };

  const turnoutRisk = deriveTurnoutRisk({
    activitiesAtRisk,
    fieldHeat: input.field.executiveFeed,
    volunteer: input.volunteers.executiveFeed,
    gotvCount: gotvRows.length,
  });

  const canvassCount = gotvRows.filter((r) => r.kind === "CANVASS").length;
  const phoneCount = gotvRows.filter((r) => r.kind === "PHONE_BANK").length;
  const pollCount = gotvRows.filter((r) => r.kind === "POLL_WATCH").length;

  const unknowns = [
    { fact: "Voter registration / turf universe", reason: VOTER_FILE_UNKNOWN.reason },
    { fact: "Election timeline phases", reason: TIMELINE_UNKNOWN.reason },
    { fact: "Coverage gaps (doors/calls completed)", reason: coverageGapsUnknown.reason },
    { fact: "Staging locations registry", reason: STAGING_UNKNOWN.reason },
    { fact: "Turnout messaging package", reason: TURNOUT_MSG_UNKNOWN.reason },
    {
      fact: "Chase program outcomes",
      reason:
        "Chase outcomes are Unknown — workflow classification exists; ballot return proof not tracked.",
    },
  ];

  const briefingLine =
    gotvRows.length === 0
      ? "GOTV Ops: no GOTV activities classified today — turnout workflow not required."
      : `GOTV readiness ${gotvReadiness}` +
        (activitiesAtRisk > 0
          ? ` · ${activitiesAtRisk} activity(ies) at risk`
          : "") +
        ` · ${gotvRows.length} deployment(s) today. Turf coverage and election timeline remain Unknown.`;

  const rallyObjectives = gotvRows
    .filter((r) => r.kind === "GOTV_RALLY" || r.kind === "GOTV_OTHER")
    .map((r) => r.objectives);

  return {
    title: "GOTV OPERATIONS",
    date: input.brief.date,
    timezone: input.brief.timezone,
    lastUpdatedAt: now.toISOString(),
    doctrine: "coordinates execution across domains — does not replicate them",
    gotvReadiness,
    todaysDeployment: gotvRows.length,
    coverageGaps: coverageGapsUnknown,
    priorityCounties,
    electionTimeline: TIMELINE_UNKNOWN,
    turnoutRisk,
    activityRows,
    readinessDomains,
    countySignals,
    unknowns,
    candidateFeed: {
      gotvSupportingStops: gotvRows.length,
      priorityCountyVisits: priorityCounties,
      rallyObjectives,
      turnoutMessagingFocus: TURNOUT_MSG_UNKNOWN,
      preparationStatus: gotvReadiness,
      briefingLine,
    },
    countyFeed: countySignals,
    volunteerFeed: {
      canvassAssignments:
        canvassCount > 0
          ? { status: "known", value: canvassCount }
          : {
              status: "unknown",
              value: null,
              reason: "No canvass activities classified today — Unknown, not zero.",
            },
      phoneBankAssignments:
        phoneCount > 0
          ? { status: "known", value: phoneCount }
          : {
              status: "unknown",
              value: null,
              reason:
                "No phone-bank activities classified today — Unknown, not zero.",
            },
      pollWorkerAssignments:
        pollCount > 0
          ? { status: "known", value: pollCount }
          : {
              status: "unknown",
              value: null,
              reason:
                "No poll-watch activities classified today — Unknown, not zero.",
            },
      stagingLocations: STAGING_UNKNOWN,
      deploymentMissions: gotvRows.length,
      briefingLine:
        gotvRows.length === 0
          ? "No GOTV deployment assignments for Volunteer Ops today."
          : `${gotvRows.length} GOTV deployment mission(s). Staging locations Unknown.`,
    },
    communicationsFeed: {
      gotvMessagingStatus: "unknown",
      electionRemindersStatus: "unknown",
      volunteerCommunicationsStatus: "unknown",
      rapidResponseNeeds: input.communications.executiveFeed.rapidResponseNeeded,
      gotvActivityCount: gotvRows.length,
      briefingLine:
        gotvRows.length === 0
          ? "No GOTV activities for messaging coordination today."
          : `GOTV messaging / election reminders Unknown across ${gotvRows.length} activity(ies). Rapid response needs from Communications: ${input.communications.executiveFeed.rapidResponseNeeded}.`,
    },
    intelligenceFeed: {
      deploymentTrendsStatus: "unknown",
      turnoutRisk,
      coverageImbalanceSignal:
        countySignals.some((c) => c.deploymentReadiness === "BLOCKED") ||
        priorityCounties.length > 2,
      executionBottlenecks: activitiesAtRisk,
      briefingLine:
        activitiesAtRisk > 0
          ? `${activitiesAtRisk} GOTV execution bottleneck(s). Deployment trends Unknown; turnout risk ${turnoutRisk}.`
          : `No GOTV bottlenecks from today’s prep signals. Deployment trends Unknown; turnout risk ${turnoutRisk}.`,
    },
    executiveFeed: {
      gotvReadiness,
      todaysDeployment: gotvRows.length,
      coverageGapsStatus: "unknown",
      coverageGapsValue: null,
      priorityCounties,
      electionTimelineStatus: "unknown",
      turnoutRisk,
      activitiesAtRisk,
      briefingLine,
    },
  };
}

export function gotvOperationsForAdvisory(home: GotvOperationsHome) {
  return {
    date: home.date,
    gotvReadiness: home.gotvReadiness,
    todaysDeployment: home.todaysDeployment,
    turnoutRisk: home.turnoutRisk,
    activitiesAtRisk: home.executiveFeed.activitiesAtRisk,
    priorityCounties: home.priorityCounties,
    domains: home.readinessDomains.map((d) => ({
      domain: d.domain,
      state: d.state,
    })),
    unknowns: home.unknowns.map((u) => u.fact),
    doctrine: home.doctrine,
    executiveFeed: home.executiveFeed,
    candidateFeed: home.candidateFeed,
  };
}
