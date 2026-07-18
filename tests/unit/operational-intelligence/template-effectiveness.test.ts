import { describe, expect, it } from "vitest";
import { analyzeTemplateEffectiveness } from "@/features/operational-intelligence/services/template-effectiveness-service";

describe("template effectiveness analyzer", () => {
  it("returns insufficient evidence for small samples", () => {
    const findings = analyzeTemplateEffectiveness({
      workflowId: "wf_festival_appearance",
      workflowVersion: 1,
      observations: [
        {
          itemKind: "packing",
          itemLabel: "Banner",
          suggested: true,
          removedByOperator: true,
        },
      ],
    });
    expect(findings[0]?.verdict).toBe("Insufficient evidence");
  });

  it("recommends Remove when operators routinely drop an item", () => {
    const observations = Array.from({ length: 5 }, () => ({
      itemKind: "packing" as const,
      itemLabel: "Extra tablecloth",
      suggested: true,
      removedByOperator: true,
    }));
    const findings = analyzeTemplateEffectiveness({
      workflowId: "wf_festival_appearance",
      workflowVersion: 1,
      observations,
    });
    expect(findings[0]?.verdict).toBe("Remove");
  });
});
