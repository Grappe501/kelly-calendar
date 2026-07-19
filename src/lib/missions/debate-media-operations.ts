/**
 * Phase 2.2 — Debate & Media Operations (pure orchestration).
 * Answers: Are we prepared for every public communication?
 *
 * Assembles appearance prep from Phase 1 kernel feeds. Owns capability
 * registries that do not yet exist as Unknown (questions, rebuttals,
 * TP versions, post-event review) — does not recreate Communications.
 *
 * Doctrine: Capabilities assemble operational context — they do not
 * create parallel operational systems.
 */

import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import {
  combineOperationalReadiness,
  type DomainReadiness,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { UnknownFact } from "@/lib/missions/volunteer-operations";

export type PublicAppearanceKind =
  | "DEBATE"
  | "INTERVIEW"
  | "PODCAST"
  | "EDITORIAL"
  | "PRESS_CONFERENCE"
  | "TOWN_HALL"
  | "LIVESTREAM"
  | "RECORDED_VIDEO"
  | "RADIO"
  | "EARNED_MEDIA"
  | "PUBLIC_OTHER"
  | "NOT_PUBLIC";

export type MediaReadinessDomain =
  | "AppearancePrep"
  | "BriefingPacket"
  | "TalkingPoints"
  | "ComplianceClearance"
  | "MediaMaterials";

export type MediaDomainCell = {
  domain: MediaReadinessDomain;
  state: DomainReadiness;
  source: string;
  detail: string;
};

export type AppearanceRow = {
  missionId: string;
  missionTitle: string;
  whenLabel: string;
  href: string;
  kind: PublicAppearanceKind;
  countyName: string | null;
  domains: MediaDomainCell[];
  appearanceReadiness: DomainReadiness;
  briefingCompleteness: DomainReadiness;
  mediaConfidence: DomainReadiness;
};

export type DebateMediaOperationsHome = {
  title: "DEBATE & MEDIA OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  doctrine: "assembles operational context — not a parallel communications system";
  publicAppearancesToday: number;
  debateReady: KnownOrUnknownCount;
  interviewReady: KnownOrUnknownCount;
  briefingCompleteness: DomainReadiness;
  mediaConfidence: DomainReadiness;
  mediaCalendar: AppearanceRow[];
  readinessDomains: MediaDomainCell[];
  unknowns: Array<{ fact: string; reason: string }>;
  candidateFeed: {
    debateReadiness: DomainReadiness;
    interviewReadiness: DomainReadiness;
    briefingCompleteness: DomainReadiness;
    mediaConfidence: DomainReadiness;
    appearancesAtRisk: number;
    briefingLine: string;
  };
  communicationsFeed: {
    approvedMessagingStatus: "unknown";
    releaseTimingStatus: "unknown";
    pressCoordination: DomainReadiness;
    publicAppearanceCount: number;
    briefingLine: string;
  };
  intelligenceFeed: {
    preparationGaps: number;
    messagingDriftSignal: boolean;
    recurringQuestionsStatus: "unknown";
    issueTrendsStatus: "unknown";
    briefingLine: string;
  };
  executiveFeed: {
    publicAppearancesToday: number;
    mediaConfidence: DomainReadiness;
    appearancesAtRisk: number;
    briefingLine: string;
  };
};

type KnownOrUnknownCount =
  | { status: "known"; value: number }
  | { status: "unknown"; value: null; reason: string };

const TP_VERSION_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Approved talking-point versions are Unknown — Debate & Media owns the version registry; content rows remain with Communications.",
};

const QUESTIONS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Anticipated questions are Unknown — no question library surface yet.",
};

const REBUTTAL_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Rebuttal library is Unknown — no rebuttal store yet.",
};

const ISSUE_BRIEF_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Issue briefing packets are Unknown — assembly owns the packet surface; issue content not stored here.",
};

const FOLLOWUP_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Media follow-up status is Unknown — no follow-up ledger yet.",
};

const REVIEW_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Post-event media review is Unknown — no review surface yet.",
};

export function classifyPublicAppearance(input: {
  title: string;
  hasSpeech: boolean;
  hasPressItem: boolean;
}): PublicAppearanceKind {
  const t = input.title.toLowerCase();
  if (/\bdebate\b/.test(t)) return "DEBATE";
  if (/\binterview\b/.test(t)) return "INTERVIEW";
  if (/\bpodcast\b/.test(t)) return "PODCAST";
  if (/\beditorial\b|\bop-?ed\b/.test(t)) return "EDITORIAL";
  if (/\bpress conference\b|\bpresser\b/.test(t)) return "PRESS_CONFERENCE";
  if (/\btown hall\b/.test(t)) return "TOWN_HALL";
  if (/\blivestream\b|\blive stream\b/.test(t)) return "LIVESTREAM";
  if (/\bvideo\b|\brecording\b/.test(t)) return "RECORDED_VIDEO";
  if (/\bradio\b/.test(t)) return "RADIO";
  if (/\bearned media\b|\bmedia hit\b/.test(t)) return "EARNED_MEDIA";
  if (input.hasSpeech || input.hasPressItem) return "PUBLIC_OTHER";
  return "NOT_PUBLIC";
}

