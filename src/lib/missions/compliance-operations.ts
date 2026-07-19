/**
 * Step 7.8 — Compliance Operations (pure aggregation).
 * Answers: Can we do this legally, ethically, and according to campaign policy?
 *
 * Canonical owner of compliance readiness facts.
 * Not a legal research desk or document vault. Filing dollars, petition
 * inventories, and training ledgers remain first-class Unknown.
 *
 * Doctrine: Compliance is a readiness domain, not an after-the-fact audit.
 * Mission status is constrained by the minimum of required domains
 * (operational + resource + compliance).
 */

import type { DomainReadiness } from "@/lib/missions/logistics-operations";
import { combineOperationalReadiness } from "@/lib/missions/logistics-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { UnknownFact, KnownNumber } from "@/lib/missions/volunteer-operations";

export type CompliancePlanSnapshot = {
  isComplianceCalendar: boolean;
  isFundraisingCalendar: boolean;
  complianceLeadAssigned: boolean;
  requiresComplianceReview: boolean;
  complianceActionCount: number;
  complianceActionOpenCount: number;
  complianceActionOverdueCount: number;
  hasPressOrSpeechComms: boolean;
};

/** Triple commitment — ops / resource / compliance never collapsed into one %. */
export type CommitmentTripleState = {
  operationalState: DomainReadiness;
  resourceState: DomainReadiness;
  complianceState: DomainReadiness;
  /** Minimum of required domains for the commitment. */
  missionStatus: DomainReadiness;
};

export type ComplianceMissionRow = {
  missionId: string;
  missionTitle: string;
  countyName: string | null;
  whenLabel: string;
  href: string;
  isComplianceCalendar: boolean;
  isFundraising: boolean;
  complianceLeadAssigned: boolean;
  requiresComplianceReview: boolean;
  openComplianceActions: number;
  overdueComplianceActions: number;
  triple: CommitmentTripleState;
  complianceBlockers: string[];
  filingStatus: UnknownFact;
};

export type ComplianceCountyRow = {
  countyName: string;
  slug: string;
  countyFilingReadiness: DomainReadiness;
  localComplianceContacts: UnknownFact;
  unresolvedIssues: KnownNumber;
  trainingCompletion: UnknownFact;
  complianceRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
};

export type ComplianceOperationsHome = {
  title: "COMPLIANCE OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  complianceRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  upcomingFilingDeadlines: UnknownFact;
  requiredActions: KnownNumber;
  overdueItems: KnownNumber;
  highRiskCommitments: KnownNumber;
  campaignComplianceStatus: DomainReadiness;
  missionRows: ComplianceMissionRow[];
  countyRows: ComplianceCountyRow[];
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    complianceRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    upcomingFilingDeadlinesStatus: "unknown";
    requiredActions: number;
    overdueItems: number;
    highRiskCommitments: number;
    campaignComplianceStatus: DomainReadiness;
    complianceLeadGaps: number;
    topItems: Array<{ label: string; detail: string; href: string }>;
    briefingLine: string;
  };
  countyFeed: ComplianceCountyRow[];
  financeFeed: {
    reimbursementPolicyCompliance: UnknownFact;
    spendingAuthorizationStatus: UnknownFact;
    reportingReadiness: UnknownFact;
  };
  communicationsFeed: {
    disclaimerReadiness: UnknownFact;
    approvalStatus: UnknownFact;
    publicationRestrictions: UnknownFact;
  };
  fieldFeed: {
    missions: Array<{
      missionId: string;
      complianceState: DomainReadiness;
      missionStatus: DomainReadiness;
      petitionCompliance: UnknownFact;
      eventAuthorization: DomainReadiness;
      requiredDocumentation: UnknownFact;
      volunteerCertificationStatus: UnknownFact;
    }>;
  };
};

export type ComplianceMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  compliance: CompliancePlanSnapshot | null;
  operationalState?: DomainReadiness | null;
  resourceState?: DomainReadiness | null;
};

const FILING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Filing status / deadlines are Unknown — no campaign filing ledger exists yet.",
};

const DISCLAIMER_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Disclaimer readiness is Unknown — Compliance Operations is not a copy desk.",
};

const APPROVAL_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Compliance approval status is Unknown — approval surface not wired as a ledger.",
};

const PUBLICATION_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Publication restrictions are Unknown — restriction registry not implemented.",
};

const PETITION_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Petition compliance is Unknown — petition inventory surface not implemented.",
};

