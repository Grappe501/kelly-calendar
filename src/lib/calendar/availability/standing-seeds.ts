/**
 * Standing policy seeds for CC-05 (no PII).
 * Mirrors develop_notes/KCCC_STANDING_AVAILABILITY_POLICY.md
 */

import { computeRuleFingerprint } from "@/lib/calendar/availability/fingerprint";
import type { AvailabilityRuleSnapshot } from "@/lib/calendar/availability/types";

const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri

export function standingPolicySeedRules(
  campaignKey = "kelly",
): Omit<AvailabilityRuleSnapshot, "id">[] {
  const base = {
    campaignKey,
    subjectType: "CANDIDATE",
    subjectUserId: null,
    timezone: "America/Chicago",
    effectiveStartDate: "2025-11-01",
    effectiveEndDate: null,
    weekdays: WEEKDAYS,
    priority: 40,
    approvalState: "ACTIVE",
    isActive: true,
  };

  const morning = {
    ...base,
    ruleType: "OFFICE_HOURS",
    classification: "UNAVAILABLE" as const,
    startLocalTime: "08:00",
    endLocalTime: "12:00",
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    label: "Campaign Office Hours (morning)",
    locationHint: null,
  };
  const afternoon = {
    ...base,
    ruleType: "OFFICE_HOURS",
    classification: "UNAVAILABLE" as const,
    startLocalTime: "13:00",
    endLocalTime: "17:00",
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    label: "Campaign Office Hours (afternoon)",
  };
  const lunch = {
    ...base,
    ruleType: "PREFERRED_WINDOW",
    classification: "PREFERRED" as const,
    startLocalTime: "12:00",
    endLocalTime: "13:00",
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    label: "Lunch — open / preferred flexible window",
    priority: 60,
  };
  const tuesdayLr = {
    ...base,
    ruleType: "PROTECTED_WORK",
    classification: "CONSTRAINED" as const,
    startLocalTime: "08:00",
    endLocalTime: "17:00",
    weekdays: [2],
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    label: "Tuesday Little Rock Campaign Office (default location)",
    locationHint: "Little Rock Campaign Office",
    priority: 45,
  };
  const prepBuffer = {
    ...base,
    ruleType: "PREPARATION_BUFFER",
    classification: "CONSTRAINED" as const,
    startLocalTime: "07:30",
    endLocalTime: "08:00",
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    label: "Morning preparation buffer before office hours",
    priority: 35,
  };

  return [morning, afternoon, lunch, tuesdayLr, prepBuffer].map((r) => ({
    ...r,
    ruleFingerprint: computeRuleFingerprint(r),
  }));
}
