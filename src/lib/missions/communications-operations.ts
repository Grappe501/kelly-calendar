/**
 * Step 7.5 — Communications Operations (pure aggregation).
 * Answers: Is everyone communicating the same campaign?
 *
 * Canonical owner of communications plan readiness / deadline risk.
 * Not an email client or social scheduler. Content quality, send proof,
 * and earned media remain first-class Unknown.
 */

import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { ConstituentOperationsHome } from "@/lib/missions/constituent-operations";
import type { DebateMediaOperationsHome } from "@/lib/missions/debate-media-operations";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import type { FundraisingOperationsHome } from "@/lib/missions/fundraising-operations";
import type { GotvOperationsHome } from "@/lib/missions/gotv-operations";
import type { PetitionBallotOperationsHome } from "@/lib/missions/petition-ballot-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { UnknownFact, KnownNumber } from "@/lib/missions/volunteer-operations";

/** Plan-row facts only — no message body or send proof. */
export type CommunicationsPlanSnapshot = {
  itemCount: number;
  readyCount: number;
  openCount: number;
  overdueCount: number;
  missingOwnerCount: number;
  hasTalkingPoints: boolean;
  talkingPointsReady: boolean;
  hasPressItem: boolean;
  hasSpeech: boolean;
  hasRapidResponse: boolean;
  rapidResponseOpen: boolean;
  nextPublishAt: string | null;
  nextDraftDueAt: string | null;
};

export type CommsReadinessLabel =
  | "READY"
  | "OPEN"
  | "OVERDUE"
  | "NO_PLAN"
  | "UNKNOWN";

export type MessagingRisk = "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";

export type CommunicationsMissionRow = {
  missionId: string;
  missionTitle: string;
  countyName: string | null;
  whenLabel: string;
  href: string;
  planDefined: boolean;
  itemCount: number;
  readyCount: number;
  openCount: number;
  overdueCount: number;
  missingOwnerCount: number;
  hasTalkingPoints: boolean;
  talkingPointsReady: boolean;
  hasPressItem: boolean;
  hasSpeech: boolean;
  rapidResponseOpen: boolean;
  readinessLabel: CommsReadinessLabel;
  messagingRisk: MessagingRisk;
  nextDeadlineLabel: string | null;
};

export type CommunicationsCountyRow = {
  countyName: string;
  slug: string;
  localMediaActivity: KnownNumber | UnknownFact;
  pendingAnnouncements: KnownNumber;
  communicationsSupportNeeds: KnownNumber;
  localMessagingPackages: UnknownFact;
  messagingRisk: MessagingRisk;
};

