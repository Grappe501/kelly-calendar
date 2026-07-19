/**
 * Step 7.10 — Operational Intelligence (pure interpretation).
 * Answers: What patterns, risks, and opportunities are emerging across the campaign?
 *
 * Owns NO primary operational facts. Consumes Field, County, Volunteer,
 * Communications, Logistics, Finance, and Compliance executive feeds only.
 *
 * Doctrine: Operational Intelligence may interpret canonical facts, but it
 * never replaces or overrides them.
 */

import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { ConstituentOperationsHome } from "@/lib/missions/constituent-operations";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import type { LogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { UnknownFact, KnownNumber } from "@/lib/missions/volunteer-operations";

export type IntelligenceSourceModule =
  | "field"
  | "county"
  | "volunteer"
  | "communications"
  | "logistics"
  | "finance"
  | "compliance"
  | "constituent"
  | "calendar";

export type IntelligenceCategory =
  | "EMERGING_RISK"
  | "COUNTY_TREND"
  | "VOLUNTEER_PRESSURE"
  | "COMMS_DRIFT"
  | "MISSION_FORECAST"
  | "RESOURCE_PRESSURE"
  | "COMPLIANCE_HOTSPOT"
  | "RELATIONSHIP_PRESSURE"
  | "OPPORTUNITY";

export type IntelligenceSeverity =
  | "CRITICAL"
  | "HIGH"
  | "WATCH"
  | "LOW"
  | "UNKNOWN";

/** Interpretable signal — always traces to a canonical owner. */
export type IntelligenceInsight = {
  id: string;
  category: IntelligenceCategory;
  title: string;
  detail: string;
  severity: IntelligenceSeverity;
  href: string | null;
  sourceModule: IntelligenceSourceModule;
  /** Exact canonical fact being interpreted — never overridden. */
  canonicalFact: string;
  interpretationOnly: true;
};

export type OperationalIntelligenceHome = {
  title: "OPERATIONAL INTELLIGENCE";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  emergingRisks: IntelligenceInsight[];
  countyTrendChanges: IntelligenceInsight[];
  volunteerBurnoutSignals: IntelligenceInsight[];
  communicationsDrift: IntelligenceInsight[];
  missionFailureForecasts: IntelligenceInsight[];
  resourcePressure: IntelligenceInsight[];
  complianceHotspots: IntelligenceInsight[];
  relationshipPressure: IntelligenceInsight[];
  opportunities: IntelligenceInsight[];
  /** Multi-day / longitudinal analytics not yet available. */
  historicalTrendDepth: UnknownFact;
  insightCounts: {
    critical: KnownNumber;
    high: KnownNumber;
    watch: KnownNumber;
    total: KnownNumber;
  };
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    emergingRiskCount: number;
    countyTrendSignalCount: number;
    volunteerPressureCount: number;
    communicationsDriftCount: number;
    missionFailureForecastCount: number;
    resourcePressureCount: number;
    complianceHotspotCount: number;
    relationshipPressureCount: number;
    opportunityCount: number;
    topInsights: Array<{
      label: string;
      detail: string;
      href: string | null;
      sourceModule: IntelligenceSourceModule;
    }>;
    briefingLine: string;
  };
};

export type IntelligenceFeedInput = {
  fieldFeed?: FieldOperationsHome["executiveFeed"] | null;
  countyFeed?: CountyOperationsHome["executiveFeed"] | null;
  volunteerFeed?: VolunteerOperationsHome["executiveFeed"] | null;
  communicationsFeed?: CommunicationsOperationsHome["executiveFeed"] | null;
  logisticsFeed?: LogisticsOperationsHome["executiveFeed"] | null;
  financeFeed?: FinanceOperationsHome["executiveFeed"] | null;
  complianceFeed?: ComplianceOperationsHome["executiveFeed"] | null;
  constituentFeed?: ConstituentOperationsHome["executiveFeed"] | null;
};

