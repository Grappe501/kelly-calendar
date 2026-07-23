import { describe, expect, it } from "vitest";
import {
  assignmentGrantsAccess,
  boardsForPermissionsProfile,
  financeBoardRequiresRestrictedProfile,
  maturityFromEventAttendanceAlone,
  volunteerMaySeeSensitiveBoard,
} from "@/lib/organization/access";
import {
  ORG_DEPARTMENTS,
  ORG_TEMPLATE_VERSION,
  TOP_OPERATING_DEPARTMENT_KEYS,
} from "@/lib/organization/template";

describe("IC-02C organization access", () => {
  it("PROPOSED does not grant access", () => {
    expect(assignmentGrantsAccess("PROPOSED")).toBe(false);
    expect(assignmentGrantsAccess("ACTIVE")).toBe(true);
    expect(assignmentGrantsAccess("INTERIM")).toBe(true);
    expect(assignmentGrantsAccess("ENDED")).toBe(false);
  });

  it("volunteer cannot see finance", () => {
    expect(volunteerMaySeeSensitiveBoard("finance")).toBe(false);
    expect(volunteerMaySeeSensitiveBoard("volunteer")).toBe(true);
  });

  it("finance requires restricted profiles", () => {
    expect(financeBoardRequiresRestrictedProfile("VOLUNTEER")).toBe(false);
    expect(financeBoardRequiresRestrictedProfile("FINANCE_MANAGER")).toBe(true);
    expect(financeBoardRequiresRestrictedProfile("CAMPAIGN_MANAGER")).toBe(true);
  });

  it("department manager boards include realm", () => {
    const boards = boardsForPermissionsProfile(
      "DEPARTMENT_MANAGER",
      "COMMUNICATIONS",
    );
    expect(boards).toContain("communications");
  });

  it("event attendance alone does not advance maturity", () => {
    expect(maturityFromEventAttendanceAlone()).toBe("UNCONTACTED");
  });

  it("template has four top operating departments", () => {
    expect(TOP_OPERATING_DEPARTMENT_KEYS).toHaveLength(4);
    expect(ORG_TEMPLATE_VERSION).toBe("1.1.0");
    expect(ORG_DEPARTMENTS.map((d) => d.key)).toEqual(
      expect.arrayContaining([...TOP_OPERATING_DEPARTMENT_KEYS]),
    );
  });
});
