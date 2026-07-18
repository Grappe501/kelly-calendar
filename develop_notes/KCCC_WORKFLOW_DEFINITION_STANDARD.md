# Workflow Definition Standard

Workflows are versioned data objects (`WorkflowDefinition`) with objectives, program flow, packing, staffing, actions, communications, travel questions, required fields, readiness weights, and applicability rules.

Applying a workflow snapshots `workflowDefinitionId` + `workflowVersion` via `EventWorkflowApplication`. Later edits to the definition do not rewrite historical plans.