export type CommunicationsOperationsHome = {
  title: "COMMUNICATIONS OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  todaysMessage: UnknownFact;
  mediaCommitments: KnownNumber;
  pressDeadlines: KnownNumber;
  interviews: UnknownFact;
  speakingEvents: KnownNumber;
  rapidResponseNeeded: KnownNumber;
  messagingRisk: MessagingRisk;
  missionRows: CommunicationsMissionRow[];
  countyRows: CommunicationsCountyRow[];
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    todaysMessageStatus: "unknown";
    mediaCommitments: number;
    pressDeadlinesAtRisk: number;
    speakingEvents: number;
    rapidResponseNeeded: number;
    messagingRisk: MessagingRisk;
    topItems: Array<{ label: string; detail: string; href: string }>;
    briefingLine: string;
  };
  countyFeed: CommunicationsCountyRow[];
  fieldFeed: {
    missions: Array<{
      missionId: string;
      talkingPointsStatus: CommsReadinessLabel;
      eventMessagingStatus: CommsReadinessLabel;
      handoutStatus: "UNKNOWN";
      pressContactStatus: "UNKNOWN";
      localIssueBriefStatus: "UNKNOWN";
      messagingRisk: MessagingRisk;
    }>;
    todaysTalkingPoints: UnknownFact;
  };
  volunteerFeed: {
    currentCampaignMessage: UnknownFact;
    approvedLiterature: UnknownFact;
    canvassingScriptVersion: UnknownFact;
    trainingReminders: UnknownFact;
    talkingPointsPlanReadyMissions: number;
  };
  /** Consumed from Logistics — literature/signage plan status. */
  logisticsConsume: {
    literatureAvailable: string;
    signageStatus: string;
    mediaKitDelivered: UnknownFact;
    pressBackdropAvailable: UnknownFact;
  } | null;
  /** Consumed from Finance — literature/ad/print authorizations. */
  financeConsume: FinanceOperationsHome["communicationsFeed"] | null;
  /** Consumed from Compliance — disclaimer / publication restrictions. */
  complianceConsume: ComplianceOperationsHome["communicationsFeed"] | null;
  /** Consumed from Constituent — issue resonance / feedback themes. */
  constituentConsume: ConstituentOperationsHome["communicationsFeed"] | null;
  /** Consumed from Debate & Media — appearance press coordination (Phase 2.2). */
  debateMediaConsume: DebateMediaOperationsHome["communicationsFeed"] | null;
  /** Consumed from Fundraising — invitation / collateral workflow (Phase 2.3). */
  fundraisingConsume: FundraisingOperationsHome["communicationsFeed"] | null;
  /** Consumed from GOTV — turnout messaging coordination (Phase 2.4). */
  gotvConsume: GotvOperationsHome["communicationsFeed"] | null;
  /** Consumed from Petition & Ballot — education messaging coordination (Phase 2.5). */
  petitionConsume: PetitionBallotOperationsHome["communicationsFeed"] | null;
};

export type CommunicationsMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  comms: CommunicationsPlanSnapshot | null;
};

const MESSAGE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Daily campaign message package is not yet available because its owning sub-surface has not been implemented.",
};

const INTERVIEW_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Interview inventory beyond event/comms plan rows is Unknown — no media booking surface yet.",
};

const PACKAGES_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Local messaging package content is Unknown — Communications Operations owns plan readiness, not copy assets yet.",
};

const HANDOUT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Handout / literature status is Unknown — asset inventory not implemented.",
};

const SCRIPT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Canvassing script version is Unknown — script registry not implemented.",
};

const TRAINING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Communications training reminders are Unknown — training surface not implemented.",
};

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function emptyComms(): CommunicationsPlanSnapshot {
  return {
    itemCount: 0,
    readyCount: 0,
    openCount: 0,
    overdueCount: 0,
    missingOwnerCount: 0,
    hasTalkingPoints: false,
    talkingPointsReady: false,
    hasPressItem: false,
    hasSpeech: false,
    hasRapidResponse: false,
    rapidResponseOpen: false,
    nextPublishAt: null,
    nextDraftDueAt: null,
  };
}

export function deriveCommsReadinessLabel(
  snap: CommunicationsPlanSnapshot,
): CommsReadinessLabel {
  if (snap.itemCount === 0) return "NO_PLAN";
  if (snap.overdueCount > 0) return "OVERDUE";
  if (snap.openCount > 0) return "OPEN";
  if (snap.readyCount === snap.itemCount) return "READY";
  return "UNKNOWN";
}

export function deriveMessagingRisk(input: {
  overdueCount: number;
  rapidResponseOpen: boolean;
  openCount: number;
  planDefined: boolean;
  missingOwnerCount: number;
}): MessagingRisk {
  if (input.rapidResponseOpen || input.overdueCount >= 2) return "CRITICAL";
  if (input.overdueCount > 0 || input.missingOwnerCount > 0) return "HIGH";
  if (!input.planDefined) return "UNKNOWN";
  if (input.openCount > 0) return "WATCH";
  return "LOW";
}

