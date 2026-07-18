import { describe, expect, it } from "vitest";
import { MUTATION_ACTIONS } from "@/server/auth/actions";
import { roleHasFullCalendarAccess, roleMayMutate } from "@/lib/auth/system-roles";

describe("Step 5.6 authorization primitives", () => {
  it("registers required mutation actions", () => {
    expect(MUTATION_ACTIONS).toContain("EVENT_CREATE");
    expect(MUTATION_ACTIONS).toContain("WORKFLOW_APPLY");
    expect(MUTATION_ACTIONS).toContain("RECOMMENDATION_DECIDE");
    expect(MUTATION_ACTIONS).toContain("CONFLICT_OVERRIDE");
  });

  it("keeps leadership administer and read-only non-mutating", () => {
    expect(roleHasFullCalendarAccess("KELLY")).toBe(true);
    expect(roleHasFullCalendarAccess("CAMPAIGN_MANAGER")).toBe(true);
    expect(roleMayMutate("READ_ONLY_ADVISOR")).toBe(false);
    expect(roleMayMutate("VOLUNTEER")).toBe(false);
  });
});
