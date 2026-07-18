import { recommendWorkflowForEvent } from "@/features/operational-intelligence/workflow-definitions/registry";
import { evaluateRecommendations } from "@/features/operational-intelligence/rules/rule-evaluator";

export function recommendFastEntryDefaults(input: {
  calendarType?: string;
  eventType?: string;
  countyId?: string;
  city?: string;
  candidateAttending?: boolean;
  mediaExpected?: boolean;
  travelRequired?: boolean;
}) {
  const workflow = recommendWorkflowForEvent({
    eventType: input.eventType,
    calendarType: input.calendarType,
  });
  const rules = evaluateRecommendations({
    eventType: input.eventType,
    calendarType: input.calendarType,
    travelRequired: input.travelRequired,
    mediaExpected: input.mediaExpected,
    candidateAttending: input.candidateAttending,
  });

  return {
    suggestedTitle: input.eventType
      ? `${input.city ? `${input.city} ` : ""}${input.eventType}`
      : undefined,
    suggestedDurationMinutes: workflow?.defaultDurationMinutes ?? 60,
    suggestedWorkflowId: workflow?.id,
    suggestedWorkflowName: workflow?.name,
    suggestedArrivalBufferMinutes: workflow?.defaultArrivalBufferMinutes,
    suggestedCalendarMemberships: workflow?.supportedCalendarTypes.slice(0, 3) ?? [],
    suggestedVisibility:
      /fundrais|donor|protected/i.test(input.eventType ?? "")
        ? "TITLE_LOCATION"
        : "CAMPAIGN_AUTHENTICATED",
    suggestedLocationDisclosure: /fundrais|donor|protected/i.test(input.eventType ?? "")
      ? "CITY"
      : "VENUE",
    suggestedStaffing: workflow?.defaultStaffingRoles ?? [],
    suggestedPacking: workflow?.defaultPackingItems ?? [],
    suggestedCommunications: workflow?.defaultCommunicationsItems ?? [],
    suggestedTravelQuestions: workflow?.defaultTravelQuestions ?? [],
    ruleRecommendations: rules.slice(0, 8),
    requiresHumanApproval: true as const,
  };
}
