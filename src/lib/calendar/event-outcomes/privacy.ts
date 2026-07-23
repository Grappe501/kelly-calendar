/**
 * IC-02A — privacy helpers for encounters and reports.
 * Encounters never create Person, consent, or communications by name alone.
 */

import type { EventOutcomePrivacyClassCode } from "@/lib/calendar/event-outcomes/types";

export const NAME_ONLY_MATCH_BLOCKED =
  "Name-only Person matching is blocked. Link an existing Person explicitly or use Review as contact.";

export function isConfidentialPrivacy(
  classification: EventOutcomePrivacyClassCode | string | null | undefined,
): boolean {
  return (classification ?? "").toUpperCase() === "CONFIDENTIAL";
}

export function redactForBroadReport(input: {
  content: string;
  privacyClassification: EventOutcomePrivacyClassCode | string;
  viewerMaySeeConfidential: boolean;
}): { content: string; redacted: boolean } {
  if (
    isConfidentialPrivacy(input.privacyClassification) &&
    !input.viewerMaySeeConfidential
  ) {
    return { content: "[redacted — confidential]", redacted: true };
  }
  return { content: input.content, redacted: false };
}

/** Fields that must never appear in ICS export projections. */
export const ICS_OUTCOME_DENY_FIELDS = [
  "whatHappened",
  "hotWash",
  "hot-wash",
  "encounter",
  "encounters",
  "attendanceOutcome",
  "operationalOutcome",
  "campaignCommitments",
  "personCommitments",
  "EventOutcomeReview",
  "EventHotWashEntry",
  "EventEncounter",
] as const;

export function assertIcsExcludesOutcomeContent(blob: string): void {
  for (const field of ICS_OUTCOME_DENY_FIELDS) {
    if (new RegExp(field, "i").test(blob)) {
      throw new Error(`ICS projection must not include outcome field: ${field}`);
    }
  }
}
