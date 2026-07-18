import { WORKFLOW_DEFINITIONS } from "./definitions";
import type { WorkflowDefinition } from "@/features/operational-intelligence/types/workflow-types";

export function listWorkflows(): WorkflowDefinition[] {
  return WORKFLOW_DEFINITIONS.filter((w) => w.isActive);
}

export function getWorkflowById(id: string): WorkflowDefinition | undefined {
  return listWorkflows().find((w) => w.id === id);
}

export function getWorkflowBySlug(slug: string): WorkflowDefinition | undefined {
  return listWorkflows().find((w) => w.slug === slug);
}

export function recommendWorkflowForEvent(input: {
  eventType?: string | null;
  calendarType?: string | null;
}): WorkflowDefinition | undefined {
  const type = input.eventType?.trim();
  if (!type) return undefined;
  return listWorkflows().find((w) =>
    w.supportedEventTypes.some((t) => t.toLowerCase() === type.toLowerCase()),
  );
}

export function evaluateApplicability(
  workflow: WorkflowDefinition,
  event: { eventType?: string | null; calendarType?: string | null },
): { applicable: boolean; confidence: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let hits = 0;
  for (const rule of workflow.applicabilityRules) {
    const value =
      rule.field === "eventType"
        ? event.eventType
        : rule.field === "calendarType"
          ? event.calendarType
          : undefined;
    if (value == null) {
      warnings.push(`Missing field for applicability: ${rule.field}`);
      continue;
    }
    const ok =
      rule.op === "eq"
        ? value === rule.value
        : rule.op === "neq"
          ? value !== rule.value
          : Array.isArray(rule.value)
            ? rule.value.map(String).includes(String(value))
            : false;
    if (ok) {
      hits += 1;
      reasons.push(`Matched ${rule.field}=${value}`);
    }
  }
  const applicable = hits > 0;
  return {
    applicable,
    confidence: applicable ? Math.min(1, 0.5 + hits * 0.2) : 0,
    reasons,
    warnings,
  };
}
