import { describe, expect, it } from "vitest";
import {
  assignmentGrantsAccess,
  assistantMaySeeFinanceRestrictedDetail,
  boardsForPermissionsProfile,
  maturityFromEventAttendanceAlone,
} from "@/lib/organization/access";
import { prioritizeTop } from "@/lib/volunteers/priority";
import {
  ORG_TEMPLATE_VERSION,
  ORG_V11_POSITIONS,
} from "@/lib/organization/template";

describe("IC-02D volunteer ops foundations", () => {
  it("template is 1.1.0 with ACM and logistics lead", () => {
    expect(ORG_TEMPLATE_VERSION).toBe("1.1.0");
    expect(ORG_V11_POSITIONS.map((p) => p.key)).toEqual(
      expect.arrayContaining([
        "ASSISTANT_CAMPAIGN_MANAGER",
        "CAMPAIGN_LOGISTICS_LEAD",
      ]),
    );
    const logistics = ORG_V11_POSITIONS.find(
      (p) => p.key === "CAMPAIGN_LOGISTICS_LEAD",
    );
    expect(logistics?.reportsToPositionKey).toBe("CAMPAIGN_MANAGER");
  });

  it("ACM boards exclude finance restricted detail privilege", () => {
    const boards = boardsForPermissionsProfile("ASSISTANT_CAMPAIGN_MANAGER");
    expect(boards).toContain("assistant_campaign_manager");
    expect(boards).toContain("campaign_logistics");
    expect(assistantMaySeeFinanceRestrictedDetail("ASSISTANT_CAMPAIGN_MANAGER")).toBe(
      false,
    );
  });

  it("priority service returns at most five explainable items", () => {
    const top = prioritizeTop(
      Array.from({ length: 12 }, (_, i) => ({
        id: `t${i}`,
        title: `Task ${i}`,
        criticalRoleUnfilled: i < 3,
        sourceHref: "/system/volunteers",
      })),
      5,
    );
    expect(top).toHaveLength(5);
    expect(top[0].reasons.length).toBeGreaterThan(0);
  });

  it("proposed org assignment still grants no access", () => {
    expect(assignmentGrantsAccess("PROPOSED")).toBe(false);
  });

  it("event alone does not advance county maturity", () => {
    expect(maturityFromEventAttendanceAlone()).toBe("UNCONTACTED");
  });
});
