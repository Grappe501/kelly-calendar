/**
 * Step 7.7 — Finance & Resources Operations (pure aggregation).
 * Answers: Do we have the resources to sustain the campaign?
 *
 * Canonical owner of resource/budget readiness facts.
 * Not a ledger. Dollar amounts, approvals, and cash position remain
 * first-class Unknown until money surfaces exist.
 *
 * Doctrine: Every operational commitment has both an operational state
 * (consumed from Logistics) and a resource state (owned here).
 */

import type { MissionCard } from "@/lib/missions/mission-card";
import type { DomainReadiness } from "@/lib/missions/logistics-operations";
import type { UnknownFact, KnownNumber } from "@/lib/missions/volunteer-operations";

export type FinancePlanSnapshot = {
  isFundraisingCalendar: boolean;
  financeLeadAssigned: boolean;
  complianceLeadAssigned: boolean;
  rentalRequired: boolean;
  flightRequired: boolean;
  lodgingRequired: boolean;
  overnightStay: boolean;
  estimatedDistanceMiles: number | null;
  packingCount: number;
};

/** Dual commitment — operational vs resource, never collapsed into one %. */
export type CommitmentDualState = {
  operationalState: DomainReadiness;
  resourceState: DomainReadiness;
};

export type FinanceMissionRow = {
  missionId: string;
  missionTitle: string;
  countyName: string | null;
  whenLabel: string;
  href: string;
  isFundraising: boolean;
  financeLeadAssigned: boolean;
  costBearingTravel: boolean;
  dual: CommitmentDualState;
  resourceBlockers: string[];
  budgetStatus: UnknownFact;
};

export type FinanceCountyRow = {
  countyName: string;
  slug: string;
  countyOperatingBudget: UnknownFact;
  reimbursementBacklog: UnknownFact;
  outstandingRequests: UnknownFact;
  localFundingReadiness: DomainReadiness;
  resourceRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
};

export type FinanceOperationsHome = {
  title: "FINANCE & RESOURCES OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  budgetRisk: UnknownFact;
  pendingApprovals: UnknownFact;
  criticalPurchases: UnknownFact;
  resourceShortfalls: KnownNumber;
  cashPosition: UnknownFact;
  financialBlockers: KnownNumber;
  missionRows: FinanceMissionRow[];
  countyRows: FinanceCountyRow[];
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    budgetRiskStatus: "unknown";
    pendingApprovalsStatus: "unknown";
    criticalPurchasesStatus: "unknown";
    resourceShortfalls: number;
    cashPositionStatus: "unknown";
    financialBlockers: number;
    fundraisingMissions: number;
    financeLeadGaps: number;
    topBlockers: Array<{ label: string; detail: string; href: string }>;
    briefingLine: string;
  };
  countyFeed: FinanceCountyRow[];
  logisticsFeed: {
    approvedTravelBudget: UnknownFact;
    lodgingAuthorization: UnknownFact;
    supplyPurchasingStatus: UnknownFact;
    fuelReimbursement: UnknownFact;
    rentalApprovals: UnknownFact;
  };
  communicationsFeed: {
    literatureBudget: UnknownFact;
    advertisingApprovals: UnknownFact;
    mediaBuyingStatus: UnknownFact;
    printingAuthorization: UnknownFact;
  };
  volunteerFeed: {
    mileageReimbursement: UnknownFact;
    expenseApprovals: UnknownFact;
    volunteerSupportFunding: UnknownFact;
    mealAllocations: UnknownFact;
  };
  fieldFeed: {
    missions: Array<{
      missionId: string;
      operationalState: DomainReadiness;
      resourceState: DomainReadiness;
    }>;
  };
};

export type FinanceMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  finance: FinancePlanSnapshot | null;
  /** Consumed from Logistics — never re-derived here. */
  operationalState?: DomainReadiness | null;
};

const BUDGET_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Budget allocations are not yet available because their owning money surface has not been implemented.",
};

