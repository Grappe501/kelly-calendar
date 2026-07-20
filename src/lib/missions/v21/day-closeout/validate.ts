import type { CampaignDayCloseoutConfig } from "@/lib/missions/v21/day-closeout/closeout-config";
import type {
  CampaignDayAssessment,
  CampaignDayCarryForwardSourceType,
  CampaignDayCarryForwardStatus,
  TomorrowReadinessStatus,
} from "@/lib/missions/v21/day-closeout/types";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-closeout/closeout-date";

const ASSESSMENTS = new Set<CampaignDayAssessment>([
  "NOT_ASSESSED",
  "CLEAR",
  "RESPONSIBILITY_REMAINS",
  "LEADERSHIP_ACTION_REQUIRED",
]);

const READINESS = new Set<TomorrowReadinessStatus>([
  "NOT_ASSESSED",
  "READY",
  "NEEDS_ATTENTION",
  "NOT_READY",
  "NO_MISSIONS_SCHEDULED",
]);

const CF_STATUS = new Set<CampaignDayCarryForwardStatus>([
  "OPEN",
  "TRANSFERRED",
  "RESOLVED",
  "CANCELLED",
]);

const CF_SOURCE = new Set<CampaignDayCarryForwardSourceType>([
  "ACTIVE_EXECUTION",
  "DEBRIEF_REQUIRED",
  "DEBRIEF_APPROVAL",
  "FOLLOW_UP_ACTION",
  "COMMITMENT",
  "BLOCKED_ACTION",
  "UNASSIGNED_ACTION",
  "LEADERSHIP_DECISION",
  "TOMORROW_PREPARATION",
  "TOMORROW_TRAVEL",
  "TOMORROW_SCHEDULE",
  "DATA_INTEGRITY",
  "OPERATOR_ADDED",
]);

const FORBIDDEN_KEYS = new Set([
  "lifecyclePhase",
  "missionStatus",
  "operationalStatus",
  "executionStatus",
  "debriefStatus",
  "followUpStatus",
  "readinessState",
  "startsAt",
  "endsAt",
  "eventId",
]);

export type CloseoutPatchResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

function rejectForbidden(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return `Field "${key}" cannot be mutated from Day Closeout.`;
    }
  }
  return null;
}

function normalizeText(
  value: unknown,
  max: number,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string.` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > max) {
    return {
      ok: false,
      error: `${label} must be at most ${max} characters.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function validateCloseoutContentPatch(
  body: unknown,
  config: CampaignDayCloseoutConfig,
): CloseoutPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  const patch: Record<string, unknown> = {};

  if ("todayAssessment" in raw) {
    if (
      typeof raw.todayAssessment !== "string" ||
      !ASSESSMENTS.has(raw.todayAssessment as CampaignDayAssessment)
    ) {
      return { ok: false, error: "Invalid todayAssessment." };
    }
    patch.todayAssessment = raw.todayAssessment;
  }
  if ("tomorrowReadiness" in raw) {
    if (
      typeof raw.tomorrowReadiness !== "string" ||
      !READINESS.has(raw.tomorrowReadiness as TomorrowReadinessStatus)
    ) {
      return { ok: false, error: "Invalid tomorrowReadiness." };
    }
    patch.tomorrowReadiness = raw.tomorrowReadiness;
  }

  for (const field of [
    "closeoutSummary",
    "carryForwardSummary",
    "tomorrowSummary",
  ] as const) {
    if (field in raw) {
      const n = normalizeText(raw[field], config.maxSummaryChars, field);
      if (!n.ok) return { ok: false, error: n.error };
      patch[field] = n.value;
    }
  }
  if ("internalNotes" in raw) {
    const n = normalizeText(raw.internalNotes, config.maxNotesChars, "internalNotes");
    if (!n.ok) return { ok: false, error: n.error };
    patch.internalNotes = n.value;
  }

  if ("expectedUpdatedAt" in raw) {
    if (
      raw.expectedUpdatedAt !== null &&
      typeof raw.expectedUpdatedAt !== "string"
    ) {
      return { ok: false, error: "expectedUpdatedAt must be an ISO string." };
    }
    patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  }

  return { ok: true, patch };
}