const DOCS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Required documentation checklist is Unknown — doc registry not implemented.",
};

const CERT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Volunteer certification status is Unknown — training ledger not implemented.",
};

const CONTACTS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Local compliance contacts are Unknown — county compliance registry not implemented.",
};

const TRAINING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Training completion % is Unknown — policy acknowledgment surface not implemented.",
};

const REIMBURSE_POLICY_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Reimbursement policy compliance is Unknown — policy ack ledger not implemented.",
};

const SPEND_AUTH_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Spending authorization status is Unknown — compliance authorization not modeled.",
};

const REPORTING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Campaign reporting readiness is Unknown — report package surface not implemented.",
};

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function emptyCompliance(): CompliancePlanSnapshot {
  return {
    isComplianceCalendar: false,
    isFundraisingCalendar: false,
    complianceLeadAssigned: false,
    requiresComplianceReview: false,
    complianceActionCount: 0,
    complianceActionOpenCount: 0,
    complianceActionOverdueCount: 0,
    hasPressOrSpeechComms: false,
  };
}

/**
 * Compliance domain readiness owned here.
 * Overdue / missing required review ⇒ BLOCKED (readiness, not audit).
 */
export function deriveComplianceState(
  snap: CompliancePlanSnapshot,
): DomainReadiness {
  if (snap.complianceActionOverdueCount > 0) return "BLOCKED";
  if (
    (snap.requiresComplianceReview || snap.isComplianceCalendar) &&
    !snap.complianceLeadAssigned
  ) {
    return "BLOCKED";
  }
  if (snap.complianceActionOpenCount > 0) return "NEEDS_ATTENTION";
  if (snap.isFundraisingCalendar && !snap.complianceLeadAssigned) {
    return "NEEDS_ATTENTION";
  }
  if (
    snap.requiresComplianceReview ||
    snap.isComplianceCalendar ||
    snap.complianceActionCount > 0 ||
    snap.hasPressOrSpeechComms
  ) {
    // Activity exists; filings/disclaimers not modeled → Unknown (not Ready)
    return "UNKNOWN";
  }
  return "NOT_REQUIRED";
}

function domainRank(d: DomainReadiness): number {
  return d === "BLOCKED"
    ? 0
    : d === "NEEDS_ATTENTION"
      ? 1
      : d === "UNKNOWN"
        ? 2
        : d === "READY"
          ? 3
          : 4;
}

function riskFromCompliance(
  d: DomainReadiness,
): ComplianceCountyRow["complianceRisk"] {
  if (d === "BLOCKED") return "CRITICAL";
  if (d === "NEEDS_ATTENTION") return "HIGH";
  if (d === "UNKNOWN") return "WATCH";
  if (d === "READY") return "LOW";
  return "UNKNOWN";
}

export function buildComplianceMissionRow(
  input: ComplianceMissionInput,
): ComplianceMissionRow {
  const snap = input.compliance ?? emptyCompliance();
  const complianceState = deriveComplianceState(snap);
  const operationalState = input.operationalState ?? "UNKNOWN";
  const resourceState = input.resourceState ?? "UNKNOWN";
  const required: DomainReadiness[] = [];
  if (operationalState !== "NOT_REQUIRED") required.push(operationalState);
  if (resourceState !== "NOT_REQUIRED") required.push(resourceState);
  if (complianceState !== "NOT_REQUIRED") required.push(complianceState);
  const missionStatus =
    required.length === 0
      ? "NOT_REQUIRED"
      : combineOperationalReadiness(required);

  const complianceBlockers: string[] = [];
  if (snap.complianceActionOverdueCount > 0) {
    complianceBlockers.push(
      `${snap.complianceActionOverdueCount} overdue compliance action(s)`,
    );
  }
  if (
    (snap.requiresComplianceReview || snap.isComplianceCalendar) &&
    !snap.complianceLeadAssigned
  ) {
    complianceBlockers.push("Compliance lead unassigned on required review");
  }
  if (snap.isFundraisingCalendar && !snap.complianceLeadAssigned) {
    complianceBlockers.push("Fundraising mission without compliance lead");
  }
  if (complianceState === "UNKNOWN" && snap.hasPressOrSpeechComms) {
    complianceBlockers.push("Disclaimer / publication restriction Unknown");
  }

  return {
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    countyName: input.countyName,
    whenLabel: input.mission.whenLabel,
    href: `/calendar?event=${input.mission.missionId}`,
    isComplianceCalendar: snap.isComplianceCalendar,
    isFundraising: snap.isFundraisingCalendar,
    complianceLeadAssigned: snap.complianceLeadAssigned,
    requiresComplianceReview: snap.requiresComplianceReview,
    openComplianceActions: snap.complianceActionOpenCount,
    overdueComplianceActions: snap.complianceActionOverdueCount,
    triple: {
      operationalState,
      resourceState,
      complianceState,
      missionStatus,
    },
    complianceBlockers,
    filingStatus: FILING_UNKNOWN,
  };
}

