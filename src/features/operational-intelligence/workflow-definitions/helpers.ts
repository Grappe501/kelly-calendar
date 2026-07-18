import type {
  WorkflowDefinition,
  WorkflowReadinessWeights,
} from "@/features/operational-intelligence/types/workflow-types";

export const DEFAULT_READINESS_WEIGHTS: WorkflowReadinessWeights = {
  "Basic Event Details": 8,
  "Date and Time": 7,
  Location: 7,
  "Candidate Role": 6,
  "Host and Contact": 6,
  Objectives: 5,
  "Program Flow": 8,
  Staffing: 10,
  Travel: 10,
  Packing: 8,
  Communications: 10,
  Approvals: 6,
  Compliance: 5,
  "Event-Day Preparation": 2,
  "Follow-Up Preparation": 2,
};

export function defineWorkflow(
  partial: Omit<WorkflowDefinition, "isSystemWorkflow" | "isActive" | "readinessWeights"> & {
    readinessWeights?: WorkflowReadinessWeights;
  },
): WorkflowDefinition {
  return {
    ...partial,
    readinessWeights: partial.readinessWeights ?? DEFAULT_READINESS_WEIGHTS,
    isSystemWorkflow: true,
    isActive: true,
  };
}