function mapTalkingPoints(
  row: CommunicationsOperationsHome["missionRows"][number] | undefined,
): DomainReadiness {
  if (!row) return "UNKNOWN";
  if (row.talkingPointsReady) return "READY";
  if (row.hasTalkingPoints || row.hasSpeech) {
    if (row.messagingRisk === "CRITICAL") return "BLOCKED";
    if (row.overdueCount > 0 || row.messagingRisk === "HIGH") {
      return "NEEDS_ATTENTION";
    }
    return "NEEDS_ATTENTION";
  }
  if (row.hasPressItem) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCompliance(
  row: ComplianceOperationsHome["missionRows"][number] | undefined,
  isPublic: boolean,
): DomainReadiness {
  if (!isPublic) return "NOT_REQUIRED";
  if (!row) return "UNKNOWN";
  return row.triple.complianceState;
}

function mapMaterials(
  row: LogisticsOperationsHome["missionRows"][number] | undefined,
  isPublic: boolean,
): DomainReadiness {
  if (!isPublic) return "NOT_REQUIRED";
  if (!row) return "UNKNOWN";
  // Media kit / literature / signage live under materials domain
  return row.domains.materials;
}

function mapAppearancePrep(
  kind: PublicAppearanceKind,
  schedule: DomainReadiness,
): DomainReadiness {
  if (kind === "NOT_PUBLIC") return "NOT_REQUIRED";
  if (schedule === "BLOCKED") return "BLOCKED";
  if (schedule === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  if (schedule === "READY") return "READY";
  return "UNKNOWN";
}

function mapBriefingPacket(input: {
  countyName: string | null;
  talkingPoints: DomainReadiness;
  kind: PublicAppearanceKind;
}): DomainReadiness {
  if (input.kind === "NOT_PUBLIC") return "NOT_REQUIRED";
  if (!input.countyName && input.talkingPoints === "UNKNOWN") return "UNKNOWN";
  if (!input.countyName) return "NEEDS_ATTENTION";
  if (input.talkingPoints === "BLOCKED") return "BLOCKED";
  if (input.talkingPoints === "READY") return "READY";
  if (input.talkingPoints === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapSchedule(mission: MissionCard): DomainReadiness {
  const state = mission.todayReadiness.state;
  if (state === "READY") return "READY";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function buildAppearanceDomains(input: {
  mission: MissionCard;
  countyName: string | null;
  kind: PublicAppearanceKind;
  communications?: CommunicationsOperationsHome["missionRows"][number];
  compliance?: ComplianceOperationsHome["missionRows"][number];
  logistics?: LogisticsOperationsHome["missionRows"][number];
}): MediaDomainCell[] {
  const isPublic = input.kind !== "NOT_PUBLIC";
  const talkingPoints = mapTalkingPoints(input.communications);
  const appearancePrep = mapAppearancePrep(input.kind, mapSchedule(input.mission));
  const briefingPacket = mapBriefingPacket({
    countyName: input.countyName,
    talkingPoints,
    kind: input.kind,
  });
  const complianceClearance = mapCompliance(input.compliance, isPublic);
  const mediaMaterials = mapMaterials(input.logistics, isPublic);

  return [
    {
      domain: "AppearancePrep",
      state: appearancePrep,
      source: "Calendar + Debate & Media classification",
      detail: isPublic
        ? `${input.kind} appearance prep ${appearancePrep}`
        : "Not a public communication appearance.",
    },
    {
      domain: "BriefingPacket",
      state: briefingPacket,
      source: "Debate & Media assembly",
      detail: isPublic
        ? `Briefing packet ${briefingPacket}`
        : "Briefing not required.",
    },
    {
      domain: "TalkingPoints",
      state: isPublic ? talkingPoints : "NOT_REQUIRED",
      source: "Communications Operations (consumed)",
      detail:
        talkingPoints === "UNKNOWN"
          ? "Talking points Unknown — Communications has no confirmed plan rows."
          : `Talking points ${talkingPoints}`,
    },
    {
      domain: "ComplianceClearance",
      state: complianceClearance,
      source: "Compliance Operations (consumed)",
      detail: `Compliance ${complianceClearance}`,
    },
    {
      domain: "MediaMaterials",
      state: mediaMaterials,
      source: "Logistics Operations (consumed)",
      detail: `Media materials ${mediaMaterials}`,
    },
  ];
}

function dayDomains(rows: AppearanceRow[]): MediaDomainCell[] {
  const order: MediaReadinessDomain[] = [
    "AppearancePrep",
    "BriefingPacket",
    "TalkingPoints",
    "ComplianceClearance",
    "MediaMaterials",
  ];
  const publicRows = rows.filter((r) => r.kind !== "NOT_PUBLIC");
  return order.map((domain) => {
    if (publicRows.length === 0) {
      return {
        domain,
        state: "NOT_REQUIRED" as DomainReadiness,
        source: "Debate & Media",
        detail: "No public appearances today — domain not required.",
      };
    }
    const states = publicRows.map(
      (r) => r.domains.find((d) => d.domain === domain)?.state ?? "UNKNOWN",
    );
    const state = combineOperationalReadiness(states);
    const sample = publicRows[0]?.domains.find((d) => d.domain === domain);
    return {
      domain,
      state,
      source: sample?.source ?? "Debate & Media assembly",
      detail: sample?.detail ?? `${domain} ${state}`,
    };
  });
}

function readinessForKind(
  rows: AppearanceRow[],
  kinds: PublicAppearanceKind[],
): KnownOrUnknownCount {
  const matched = rows.filter((r) => kinds.includes(r.kind));
  if (matched.length === 0) {
    return {
      status: "unknown",
      value: null,
      reason: `No ${kinds[0]?.toLowerCase() ?? "appearance"} classified today — readiness Unknown rather than zero.`,
    };
  }
  const ready = matched.filter((r) => r.mediaConfidence === "READY").length;
  return { status: "known", value: ready };
}

export function buildDebateMediaOperationsHome(input: {
  brief: CampaignBrief;
  missions: MissionCard[];
  countiesByMission: Array<{ missionId: string; countyName: string | null }>;
  communications: CommunicationsOperationsHome;
  compliance: ComplianceOperationsHome;
  logistics: LogisticsOperationsHome;
  now?: Date;
}): DebateMediaOperationsHome {
  const now = input.now ?? new Date();
  const commsById = new Map(
    input.communications.missionRows.map((m) => [m.missionId, m]),
  );
  const complianceById = new Map(
    input.compliance.missionRows.map((m) => [m.missionId, m]),
  );
  const logisticsById = new Map(
    input.logistics.missionRows.map((m) => [m.missionId, m]),
  );

  const mediaCalendar: AppearanceRow[] = input.missions.map((mission) => {
    const communications = commsById.get(mission.missionId);
    const kind = classifyPublicAppearance({
      title: mission.title,
      hasSpeech: communications?.hasSpeech ?? false,
      hasPressItem: communications?.hasPressItem ?? false,
    });
    const countyName =
      input.countiesByMission.find((c) => c.missionId === mission.missionId)
        ?.countyName ?? null;
    const domains = buildAppearanceDomains({
      mission,
      countyName,
      kind,
      communications,
      compliance: complianceById.get(mission.missionId),
      logistics: logisticsById.get(mission.missionId),
    });
    const required = domains.map((d) => d.state);
    const appearanceReadiness = combineOperationalReadiness(
      domains
        .filter((d) => d.domain === "AppearancePrep")
        .map((d) => d.state),
    );
    const briefingCompleteness = combineOperationalReadiness(
      domains
        .filter((d) => d.domain === "BriefingPacket")
        .map((d) => d.state),
    );
    const mediaConfidence = combineOperationalReadiness(required);

    return {
      missionId: mission.missionId,
      missionTitle: mission.title,
      whenLabel: mission.whenLabel,
      href: `/calendar?event=${mission.missionId}`,
      kind,
      countyName,
      domains,
      appearanceReadiness,
      briefingCompleteness,
      mediaConfidence,
    };
  });

  const publicRows = mediaCalendar.filter((r) => r.kind !== "NOT_PUBLIC");
  const readinessDomains = dayDomains(mediaCalendar);
  const mediaConfidence = combineOperationalReadiness(
    readinessDomains.map((d) => d.state),
  );
  const briefingCompleteness = combineOperationalReadiness(
    publicRows.map((r) => r.briefingCompleteness),
  );
  const appearancesAtRisk = publicRows.filter(
    (r) =>
      r.mediaConfidence === "BLOCKED" ||
      r.mediaConfidence === "NEEDS_ATTENTION" ||
      r.mediaConfidence === "UNKNOWN",
  ).length;

  const debateReady = readinessForKind(mediaCalendar, ["DEBATE"]);
  const interviewReady = readinessForKind(mediaCalendar, [
    "INTERVIEW",
    "PODCAST",
    "RADIO",
    "EDITORIAL",
  ]);

  const unknowns = [
    { fact: "Approved talking-point versions", reason: TP_VERSION_UNKNOWN.reason },
    { fact: "Anticipated questions", reason: QUESTIONS_UNKNOWN.reason },
    { fact: "Rebuttal library", reason: REBUTTAL_UNKNOWN.reason },
    { fact: "Issue briefing packets", reason: ISSUE_BRIEF_UNKNOWN.reason },
    { fact: "Media follow-up status", reason: FOLLOWUP_UNKNOWN.reason },
    { fact: "Post-event media review", reason: REVIEW_UNKNOWN.reason },
  ];

  const debateRows = publicRows.filter((r) => r.kind === "DEBATE");
  const interviewRows = publicRows.filter((r) =>
    ["INTERVIEW", "PODCAST", "RADIO", "EDITORIAL"].includes(r.kind),
  );
  const debateReadiness =
    debateRows.length === 0
      ? ("UNKNOWN" as DomainReadiness)
      : combineOperationalReadiness(debateRows.map((r) => r.mediaConfidence));
  const interviewReadiness =
    interviewRows.length === 0
      ? ("UNKNOWN" as DomainReadiness)
      : combineOperationalReadiness(
          interviewRows.map((r) => r.mediaConfidence),
        );

  const messagingDriftSignal =
    input.communications.executiveFeed.messagingRisk === "CRITICAL" ||
    input.communications.executiveFeed.messagingRisk === "HIGH" ||
    input.communications.executiveFeed.rapidResponseNeeded > 0;

  const pressCoordination = combineOperationalReadiness(
    publicRows
      .map((r) => r.domains.find((d) => d.domain === "TalkingPoints")?.state)
      .filter((s): s is DomainReadiness => Boolean(s)),
  );

  const candidateLine =
    publicRows.length === 0
      ? "Debate & Media: no public appearances classified today."
      : `Media confidence ${mediaConfidence}` +
        (appearancesAtRisk > 0
          ? ` · ${appearancesAtRisk} appearance(s) need prep`
          : "") +
        ` · ${publicRows.length} public appearance(s).`;

  const execLine = candidateLine;

  return {
    title: "DEBATE & MEDIA OPERATIONS",
    date: input.brief.date,
    timezone: input.brief.timezone,
    lastUpdatedAt: now.toISOString(),
    doctrine:
      "assembles operational context — not a parallel communications system",
    publicAppearancesToday: publicRows.length,
    debateReady,
    interviewReady,
    briefingCompleteness:
      publicRows.length === 0 ? "NOT_REQUIRED" : briefingCompleteness,
    mediaConfidence:
      publicRows.length === 0 ? "NOT_REQUIRED" : mediaConfidence,
    mediaCalendar,
    readinessDomains,
    unknowns,
    candidateFeed: {
      debateReadiness,
      interviewReadiness,
      briefingCompleteness:
        publicRows.length === 0 ? "NOT_REQUIRED" : briefingCompleteness,
      mediaConfidence:
        publicRows.length === 0 ? "NOT_REQUIRED" : mediaConfidence,
      appearancesAtRisk,
      briefingLine: candidateLine,
    },
    communicationsFeed: {
      approvedMessagingStatus: "unknown",
      releaseTimingStatus: "unknown",
      pressCoordination:
        publicRows.length === 0 ? "NOT_REQUIRED" : pressCoordination,
      publicAppearanceCount: publicRows.length,
      briefingLine:
        publicRows.length === 0
          ? "No public appearances for press coordination today."
          : `Press coordination ${pressCoordination} across ${publicRows.length} public appearance(s). Approved messaging and release timing remain Unknown.`,
    },
    intelligenceFeed: {
      preparationGaps: appearancesAtRisk,
      messagingDriftSignal,
      recurringQuestionsStatus: "unknown",
      issueTrendsStatus: "unknown",
      briefingLine: messagingDriftSignal
        ? `Preparation gaps ${appearancesAtRisk}; messaging drift signal from Communications risk. Recurring questions and issue trends Unknown.`
        : `Preparation gaps ${appearancesAtRisk}. Recurring questions and issue trends Unknown.`,
    },
    executiveFeed: {
      publicAppearancesToday: publicRows.length,
      mediaConfidence:
        publicRows.length === 0 ? "NOT_REQUIRED" : mediaConfidence,
      appearancesAtRisk,
      briefingLine: execLine,
    },
  };
}

export function debateMediaOperationsForAdvisory(
  home: DebateMediaOperationsHome,
) {
  return {
    date: home.date,
    mediaConfidence: home.mediaConfidence,
    publicAppearancesToday: home.publicAppearancesToday,
    appearancesAtRisk: home.executiveFeed.appearancesAtRisk,
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
