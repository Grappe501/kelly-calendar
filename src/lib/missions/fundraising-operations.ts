/**
 * Phase 2.3 — Fundraising Operations (pure orchestration).
 * Answers: Can the campaign sustainably generate the resources needed
 * to execute the mission?
 *
 * Distinct from Finance & Resources (Phase 1): Do we have the resources
 * to sustain the campaign?
 *
 * Finance owns resource state. Fundraising owns the workflow of building
 * future resources. Not a donor CRM / gift ledger.
 *
 * Doctrine: Capabilities own experiences and workflows, while operational
 * systems own facts and state.
 */

import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import {
  combineOperationalReadiness,
  type DomainReadiness,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { UnknownFact } from "@/lib/missions/volunteer-operations";

export type FundraisingEventKind =
  | "FUNDRAISER"
  | "DONOR_MEETING"
  | "CALL_TIME"
  | "STEWARDSHIP"
  | "NOT_FUNDRAISING";

export type FundraisingReadinessDomain =
  | "EventPrep"
  | "AskReadiness"
  | "InvitationCollateral"
  | "FinanceLead"
  | "ComplianceClearance"
  | "LogisticsSupport";

export type FundraisingDomainCell = {
  domain: FundraisingReadinessDomain;
  state: DomainReadiness;
  source: string;
  detail: string;
};

export type FundraisingEventRow = {
  missionId: string;
  missionTitle: string;
  whenLabel: string;
  href: string;
  kind: FundraisingEventKind;
  countyName: string | null;
  domains: FundraisingDomainCell[];
  eventReadiness: DomainReadiness;
  fundraisingReadiness: DomainReadiness;
  objectives: string;
};

export type FundraisingOperationsHome = {
  title: "FUNDRAISING OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  doctrine: "owns fundraising workflow — Finance owns resource state";
  fundraisingReadiness: DomainReadiness;
  upcomingEvents: number;
  criticalFollowups: UnknownFact;
  pipelineHealth: UnknownFact;
  nearTermOpportunities: UnknownFact;
  campaignFundingOutlook: UnknownFact;
  fundraisingGoals: UnknownFact;
  eventRows: FundraisingEventRow[];
  readinessDomains: FundraisingDomainCell[];
  unknowns: Array<{ fact: string; reason: string }>;
  candidateFeed: {
    todaysFundraisingBrief: string;
    donorMeetings: number;
    eventObjectives: string[];
    preparationStatus: DomainReadiness;
    briefingLine: string;
  };
  communicationsFeed: {
    fundraisingMessagingStatus: "unknown";
    invitationReadiness: DomainReadiness;
    eventCollateralStatus: DomainReadiness;
    fundraisingEventCount: number;
    briefingLine: string;
  };
  intelligenceFeed: {
    pipelineTrendsStatus: "unknown";
    followUpDelaySignal: boolean;
    eventEffectivenessStatus: "unknown";
    engagementPatternsStatus: "unknown";
    eventsAtRisk: number;
    briefingLine: string;
  };
  executiveFeed: {
    fundraisingReadiness: DomainReadiness;
    upcomingEvents: number;
    criticalFollowupsStatus: "unknown";
    pipelineHealthStatus: "unknown";
    nearTermOpportunitiesStatus: "unknown";
    campaignFundingOutlookStatus: "unknown";
    eventsAtRisk: number;
    briefingLine: string;
  };
};

const PIPELINE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Prospect pipeline health is Unknown — Fundraising owns the workflow surface; no prospect CRM ledger yet.",
};

const FOLLOWUP_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Critical fundraising follow-ups are Unknown — stewardship / ask follow-up ledger not implemented.",
};

const OPPORTUNITY_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Near-term ask opportunities are Unknown — no ask registry yet.",
};

const OUTLOOK_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Campaign funding outlook is Unknown — Fundraising does not invent dollars; Finance owns cash/budget state (also Unknown).",
};

const GOALS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Campaign fundraising goals are Unknown — no goals registry yet.",
};

const MESSAGING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Fundraising messaging package is Unknown — Communications owns plan rows; daily ask copy not confirmed.",
};

