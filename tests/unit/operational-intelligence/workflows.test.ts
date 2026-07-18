import { describe, expect, it } from "vitest";
import {
  listWorkflows,
  recommendWorkflowForEvent,
  evaluateApplicability,
  getWorkflowBySlug,
} from "@/features/operational-intelligence/workflow-definitions/registry";
import { previewWorkflowExpansion } from "@/features/operational-intelligence/services/workflow-expansion-service";

describe("workflow registry", () => {
  it("loads versioned system workflows", () => {
    const workflows = listWorkflows();
    expect(workflows.length).toBeGreaterThanOrEqual(20);
    expect(workflows.every((w) => w.version >= 1)).toBe(true);
    expect(getWorkflowBySlug("festival-appearance")).toBeTruthy();
    expect(getWorkflowBySlug("fundraiser")).toBeTruthy();
    expect(getWorkflowBySlug("debate")).toBeTruthy();
    expect(getWorkflowBySlug("protected-personal-time")).toBeTruthy();
  });

  it("recommends applicable workflow and rejects inapplicable", () => {
    const festival = recommendWorkflowForEvent({ eventType: "Festival Appearance" });
    expect(festival?.slug).toBe("festival-appearance");
    const applicability = evaluateApplicability(festival!, {
      eventType: "Festival Appearance",
    });
    expect(applicability.applicable).toBe(true);
    const bad = evaluateApplicability(festival!, { eventType: "Debate" });
    expect(bad.applicable).toBe(false);
  });

  it("preview does not mutate and detects duplicates", () => {
    const workflow = getWorkflowBySlug("festival-appearance")!;
    const preview = previewWorkflowExpansion({
      eventId: "evt_1",
      eventVersion: 1,
      workflowId: workflow.id,
      eventType: "Festival Appearance",
      existing: { packingItemNames: ["Campaign tent"] },
    });
    expect(preview.requiresHumanApproval).toBe(true);
    expect(preview.duplicates.some((d) => d.label === "Campaign tent")).toBe(true);
    expect(preview.additions.packingItems.some((p) => p.itemName === "Campaign tent")).toBe(
      false,
    );
  });
});
