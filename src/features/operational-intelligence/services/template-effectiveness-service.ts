/**
 * Compares workflow defaults to reviewed outcomes.
 * Never auto-rewrites system workflows — admin recommendations only.
 */

export type TemplateEffectivenessVerdict =
  | "Keep"
  | "Modify"
  | "Remove"
  | "Investigate"
  | "Insufficient evidence";

export type TemplateEffectivenessFinding = {
  workflowId: string;
  workflowVersion: number;
  itemKind: "packing" | "staffing" | "action" | "program_flow";
  itemLabel: string;
  timesSuggested: number;
  timesRemoved: number;
  timesAddedExtra: number;
  timesUnassigned?: number;
  timesMissedDeadline?: number;
  verdict: TemplateEffectivenessVerdict;
  explanation: string;
};

export function analyzeTemplateEffectiveness(input: {
  workflowId: string;
  workflowVersion: number;
  observations: Array<{
    itemKind: TemplateEffectivenessFinding["itemKind"];
    itemLabel: string;
    suggested: boolean;
    removedByOperator?: boolean;
    addedByOperator?: boolean;
    leftUnassigned?: boolean;
    deadlineMissed?: boolean;
  }>;
}): TemplateEffectivenessFinding[] {
  const groups = new Map<string, typeof input.observations>();
  for (const obs of input.observations) {
    const key = `${obs.itemKind}:${obs.itemLabel}`;
    const list = groups.get(key) ?? [];
    list.push(obs);
    groups.set(key, list);
  }

  const findings: TemplateEffectivenessFinding[] = [];
  for (const [key, list] of groups) {
    const [itemKind, itemLabel] = key.split(":") as [
      TemplateEffectivenessFinding["itemKind"],
      string,
    ];
    const timesSuggested = list.filter((o) => o.suggested).length;
    const timesRemoved = list.filter((o) => o.removedByOperator).length;
    const timesAddedExtra = list.filter((o) => o.addedByOperator).length;
    const timesUnassigned = list.filter((o) => o.leftUnassigned).length;
    const timesMissedDeadline = list.filter((o) => o.deadlineMissed).length;

    let verdict: TemplateEffectivenessVerdict = "Insufficient evidence";
    if (timesSuggested + timesAddedExtra < 3) {
      verdict = "Insufficient evidence";
    } else if (timesRemoved / Math.max(1, timesSuggested) >= 0.6) {
      verdict = "Remove";
    } else if (timesAddedExtra >= 3 || timesMissedDeadline >= 3) {
      verdict = "Modify";
    } else if (timesUnassigned / Math.max(1, timesSuggested) >= 0.5) {
      verdict = "Investigate";
    } else {
      verdict = "Keep";
    }

    findings.push({
      workflowId: input.workflowId,
      workflowVersion: input.workflowVersion,
      itemKind,
      itemLabel,
      timesSuggested,
      timesRemoved,
      timesAddedExtra,
      timesUnassigned,
      timesMissedDeadline,
      verdict,
      explanation: `Based on ${list.length} reviewed observation(s); administrator review required before changing system workflows.`,
    });
  }
  return findings;
}
