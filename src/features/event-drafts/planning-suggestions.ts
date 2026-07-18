/**
 * AI-ready recommendation contracts.
 * AI remains disabled by default; suggestions require human approval.
 */

export type SuggestionEvidence = {
  sourceType:
    | "CURRENT_FORM"
    | "EVENT_TEMPLATE"
    | "REVIEWED_HISTORICAL_EVENT"
    | "CAMPAIGN_POLICY";
  sourceId?: string;
  summary: string;
};

export type EventPlanningSuggestion = {
  suggestionId: string;
  field: string;
  suggestedValue: unknown;
  confidence: number;
  reasons: string[];
  evidence: SuggestionEvidence[];
  requiresHumanApproval: true;
};

export type SuggestionRequest = {
  draftSnapshot: Record<string, unknown>;
  reviewedHistoricalOnly: boolean;
  aiEnabled: boolean;
};

export function createPolicySuggestion(input: {
  field: string;
  suggestedValue: unknown;
  reason: string;
  confidence?: number;
}): EventPlanningSuggestion {
  const confidence = Math.min(1, Math.max(0, input.confidence ?? 0.5));
  return {
    suggestionId: `sug_${input.field}_${Date.now().toString(36)}`,
    field: input.field,
    suggestedValue: input.suggestedValue,
    confidence,
    reasons: [input.reason],
    evidence: [
      {
        sourceType: "CAMPAIGN_POLICY",
        summary: input.reason,
      },
    ],
    requiresHumanApproval: true,
  };
}

/**
 * Returns offline template/policy suggestions only.
 * Never calls OpenAI. Unreviewed imports are not trusted pattern sources.
 */
export function buildOfflinePlanningSuggestions(
  draft: Record<string, unknown>,
): EventPlanningSuggestion[] {
  const suggestions: EventPlanningSuggestion[] = [];
  const basic = (draft.basic ?? {}) as Record<string, unknown>;
  const calendar = String(basic.primaryCalendar ?? "");

  if (calendar === "Public Events" && !basic.eventType) {
    suggestions.push(
      createPolicySuggestion({
        field: "basic.eventType",
        suggestedValue: "Community meeting",
        reason: "Public Events calendar commonly uses Community meeting as a starting type",
        confidence: 0.4,
      }),
    );
  }

  if (calendar === "Fundraising") {
    suggestions.push(
      createPolicySuggestion({
        field: "visibility.locationDisclosure",
        suggestedValue: "CITY",
        reason: "Fundraising events default to city-level location disclosure",
        confidence: 0.7,
      }),
    );
  }

  if (calendar === "Protected Personal Time") {
    suggestions.push(
      createPolicySuggestion({
        field: "visibility.generalVisibility",
        suggestedValue: "Protected",
        reason: "Protected personal time uses busy-only visibility defaults",
        confidence: 0.9,
      }),
    );
  }

  return suggestions.map((s) => ({
    ...s,
    requiresHumanApproval: true as const,
    evidence: s.evidence.length
      ? s.evidence
      : [{ sourceType: "CAMPAIGN_POLICY" as const, summary: "Policy default" }],
  }));
}

export function assertSuggestionSafe(suggestion: EventPlanningSuggestion): boolean {
  return (
    suggestion.requiresHumanApproval === true &&
    Array.isArray(suggestion.evidence) &&
    suggestion.evidence.length > 0 &&
    suggestion.confidence >= 0 &&
    suggestion.confidence <= 1
  );
}

export const AI_ASSISTANCE_STATUS = {
  aiEnabled: false,
  mode: "advisory_contract_only",
  mayPublish: false,
  mayAssignStaff: false,
  maySendCommunications: false,
  trustedPatternsRequireReviewedHistory: true,
  unreviewedImportsEligibleAsPatterns: false,
} as const;