function nextDeadlineLabel(snap: CommunicationsPlanSnapshot): string | null {
  const candidates = [snap.nextDraftDueAt, snap.nextPublishAt].filter(
    (x): x is string => Boolean(x),
  );
  if (candidates.length === 0) return null;
  const earliest = candidates.sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  )[0];
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(earliest));
  } catch {
    return earliest;
  }
}

export function buildCommunicationsMissionRow(
  input: CommunicationsMissionInput,
): CommunicationsMissionRow {
  const snap = input.comms ?? emptyComms();
  const planDefined = snap.itemCount > 0;
  const readinessLabel = deriveCommsReadinessLabel(snap);
  const messagingRisk = deriveMessagingRisk({
    overdueCount: snap.overdueCount,
    rapidResponseOpen: snap.rapidResponseOpen,
    openCount: snap.openCount,
    planDefined,
    missingOwnerCount: snap.missingOwnerCount,
  });

  return {
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    countyName: input.countyName,
    whenLabel: input.mission.whenLabel,
    href: `/calendar?event=${input.mission.missionId}`,
    planDefined,
    itemCount: snap.itemCount,
    readyCount: snap.readyCount,
    openCount: snap.openCount,
    overdueCount: snap.overdueCount,
    missingOwnerCount: snap.missingOwnerCount,
    hasTalkingPoints: snap.hasTalkingPoints,
    talkingPointsReady: snap.talkingPointsReady,
    hasPressItem: snap.hasPressItem,
    hasSpeech: snap.hasSpeech,
    rapidResponseOpen: snap.rapidResponseOpen,
    readinessLabel,
    messagingRisk,
    nextDeadlineLabel: nextDeadlineLabel(snap),
  };
}

function riskRank(r: MessagingRisk): number {
  return r === "CRITICAL"
    ? 0
    : r === "HIGH"
      ? 1
      : r === "WATCH"
        ? 2
        : r === "UNKNOWN"
          ? 3
          : 4;
}

function buildCountyRow(
  countyName: string,
  missions: CommunicationsMissionRow[],
): CommunicationsCountyRow {
  const withPlan = missions.filter((m) => m.planDefined);
  const pending = missions.reduce((s, m) => s + m.openCount, 0);
  const support = missions.reduce(
    (s, m) => s + m.overdueCount + (m.missingOwnerCount > 0 ? 1 : 0),
    0,
  );
  const pressItems = missions.filter((m) => m.hasPressItem).length;
  let messagingRisk: MessagingRisk = "UNKNOWN";
  for (const m of missions) {
    if (riskRank(m.messagingRisk) < riskRank(messagingRisk)) {
      messagingRisk = m.messagingRisk;
    }
  }
  if (missions.length === 0) messagingRisk = "UNKNOWN";

  return {
    countyName,
    slug: countySlug(countyName),
    localMediaActivity:
      withPlan.length === 0
        ? {
            status: "unknown",
            value: null,
            reason:
              "No communications plan rows for this county today — media activity Unknown (not zero).",
          }
        : {
            status: "known",
            value: pressItems,
            note: `${pressItems} mission(s) with press/advisory items; ${withPlan.length} with plans`,
          },
    pendingAnnouncements: { status: "known", value: pending },
    communicationsSupportNeeds: { status: "known", value: support },
    localMessagingPackages: PACKAGES_UNKNOWN,
    messagingRisk,
  };
}