const APPROVALS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Spending / purchase approvals are Unknown — no approval ledger exists yet.",
};

const PURCHASES_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Critical purchase queue is Unknown — purchase-request surface not implemented.",
};

const CASH_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Cash position is Unknown — Finance & Resources Operations is not a bank feed.",
};

const COUNTY_BUDGET_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "County operating budget is Unknown — no county finance registry yet.",
};

const REIMBURSE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Reimbursement backlog is Unknown — expense/mileage ledger not implemented.",
};

const REQUESTS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Outstanding resource requests are Unknown — request queue not implemented.",
};

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function emptyFinance(): FinancePlanSnapshot {
  return {
    isFundraisingCalendar: false,
    financeLeadAssigned: false,
    complianceLeadAssigned: false,
    rentalRequired: false,
    flightRequired: false,
    lodgingRequired: false,
    overnightStay: false,
    estimatedDistanceMiles: null,
    packingCount: 0,
  };
}

export function hasCostBearingTravel(snap: FinancePlanSnapshot): boolean {
  return (
    snap.rentalRequired ||
    snap.flightRequired ||
    snap.lodgingRequired ||
    snap.overnightStay ||
    (snap.estimatedDistanceMiles != null && snap.estimatedDistanceMiles > 0)
  );
}

/**
 * Resource state owned by Finance. Dollar readiness stays Unknown when
 * cost-bearing activity exists without a money surface.
 */
export function deriveResourceState(snap: FinancePlanSnapshot): DomainReadiness {
  if (snap.isFundraisingCalendar && !snap.financeLeadAssigned) {
    return "BLOCKED";
  }
  if (hasCostBearingTravel(snap) && !snap.financeLeadAssigned) {
    return "NEEDS_ATTENTION";
  }
  if (
    snap.isFundraisingCalendar ||
    hasCostBearingTravel(snap) ||
    snap.packingCount > 0
  ) {
    // Activity exists; budgets/approvals not modeled → Unknown (not Ready)
    return "UNKNOWN";
  }
  return "NOT_REQUIRED";
}

export function buildFinanceMissionRow(
  input: FinanceMissionInput,
): FinanceMissionRow {
  const snap = input.finance ?? emptyFinance();
  const resourceState = deriveResourceState(snap);
  const operationalState = input.operationalState ?? "UNKNOWN";
  const costBearingTravel = hasCostBearingTravel(snap);
  const resourceBlockers: string[] = [];
  if (snap.isFundraisingCalendar && !snap.financeLeadAssigned) {
    resourceBlockers.push("Finance lead unassigned on fundraising mission");
  }
  if (costBearingTravel && !snap.financeLeadAssigned) {
    resourceBlockers.push("Cost-bearing travel without finance lead");
  }
  if (resourceState === "UNKNOWN" && (costBearingTravel || snap.packingCount > 0)) {
    resourceBlockers.push("Budget/approval status Unknown (not Ready)");
  }

  return {
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    countyName: input.countyName,
    whenLabel: input.mission.whenLabel,
    href: `/calendar?event=${input.mission.missionId}`,
    isFundraising: snap.isFundraisingCalendar,
    financeLeadAssigned: snap.financeLeadAssigned,
    costBearingTravel,
    dual: { operationalState, resourceState },
    resourceBlockers,
    budgetStatus: BUDGET_UNKNOWN,
  };
}

