import type { FieldOpsConfig } from "@/lib/missions/v21/field-ops/field-ops-config";
import type {
  MissionFieldConfirmationState,
  MissionFieldItemCondition,
  MissionFieldOpsAcknowledgementDisposition,
  MissionFieldOpsIssueType,
  MissionFieldOpsReadiness,
  MissionFieldOpsSessionStatus,
} from "@/lib/missions/v21/field-ops/types";

const set = <T extends string>(values: T[]) => new Set<T>(values);
const SESSION_STATUS = set<MissionFieldOpsSessionStatus>([
  "OPEN",
  "CHECKING",
  "READY",
  "READY_WITH_RISK",
  "WRAP_PENDING",
  "CLOSED",
  "CANCELLED",
]);
const READINESS = set<MissionFieldOpsReadiness>([
  "NOT_ASSESSED",
  "READY",
  "READY_WITH_ACCEPTED_RISK",
  "NOT_READY",
  "NOT_REQUIRED",
  "WRAP_PENDING",
]);
const CONFIRM_STATE = set<MissionFieldConfirmationState>([
  "PRESENT",
  "MISSING",
  "DAMAGED",
  "SUBSTITUTED",
  "NOT_USABLE",
  "NOT_APPLICABLE",
  "RETURNED",
  "RETURN_MISSING",
]);
const CONDITION = set<MissionFieldItemCondition>(["GOOD", "DAMAGED", "UNKNOWN"]);
const ISSUE_TYPE = set<MissionFieldOpsIssueType>([
  "NO_PACK",
  "NO_SESSION",
  "CRITICAL_UNCONFIRMED",
  "CRITICAL_MISSING",
  "CRITICAL_DAMAGED",
  "CRITICAL_SUBSTITUTED",
  "CRITICAL_NOT_USABLE",
  "SUBSTITUTE_UNACCEPTED",
  "HANDOFF_INCOMPLETE_AT_CHECK",
  "RETURN_OUTSTANDING",
  "RETURN_MISSING",
  "RETURN_DAMAGED",
  "STALE_AFTER_LOGISTICS_CHANGE",
  "STALE_AFTER_RESCHEDULE",
  "STALE_AFTER_TRAVEL_CHANGE",
  "CANCELLED_MISSION_OPEN_SESSION",
  "WRONG_CAMPAIGN_DAY",
  "OVERNIGHT_WRAP_OPEN",
  "OPERATOR_ADDED",
]);
const DISPOSITION = set<MissionFieldOpsAcknowledgementDisposition>([
  "ACKNOWLEDGED",
  "ACCEPTED_RISK",
  "RESOLVED",
  "NOT_APPLICABLE",
]);
const FORBIDDEN = new Set([
  "lifecyclePhase",
  "missionStatus",
  "operationalStatus",
  "executionStatus",
  "debriefStatus",
  "followUpStatus",
  "startsAt",
  "endsAt",
  "eventId",
  "sourceEventId",
  "plannedDepartureAt",
  "status", // D12 item status — never mutated here via client alias confusion
]);

export type FieldOpsPatchResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

const object = (body: unknown): Record<string, unknown> | null =>
  body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;

const forbidden = (raw: Record<string, unknown>) =>
  Object.keys(raw).find((key) => FORBIDDEN.has(key));

function text(
  value: unknown,
  max: number,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string")
    return { ok: false, error: `${label} must be a string.` };
  const valueTrimmed = value.trim();
  return valueTrimmed.length > max
    ? { ok: false, error: `${label} must be at most ${max} characters.` }
    : { ok: true, value: valueTrimmed || null };
}

function begin(body: unknown): { raw: Record<string, unknown> } | FieldOpsPatchResult {
  const raw = object(body);
  if (!raw) return { ok: false, error: "Request body must be an object." };
  const bad = forbidden(raw);
  return bad
    ? {
        ok: false,
        error: `Field "${bad}" cannot be mutated from Field Day Operations.`,
      }
    : { raw };
}

function enumField<T extends string>(
  raw: Record<string, unknown>,
  patch: Record<string, unknown>,
  field: string,
  values: Set<T>,
) {
  if (!(field in raw)) return null;
  if (typeof raw[field] !== "string" || !values.has(raw[field] as T)) {
    return `Invalid ${field}.`;
  }
  patch[field] = raw[field];
  return null;
}

