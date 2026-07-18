import {
  evaluateApplicability,
  getWorkflowById,
} from "@/features/operational-intelligence/workflow-definitions/registry";
import type { WorkflowExpansionPreview } from "@/features/operational-intelligence/types/workflow-types";

export type ExistingPlan = {
  objectiveTitles?: string[];
  packingItemNames?: string[];
  staffingRoleTypes?: string[];
  actionTitles?: string[];
  communicationsKeys?: string[];
};

/**
 * Preview-only expansion. Live apply is `expandWorkflowForEvent` (auth + transaction).
 */
export function previewWorkflowExpansion(input: {
  eventId: string;
  eventVersion: number;
  eventType?: string | null;
  calendarType?: string | null;
  workflowId: string;
  existing?: ExistingPlan;
}): WorkflowExpansionPreview {
  const workflow = getWorkflowById(input.workflowId);
  if (!workflow) {
    return {
      eventId: input.eventId,
      eventVersion: input.eventVersion,
      workflow: { id: input.workflowId, name: "Unknown", version: 0 },
      applicability: {
        applicable: false,
        confidence: 0,
        reasons: [],
        warnings: ["Workflow not found"],
      },
      additions: {
        objectives: [],
        programFlow: [],
        packingItems: [],
        staffingRoles: [],
        actionItems: [],
        communicationsItems: [],
        travelRequirements: [],
      },
      duplicates: [],
      conflicts: [],
      missingInformation: [],
      requiresHumanApproval: true,
    };
  }

  const applicability = evaluateApplicability(workflow, {
    eventType: input.eventType,
    calendarType: input.calendarType,
  });

  const existingPack = new Set(
    (input.existing?.packingItemNames ?? []).map((s) => s.toLowerCase()),
  );
  const existingRoles = new Set(
    (input.existing?.staffingRoleTypes ?? []).map((s) => s.toLowerCase()),
  );
  const existingActions = new Set(
    (input.existing?.actionTitles ?? []).map((s) => s.toLowerCase()),
  );
  const duplicates: WorkflowExpansionPreview["duplicates"] = [];

  const packingItems = workflow.defaultPackingItems
    .filter((p) => {
      if (existingPack.has(p.itemName.toLowerCase())) {
        duplicates.push({
          kind: "packing",
          label: p.itemName,
          reason: "Matching packing item already exists",
        });
        return false;
      }
      return true;
    })
    .map((p) => ({ ...p, source: "workflow" as const }));

  const staffingRoles = workflow.defaultStaffingRoles
    .filter((r) => {
      if (existingRoles.has(r.roleType.toLowerCase())) {
        duplicates.push({
          kind: "staffing",
          label: r.roleType,
          reason: "Matching staffing role already exists",
        });
        return false;
      }
      return true;
    })
    .map((r) => ({ ...r, source: "workflow" as const }));

  const actionItems = workflow.defaultActionItems
    .filter((a) => {
      if (existingActions.has(a.title.toLowerCase())) {
        duplicates.push({
          kind: "action",
          label: a.title,
          reason: "Matching action item already exists",
        });
        return false;
      }
      return true;
    })
    .map((a) => ({ ...a, source: "workflow" as const }));

  return {
    eventId: input.eventId,
    eventVersion: input.eventVersion,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
    },
    applicability,
    additions: {
      objectives: workflow.defaultObjectives.map((o) => ({ ...o, source: "workflow" })),
      programFlow: workflow.defaultProgramFlow.map((p) => ({ ...p, source: "workflow" })),
      packingItems,
      staffingRoles,
      actionItems,
      communicationsItems: workflow.defaultCommunicationsItems.map((c) => ({
        ...c,
        source: "workflow",
      })),
      travelRequirements: workflow.defaultTravelQuestions.map((q) => ({
        ...q,
        source: "workflow",
      })),
    },
    duplicates,
    conflicts: [],
    missingInformation: workflow.requiredInformation.map((r) => ({
      fieldPath: r.fieldPath,
      label: r.label,
      severity: r.severity,
      whyItMatters: r.whyItMatters,
    })),
    requiresHumanApproval: true,
  };
}

/**
 * Authenticated apply entry point — blocked until Step 4.
 * Preview remains available via `previewWorkflowExpansion`.
 */
export async function expandWorkflowForEvent(_input: {
  eventId: string;
  workflowId: string;
  expectedEventVersion: number;
  mode: string;
  selectedSections?: string[];
  actorUserId?: string | null;
}): Promise<never> {
  void _input;
  throw Object.assign(
    new Error(
      "Workflow apply requires Step 4 authentication and an explicit approved preview.",
    ),
    {
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
    },
  );
}
