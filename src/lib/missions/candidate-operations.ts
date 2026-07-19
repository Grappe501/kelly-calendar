/**
 * Phase 2.1 — Candidate Operations (pure orchestration).
 * Answers: Is the candidate prepared for today's engagements?
 *
 * Orchestrates Phase 1 kernel feeds. Owns almost no primary data.
 * Prepared ≠ scheduled — readiness domains assemble travel, speech,
 * briefing, media, materials, schedule, security, and personal signals.
 *
 * Doctrine: Phase 2 capabilities orchestrate Phase 1 services —
 * they do not replace or duplicate them.
 */

import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { ConstituentOperationsHome } from "@/lib/missions/constituent-operations";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import type { DebateMediaOperationsHome } from "@/lib/missions/debate-media-operations";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import type { FundraisingOperationsHome } from "@/lib/missions/fundraising-operations";
import type { GotvOperationsHome } from "@/lib/missions/gotv-operations";
import {
  combineOperationalReadiness,
  type DomainReadiness,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { PetitionBallotOperationsHome } from "@/lib/missions/petition-ballot-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { UnknownFact } from "@/lib/missions/volunteer-operations";

export type CandidateReadinessDomain =
  | "Travel"
  | "Speech"
  | "Briefing"
  | "Media"
  | "Materials"
  | "Schedule"
  | "Security"
  | "Personal";

export type CandidateDomainCell = {
  domain: CandidateReadinessDomain;
  state: DomainReadiness;
  source: string;
  detail: string;
};

export type CandidateInboxItem = {
  id: string;
  category:
    | "BRIEFING"
    | "MEDIA"
    | "COUNTY"
    | "TRAVEL"
    | "DEBATE"
    | "DOCUMENT"
    | "SPEECH"
    | "FUNDRAISING"
    | "GOTV"
    | "PETITION";
  title: string;
  detail: string;
  href: string | null;
  status: "actionable" | "unknown";
};

export type EngagementBrief = {
  missionId: string;
  missionTitle: string;
  whenLabel: string;
  href: string;
  purpose: string;
  host: UnknownFact;
  expectedAttendance: UnknownFact;
  countySnapshot: string;
  communityPriorities: UnknownFact;
  talkingPoints: string;
  knownSupporters: UnknownFact;
  knownConcerns: UnknownFact;
  mediaPresent: UnknownFact;
  volunteerLead: string;
  logisticsStatus: DomainReadiness;
  complianceStatus: DomainReadiness;
  preparedness: DomainReadiness;
  domains: CandidateDomainCell[];
};

export type CandidateBrief = {
  greeting: string;
  todaysSchedule: Array<{
    missionId: string;
    title: string;
    whenLabel: string;
    whereLabel: string;
    href: string;
  }>;
  travel: string;
  speakingNotes: string;
  peopleYoullMeet: string;
  localIssues: UnknownFact;
  media: string;
  potentialRisks: string[];
  requiredDecisions: string[];
  preparednessScore: DomainReadiness;
};

export type CandidateBinder = {
  title: "CANDIDATE BINDER";
  assembledFrom: string[];
  sections: Array<{ heading: string; body: string }>;
  note: string;
};

export type CandidateOperationsHome = {
  title: "CANDIDATE OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  doctrine: "orchestrates Phase 1 — does not replace or duplicate kernel facts";
  candidateBrief: CandidateBrief;
  engagementBriefs: EngagementBrief[];
  readinessDomains: CandidateDomainCell[];
  preparednessScore: DomainReadiness;
  candidateInbox: CandidateInboxItem[];
  binder: CandidateBinder;
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    preparednessScore: DomainReadiness;
    blockedDomains: number;
    unknownDomains: number;
    inboxActionable: number;
    nextEngagement: string | null;
    briefingLine: string;
  };
};

const LOCAL_ISSUES_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Local issues are Unknown — no issue briefing registry in Phase 1; Debate & Media (2.2) may supply later.",
};

const HOST_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Host identity is Unknown — organization presence is a count, not a host registry.",
};

const ATTENDANCE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Expected attendance is Unknown — RSVP surfaces are not in the kernel.",
};

