import "server-only";

import { AUTH_STATUS } from "@/server/auth/auth-status";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";
import { AppError } from "@/lib/security/safe-error";
import { previewWorkflowExpansion } from "@/features/operational-intelligence/services/workflow-expansion-service";
import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import { evaluateRecommendations } from "@/features/operational-intelligence/services/recommendation-service";
import { recommendFastEntryDefaults } from "@/features/operational-intelligence/services/fast-entry-recommendation-service";
import { listWorkflows, getWorkflowById } from "@/features/operational-intelligence/workflow-definitions/registry";

function requireAuthViewer() {
  if (!AUTH_STATUS.authenticationComplete) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage:
        "Operational intelligence event APIs require Step 4 authentication.",
    });
  }
}

export function listSystemWorkflows() {
  return listWorkflows().map((w) => ({
    id: w.id,
    slug: w.slug,
    name: w.name,
    version: w.version,
    supportedEventTypes: w.supportedEventTypes,
    isActive: w.isActive,
  }));
}

export function getSystemWorkflow(workflowId: string) {
  return getWorkflowById(workflowId) ?? null;
}

export function previewEventWorkflow(input: {
  eventId: string;
  eventVersion: number;
  workflowId: string;
  eventType?: string;
  calendarType?: string;
}) {
  requireAuthViewer();
  return previewWorkflowExpansion(input);
}

export function applyEventWorkflow(input: unknown) {
  void input;
  requireAuthorizedMutation("applyEventWorkflow");
}

export function getEventRecommendations(input: {
  eventType?: string;
  calendarType?: string;
  travelRequired?: boolean;
}) {
  requireAuthViewer();
  return evaluateRecommendations(input);
}

export function decideRecommendation(action: string) {
  requireAuthorizedMutation(`recommendation:${action}`);
}

export function getEventReadinessDemo(input: Parameters<typeof calculateEventReadiness>[0]) {
  // Pure calculation allowed for system validation pages with synthetic input.
  return calculateEventReadiness(input);
}

export function getEventReadinessForViewer(input: Parameters<typeof calculateEventReadiness>[0]) {
  requireAuthViewer();
  return calculateEventReadiness(input);
}

export function recalculateReadiness() {
  requireAuthorizedMutation("recalculateReadiness");
}

export function fastEntryRecommend(input: Parameters<typeof recommendFastEntryDefaults>[0]) {
  // Fast-entry suggestions are non-persistent; still no auto-save.
  return recommendFastEntryDefaults(input);
}