function resourceRank(d: DomainReadiness): number {
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

function riskFromResource(d: DomainReadiness): FinanceCountyRow["resourceRisk"] {
  if (d === "BLOCKED") return "CRITICAL";
  if (d === "NEEDS_ATTENTION") return "HIGH";
  if (d === "UNKNOWN") return "WATCH";
  if (d === "READY") return "LOW";
  return "UNKNOWN";
}

function buildCountyRow(
  countyName: string,
  missions: FinanceMissionRow[],
): FinanceCountyRow {
  let worst: DomainReadiness = missions.length === 0 ? "UNKNOWN" : "NOT_REQUIRED";
  for (const m of missions) {
    if (resourceRank(m.dual.resourceState) < resourceRank(worst)) {
      worst = m.dual.resourceState;
    }
  }
  return {
    countyName,
    slug: countySlug(countyName),
    countyOperatingBudget: COUNTY_BUDGET_UNKNOWN,
    reimbursementBacklog: REIMBURSE_UNKNOWN,
    outstandingRequests: REQUESTS_UNKNOWN,
    localFundingReadiness: worst,
    resourceRisk: riskFromResource(worst),
  };
}

export function buildFinanceOperationsHome(input: {
  date: string;
  timezone: string;
  missions: FinanceMissionInput[];
  now?: Date;
}): FinanceOperationsHome {
  const now = input.now ?? new Date();
  const missionRows = input.missions
    .map(buildFinanceMissionRow)
    .sort(
      (a, b) =>
        resourceRank(a.dual.resourceState) - resourceRank(b.dual.resourceState) ||
        a.missionTitle.localeCompare(b.missionTitle),
    );

  const financeLeadGaps = missionRows.filter(
    (m) =>
      (m.isFundraising || m.costBearingTravel) && !m.financeLeadAssigned,
  ).length;
  const financialBlockers = missionRows.filter(
    (m) =>
      m.dual.resourceState === "BLOCKED" ||
      m.dual.resourceState === "NEEDS_ATTENTION",
  ).length;
  const resourceShortfalls = financialBlockers;
  const fundraisingMissions = missionRows.filter((m) => m.isFundraising).length;

  const byCounty = new Map<string, FinanceMissionRow[]>();
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
        resourceRank(a.localFundingReadiness) -
          resourceRank(b.localFundingReadiness) ||
        a.countyName.localeCompare(b.countyName),
    );

  const topBlockers = missionRows
    .filter(
      (m) =>
        m.dual.resourceState === "BLOCKED" ||
        m.dual.resourceState === "NEEDS_ATTENTION",
    )
    .slice(0, 5)
    .map((m) => ({
      label: m.countyName || m.missionTitle,
      detail:
        m.resourceBlockers[0] ??
        `Resource ${m.dual.resourceState} · Ops ${m.dual.operationalState}`,
      href: m.href,
    }));

  const briefingParts: string[] = [];
  if (financialBlockers > 0) {
    briefingParts.push(
      `${financialBlockers} mission${financialBlockers === 1 ? "" : "s"} have resource blockers.`,
    );
  }
  if (financeLeadGaps > 0) {
    briefingParts.push(
      `${financeLeadGaps} cost-bearing mission${financeLeadGaps === 1 ? "" : "s"} missing a finance lead.`,
    );
  }
  if (briefingParts.length === 0) {
    briefingParts.push(
      missionRows.length > 0
        ? "No finance-lead gaps flagged; budget dollars remain Unknown."
        : "No missions today — resource readiness Unknown, not funded.",
    );
  }
  briefingParts.push("Cash position and pending approvals Unknown.");

  return {
    title: "FINANCE & RESOURCES OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    budgetRisk: BUDGET_UNKNOWN,
    pendingApprovals: APPROVALS_UNKNOWN,
    criticalPurchases: PURCHASES_UNKNOWN,
    resourceShortfalls: {
      status: "known",
      value: resourceShortfalls,
      note: "Missions with resource BLOCKED or NEEDS_ATTENTION.",
    },
    cashPosition: CASH_UNKNOWN,
    financialBlockers: {
      status: "known",
      value: financialBlockers,
      note: "Same as resource shortfalls from dual-state analysis.",
    },
    missionRows,
    countyRows,
    unknowns: [
      { fact: "Budget risk / allocations", reason: BUDGET_UNKNOWN.reason },
      { fact: "Pending approvals", reason: APPROVALS_UNKNOWN.reason },
      { fact: "Critical purchases", reason: PURCHASES_UNKNOWN.reason },
      { fact: "Cash position", reason: CASH_UNKNOWN.reason },
      { fact: "County operating budgets", reason: COUNTY_BUDGET_UNKNOWN.reason },
      { fact: "Reimbursement backlog", reason: REIMBURSE_UNKNOWN.reason },
      {
        fact: "Vendor relationships",
        reason:
          "Vendor commitments are Unknown — vendor registry not implemented.",
      },
      {
        fact: "Fundraising goal progress ($)",
        reason:
          "Contribution amounts are Unknown — fundraising calendar presence is not money.",
      },
    ],
    executiveFeed: {
      budgetRiskStatus: "unknown",
      pendingApprovalsStatus: "unknown",
      criticalPurchasesStatus: "unknown",
      resourceShortfalls,
      cashPositionStatus: "unknown",
      financialBlockers,
      fundraisingMissions,
      financeLeadGaps,
      topBlockers,
      briefingLine: briefingParts.join(" "),
    },
    countyFeed: countyRows,
    logisticsFeed: {
      approvedTravelBudget: {
        status: "unknown",
        value: null,
        reason: "Travel budget approvals Unknown — money surface not implemented.",
      },
      lodgingAuthorization: {
        status: "unknown",
        value: null,
        reason: "Lodging authorization Unknown — not a booking ledger.",
      },
      supplyPurchasingStatus: {
        status: "unknown",
        value: null,
        reason: "Supply purchasing status Unknown — purchase requests not modeled.",
      },
      fuelReimbursement: REIMBURSE_UNKNOWN,
      rentalApprovals: {
        status: "unknown",
        value: null,
        reason: "Rental approvals Unknown — rentalRequired is a flag, not an approval.",
      },
    },
    communicationsFeed: {
      literatureBudget: {
        status: "unknown",
        value: null,
        reason: "Literature budget Unknown — packing counts are not spend.",
      },
      advertisingApprovals: APPROVALS_UNKNOWN,
      mediaBuyingStatus: {
        status: "unknown",
        value: null,
        reason: "Media buying status Unknown — no media buy surface yet.",
      },
      printingAuthorization: {
        status: "unknown",
        value: null,
        reason: "Printing authorization Unknown — no print PO surface yet.",
      },
    },
    volunteerFeed: {
      mileageReimbursement: REIMBURSE_UNKNOWN,
      expenseApprovals: APPROVALS_UNKNOWN,
      volunteerSupportFunding: {
        status: "unknown",
        value: null,
        reason: "Volunteer support funding Unknown — no stipend ledger yet.",
      },
      mealAllocations: {
        status: "unknown",
        value: null,
        reason: "Meal allocations Unknown — hospitality spend not modeled.",
      },
    },
    fieldFeed: {
      missions: missionRows.map((m) => ({
        missionId: m.missionId,
        operationalState: m.dual.operationalState,
        resourceState: m.dual.resourceState,
      })),
    },
  };
}

export function financeOperationsForAdvisory(home: FinanceOperationsHome) {
  return {
    date: home.date,
    resourceShortfalls: home.resourceShortfalls,
    financialBlockers: home.financialBlockers,
    budgetRisk: home.budgetRisk,
    cashPosition: home.cashPosition,
    executiveFeed: home.executiveFeed,
    unknowns: home.unknowns,
    dualSample: home.missionRows.slice(0, 6).map((m) => ({
      mission: m.missionTitle,
      operationalState: m.dual.operationalState,
      resourceState: m.dual.resourceState,
    })),
  };
}

export function countyFinanceFact(
  feed: FinanceCountyRow[] | null | undefined,
  countyName: string,
): FinanceCountyRow | null {
  if (!feed) return null;
  const key = countyName.trim().toLowerCase();
  return feed.find((c) => c.countyName.toLowerCase() === key) ?? null;
}
