export type WorkflowPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type WorkflowApplicationMode =
  | "MANUAL"
  | "TEMPLATE"
  | "RULE_RECOMMENDATION"
  | "HISTORICAL_RECOMMENDATION"
  | "AI_RECOMMENDATION"
  | "IMPORT_ENRICHMENT";

export type WorkflowObjectiveDefinition = {
  objectiveType: string;
  isPrimary?: boolean;
  description: string;
  successDefinition?: string;
  priority?: WorkflowPriority;
};

export type WorkflowProgramFlowDefinition = {
  sequence: number;
  activityType: string;
  title: string;
  durationMinutes?: number;
  description?: string;
};

export type WorkflowPackingDefinition = {
  category: string;
  itemName: string;
  quantity?: number;
  state?: string;
};

export type WorkflowStaffingDefinition = {
  roleType: string;
  required: boolean;
  instructions?: string;
};

export type WorkflowActionDefinition = {
  phase: string;
  actionType: string;
  title: string;
  description?: string;
  offsetHoursBeforeStart?: number;
  priority?: WorkflowPriority;
  requiresApproval?: boolean;
};

export type WorkflowCommunicationsDefinition = {
  channel: string;
  communicationType: string;
  audience?: string;
  objective?: string;
  offsetHoursBeforeStart?: number;
};

export type WorkflowTravelQuestion = {
  key: string;
  prompt: string;
  required: boolean;
};

export type WorkflowRequiredField = {
  fieldPath: string;
  label: string;
  severity: WorkflowPriority;
  whyItMatters: string;
  requiredBefore?: string;
};

export type WorkflowReadinessWeights = Record<string, number>;

export type WorkflowApplicabilityRule = {
  field: string;
  op: "eq" | "in" | "neq";
  value: string | string[];
};

export type WorkflowDefinition = {
  id: string;
  version: number;
  slug: string;
  name: string;
  description: string;
  supportedCalendarTypes: string[];
  supportedEventTypes: string[];
  defaultDurationMinutes?: number;
  defaultArrivalBufferMinutes?: number;
  defaultDepartureBufferMinutes?: number;
  defaultSetupMinutes?: number;
  defaultBreakdownMinutes?: number;
  defaultObjectives: WorkflowObjectiveDefinition[];
  defaultProgramFlow: WorkflowProgramFlowDefinition[];
  defaultPackingItems: WorkflowPackingDefinition[];
  defaultStaffingRoles: WorkflowStaffingDefinition[];
  defaultActionItems: WorkflowActionDefinition[];
  defaultCommunicationsItems: WorkflowCommunicationsDefinition[];
  defaultTravelQuestions: WorkflowTravelQuestion[];
  requiredInformation: WorkflowRequiredField[];
  readinessWeights: WorkflowReadinessWeights;
  applicabilityRules: WorkflowApplicabilityRule[];
  isSystemWorkflow: boolean;
  isActive: boolean;
};

export type ProposedObjective = WorkflowObjectiveDefinition & { source: "workflow" };
export type ProposedProgramFlowItem = WorkflowProgramFlowDefinition & { source: "workflow" };
export type ProposedPackingItem = WorkflowPackingDefinition & { source: "workflow" };
export type ProposedStaffingRole = WorkflowStaffingDefinition & { source: "workflow" };
export type ProposedActionItem = WorkflowActionDefinition & { source: "workflow" };
export type ProposedCommunicationsItem = WorkflowCommunicationsDefinition & {
  source: "workflow";
};
export type ProposedTravelRequirement = {
  key: string;
  prompt: string;
  required: boolean;
  source: "workflow";
};

export type WorkflowExpansionPreview = {
  eventId: string;
  eventVersion: number;
  workflow: { id: string; name: string; version: number };
  applicability: {
    applicable: boolean;
    confidence: number;
    reasons: string[];
    warnings: string[];
  };
  additions: {
    objectives: ProposedObjective[];
    programFlow: ProposedProgramFlowItem[];
    packingItems: ProposedPackingItem[];
    staffingRoles: ProposedStaffingRole[];
    actionItems: ProposedActionItem[];
    communicationsItems: ProposedCommunicationsItem[];
    travelRequirements: ProposedTravelRequirement[];
  };
  duplicates: Array<{ kind: string; label: string; reason: string }>;
  conflicts: Array<{ kind: string; label: string; reason: string }>;
  missingInformation: Array<{
    fieldPath: string;
    label: string;
    severity: WorkflowPriority;
    whyItMatters: string;
  }>;
  requiresHumanApproval: true;
};