const PRIORITIES_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Community priorities are Unknown — County Ops owns health, not issue lists.",
};

const SUPPORTERS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Known supporters are Unknown — Constituent Ops is not a CRM and does not project PII.",
};

const CONCERNS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Known concerns are Unknown — no concern ledger in Phase 1.",
};

const MEDIA_PRESENT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason: "Media present is Unknown — press attendance is not tracked as a fact yet.",
};

function mapScheduleReadiness(
  mission: MissionCard,
): DomainReadiness {
  const state = mission.todayReadiness.state;
  if (state === "READY") return "READY";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCommsSpeech(
  row: CommunicationsOperationsHome["missionRows"][number] | undefined,
): DomainReadiness {
  if (!row) return "UNKNOWN";
  if (!row.planDefined && !row.hasTalkingPoints && !row.hasSpeech) return "UNKNOWN";
  if (row.messagingRisk === "CRITICAL") return "BLOCKED";
  if (row.messagingRisk === "HIGH" || row.overdueCount > 0) return "NEEDS_ATTENTION";
  if (row.talkingPointsReady || row.hasSpeech) return "READY";
  if (row.hasTalkingPoints || row.planDefined) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCommsMedia(
  row: CommunicationsOperationsHome["missionRows"][number] | undefined,
  home: CommunicationsOperationsHome,
  debateMedia?: DebateMediaOperationsHome["candidateFeed"] | null,
  appearanceConfidence?: DomainReadiness | null,
): DomainReadiness {
  if (appearanceConfidence && appearanceConfidence !== "NOT_REQUIRED") {
    return appearanceConfidence;
  }
  if (debateMedia && debateMedia.mediaConfidence !== "NOT_REQUIRED") {
    return debateMedia.mediaConfidence;
  }
  if (home.interviews.status === "unknown" && home.todaysMessage.status === "unknown") {
    if (!row?.hasPressItem) return "UNKNOWN";
  }
  if (row?.messagingRisk === "CRITICAL") return "BLOCKED";
  if (row?.hasPressItem) {
    if (row.messagingRisk === "HIGH") return "NEEDS_ATTENTION";
    return "READY";
  }
  if (home.executiveFeed.pressDeadlinesAtRisk > 0) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCompliance(
  row: ComplianceOperationsHome["missionRows"][number] | undefined,
): DomainReadiness {
  return row?.triple.complianceState ?? "UNKNOWN";
}

function buildMissionDomains(input: {
  mission: MissionCard;
  countyName: string | null;
  logistics?: LogisticsOperationsHome["missionRows"][number];
  communications?: CommunicationsOperationsHome["missionRows"][number];
  compliance?: ComplianceOperationsHome["missionRows"][number];
  communicationsHome: CommunicationsOperationsHome;
  debateMediaFeed?: DebateMediaOperationsHome["candidateFeed"] | null;
  appearanceConfidence?: DomainReadiness | null;
  briefingFromMedia?: DomainReadiness | null;
}): CandidateDomainCell[] {
  const travel = input.logistics?.domains.travel ?? "UNKNOWN";
  const materials = input.logistics?.domains.materials ?? "UNKNOWN";
  const speech = mapCommsSpeech(input.communications);
  const media = mapCommsMedia(
    input.communications,
    input.communicationsHome,
    input.debateMediaFeed,
    input.appearanceConfidence,
  );
  const schedule = mapScheduleReadiness(input.mission);
  const briefing: DomainReadiness =
    input.briefingFromMedia && input.briefingFromMedia !== "NOT_REQUIRED"
      ? input.briefingFromMedia
      : input.countyName
        ? "READY"
        : input.mission
          ? "NEEDS_ATTENTION"
          : "UNKNOWN";

  return [
    {
      domain: "Travel",
      state: travel,
      source: "Logistics Operations",
      detail: input.logistics
        ? `Travel domain ${travel}`
        : "Travel Unknown — logistics snapshot missing.",
    },
    {
      domain: "Speech",
      state: speech,
      source: "Communications Operations",
      detail:
        speech === "UNKNOWN"
          ? "Speech content Unknown — plan/talking points not confirmed."
          : `Speech readiness ${speech}`,
    },
    {
      domain: "Briefing",
      state: briefing,
      source: input.briefingFromMedia
        ? "Debate & Media Operations"
        : "Candidate Ops assembly + County",
      detail: input.countyName
        ? `County context: ${input.countyName}`
        : "County Unknown — briefing incomplete.",
    },
    {
      domain: "Media",
      state: media,
      source: input.debateMediaFeed
        ? "Debate & Media Operations"
        : "Communications Operations",
      detail:
        media === "UNKNOWN"
          ? "Media prep Unknown — interviews/message content not wired."
          : `Media readiness ${media}`,
    },
    {
      domain: "Materials",
      state: materials,
      source: "Logistics Operations",
      detail: input.logistics
        ? `Materials domain ${materials}`
        : "Materials Unknown — packing snapshot missing.",
    },
    {
      domain: "Schedule",
      state: schedule,
      source: "Calendar / Campaign Brief",
      detail: `Mission schedule readiness ${schedule}`,
    },
    {
      domain: "Security",
      state: "UNKNOWN",
      source: "none (Phase 1)",
      detail: "Security is Unknown — no security domain in the kernel.",
    },
    {
      domain: "Personal",
      state: "UNKNOWN",
      source: "none (Phase 1)",
      detail: "Personal readiness is Unknown — not tracked in the kernel.",
    },
  ];
}

function dayDomains(engagements: EngagementBrief[]): CandidateDomainCell[] {
  const order: CandidateReadinessDomain[] = [
    "Travel",
    "Speech",
    "Briefing",
    "Media",
    "Materials",
    "Schedule",
    "Security",
    "Personal",
  ];
  return order.map((domain) => {
    const states = engagements.map(
      (e) => e.domains.find((d) => d.domain === domain)?.state ?? "UNKNOWN",
    );
    if (engagements.length === 0) {
      if (domain === "Security" || domain === "Personal") {
        return {
          domain,
          state: "UNKNOWN" as DomainReadiness,
          source: "none (Phase 1)",
          detail: `${domain} is Unknown — no kernel owner.`,
        };
      }
      return {
        domain,
        state: "NOT_REQUIRED" as DomainReadiness,
        source: "Candidate Ops",
        detail: "No engagements today — domain not required.",
      };
    }
    const state = combineOperationalReadiness(states);
    const sample = engagements[0]?.domains.find((d) => d.domain === domain);
    return {
      domain,
      state,
      source: sample?.source ?? "Candidate Ops assembly",
      detail: sample?.detail ?? `${domain} ${state}`,
    };
  });
}

export function buildCandidateOperationsHome(input: {
  brief: CampaignBrief;
  missions: MissionCard[];
  countiesByMission: Array<{ missionId: string; countyName: string | null }>;
  logistics: LogisticsOperationsHome;
  communications: CommunicationsOperationsHome;
  compliance: ComplianceOperationsHome;
  constituents: ConstituentOperationsHome;
  counties: CountyOperationsHome;
  field: FieldOperationsHome;
  finance: FinanceOperationsHome;
  volunteers: VolunteerOperationsHome;
  debateMediaConsume?: DebateMediaOperationsHome | null;
  fundraisingConsume?: FundraisingOperationsHome | null;
  gotvConsume?: GotvOperationsHome | null;
  petitionConsume?: PetitionBallotOperationsHome | null;
  now?: Date;
}): CandidateOperationsHome {
  const now = input.now ?? new Date();
  const logisticsById = new Map(
    input.logistics.missionRows.map((m) => [m.missionId, m]),
  );
  const commsById = new Map(
    input.communications.missionRows.map((m) => [m.missionId, m]),
  );
  const complianceById = new Map(
    input.compliance.missionRows.map((m) => [m.missionId, m]),
  );
  const constituentById = new Map(
    input.constituents.missionRows.map((m) => [m.missionId, m]),
  );
  const volunteerLeadById = new Map(
    input.volunteers.fieldFeed.missions.map((m) => [
      m.missionId,
      m.volunteerLeadAssigned,
    ]),
  );
  const appearanceById = new Map(
    (input.debateMediaConsume?.mediaCalendar ?? []).map((a) => [a.missionId, a]),
  );
  const debateMediaFeed = input.debateMediaConsume?.candidateFeed ?? null;
  const fundraisingFeed = input.fundraisingConsume?.candidateFeed ?? null;
  const gotvFeed = input.gotvConsume?.candidateFeed ?? null;
  const petitionFeed = input.petitionConsume?.candidateFeed ?? null;

  const cleanedBriefs: EngagementBrief[] = input.missions.map((mission) => {
    const countyName =
      input.countiesByMission.find((c) => c.missionId === mission.missionId)
        ?.countyName ?? null;
    const logistics = logisticsById.get(mission.missionId);
    const communications = commsById.get(mission.missionId);
    const compliance = complianceById.get(mission.missionId);
    const appearance = appearanceById.get(mission.missionId);
    const domains = buildMissionDomains({
      mission,
      countyName,
      logistics,
      communications,
      compliance,
      communicationsHome: input.communications,
      debateMediaFeed,
      appearanceConfidence: appearance?.mediaConfidence ?? null,
      briefingFromMedia: appearance?.briefingCompleteness ?? null,
    });
    const preparedness = combineOperationalReadiness(domains.map((d) => d.state));
    const talking =
      communications?.talkingPointsReady
        ? "Talking points marked ready (Communications)."
        : communications?.hasTalkingPoints
          ? "Talking points planned — not confirmed ready."
          : communications?.hasSpeech
            ? "Speech item present — readiness partial."
            : "Speaking notes Unknown — Communications has no confirmed content.";

    const leadAssigned = volunteerLeadById.get(mission.missionId);
    const volunteerLead =
      leadAssigned === true
        ? "Volunteer lead assigned (Volunteer Ops)."
        : leadAssigned === false
          ? "Volunteer lead not assigned — see Volunteer Ops."
          : "Volunteer lead Unknown — confirm on Volunteer Ops.";

    return {
      missionId: mission.missionId,
      missionTitle: mission.title,
      whenLabel: mission.whenLabel,
      href: `/calendar?event=${mission.missionId}`,
      purpose: mission.title,
      host: HOST_UNKNOWN,
      expectedAttendance: ATTENDANCE_UNKNOWN,
      countySnapshot: countyName
        ? `${countyName} — see County Ops for health.`
        : "County Unknown",
      communityPriorities: PRIORITIES_UNKNOWN,
      talkingPoints: talking,
      knownSupporters: SUPPORTERS_UNKNOWN,
      knownConcerns: CONCERNS_UNKNOWN,
      mediaPresent: MEDIA_PRESENT_UNKNOWN,
      volunteerLead,
      logisticsStatus: logistics?.missionReadiness ?? "UNKNOWN",
      complianceStatus: mapCompliance(compliance),
      preparedness,
      domains,
    };
  });

  const peopleLine =
    input.missions.length === 0
      ? "No engagements — no people linked today."
      : input.missions
          .map((m) => {
            const c = constituentById.get(m.missionId);
            if (!c) return `${m.title}: people Unknown`;
            return `${m.title}: ${c.peopleLinked} people / ${c.organizationsLinked} orgs (counts)`;
          })
          .join("; ");

  const readinessDomains = dayDomains(cleanedBriefs);
  const preparednessScore = combineOperationalReadiness(
    readinessDomains.map((d) => d.state),
  );

  const potentialRisks: string[] = [];
  if (input.field.executiveFeed.teamsNeedingAttention > 0) {
    potentialRisks.push(input.field.executiveFeed.briefingLine);
  }
  if (input.logistics.executiveFeed.travelRisk === "CRITICAL" ||
      input.logistics.executiveFeed.travelRisk === "HIGH") {
    potentialRisks.push(input.logistics.executiveFeed.briefingLine);
  }
  if (
    input.compliance.executiveFeed.complianceRisk === "CRITICAL" ||
    input.compliance.executiveFeed.complianceRisk === "HIGH"
  ) {
    potentialRisks.push(input.compliance.executiveFeed.briefingLine);
  }
  if (input.finance.executiveFeed.financialBlockers > 0) {
    potentialRisks.push(input.finance.executiveFeed.briefingLine);
  }
  if (input.counties.executiveFeed.needsImmediate > 0) {
    potentialRisks.push(input.counties.executiveFeed.briefingLine);
  }
  if (potentialRisks.length === 0) {
    potentialRisks.push("No acute candidate-facing risks flagged from kernel feeds.");
  }

  const requiredDecisions: string[] = [];
  if (preparednessScore === "BLOCKED") {
    requiredDecisions.push("Clear blocked preparedness domains before first stop");
  }
  if (readinessDomains.some((d) => d.domain === "Travel" && d.state === "BLOCKED")) {
    requiredDecisions.push("Confirm driver / travel before departure");
  }
  if (readinessDomains.some((d) => d.domain === "Speech" && (d.state === "UNKNOWN" || d.state === "NEEDS_ATTENTION"))) {
    requiredDecisions.push("Confirm speaking notes with Communications");
  }
  if (input.constituents.executiveFeed.overdueFollowups > 0) {
    requiredDecisions.push("Acknowledge overdue relationship follow-ups (Constituent Ops)");
  }
  if (requiredDecisions.length === 0 && input.brief.nextMission) {
    requiredDecisions.push("Confirm next engagement is prepared to execute");
  }

  const travelLine =
    input.brief.travel.nextMissionDriveMinutes != null
      ? `Next travel about ${input.brief.travel.nextMissionDriveMinutes} minutes. ${input.logistics.executiveFeed.briefingLine}`
      : input.logistics.executiveFeed.briefingLine;

  const mediaLine = debateMediaFeed
    ? debateMediaFeed.briefingLine
    : input.communications.executiveFeed.messagingRisk === "UNKNOWN" &&
        input.communications.executiveFeed.mediaCommitments === 0
      ? "Media Unknown — interviews and daily message not confirmed."
      : input.communications.executiveFeed.briefingLine;

  const candidateBrief: CandidateBrief = {
    greeting: "Good Morning Kelly",
    todaysSchedule: input.missions.map((m) => ({
      missionId: m.missionId,
      title: m.title,
      whenLabel: m.whenLabel,
      whereLabel: m.whereLabel,
      href: `/calendar?event=${m.missionId}`,
    })),
    travel: travelLine,
    speakingNotes:
      input.communications.fieldFeed.todaysTalkingPoints.status === "unknown"
        ? "Speaking notes Unknown — Communications owns plans; daily message content not confirmed."
        : input.communications.executiveFeed.briefingLine,
    peopleYoullMeet: peopleLine,
    localIssues: LOCAL_ISSUES_UNKNOWN,
    media: mediaLine,
    potentialRisks,
    requiredDecisions,
    preparednessScore,
  };

  const candidateInbox: CandidateInboxItem[] = [];
  for (const eng of cleanedBriefs) {
    if (eng.preparedness === "BLOCKED" || eng.preparedness === "NEEDS_ATTENTION") {
      candidateInbox.push({
        id: `brief-${eng.missionId}`,
        category: "BRIEFING",
        title: `Engagement needs prep: ${eng.missionTitle}`,
        detail: `Preparedness ${eng.preparedness}`,
        href: eng.href,
        status: "actionable",
      });
    }
    if (eng.domains.find((d) => d.domain === "Speech")?.state === "UNKNOWN") {
      candidateInbox.push({
        id: `speech-${eng.missionId}`,
        category: "SPEECH",
        title: `Speaking notes Unknown — ${eng.missionTitle}`,
        detail: "Confirm with Communications Ops.",
        href: "/communications",
        status: "unknown",
      });
    }
    if (eng.domains.find((d) => d.domain === "Travel")?.state === "BLOCKED") {
      candidateInbox.push({
        id: `travel-${eng.missionId}`,
        category: "TRAVEL",
        title: `Travel blocked — ${eng.missionTitle}`,
        detail: eng.domains.find((d) => d.domain === "Travel")?.detail ?? "Travel blocked",
        href: "/logistics",
        status: "actionable",
      });
    }
  }
  if (input.counties.executiveFeed.needsImmediate > 0) {
    const top = input.counties.executiveFeed.topWeak[0];
    candidateInbox.push({
      id: "county-alert",
      category: "COUNTY",
      title: "County alert",
      detail: top ? `${top.countyName}: ${top.reason}` : input.counties.executiveFeed.briefingLine,
      href: top?.href ?? "/counties",
      status: "actionable",
    });
  }
  candidateInbox.push({
    id: "media-prep",
    category: "MEDIA",
    title: "Media prep",
    detail: mediaLine,
    href: "/communications",
    status:
      input.communications.executiveFeed.messagingRisk === "UNKNOWN"
        ? "unknown"
        : "actionable",
  });
  if (debateMediaFeed) {
    candidateInbox.push({
      id: "debate-media",
      category: "DEBATE",
      title: "Debate & media readiness",
      detail: debateMediaFeed.briefingLine,
      href: "/debate-media",
      status:
        debateMediaFeed.appearancesAtRisk > 0 ||
        debateMediaFeed.mediaConfidence === "BLOCKED" ||
        debateMediaFeed.mediaConfidence === "NEEDS_ATTENTION"
          ? "actionable"
          : debateMediaFeed.mediaConfidence === "UNKNOWN"
            ? "unknown"
            : "actionable",
    });
  } else {
    candidateInbox.push({
      id: "debate-notes",
      category: "DEBATE",
      title: "Debate notes",
      detail:
        "Debate packets Unknown — owned by Debate & Media Operations (Phase 2.2).",
      href: "/debate-media",
      status: "unknown",
    });
  }
  if (fundraisingFeed) {
    candidateInbox.push({
      id: "fundraising-brief",
      category: "FUNDRAISING",
      title: "Today's fundraising brief",
      detail: fundraisingFeed.todaysFundraisingBrief,
      href: "/fundraising",
      status:
        fundraisingFeed.preparationStatus === "BLOCKED" ||
        fundraisingFeed.preparationStatus === "NEEDS_ATTENTION"
          ? "actionable"
          : fundraisingFeed.preparationStatus === "UNKNOWN"
            ? "unknown"
            : "actionable",
    });
  }
  if (gotvFeed) {
    candidateInbox.push({
      id: "gotv-brief",
      category: "GOTV",
      title: "GOTV / turnout focus",
      detail: gotvFeed.briefingLine,
      href: "/gotv",
      status:
        gotvFeed.preparationStatus === "BLOCKED" ||
        gotvFeed.preparationStatus === "NEEDS_ATTENTION"
          ? "actionable"
          : gotvFeed.preparationStatus === "UNKNOWN"
            ? "unknown"
            : "actionable",
    });
  }
  if (petitionFeed) {
    candidateInbox.push({
      id: "petition-brief",
      category: "PETITION",
      title: "Petition & ballot focus",
      detail: petitionFeed.briefingLine,
      href: "/petition",
      status:
        petitionFeed.preparationStatus === "BLOCKED" ||
        petitionFeed.preparationStatus === "NEEDS_ATTENTION"
          ? "actionable"
          : petitionFeed.preparationStatus === "UNKNOWN"
            ? "unknown"
            : "actionable",
    });
  }
  candidateInbox.push({
    id: "doc-review",
    category: "DOCUMENT",
    title: "Document reviews",
    detail: "Document approval queue Unknown — no binder workflow store yet.",
    href: null,
    status: "unknown",
  });

  const binder: CandidateBinder = {
    title: "CANDIDATE BINDER",
    assembledFrom: [
      "Executive Command / Campaign Brief",
      "County Operations",
      "Communications Operations",
      "Logistics Operations",
      "Compliance Operations",
      "Voter & Constituent Operations",
      "Field Operations",
      "Volunteer Operations",
      "Finance & Resources Operations",
    ],
    sections: [
      {
        heading: "Today's Schedule",
        body:
          candidateBrief.todaysSchedule.length === 0
            ? "No permissioned engagements today."
            : candidateBrief.todaysSchedule
                .map((s) => `${s.whenLabel} — ${s.title} @ ${s.whereLabel}`)
                .join("\n"),
      },
      { heading: "Travel", body: candidateBrief.travel },
      { heading: "Speaking Notes", body: candidateBrief.speakingNotes },
      { heading: "People You'll Meet", body: candidateBrief.peopleYoullMeet },
      {
        heading: "Local Issues",
        body: candidateBrief.localIssues.reason,
      },
      { heading: "Media", body: candidateBrief.media },
      {
        heading: "Potential Risks",
        body: candidateBrief.potentialRisks.join("\n"),
      },
      {
        heading: "Required Decisions",
        body:
          candidateBrief.requiredDecisions.length === 0
            ? "None flagged."
            : candidateBrief.requiredDecisions.join("\n"),
      },
      {
        heading: "Preparedness Score",
        body: `Overall preparedness: ${preparednessScore} (minimum of required domains).`,
      },
      {
        heading: "Engagement Briefs",
        body:
          cleanedBriefs.length === 0
            ? "No stops today."
            : cleanedBriefs
                .map(
                  (e) =>
                    `${e.missionTitle} (${e.whenLabel}) — prep ${e.preparedness}; logistics ${e.logisticsStatus}; compliance ${e.complianceStatus}`,
                )
                .join("\n"),
      },
    ],
    note: "Binder is assembled on read — no duplicate storage. Print / tablet friendly.",
  };

  const unknowns: Array<{ fact: string; reason: string }> = [
    {
      fact: "Security readiness",
      reason: "Unknown — Phase 1 has no security domain.",
    },
    {
      fact: "Personal readiness",
      reason: "Unknown — Phase 1 has no personal domain.",
    },
    {
      fact: "Local issues / community priorities",
      reason: LOCAL_ISSUES_UNKNOWN.reason,
    },
    {
      fact: "Host / attendance / supporters / concerns",
      reason:
        "Unknown — Candidate Ops does not invent CRM or RSVP facts; Constituent Ops projects counts only.",
    },
    {
      fact: "Debate notes",
      reason: "Unknown until Debate & Media Operations (2.2).",
    },
  ];

  const blockedDomains = readinessDomains.filter((d) => d.state === "BLOCKED").length;
  const unknownDomains = readinessDomains.filter((d) => d.state === "UNKNOWN").length;
  const next = cleanedBriefs[0] ?? null;
  const briefingLine =
    input.missions.length === 0
      ? "Candidate Ops: no engagements today — preparedness not required."
      : `Candidate preparedness ${preparednessScore}` +
        (blockedDomains > 0 ? ` · ${blockedDomains} blocked domain(s)` : "") +
        (unknownDomains > 0 ? ` · ${unknownDomains} Unknown domain(s)` : "") +
        (next ? ` · Next: ${next.missionTitle}` : "") +
        ".";

  return {
    title: "CANDIDATE OPERATIONS",
    date: input.brief.date,
    timezone: input.brief.timezone,
    lastUpdatedAt: now.toISOString(),
    doctrine: "orchestrates Phase 1 — does not replace or duplicate kernel facts",
    candidateBrief,
    engagementBriefs: cleanedBriefs,
    readinessDomains,
    preparednessScore,
    candidateInbox,
    binder,
    unknowns,
    executiveFeed: {
      preparednessScore,
      blockedDomains,
      unknownDomains,
      inboxActionable: candidateInbox.filter((i) => i.status === "actionable").length,
      nextEngagement: next ? `${next.missionTitle} (${next.whenLabel})` : null,
      briefingLine,
    },
  };
}

export function candidateOperationsForAdvisory(home: CandidateOperationsHome) {
  return {
    date: home.date,
    preparednessScore: home.preparednessScore,
    domains: home.readinessDomains.map((d) => ({
      domain: d.domain,
      state: d.state,
    })),
    inboxActionable: home.executiveFeed.inboxActionable,
    nextEngagement: home.executiveFeed.nextEngagement,
    risks: home.candidateBrief.potentialRisks.slice(0, 4),
    decisions: home.candidateBrief.requiredDecisions.slice(0, 4),
    unknowns: home.unknowns.map((u) => u.fact),
    doctrine: home.doctrine,
    executiveFeed: home.executiveFeed,
  };
}