export function validateCarryForwardCreate(
  body: unknown,
): CloseoutPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  if (
    typeof raw.sourceType !== "string" ||
    !CF_SOURCE.has(raw.sourceType as CampaignDayCarryForwardSourceType)
  ) {
    return { ok: false, error: "Invalid sourceType." };
  }
  if (typeof raw.title !== "string" || !raw.title.trim()) {
    return { ok: false, error: "title is required." };
  }
  if (raw.title.trim().length > 300) {
    return { ok: false, error: "title must be at most 300 characters." };
  }

  const patch: Record<string, unknown> = {
    sourceType: raw.sourceType,
    title: raw.title.trim(),
    sourceRecordId:
      typeof raw.sourceRecordId === "string" ? raw.sourceRecordId : null,
    missionId: typeof raw.missionId === "string" ? raw.missionId : null,
    reason: typeof raw.reason === "string" ? raw.reason.trim() || null : null,
    ownerName:
      typeof raw.ownerName === "string" ? raw.ownerName.trim() || null : null,
    ownerUserId:
      typeof raw.ownerUserId === "string" ? raw.ownerUserId : null,
    destination:
      typeof raw.destination === "string"
        ? raw.destination.trim() || null
        : null,
    clientKey: typeof raw.clientKey === "string" ? raw.clientKey : null,
  };

  if ("targetDateKey" in raw && raw.targetDateKey != null) {
    if (typeof raw.targetDateKey !== "string") {
      return { ok: false, error: "targetDateKey must be YYYY-MM-DD." };
    }
    const parsed = parseBriefingDateKey(raw.targetDateKey);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    patch.targetDateKey = parsed.dateKey;
  } else {
    patch.targetDateKey = null;
  }

  return { ok: true, patch };
}

export function validateCarryForwardPatch(
  body: unknown,
): CloseoutPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  const patch: Record<string, unknown> = {};
  if ("status" in raw) {
    if (
      typeof raw.status !== "string" ||
      !CF_STATUS.has(raw.status as CampaignDayCarryForwardStatus)
    ) {
      return { ok: false, error: "Invalid status." };
    }
    patch.status = raw.status;
    if (raw.status === "CANCELLED") {
      if (
        typeof raw.cancellationReason !== "string" ||
        !raw.cancellationReason.trim()
      ) {
        return {
          ok: false,
          error: "cancellationReason is required when cancelling.",
        };
      }
      patch.cancellationReason = raw.cancellationReason.trim();
    }
  }
  if ("ownerName" in raw) {
    patch.ownerName =
      typeof raw.ownerName === "string" ? raw.ownerName.trim() || null : null;
  }
  if ("ownerUserId" in raw) {
    patch.ownerUserId =
      typeof raw.ownerUserId === "string" ? raw.ownerUserId : null;
  }
  if ("targetDateKey" in raw) {
    if (raw.targetDateKey == null) patch.targetDateKey = null;
    else if (typeof raw.targetDateKey === "string") {
      const parsed = parseBriefingDateKey(raw.targetDateKey);
      if (!parsed.ok) return { ok: false, error: parsed.error };
      patch.targetDateKey = parsed.dateKey;
    } else {
      return { ok: false, error: "targetDateKey must be YYYY-MM-DD." };
    }
  }
  if ("reason" in raw) {
    patch.reason =
      typeof raw.reason === "string" ? raw.reason.trim() || null : null;
  }
  if ("destination" in raw) {
    patch.destination =
      typeof raw.destination === "string"
        ? raw.destination.trim() || null
        : null;
  }
  if ("expectedUpdatedAt" in raw) {
    patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  }
  return { ok: true, patch };
}