export function validateFieldOpsSessionPatch(
  body: unknown,
  config: FieldOpsConfig,
): FieldOpsPatchResult {
  const started = begin(body);
  if (!("raw" in started)) return started;
  const { raw } = started;
  const patch: Record<string, unknown> = {};
  for (const [field, values] of [
    ["sessionStatus", SESSION_STATUS],
    ["readinessState", READINESS],
  ] as const) {
    const error = enumField(raw, patch, field, values);
    if (error) return { ok: false, error };
  }
  // Map sessionStatus -> status for repository
  if ("sessionStatus" in patch) {
    patch.status = patch.sessionStatus;
    delete patch.sessionStatus;
  }
  for (const field of [
    "fieldLeadName",
    "fieldLeadUserId",
    "locationLabel",
  ] as const) {
    if (field in raw) {
      const result = text(raw[field], 200, field);
      if (!result.ok) return result;
      patch[field] = result.value;
    }
  }
  for (const field of ["contextNote", "acceptedRiskSummary", "fieldNotes"] as const) {
    if (field in raw) {
      const result = text(raw[field], config.maxSummaryChars, field);
      if (!result.ok) return result;
      patch[field] = result.value;
    }
  }
  if ("internalNotes" in raw) {
    const result = text(raw.internalNotes, config.maxNotesChars, "internalNotes");
    if (!result.ok) return result;
    patch.internalNotes = result.value;
  }
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  if (raw.confirmReadiness === true) patch.confirmReadiness = true;
  if (raw.beginWrap === true) patch.beginWrap = true;
  if (raw.closeSession === true) patch.closeSession = true;
  if (raw.checkIn === true) patch.checkIn = true;
  return { ok: true, patch };
}

export function validateFieldConfirmationUpsert(
  body: unknown,
  config: FieldOpsConfig,
): FieldOpsPatchResult {
  const started = begin(body);
  if (!("raw" in started)) return started;
  const { raw } = started;
  const patch: Record<string, unknown> = {};
  if (typeof raw.logisticsItemId !== "string" || !raw.logisticsItemId.trim()) {
    return { ok: false, error: "logisticsItemId is required." };
  }
  patch.logisticsItemId = raw.logisticsItemId.trim();
  const stateErr = enumField(raw, patch, "state", CONFIRM_STATE);
  if (stateErr) return { ok: false, error: stateErr };
  if (!("state" in patch)) return { ok: false, error: "state is required." };
  const condErr = enumField(raw, patch, "condition", CONDITION);
  if (condErr) return { ok: false, error: condErr };
  for (const field of [
    "observedQuantityLabel",
    "substituteDescription",
    "locationLabel",
  ] as const) {
    if (field in raw) {
      const result = text(raw[field], 200, field);
      if (!result.ok) return result;
      patch[field] = result.value;
    }
  }
  if ("exceptionNote" in raw) {
    const result = text(raw.exceptionNote, config.maxNotesChars, "exceptionNote");
    if (!result.ok) return result;
    patch.exceptionNote = result.value;
  }
  if (patch.state === "SUBSTITUTED" && !patch.substituteDescription) {
    return {
      ok: false,
      error: "substituteDescription is required when state is SUBSTITUTED.",
    };
  }
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  return { ok: true, patch };
}

export function validateFieldOpsAcknowledgement(body: unknown): FieldOpsPatchResult {
  const started = begin(body);
  if (!("raw" in started)) return started;
  const { raw } = started;
  const patch: Record<string, unknown> = {};
  for (const field of ["issueKey", "title"] as const) {
    if (typeof raw[field] !== "string" || !raw[field].trim()) {
      return { ok: false, error: `${field} is required.` };
    }
    patch[field] = (raw[field] as string).trim();
  }
  const typeErr = enumField(raw, patch, "issueType", ISSUE_TYPE);
  if (typeErr) return { ok: false, error: typeErr };
  if (!("issueType" in patch)) return { ok: false, error: "issueType is required." };
  const dispErr = enumField(raw, patch, "disposition", DISPOSITION);
  if (dispErr) return { ok: false, error: dispErr };
  if (!("disposition" in patch))
    return { ok: false, error: "disposition is required." };
  if ("note" in raw) {
    const result = text(raw.note, 2000, "note");
    if (!result.ok) return result;
    patch.note = result.value;
  } else {
    patch.note = null;
  }
  if ("acceptedRiskReason" in raw) {
    const result = text(raw.acceptedRiskReason, 2000, "acceptedRiskReason");
    if (!result.ok) return result;
    patch.acceptedRiskReason = result.value;
  } else {
    patch.acceptedRiskReason = null;
  }
  if (
    patch.disposition === "ACCEPTED_RISK" &&
    !patch.acceptedRiskReason
  ) {
    return {
      ok: false,
      error: "acceptedRiskReason is required for ACCEPTED_RISK.",
    };
  }
  return { ok: true, patch };
}
