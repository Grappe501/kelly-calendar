import type { WorkflowDefinition } from "@/features/operational-intelligence/types/workflow-types";

export type MissingInformationItem = {
  fieldPath: string;
  label: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  whyItMatters: string;
  requiredBefore?: string;
  kind: "REQUIRED" | "RECOMMENDED";
};

export function analyzeMissingEventInformation(input: {
  workflow?: WorkflowDefinition | null;
  presentFields: Record<string, unknown>;
}): MissingInformationItem[] {
  const out: MissingInformationItem[] = [];
  for (const req of input.workflow?.requiredInformation ?? []) {
    const value = input.presentFields[req.fieldPath];
    const missing =
      value == null || value === "" || (Array.isArray(value) && value.length === 0);
    if (!missing) continue;
    out.push({
      fieldPath: req.fieldPath,
      label: req.label,
      severity: req.severity,
      whyItMatters: req.whyItMatters,
      requiredBefore: req.requiredBefore,
      kind: "REQUIRED",
    });
  }
  return out;
}