export function classifyFundraisingEvent(input: {
  title: string;
  isFundraisingCalendar: boolean;
}): FundraisingEventKind {
  const t = input.title.toLowerCase();
  if (/\bcall time\b|\bcalltime\b/.test(t)) return "CALL_TIME";
  if (/\bdonor meeting\b|\bone[- ]on[- ]one\b|\b1:1\b/.test(t)) {
    return "DONOR_MEETING";
  }
  if (/\bsteward\b|\bthank[- ]you\b/.test(t)) return "STEWARDSHIP";
  if (
    input.isFundraisingCalendar ||
    /\bfundraiser\b|\bfundraising\b|\breception\b|\bgala\b|\bdinner\b/.test(t)
  ) {
    return "FUNDRAISER";
  }
  return "NOT_FUNDRAISING";
}

function mapSchedule(mission: MissionCard): DomainReadiness {
  const state = mission.todayReadiness.state;
  if (state === "READY") return "READY";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapAskReadiness(kind: FundraisingEventKind): DomainReadiness {
  if (kind === "NOT_FUNDRAISING") return "NOT_REQUIRED";
  // Ask amount / prospect stage Unknown — workflow not ready until registry
  return "UNKNOWN";
}

function mapInvitation(
  kind: FundraisingEventKind,
  communications?: CommunicationsOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_FUNDRAISING") return "NOT_REQUIRED";
  if (kind === "DONOR_MEETING" || kind === "CALL_TIME") return "NOT_REQUIRED";
  if (!communications) return "UNKNOWN";
  if (communications.talkingPointsReady || communications.hasPressItem) {
    if (communications.messagingRisk === "CRITICAL") return "BLOCKED";
    if (communications.overdueCount > 0 || communications.messagingRisk === "HIGH") {
      return "NEEDS_ATTENTION";
    }
    return "READY";
  }
  if (communications.planDefined) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapFinanceLead(
  kind: FundraisingEventKind,
  finance?: FinanceOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_FUNDRAISING") return "NOT_REQUIRED";
  if (!finance) return "UNKNOWN";
  if (finance.financeLeadAssigned) return "READY";
  if (finance.isFundraising) return "BLOCKED";
  return "NEEDS_ATTENTION";
}

function mapCompliance(
  kind: FundraisingEventKind,
  compliance?: ComplianceOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_FUNDRAISING") return "NOT_REQUIRED";
  if (!compliance) return "UNKNOWN";
  return compliance.triple.complianceState;
}

function mapLogistics(
  kind: FundraisingEventKind,
  logistics?: LogisticsOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_FUNDRAISING") return "NOT_REQUIRED";
  if (kind === "CALL_TIME") return "NOT_REQUIRED";
  if (!logistics) return "UNKNOWN";
  return logistics.missionReadiness;
}

function buildEventDomains(input: {
  mission: MissionCard;
  kind: FundraisingEventKind;
  communications?: CommunicationsOperationsHome["missionRows"][number];
  finance?: FinanceOperationsHome["missionRows"][number];
  compliance?: ComplianceOperationsHome["missionRows"][number];
  logistics?: LogisticsOperationsHome["missionRows"][number];
}): FundraisingDomainCell[] {
  const eventPrep =
    input.kind === "NOT_FUNDRAISING"
      ? ("NOT_REQUIRED" as DomainReadiness)
      : mapSchedule(input.mission);
  const ask = mapAskReadiness(input.kind);
  const invitation = mapInvitation(input.kind, input.communications);
  const financeLead = mapFinanceLead(input.kind, input.finance);
  const complianceClearance = mapCompliance(input.kind, input.compliance);
  const logisticsSupport = mapLogistics(input.kind, input.logistics);

  return [
    {
      domain: "EventPrep",
      state: eventPrep,
      source: "Calendar + Fundraising classification",
      detail:
        input.kind === "NOT_FUNDRAISING"
          ? "Not a fundraising event."
          : `Event prep ${eventPrep}`,
    },
    {
      domain: "AskReadiness",
      state: ask,
      source: "Fundraising Operations",
      detail:
        ask === "UNKNOWN"
          ? "Ask readiness Unknown — no ask/prospect registry yet."
          : `Ask readiness ${ask}`,
    },
    {
      domain: "InvitationCollateral",
      state: invitation,
      source: "Communications Operations (consumed)",
      detail: `Invitation / collateral ${invitation}`,
    },
    {
      domain: "FinanceLead",
      state: financeLead,
      source: "Finance & Resources (consumed — not owned)",
      detail: `Finance lead signal ${financeLead}`,
    },
    {
      domain: "ComplianceClearance",
      state: complianceClearance,
      source: "Compliance Operations (consumed)",
      detail: `Compliance ${complianceClearance}`,
    },
    {
      domain: "LogisticsSupport",
      state: logisticsSupport,
      source: "Logistics Operations (consumed)",
      detail: `Logistics support ${logisticsSupport}`,
    },
  ];
}

function dayDomains(rows: FundraisingEventRow[]): FundraisingDomainCell[] {
  const order: FundraisingReadinessDomain[] = [
    "EventPrep",
    "AskReadiness",
    "InvitationCollateral",
    "FinanceLead",
    "ComplianceClearance",
    "LogisticsSupport",
  ];
  const fr = rows.filter((r) => r.kind !== "NOT_FUNDRAISING");
  return order.map((domain) => {
    if (fr.length === 0) {
      return {
        domain,
        state: "NOT_REQUIRED" as DomainReadiness,
        source: "Fundraising Operations",
        detail: "No fundraising events today — domain not required.",
      };
    }
    const states = fr.map(
      (r) => r.domains.find((d) => d.domain === domain)?.state ?? "UNKNOWN",
    );
    const state = combineOperationalReadiness(states);
    const sample = fr[0]?.domains.find((d) => d.domain === domain);
    return {
      domain,
      state,
      source: sample?.source ?? "Fundraising Operations",
      detail: sample?.detail ?? `${domain} ${state}`,
    };
  });
}

function objectivesFor(kind: FundraisingEventKind, title: string): string {
  switch (kind) {
    case "FUNDRAISER":
      return `Event objective: execute fundraiser — ${title}`;
    case "DONOR_MEETING":
      return `Event objective: donor meeting — ${title}`;
    case "CALL_TIME":
      return `Event objective: call time — ${title}`;
    case "STEWARDSHIP":
      return `Event objective: stewardship — ${title}`;
    default:
      return "Not a fundraising objective.";
  }
}

export function buildFundraisingOperationsHome(input: {
  brief: CampaignBrief;
  missions: MissionCard[];
  countiesByMission: Array<{ missionId: string; countyName: string | null }>;
  finance: FinanceOperationsHome;
  communications: CommunicationsOperationsHome;
  compliance: ComplianceOperationsHome;
  logistics: LogisticsOperationsHome;
  now?: Date;
}): FundraisingOperationsHome {
  const now = input.now ?? new Date();
  const financeById = new Map(
    input.finance.missionRows.map((m) => [m.missionId, m]),
  );
  const commsById = new Map(
    input.communications.missionRows.map((m) => [m.missionId, m]),
  );
  const complianceById = new Map(
    input.compliance.missionRows.map((m) => [m.missionId, m]),
  );
  const logisticsById = new Map(
    input.logistics.missionRows.map((m) => [m.missionId, m]),
  );

  const eventRows: FundraisingEventRow[] = input.missions.map((mission) => {
    const finance = financeById.get(mission.missionId);
    const kind = classifyFundraisingEvent({
      title: mission.title,
      isFundraisingCalendar: finance?.isFundraising ?? false,
    });
    const countyName =
      input.countiesByMission.find((c) => c.missionId === mission.missionId)
        ?.countyName ?? null;
    const domains = buildEventDomains({
      mission,
      kind,
      communications: commsById.get(mission.missionId),
      finance,
      compliance: complianceById.get(mission.missionId),
      logistics: logisticsById.get(mission.missionId),
    });
    const eventReadiness = combineOperationalReadiness(
      domains.filter((d) => d.domain === "EventPrep").map((d) => d.state),
    );
    const fundraisingReadiness = combineOperationalReadiness(
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
      eventReadiness,
      fundraisingReadiness,
      objectives: objectivesFor(kind, mission.title),
    };
  });

  const frRows = eventRows.filter((r) => r.kind !== "NOT_FUNDRAISING");
  const readinessDomains = dayDomains(eventRows);
  const fundraisingReadiness =
    frRows.length === 0
      ? ("NOT_REQUIRED" as DomainReadiness)
      : combineOperationalReadiness(readinessDomains.map((d) => d.state));

  const eventsAtRisk = frRows.filter(
    (r) =>
      r.fundraisingReadiness === "BLOCKED" ||
      r.fundraisingReadiness === "NEEDS_ATTENTION" ||
      r.fundraisingReadiness === "UNKNOWN",
  ).length;

  const donorMeetings = frRows.filter((r) => r.kind === "DONOR_MEETING").length;
  const invitationReadiness = combineOperationalReadiness(
    frRows.map(
      (r) =>
        r.domains.find((d) => d.domain === "InvitationCollateral")?.state ??
        "NOT_REQUIRED",
    ),
  );
  const eventCollateralStatus = invitationReadiness;

  const unknowns = [
    { fact: "Prospect pipeline stages", reason: PIPELINE_UNKNOWN.reason },
    { fact: "Ask opportunities", reason: OPPORTUNITY_UNKNOWN.reason },
    { fact: "Critical follow-ups / stewardship", reason: FOLLOWUP_UNKNOWN.reason },
    { fact: "Campaign fundraising goals", reason: GOALS_UNKNOWN.reason },
    { fact: "Prospect engagement cadence", reason: "Engagement cadence is Unknown — no cadence store yet." },
    { fact: "Campaign funding outlook (dollars)", reason: OUTLOOK_UNKNOWN.reason },
    { fact: "Fundraising messaging package", reason: MESSAGING_UNKNOWN.reason },
  ];

  const briefingLine =
    frRows.length === 0
      ? "Fundraising Ops: no fundraising events classified today — workflow not required."
      : `Fundraising readiness ${fundraisingReadiness}` +
        (eventsAtRisk > 0 ? ` · ${eventsAtRisk} event(s) need prep` : "") +
        ` · ${frRows.length} fundraising event(s). Pipeline and goals remain Unknown.`;

  const candidateBrief =
    frRows.length === 0
      ? "No fundraising engagements on today’s permissioned schedule."
      : `Today: ${frRows.map((r) => `${r.kind} — ${r.missionTitle} (${r.whenLabel})`).join("; ")}. Prep ${fundraisingReadiness}.`;

  return {
    title: "FUNDRAISING OPERATIONS",
    date: input.brief.date,
    timezone: input.brief.timezone,
    lastUpdatedAt: now.toISOString(),
    doctrine: "owns fundraising workflow — Finance owns resource state",
    fundraisingReadiness,
    upcomingEvents: frRows.length,
    criticalFollowups: FOLLOWUP_UNKNOWN,
    pipelineHealth: PIPELINE_UNKNOWN,
    nearTermOpportunities: OPPORTUNITY_UNKNOWN,
    campaignFundingOutlook: OUTLOOK_UNKNOWN,
    fundraisingGoals: GOALS_UNKNOWN,
    eventRows,
    readinessDomains,
    unknowns,
    candidateFeed: {
      todaysFundraisingBrief: candidateBrief,
      donorMeetings,
      eventObjectives: frRows.map((r) => r.objectives),
      preparationStatus: fundraisingReadiness,
      briefingLine,
    },
    communicationsFeed: {
      fundraisingMessagingStatus: "unknown",
      invitationReadiness:
        frRows.length === 0 ? "NOT_REQUIRED" : invitationReadiness,
      eventCollateralStatus:
        frRows.length === 0 ? "NOT_REQUIRED" : eventCollateralStatus,
      fundraisingEventCount: frRows.length,
      briefingLine:
        frRows.length === 0
          ? "No fundraising events for invitation/collateral coordination today."
          : `Invitation readiness ${invitationReadiness} across ${frRows.length} fundraising event(s). Fundraising messaging package Unknown.`,
    },
    intelligenceFeed: {
      pipelineTrendsStatus: "unknown",
      followUpDelaySignal: false,
      eventEffectivenessStatus: "unknown",
      engagementPatternsStatus: "unknown",
      eventsAtRisk,
      briefingLine:
        eventsAtRisk > 0
          ? `${eventsAtRisk} fundraising event(s) at risk. Pipeline trends, follow-up delays, and engagement patterns Unknown.`
          : "No fundraising events at risk from today’s prep signals. Pipeline trends and effectiveness Unknown.",
    },
    executiveFeed: {
      fundraisingReadiness,
      upcomingEvents: frRows.length,
      criticalFollowupsStatus: "unknown",
      pipelineHealthStatus: "unknown",
      nearTermOpportunitiesStatus: "unknown",
      campaignFundingOutlookStatus: "unknown",
      eventsAtRisk,
      briefingLine,
    },
  };
}

export function fundraisingOperationsForAdvisory(
  home: FundraisingOperationsHome,
) {
  return {
    date: home.date,
    fundraisingReadiness: home.fundraisingReadiness,
    upcomingEvents: home.upcomingEvents,
    eventsAtRisk: home.executiveFeed.eventsAtRisk,
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
