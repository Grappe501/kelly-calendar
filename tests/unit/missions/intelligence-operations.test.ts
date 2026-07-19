import { describe, expect, it } from "vitest";
import {
  buildEmergingRisks,
  buildOperationalIntelligenceHome,
} from "@/lib/missions/intelligence-operations";

describe("Operational Intelligence (Step 7.10)", () => {
  it("marks every insight as interpretation-only with a canonical source", () => {
    const risks = buildEmergingRisks({
      fieldFeed: {
        teamsNeedingAttention: 2,
        countiesWithoutLeader: 0,
        understaffedMissions: 1,
        blockedMissions: 1,
        topHelpItems: [{ countyLabel: "Benton", detail: "Needs volunteers" }],
        briefingLine: "2 field teams need attention.",
      },
      complianceFeed: {
        complianceRisk: "HIGH",
        upcomingFilingDeadlinesStatus: "unknown",
        requiredActions: 1,
        overdueItems: 1,
        highRiskCommitments: 1,
        campaignComplianceStatus: "BLOCKED",
        complianceLeadGaps: 1,
        topItems: [
          {
            label: "Benton",
            detail: "Overdue compliance action",
            href: "/compliance",
          },
        ],
        briefingLine: "1 overdue compliance item.",
      },
    });

    expect(risks.length).toBeGreaterThan(0);
    for (const r of risks) {
      expect(r.interpretationOnly).toBe(true);
      expect(r.canonicalFact.length).toBeGreaterThan(10);
      expect(["field", "compliance"]).toContain(r.sourceModule);
    }
  });

  it("keeps multi-day trends Unknown and does not invent voter analytics", () => {
    const home = buildOperationalIntelligenceHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      feeds: {
        countyFeed: {
          needsImmediate: 1,
          inactiveNoLeadership: 0,
          readyForExpansion: 2,
          healthy: 10,
          topWeak: [
            {
              countyName: "Pulaski",
              healthScore: 20,
              reason: "No leadership",
              href: "/counties/pulaski",
            },
          ],
          briefingLine: "1 county needs immediate attention.",
        },
      },
    });

    expect(home.historicalTrendDepth.status).toBe("unknown");
    expect(home.countyTrendChanges[0]?.sourceModule).toBe("county");
    expect(home.opportunities.some((o) => o.sourceModule === "county")).toBe(
      true,
    );
    expect(
      home.unknowns.some((u) => u.fact.includes("Polling") || u.fact.includes("electorate")),
    ).toBe(true);
    expect(home.executiveFeed.briefingLine).toMatch(/does not override/i);
  });

  it("produces a mission failure forecast only from canonical blocker sums", () => {
    const home = buildOperationalIntelligenceHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      feeds: {
        fieldFeed: {
          teamsNeedingAttention: 0,
          countiesWithoutLeader: 0,
          understaffedMissions: 0,
          blockedMissions: 2,
          topHelpItems: [],
          briefingLine: "2 blocked.",
        },
        logisticsFeed: {
          travelRisk: "HIGH",
          venueNotReady: 0,
          vehicleStatusUnknown: true,
          materialsAtRisk: 0,
          equipmentIssuesUnknown: true,
          logisticsBlockers: 1,
          topBlockers: [],
          briefingLine: "1 logistics blocker.",
        },
        complianceFeed: {
          complianceRisk: "WATCH",
          upcomingFilingDeadlinesStatus: "unknown",
          requiredActions: 0,
          overdueItems: 0,
          highRiskCommitments: 1,
          campaignComplianceStatus: "NEEDS_ATTENTION",
          complianceLeadGaps: 0,
          topItems: [],
          briefingLine: "1 high-risk commitment.",
        },
      },
    });

    const forecast = home.missionFailureForecasts.find(
      (f) => f.id === "forecast-blockers",
    );
    expect(forecast).toBeTruthy();
    expect(forecast?.canonicalFact).toContain("= 4");
    expect(forecast?.interpretationOnly).toBe(true);
  });
});