function buildCountyRow(
  countyName: string,
  missions: ComplianceMissionRow[],
): ComplianceCountyRow {
  let worst: DomainReadiness =
    missions.length === 0 ? "UNKNOWN" : "NOT_REQUIRED";
  let unresolved = 0;
  for (const m of missions) {
    if (domainRank(m.triple.complianceState) < domainRank(worst)) {
      worst = m.triple.complianceState;
    }
    unresolved +=
      m.overdueComplianceActions +
      (m.triple.complianceState === "BLOCKED" ||
      m.triple.complianceState === "NEEDS_ATTENTION"
        ? 1
        : 0);
  }
  return {
    countyName,
    slug: countySlug(countyName),
    countyFilingReadiness: worst,
    localComplianceContacts: CONTACTS_UNKNOWN,
    unresolvedIssues: {
      status: "known",
      value: unresolved,
      note: "Open/overdue compliance signals on today’s missions (not a case file count).",
    },
    trainingCompletion: TRAINING_UNKNOWN,
    complianceRisk: riskFromCompliance(worst),
  };
}

export function buildComplianceOperationsHome(input: {
  date: string;
  timezone: string;
  missions: ComplianceMissionInput[];
  now?: Date;
}): ComplianceOperationsHome {
  const now = input.now ?? new Date();
  const missionRows = input.missions
    .map(buildComplianceMissionRow)
    .sort(
      (a, b) =>
        domainRank(a.triple.complianceState) -
          domainRank(b.triple.complianceState) ||
        a.missionTitle.localeCompare(b.missionTitle),
    );

  const overdueItems = missionRows.reduce(
    (s, m) => s + m.overdueComplianceActions,
    0,
  );
  const requiredActions = missionRows.reduce(
    (s, m) => s + m.openComplianceActions + m.overdueComplianceActions,
    0,
  );
  const highRiskCommitments = missionRows.filter(
    (m) =>
      m.triple.complianceState === "BLOCKED" ||
      m.triple.complianceState === "NEEDS_ATTENTION",
  ).length;
  const complianceLeadGaps = missionRows.filter(
    (m) =>
      (m.requiresComplianceReview ||
        m.isComplianceCalendar ||
        m.isFundraising) &&
      !m.complianceLeadAssigned,
  ).length;

  const campaignComplianceStatus =
    missionRows.length === 0
      ? "UNKNOWN"
      : combineOperationalReadiness(
          missionRows.map((m) => m.triple.complianceState),
        );

  const complianceRisk = riskFromCompliance(campaignComplianceStatus);

  const byCounty = new Map<string, ComplianceMissionRow[]>();
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
        domainRank(a.countyFilingReadiness) -
          domainRank(b.countyFilingReadiness) ||
        a.countyName.localeCompare(b.countyName),
    );

  const topItems = missionRows
    .filter(
      (m) =>
        m.triple.complianceState === "BLOCKED" ||
        m.triple.complianceState === "NEEDS_ATTENTION",
    )
    .slice(0, 5)
    .map((m) => ({
      label: m.countyName || m.missionTitle,
      detail:
        m.complianceBlockers[0] ??
        `Compliance ${m.triple.complianceState} · Mission ${m.triple.missionStatus}`,
      href: m.href,
    }));

  const briefingParts: string[] = [];
  if (overdueItems > 0) {
    briefingParts.push(
      `${overdueItems} overdue compliance item${overdueItems === 1 ? "" : "s"}.`,
    );
  }
  if (highRiskCommitments > 0) {
    briefingParts.push(
      `${highRiskCommitments} commitment${highRiskCommitments === 1 ? "" : "s"} compliance-blocked or need attention.`,
    );
  }
  if (complianceLeadGaps > 0) {
    briefingParts.push(
      `${complianceLeadGaps} mission${complianceLeadGaps === 1 ? "" : "s"} missing a compliance lead.`,
    );
  }
  if (briefingParts.length === 0) {
    briefingParts.push(
      missionRows.length > 0
        ? "No overdue compliance actions flagged; filing deadlines remain Unknown."
        : "No missions today — campaign compliance status Unknown, not cleared.",
    );
  }
  briefingParts.push("Filing deadlines and disclaimer readiness Unknown.");

  return {
    title: "COMPLIANCE OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    complianceRisk,
    upcomingFilingDeadlines: FILING_UNKNOWN,
    requiredActions: {
      status: "known",
      value: requiredActions,
      note: "Open + overdue COMPLIANCE-phase action items today.",
    },
    overdueItems: {
      status: "known",
      value: overdueItems,
      note: "Overdue COMPLIANCE-phase action items.",
    },
    highRiskCommitments: {
      status: "known",
      value: highRiskCommitments,
      note: "Missions with compliance BLOCKED or NEEDS_ATTENTION.",
    },
    campaignComplianceStatus,
    missionRows,
    countyRows,
    unknowns: [
      { fact: "Filing status / deadlines", reason: FILING_UNKNOWN.reason },
      { fact: "Disclaimer readiness", reason: DISCLAIMER_UNKNOWN.reason },
      { fact: "Publication restrictions", reason: PUBLICATION_UNKNOWN.reason },
      { fact: "Petition compliance", reason: PETITION_UNKNOWN.reason },
      { fact: "Policy acknowledgments", reason: TRAINING_UNKNOWN.reason },
      { fact: "Required training completion", reason: CERT_UNKNOWN.reason },
      { fact: "Campaign reporting packages", reason: REPORTING_UNKNOWN.reason },
      {
        fact: "Compliance exceptions / waivers",
        reason:
          "Exception registry is Unknown — Compliance Operations is not a case-management system.",
      },
    ],
    executiveFeed: {
      complianceRisk,
      upcomingFilingDeadlinesStatus: "unknown",
      requiredActions,
      overdueItems,
      highRiskCommitments,
      campaignComplianceStatus,
      complianceLeadGaps,
      topItems,
      briefingLine: briefingParts.join(" "),
    },
    countyFeed: countyRows,
    financeFeed: {
      reimbursementPolicyCompliance: REIMBURSE_POLICY_UNKNOWN,
      spendingAuthorizationStatus: SPEND_AUTH_UNKNOWN,
      reportingReadiness: REPORTING_UNKNOWN,
    },
    communicationsFeed: {
      disclaimerReadiness: DISCLAIMER_UNKNOWN,
      approvalStatus: APPROVAL_UNKNOWN,
      publicationRestrictions: PUBLICATION_UNKNOWN,
    },
    fieldFeed: {
      missions: missionRows.map((m) => ({
        missionId: m.missionId,
        complianceState: m.triple.complianceState,
        missionStatus: m.triple.missionStatus,
        petitionCompliance: PETITION_UNKNOWN,
        eventAuthorization:
          m.triple.complianceState === "NOT_REQUIRED"
            ? "NOT_REQUIRED"
            : m.triple.complianceState === "BLOCKED"
              ? "BLOCKED"
              : m.requiresComplianceReview || m.isComplianceCalendar
                ? m.complianceLeadAssigned
                  ? "UNKNOWN"
                  : "BLOCKED"
                : "UNKNOWN",
        requiredDocumentation: DOCS_UNKNOWN,
        volunteerCertificationStatus: CERT_UNKNOWN,
      })),
    },
  };
}

export function complianceOperationsForAdvisory(home: ComplianceOperationsHome) {
  return {
    date: home.date,
    complianceRisk: home.complianceRisk,
    requiredActions: home.requiredActions,
    overdueItems: home.overdueItems,
    highRiskCommitments: home.highRiskCommitments,
    campaignComplianceStatus: home.campaignComplianceStatus,
    upcomingFilingDeadlines: home.upcomingFilingDeadlines,
    executiveFeed: home.executiveFeed,
    unknowns: home.unknowns,
    tripleSample: home.missionRows.slice(0, 6).map((m) => ({
      mission: m.missionTitle,
      operationalState: m.triple.operationalState,
      resourceState: m.triple.resourceState,
      complianceState: m.triple.complianceState,
      missionStatus: m.triple.missionStatus,
    })),
  };
}

export function countyComplianceFact(
  feed: ComplianceCountyRow[] | null | undefined,
  countyName: string,
): ComplianceCountyRow | null {
  if (!feed) return null;
  const key = countyName.trim().toLowerCase();
  return feed.find((c) => c.countyName.toLowerCase() === key) ?? null;
}