const HISTORY_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Multi-day trend depth is Unknown — Operational Intelligence interprets today’s canonical feeds, not a longitudinal warehouse.",
};

const BURNOUT_UNKNOWN_REASON =
  "Volunteer burnout as a person-level signal is Unknown — Volunteer Operations owns capacity fill, not wellness scores.";

function severityRank(s: IntelligenceSeverity): number {
  return s === "CRITICAL"
    ? 0
    : s === "HIGH"
      ? 1
      : s === "WATCH"
        ? 2
        : s === "UNKNOWN"
          ? 3
          : 4;
}

function insight(
  partial: Omit<IntelligenceInsight, "interpretationOnly">,
): IntelligenceInsight {
  return { ...partial, interpretationOnly: true };
}

export function buildEmergingRisks(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const out: IntelligenceInsight[] = [];
  const field = feeds.fieldFeed;
  if (field && field.teamsNeedingAttention > 0) {
    out.push(
      insight({
        id: "risk-field-help",
        category: "EMERGING_RISK",
        title: "Field help pressure",
        detail: field.briefingLine,
        severity: field.blockedMissions > 0 ? "CRITICAL" : "HIGH",
        href: "/field",
        sourceModule: "field",
        canonicalFact: `Field Operations: teamsNeedingAttention=${field.teamsNeedingAttention}, blockedMissions=${field.blockedMissions}`,
      }),
    );
  }
  const logistics = feeds.logisticsFeed;
  if (
    logistics &&
    (logistics.logisticsBlockers > 0 ||
      logistics.travelRisk === "CRITICAL" ||
      logistics.travelRisk === "HIGH")
  ) {
    out.push(
      insight({
        id: "risk-logistics",
        category: "EMERGING_RISK",
        title: "Execute-ability at risk",
        detail: logistics.briefingLine,
        severity:
          logistics.travelRisk === "CRITICAL" || logistics.logisticsBlockers > 2
            ? "CRITICAL"
            : "HIGH",
        href: "/logistics",
        sourceModule: "logistics",
        canonicalFact: `Logistics Operations: logisticsBlockers=${logistics.logisticsBlockers}, travelRisk=${logistics.travelRisk}`,
      }),
    );
  }
  const finance = feeds.financeFeed;
  if (finance && finance.financialBlockers > 0) {
    out.push(
      insight({
        id: "risk-finance",
        category: "EMERGING_RISK",
        title: "Resource blockers threaten sustainment",
        detail: finance.briefingLine,
        severity: finance.financialBlockers > 2 ? "CRITICAL" : "HIGH",
        href: "/finance",
        sourceModule: "finance",
        canonicalFact: `Finance & Resources: financialBlockers=${finance.financialBlockers}`,
      }),
    );
  }
  const compliance = feeds.complianceFeed;
  if (
    compliance &&
    (compliance.overdueItems > 0 || compliance.highRiskCommitments > 0)
  ) {
    out.push(
      insight({
        id: "risk-compliance",
        category: "EMERGING_RISK",
        title: "Compliance readiness threatening execution",
        detail: compliance.briefingLine,
        severity:
          compliance.complianceRisk === "CRITICAL" || compliance.overdueItems > 0
            ? "CRITICAL"
            : "HIGH",
        href: "/compliance",
        sourceModule: "compliance",
        canonicalFact: `Compliance Operations: overdueItems=${compliance.overdueItems}, highRiskCommitments=${compliance.highRiskCommitments}, complianceRisk=${compliance.complianceRisk}`,
      }),
    );
  }
  return out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

export function buildCountyTrendSignals(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const county = feeds.countyFeed;
  if (!county) return [];
  const out: IntelligenceInsight[] = [];
  if (county.needsImmediate > 0) {
    const top = county.topWeak[0];
    out.push(
      insight({
        id: "county-immediate",
        category: "COUNTY_TREND",
        title: "Counties needing immediate attention",
        detail: top
          ? `${top.countyName}: ${top.reason}`
          : county.briefingLine,
        severity: "CRITICAL",
        href: top?.href ?? "/counties",
        sourceModule: "county",
        canonicalFact: `County Operations: needsImmediate=${county.needsImmediate} (today’s weakness signal — not a multi-day trend)`,
      }),
    );
  }
  if (county.inactiveNoLeadership > 0) {
    out.push(
      insight({
        id: "county-inactive",
        category: "COUNTY_TREND",
        title: "Inactive / no-leadership counties",
        detail: `${county.inactiveNoLeadership} count${county.inactiveNoLeadership === 1 ? "y" : "ies"} flagged inactive or without leadership today.`,
        severity: "HIGH",
        href: "/counties",
        sourceModule: "county",
        canonicalFact: `County Operations: inactiveNoLeadership=${county.inactiveNoLeadership}`,
      }),
    );
  }
  if (county.readyForExpansion > 0) {
    out.push(
      insight({
        id: "county-expansion",
        category: "OPPORTUNITY",
        title: "Counties ready for expansion",
        detail: `${county.readyForExpansion} count${county.readyForExpansion === 1 ? "y" : "ies"} scored ready for expansion by County Operations.`,
        severity: "LOW",
        href: "/counties",
        sourceModule: "county",
        canonicalFact: `County Operations: readyForExpansion=${county.readyForExpansion}`,
      }),
    );
  }
  return out;
}

export function buildVolunteerPressureSignals(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const vol = feeds.volunteerFeed;
  if (!vol) return [];
  const out: IntelligenceInsight[] = [];
  if (vol.criticalVacancies > 0) {
    const top = vol.topVacancies[0];
    out.push(
      insight({
        id: "vol-vacancies",
        category: "VOLUNTEER_PRESSURE",
        title: "Staffing vacancies pressure capacity",
        detail: top ? top.detail : vol.briefingLine,
        severity: vol.criticalVacancies > 2 ? "CRITICAL" : "HIGH",
        href: top?.href ?? "/volunteers",
        sourceModule: "volunteer",
        canonicalFact: `Volunteer Operations: criticalVacancies=${vol.criticalVacancies}, openPositions=${vol.openPositions}`,
      }),
    );
  }
  if (vol.unassignedTrainedCanvassersStatus === "unknown") {
    out.push(
      insight({
        id: "vol-burnout-unknown",
        category: "VOLUNTEER_PRESSURE",
        title: "Burnout / bench wellness Unknown",
        detail: BURNOUT_UNKNOWN_REASON,
        severity: "UNKNOWN",
        href: "/volunteers",
        sourceModule: "volunteer",
        canonicalFact:
          "Volunteer Operations: unassignedTrainedCanvassersStatus=unknown; burnout not owned",
      }),
    );
  }
  return out;
}

export function buildCommunicationsDriftSignals(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const comms = feeds.communicationsFeed;
  if (!comms) return [];
  const out: IntelligenceInsight[] = [];
  if (
    comms.messagingRisk === "CRITICAL" ||
    comms.messagingRisk === "HIGH" ||
    comms.rapidResponseNeeded > 0 ||
    comms.pressDeadlinesAtRisk > 0
  ) {
    const top = comms.topItems[0];
    out.push(
      insight({
        id: "comms-risk",
        category: "COMMS_DRIFT",
        title: "Communications plan risk / drift pressure",
        detail: top ? top.detail : comms.briefingLine,
        severity:
          comms.messagingRisk === "CRITICAL" || comms.rapidResponseNeeded > 0
            ? "CRITICAL"
            : "HIGH",
        href: top?.href ?? "/communications",
        sourceModule: "communications",
        canonicalFact: `Communications Operations: messagingRisk=${comms.messagingRisk}, rapidResponseNeeded=${comms.rapidResponseNeeded}, pressDeadlinesAtRisk=${comms.pressDeadlinesAtRisk}`,
      }),
    );
  }
  if (comms.todaysMessageStatus === "unknown") {
    out.push(
      insight({
        id: "comms-message-unknown",
        category: "COMMS_DRIFT",
        title: "Unified daily message Unknown",
        detail:
          "Today’s unified campaign message remains Unknown — Communications owns plan readiness, not a daily message package yet.",
        severity: "WATCH",
        href: "/communications",
        sourceModule: "communications",
        canonicalFact: "Communications Operations: todaysMessageStatus=unknown",
      }),
    );
  }
  return out;
}

export function buildMissionFailureForecasts(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const out: IntelligenceInsight[] = [];
  const field = feeds.fieldFeed;
  const logistics = feeds.logisticsFeed;
  const compliance = feeds.complianceFeed;
  const blocked =
    (field?.blockedMissions ?? 0) +
    (logistics?.logisticsBlockers ?? 0) +
    (compliance?.highRiskCommitments ?? 0);
  if (blocked > 0) {
    out.push(
      insight({
        id: "forecast-blockers",
        category: "MISSION_FORECAST",
        title: "Mission failure pressure elevated today",
        detail: `Interpreted from canonical blockers: Field blocked=${field?.blockedMissions ?? 0}, Logistics blockers=${logistics?.logisticsBlockers ?? 0}, Compliance high-risk=${compliance?.highRiskCommitments ?? 0}. Forecast only — ownership stays with those modules.`,
        severity: blocked > 3 ? "CRITICAL" : "HIGH",
        href: "/command",
        sourceModule: "field",
        canonicalFact: `Cross-feed sum of Field.blockedMissions + Logistics.logisticsBlockers + Compliance.highRiskCommitments = ${blocked}`,
      }),
    );
  }
  if (logistics?.vehicleStatusUnknown) {
    out.push(
      insight({
        id: "forecast-vehicle-unknown",
        category: "MISSION_FORECAST",
        title: "Fleet Unknown limits failure forecasting",
        detail:
          "Vehicle fleet status is Unknown in Logistics — failure forecasts cannot assume transport availability.",
        severity: "WATCH",
        href: "/logistics",
        sourceModule: "logistics",
        canonicalFact: "Logistics Operations: vehicleStatusUnknown=true",
      }),
    );
  }
  return out;
}

export function buildResourcePressureSignals(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const finance = feeds.financeFeed;
  if (!finance) return [];
  const out: IntelligenceInsight[] = [];
  if (finance.resourceShortfalls > 0 || finance.financeLeadGaps > 0) {
    const top = finance.topBlockers[0];
    out.push(
      insight({
        id: "resource-pressure",
        category: "RESOURCE_PRESSURE",
        title: "Resource pressure on sustainment",
        detail: top ? top.detail : finance.briefingLine,
        severity: finance.financialBlockers > 0 ? "HIGH" : "WATCH",
        href: top?.href ?? "/finance",
        sourceModule: "finance",
        canonicalFact: `Finance & Resources: resourceShortfalls=${finance.resourceShortfalls}, financeLeadGaps=${finance.financeLeadGaps}, cashPositionStatus=${finance.cashPositionStatus}`,
      }),
    );
  }
  if (finance.cashPositionStatus === "unknown") {
    out.push(
      insight({
        id: "resource-cash-unknown",
        category: "RESOURCE_PRESSURE",
        title: "Cash position Unknown",
        detail:
          "Cash position remains Unknown — Intelligence will not invent liquidity.",
        severity: "UNKNOWN",
        href: "/finance",
        sourceModule: "finance",
        canonicalFact: "Finance & Resources: cashPositionStatus=unknown",
      }),
    );
  }
  return out;
}

export function buildRelationshipPressureSignals(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const cst = feeds.constituentFeed;
  if (!cst) return [];
  const out: IntelligenceInsight[] = [];
  if (cst.overdueFollowups > 0 || cst.highPriorityFollowups > 0) {
    const top = cst.topFollowups[0];
    out.push(
      insight({
        id: "relationship-followups",
        category: "RELATIONSHIP_PRESSURE",
        title: "Relationship follow-up pressure",
        detail: top ? top.detail : cst.briefingLine,
        severity:
          cst.relationshipRisk === "CRITICAL" || cst.overdueFollowups > 0
            ? "CRITICAL"
            : "HIGH",
        href: top?.href ?? "/constituents",
        sourceModule: "constituent",
        canonicalFact: `Voter & Constituent Operations: overdueFollowups=${cst.overdueFollowups}, highPriorityFollowups=${cst.highPriorityFollowups}, relationshipRisk=${cst.relationshipRisk}`,
      }),
    );
  }
  if (cst.targetConstituenciesStatus === "unknown") {
    out.push(
      insight({
        id: "relationship-targets-unknown",
        category: "RELATIONSHIP_PRESSURE",
        title: "Target constituencies Unknown",
        detail:
          "Target constituencies remain Unknown — Intelligence will not invent audience segments.",
        severity: "UNKNOWN",
        href: "/constituents",
        sourceModule: "constituent",
        canonicalFact:
          "Voter & Constituent Operations: targetConstituenciesStatus=unknown",
      }),
    );
  }
  return out;
}

export function buildComplianceHotspots(
  feeds: IntelligenceFeedInput,
): IntelligenceInsight[] {
  const compliance = feeds.complianceFeed;
  if (!compliance) return [];
  const out: IntelligenceInsight[] = [];
  if (compliance.highRiskCommitments > 0 || compliance.overdueItems > 0) {
    const top = compliance.topItems[0];
    out.push(
      insight({
        id: "compliance-hotspot",
        category: "COMPLIANCE_HOTSPOT",
        title: "Compliance hotspot",
        detail: top ? top.detail : compliance.briefingLine,
        severity:
          compliance.complianceRisk === "CRITICAL" ? "CRITICAL" : "HIGH",
        href: top?.href ?? "/compliance",
        sourceModule: "compliance",
        canonicalFact: `Compliance Operations: campaignComplianceStatus=${compliance.campaignComplianceStatus}, overdueItems=${compliance.overdueItems}`,
      }),
    );
  }
  if (compliance.upcomingFilingDeadlinesStatus === "unknown") {
    out.push(
      insight({
        id: "compliance-filings-unknown",
        category: "COMPLIANCE_HOTSPOT",
        title: "Filing deadlines Unknown",
        detail:
          "Upcoming filing deadlines remain Unknown — Intelligence does not invent calendar filings.",
        severity: "UNKNOWN",
        href: "/compliance",
        sourceModule: "compliance",
        canonicalFact:
          "Compliance Operations: upcomingFilingDeadlinesStatus=unknown",
      }),
    );
  }
  return out;
}

export function buildOperationalIntelligenceHome(input: {
  date: string;
  timezone: string;
  feeds: IntelligenceFeedInput;
  now?: Date;
}): OperationalIntelligenceHome {
  const now = input.now ?? new Date();
  const emergingRisks = buildEmergingRisks(input.feeds);
  const countySignals = buildCountyTrendSignals(input.feeds);
  const countyTrendChanges = countySignals.filter(
    (i) => i.category === "COUNTY_TREND",
  );
  const opportunities = [
    ...countySignals.filter((i) => i.category === "OPPORTUNITY"),
  ];
  const volunteerBurnoutSignals = buildVolunteerPressureSignals(input.feeds);
  const communicationsDrift = buildCommunicationsDriftSignals(input.feeds);
  const missionFailureForecasts = buildMissionFailureForecasts(input.feeds);
  const resourcePressure = buildResourcePressureSignals(input.feeds);
  const complianceHotspots = buildComplianceHotspots(input.feeds);
  const relationshipPressure = buildRelationshipPressureSignals(input.feeds);

  const all = [
    ...emergingRisks,
    ...countyTrendChanges,
    ...volunteerBurnoutSignals,
    ...communicationsDrift,
    ...missionFailureForecasts,
    ...resourcePressure,
    ...complianceHotspots,
    ...relationshipPressure,
    ...opportunities,
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const critical = all.filter((i) => i.severity === "CRITICAL").length;
  const high = all.filter((i) => i.severity === "HIGH").length;
  const watch = all.filter((i) => i.severity === "WATCH").length;

  const topInsights = all
    .filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH")
    .slice(0, 6)
    .map((i) => ({
      label: i.title,
      detail: i.detail,
      href: i.href,
      sourceModule: i.sourceModule,
    }));

  const briefingParts: string[] = [];
  if (critical + high > 0) {
    briefingParts.push(
      `${critical + high} high-priority insight${critical + high === 1 ? "" : "s"} from canonical domain feeds.`,
    );
  }
  if (emergingRisks.length > 0) {
    briefingParts.push(`${emergingRisks.length} emerging risk signal(s).`);
  }
  if (opportunities.length > 0) {
    briefingParts.push(`${opportunities.length} expansion opportunity signal(s).`);
  }
  if (briefingParts.length === 0) {
    briefingParts.push(
      "No high-severity cross-domain signals interpreted from today’s permissioned feeds.",
    );
  }
  briefingParts.push(
    "Intelligence interprets only — it does not override Field, County, Volunteer, Communications, Logistics, Finance, or Compliance.",
  );

  return {
    title: "OPERATIONAL INTELLIGENCE",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    emergingRisks,
    countyTrendChanges,
    volunteerBurnoutSignals,
    communicationsDrift,
    missionFailureForecasts,
    resourcePressure,
    complianceHotspots,
    relationshipPressure,
    opportunities,
    historicalTrendDepth: HISTORY_UNKNOWN,
    insightCounts: {
      critical: {
        status: "known",
        value: critical,
        note: "Insights at CRITICAL severity from today’s feeds.",
      },
      high: {
        status: "known",
        value: high,
        note: "Insights at HIGH severity from today’s feeds.",
      },
      watch: {
        status: "known",
        value: watch,
        note: "Insights at WATCH severity from today’s feeds.",
      },
      total: {
        status: "known",
        value: all.length,
        note: "All interpreted insights including Unknown severity markers.",
      },
    },
    unknowns: [
      { fact: "Multi-day trend depth", reason: HISTORY_UNKNOWN.reason },
      {
        fact: "Volunteer burnout scores",
        reason: BURNOUT_UNKNOWN_REASON,
      },
      {
        fact: "Predictive ML failure probability",
        reason:
          "Mission failure forecasts are deterministic cross-feed heuristics, not trained model probabilities.",
      },
      {
        fact: "Polling / electorate analytics",
        reason:
          "Voter & Constituent Operations is not yet implemented — electorate patterns remain Unknown.",
      },
    ],
    executiveFeed: {
      emergingRiskCount: emergingRisks.length,
      countyTrendSignalCount: countyTrendChanges.length,
      volunteerPressureCount: volunteerBurnoutSignals.length,
      communicationsDriftCount: communicationsDrift.length,
      missionFailureForecastCount: missionFailureForecasts.length,
      resourcePressureCount: resourcePressure.length,
      complianceHotspotCount: complianceHotspots.length,
      relationshipPressureCount: relationshipPressure.length,
      opportunityCount: opportunities.length,
      topInsights,
      briefingLine: briefingParts.join(" "),
    },
  };
}

export function intelligenceOperationsForAdvisory(
  home: OperationalIntelligenceHome,
) {
  return {
    date: home.date,
    insightCounts: home.insightCounts,
    executiveFeed: home.executiveFeed,
    topInsights: home.executiveFeed.topInsights,
    unknowns: home.unknowns,
    doctrine:
      "Interpret only — never override Field/County/Volunteer/Comms/Logistics/Finance/Compliance canonical facts.",
  };
}
