import { createHash } from "node:crypto";
import type {
  AvailabilityExceptionSnapshot,
  AvailabilityRuleSnapshot,
} from "@/lib/calendar/availability/types";

export function fingerprintPayload(parts: Record<string, unknown>): string {
  const canonical = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export function computeRuleFingerprint(
  rule: Omit<AvailabilityRuleSnapshot, "id" | "ruleFingerprint"> & {
    reasonSensitive?: string | null;
  },
): string {
  return fingerprintPayload({
    campaignKey: rule.campaignKey,
    subjectType: rule.subjectType,
    subjectUserId: rule.subjectUserId ?? null,
    ruleType: rule.ruleType,
    classification: rule.classification,
    timezone: rule.timezone,
    effectiveStartDate: rule.effectiveStartDate,
    effectiveEndDate: rule.effectiveEndDate ?? null,
    startLocalTime: rule.startLocalTime ?? null,
    endLocalTime: rule.endLocalTime ?? null,
    weekdays: [...rule.weekdays].sort((a, b) => a - b),
    bufferBeforeMinutes: rule.bufferBeforeMinutes,
    bufferAfterMinutes: rule.bufferAfterMinutes,
    priority: rule.priority,
    label: rule.label,
    locationHint: rule.locationHint ?? null,
  });
}

export function computeExceptionFingerprint(
  ex: Omit<AvailabilityExceptionSnapshot, "id" | "exceptionFingerprint"> & {
    reasonSensitive?: string | null;
  },
): string {
  return fingerprintPayload({
    campaignKey: ex.campaignKey,
    ruleId: ex.ruleId ?? null,
    subjectType: ex.subjectType,
    startDate: ex.startDate,
    endDateExclusive: ex.endDateExclusive,
    startLocalTime: ex.startLocalTime ?? null,
    endLocalTime: ex.endLocalTime ?? null,
    isAllDay: ex.isAllDay,
    timezone: ex.timezone,
    classification: ex.classification,
    label: ex.label,
  });
}

export function computeRuleSetFingerprint(
  rules: AvailabilityRuleSnapshot[],
  exceptions: AvailabilityExceptionSnapshot[],
): string {
  const ruleFp = rules
    .filter((r) => r.isActive && r.approvalState === "ACTIVE")
    .map((r) => r.ruleFingerprint)
    .sort();
  const exFp = exceptions
    .filter((e) => e.isActive && e.approvalState === "ACTIVE")
    .map((e) => e.exceptionFingerprint)
    .sort();
  return fingerprintPayload({ rules: ruleFp, exceptions: exFp });
}

export function computeEvaluationFingerprint(input: {
  ruleSetFingerprint: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  eventStatus?: string | null;
  subjectType: string;
}): string {
  return fingerprintPayload({
    ruleSetFingerprint: input.ruleSetFingerprint,
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
    timezone: input.timezone,
    isAllDay: input.isAllDay,
    eventStatus: input.eventStatus ?? null,
    subjectType: input.subjectType,
  });
}