export function buildCommunicationsOperationsHome(input: {
  date: string;
  timezone: string;
  missions: CommunicationsMissionInput[];
  now?: Date;
  logisticsConsume?: CommunicationsOperationsHome["logisticsConsume"];
  financeConsume?: CommunicationsOperationsHome["financeConsume"];
  complianceConsume?: CommunicationsOperationsHome["complianceConsume"];
  constituentConsume?: CommunicationsOperationsHome["constituentConsume"];
  debateMediaConsume?: CommunicationsOperationsHome["debateMediaConsume"];
  fundraisingConsume?: CommunicationsOperationsHome["fundraisingConsume"];
  gotvConsume?: CommunicationsOperationsHome["gotvConsume"];
  petitionConsume?: CommunicationsOperationsHome["petitionConsume"];
}): CommunicationsOperationsHome {
  const now = input.now ?? new Date();
  const missionRows = input.missions
    .map(buildCommunicationsMissionRow)
    .sort(
      (a, b) =>
        riskRank(a.messagingRisk) - riskRank(b.messagingRisk) ||
        b.overdueCount - a.overdueCount,
    );

  const mediaCommitments = missionRows.filter((m) => m.hasPressItem).length;
  const pressDeadlines = missionRows.reduce((s, m) => s + m.overdueCount, 0);
  const speakingEvents = missionRows.filter((m) => m.hasSpeech).length;
  const rapidResponseNeeded = missionRows.filter((m) => m.rapidResponseOpen)
    .length;

  let messagingRisk: MessagingRisk = "LOW";
  if (missionRows.every((m) => !m.planDefined)) messagingRisk = "UNKNOWN";
  for (const m of missionRows) {
    if (riskRank(m.messagingRisk) < riskRank(messagingRisk)) {
      messagingRisk = m.messagingRisk;
    }
  }

  const byCounty = new Map<string, CommunicationsMissionRow[]>();
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
        riskRank(a.messagingRisk) - riskRank(b.messagingRisk) ||
        a.countyName.localeCompare(b.countyName),
    );

  const topItems = missionRows
    .filter(
      (m) =>
        m.messagingRisk === "CRITICAL" ||
        m.messagingRisk === "HIGH" ||
        m.overdueCount > 0 ||
        m.rapidResponseOpen,
    )
    .slice(0, 5)
    .map((m) => ({
      label: m.countyName || m.missionTitle,
      detail:
        m.rapidResponseOpen
          ? `Rapid response open · ${m.missionTitle}`
          : m.overdueCount > 0
            ? `${m.overdueCount} overdue comms · ${m.missionTitle}`
            : `${m.readinessLabel} · ${m.missionTitle}`,
      href: m.href,
    }));

  const briefingParts: string[] = [];
  if (rapidResponseNeeded > 0) {
    briefingParts.push(
      `${rapidResponseNeeded} rapid response item${rapidResponseNeeded === 1 ? "" : "s"} need attention.`,
    );
  }
  if (pressDeadlines > 0) {
    briefingParts.push(
      `${pressDeadlines} communications deadline${pressDeadlines === 1 ? "" : "s"} at risk.`,
    );
  }
  if (mediaCommitments > 0) {
    briefingParts.push(
      `${mediaCommitments} mission${mediaCommitments === 1 ? "" : "s"} with media/press commitments.`,
    );
  }
  if (briefingParts.length === 0) {
    if (missionRows.some((m) => m.planDefined)) {
      briefingParts.push(
        "No critical communications deadline risk in today’s permissioned plans.",
      );
    } else {
      briefingParts.push(
        "Communications plans undefined on today’s missions — messaging readiness Unknown, not ready.",
      );
    }
  }
  briefingParts.push("Today’s unified campaign message is Unknown.");

  const talkingPointsReadyMissions = missionRows.filter(
    (m) => m.talkingPointsReady,
  ).length;

  return {
    title: "COMMUNICATIONS OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    todaysMessage: MESSAGE_UNKNOWN,
    mediaCommitments: {
      status: "known",
      value: mediaCommitments,
      note: "Missions with press/advisory plan items today.",
    },
    pressDeadlines: {
      status: "known",
      value: pressDeadlines,
      note: "Overdue draft/approval/publish deadlines across plans.",
    },
    interviews: INTERVIEW_UNKNOWN,
    speakingEvents: {
      status: "known",
      value: speakingEvents,
      note: "Missions with SPEECH communications plan items.",
    },
    rapidResponseNeeded: {
      status: "known",
      value: rapidResponseNeeded,
      note: "Open RAPID_RESPONSE plan items.",
    },
    messagingRisk,
    missionRows,
    countyRows,
    unknowns: [
      { fact: "Today's message", reason: MESSAGE_UNKNOWN.reason },
      { fact: "Interview booking inventory", reason: INTERVIEW_UNKNOWN.reason },
      {
        fact: "Outbound send / delivery proof",
        reason:
          "Send confirmation is Unknown — Communications Operations is not an email or social client.",
      },
      {
        fact: "Earned media / clip outcomes",
        reason:
          "Media monitoring is Unknown — no clip inventory surface yet.",
      },
      { fact: "Local messaging packages", reason: PACKAGES_UNKNOWN.reason },
      { fact: "Handouts / literature", reason: HANDOUT_UNKNOWN.reason },
      { fact: "Canvassing script version", reason: SCRIPT_UNKNOWN.reason },
    ],
    executiveFeed: {
      todaysMessageStatus: "unknown",
      mediaCommitments,
      pressDeadlinesAtRisk: pressDeadlines,
      speakingEvents,
      rapidResponseNeeded,
      messagingRisk,
      topItems,
      briefingLine: briefingParts.join(" "),
    },
    countyFeed: countyRows,
    fieldFeed: {
      missions: missionRows.map((m) => ({
        missionId: m.missionId,
        talkingPointsStatus: m.hasTalkingPoints
          ? m.talkingPointsReady
            ? "READY"
            : m.overdueCount > 0
              ? "OVERDUE"
              : "OPEN"
          : "UNKNOWN",
        eventMessagingStatus: m.readinessLabel,
        handoutStatus: "UNKNOWN" as const,
        pressContactStatus: "UNKNOWN" as const,
        localIssueBriefStatus: "UNKNOWN" as const,
        messagingRisk: m.messagingRisk,
      })),
      todaysTalkingPoints: {
        status: "unknown",
        value: null,
        reason:
          talkingPointsReadyMissions > 0
            ? `${talkingPointsReadyMissions} mission(s) have talking-points plan rows ready — unified daily package content remains Unknown.`
            : MESSAGE_UNKNOWN.reason,
      },
    },
    volunteerFeed: {
      currentCampaignMessage: MESSAGE_UNKNOWN,
      approvedLiterature: HANDOUT_UNKNOWN,
      canvassingScriptVersion: SCRIPT_UNKNOWN,
      trainingReminders: TRAINING_UNKNOWN,
      talkingPointsPlanReadyMissions: talkingPointsReadyMissions,
    },
    logisticsConsume: input.logisticsConsume ?? null,
    financeConsume: input.financeConsume ?? null,
    complianceConsume: input.complianceConsume ?? null,
    constituentConsume: input.constituentConsume ?? null,
    debateMediaConsume: input.debateMediaConsume ?? null,
    fundraisingConsume: input.fundraisingConsume ?? null,
    gotvConsume: input.gotvConsume ?? null,
    petitionConsume: input.petitionConsume ?? null,
  };
}

export function communicationsOperationsForAdvisory(
  home: CommunicationsOperationsHome,
) {
  return {
    date: home.date,
    mediaCommitments: home.mediaCommitments,
    pressDeadlines: home.pressDeadlines,
    rapidResponseNeeded: home.rapidResponseNeeded,
    messagingRisk: home.messagingRisk,
    todaysMessage: home.todaysMessage,
    topItems: home.executiveFeed.topItems,
    unknowns: home.unknowns,
    executiveFeed: home.executiveFeed,
  };
}

export function countyCommunicationsFact(
  feed: CommunicationsCountyRow[] | null | undefined,
  countyName: string,
): CommunicationsCountyRow | null {
  if (!feed) return null;
  const key = countyName.trim().toLowerCase();
  return feed.find((c) => c.countyName.toLowerCase() === key) ?? null;
}
