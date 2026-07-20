import type { TravelMovementConfig } from "@/lib/missions/v21/travel-movement/travel-config";
import type {
  MissionTravelAcknowledgementDisposition,
  MissionTravelIssueType,
  MissionTravelMode,
  MissionTravelPlanStatus,
  MissionTravelReadiness,
} from "@/lib/missions/v21/travel-movement/types";

const PLAN_STATUS = new Set<MissionTravelPlanStatus>([
  "DRAFT",
  "ACTIVE",
  "READY",
  "NEEDS_REVIEW",
  "INACTIVE",
  "CANCELLED",
]);

const READINESS = new Set<MissionTravelReadiness>([
  "NOT_ASSESSED",
  "READY",
  "READY_WITH_ACCEPTED_RISK",
  "NOT_READY",
  "NOT_REQUIRED",
]);

const MODE = new Set<MissionTravelMode>([
  "UNSPECIFIED",
  "DRIVE",
  "WALK",
  "FLIGHT",
  "OTHER",
]);

const DISPOSITION = new Set<MissionTravelAcknowledgementDisposition>([
  "ACKNOWLEDGED",
  "ACCEPTED_RISK",
  "RESOLVED",
  "NOT_APPLICABLE",
]);

const ISSUE_TYPE = new Set<MissionTravelIssueType>([
  "NO_PLAN",
  "MISSING_DEPARTURE",
  "MISSING_DESTINATION",
  "MISSING_DRIVER",
  "MISSING_VEHICLE",
  "ARRIVAL_AFTER_MISSION_START",
  "TIME_CONFLICT",
  "LEG_INCOMPLETE",
  "LEG_ORDER",
  "MOVEMENT_OVERLAP",
  "MISSING_BUFFER",
  "STALE_AFTER_RESCHEDULE",
  "CANCELLED_MISSION_ACTIVE_PLAN",
  "CROSS_MIDNIGHT_AMBIGUITY",
  "PREP_INCOMPLETE",
  "OPERATOR_ADDED",
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
]);

export type TravelPatchResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

function rejectForbidden(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN.has(key)) {
      return `Field "${key}" cannot be mutated from Travel and Movement Operations.`;
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
    return { ok: false, error: `${label} must be at most ${max} characters.` };
  }
  return { ok: true, value: trimmed };
}

function parseIso(
  value: unknown,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string" || !value.trim()) {
    return { ok: true, value: null };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${label} must be a valid ISO datetime.` };
  }
  return { ok: true, value: d.toISOString() };
}

export function validateTravelPlanPatch(
  body: unknown,
  config: TravelMovementConfig,
): TravelPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  const patch: Record<string, unknown> = {};

  if ("status" in raw) {
    if (typeof raw.status !== "string" || !PLAN_STATUS.has(raw.status as MissionTravelPlanStatus)) {
      return { ok: false, error: "Invalid status." };
    }
    patch.status = raw.status;
  }
  if ("readinessState" in raw) {
    if (
      typeof raw.readinessState !== "string" ||
      !READINESS.has(raw.readinessState as MissionTravelReadiness)
    ) {
      return { ok: false, error: "Invalid readinessState." };
    }
    patch.readinessState = raw.readinessState;
  }
  if ("movementRequired" in raw) {
    if (raw.movementRequired !== null && typeof raw.movementRequired !== "boolean") {
      return { ok: false, error: "movementRequired must be boolean or null." };
    }
    patch.movementRequired = raw.movementRequired;
  }
  for (const flag of ["driverRequired", "vehicleRequired"] as const) {
    if (flag in raw) {
      if (typeof raw[flag] !== "boolean") {
        return { ok: false, error: `${flag} must be a boolean.` };
      }
      patch[flag] = raw[flag];
    }
  }
  for (const field of [
    "plannedReadyAt",
    "plannedDepartureAt",
    "requiredArrivalAt",
  ] as const) {
    if (field in raw) {
      const parsed = parseIso(raw[field], field);
      if (!parsed.ok) return { ok: false, error: parsed.error };
      patch[field] = parsed.value;
    }
  }
  if ("bufferMinutes" in raw) {
    if (raw.bufferMinutes === null || raw.bufferMinutes === undefined || raw.bufferMinutes === "") {
      patch.bufferMinutes = null;
    } else if (
      typeof raw.bufferMinutes !== "number" ||
      !Number.isInteger(raw.bufferMinutes) ||
      raw.bufferMinutes < 0 ||
      raw.bufferMinutes > 24 * 60
    ) {
      return { ok: false, error: "bufferMinutes must be an integer from 0 to 1440." };
    } else {
      patch.bufferMinutes = raw.bufferMinutes;
    }
  }
  for (const field of [
    "driverName",
    "driverUserId",
    "vehicleDescription",
  ] as const) {
    if (field in raw) {
      const n = normalizeText(raw[field], 200, field);
      if (!n.ok) return { ok: false, error: n.error };
      patch[field] = n.value;
    }
  }
  for (const field of [
    "passengerNotes",
    "accessibilityNotes",
    "securityNotes",
    "logisticsNotes",
    "acceptedRiskSummary",
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
    patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  }
  if ("confirmSchedule" in raw && raw.confirmSchedule === true) {
    patch.confirmSchedule = true;
  }

  return { ok: true, patch };
}

export function validateTravelLegUpsert(
  body: unknown,
  config: TravelMovementConfig,
): TravelPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  const patch: Record<string, unknown> = {};
  if ("sequence" in raw) {
    if (
      typeof raw.sequence !== "number" ||
      !Number.isInteger(raw.sequence) ||
      raw.sequence < 1 ||
      raw.sequence > config.maxLegs
    ) {
      return { ok: false, error: `sequence must be an integer from 1 to ${config.maxLegs}.` };
    }
    patch.sequence = raw.sequence;
  }
  for (const field of ["originLabel", "destinationLabel", "driverName", "vehicleDescription", "instructions"] as const) {
    if (field in raw) {
      const n = normalizeText(raw[field], config.maxSummaryChars, field);
      if (!n.ok) return { ok: false, error: n.error };
      patch[field] = n.value;
    }
  }
  for (const field of ["plannedDepartureAt", "plannedArrivalAt"] as const) {
    if (field in raw) {
      const parsed = parseIso(raw[field], field);
      if (!parsed.ok) return { ok: false, error: parsed.error };
      patch[field] = parsed.value;
    }
  }
  if ("mode" in raw) {
    if (typeof raw.mode !== "string" || !MODE.has(raw.mode as MissionTravelMode)) {
      return { ok: false, error: "Invalid mode." };
    }
    patch.mode = raw.mode;
  }
  if ("bufferMinutes" in raw) {
    if (raw.bufferMinutes === null || raw.bufferMinutes === undefined || raw.bufferMinutes === "") {
      patch.bufferMinutes = null;
    } else if (
      typeof raw.bufferMinutes !== "number" ||
      !Number.isInteger(raw.bufferMinutes) ||
      raw.bufferMinutes < 0
    ) {
      return { ok: false, error: "bufferMinutes must be a non-negative integer." };
    } else {
      patch.bufferMinutes = raw.bufferMinutes;
    }
  }
  if ("status" in raw) {
    const ok = ["PLANNED", "CONFIRMED", "SKIPPED", "CANCELLED"].includes(
      String(raw.status),
    );
    if (!ok) return { ok: false, error: "Invalid leg status." };
    patch.status = raw.status;
  }
  if ("expectedUpdatedAt" in raw) {
    patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  }

  if (
    typeof patch.plannedDepartureAt === "string" &&
    typeof patch.plannedArrivalAt === "string" &&
    new Date(patch.plannedArrivalAt as string).getTime() <
      new Date(patch.plannedDepartureAt as string).getTime()
  ) {
    return {
      ok: false,
      error: "Leg planned arrival cannot be before planned departure.",
    };
  }

  return { ok: true, patch };
}

export function validateTravelAcknowledgement(
  body: unknown,
): TravelPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  if (typeof raw.issueKey !== "string" || !raw.issueKey.trim()) {
    return { ok: false, error: "issueKey is required." };
  }
  if (
    typeof raw.issueType !== "string" ||
    !ISSUE_TYPE.has(raw.issueType as MissionTravelIssueType)
  ) {
    return { ok: false, error: "Invalid issueType." };
  }
  if (typeof raw.title !== "string" || !raw.title.trim()) {
    return { ok: false, error: "title is required." };
  }
  if (
    typeof raw.disposition !== "string" ||
    !DISPOSITION.has(raw.disposition as MissionTravelAcknowledgementDisposition)
  ) {
    return { ok: false, error: "Invalid disposition." };
  }
  if (
    raw.disposition === "ACCEPTED_RISK" &&
    (typeof raw.acceptedRiskReason !== "string" || !raw.acceptedRiskReason.trim())
  ) {
    return {
      ok: false,
      error: "acceptedRiskReason is required when accepting risk.",
    };
  }
  if (
    raw.disposition === "NOT_APPLICABLE" &&
    (typeof raw.note !== "string" || !raw.note.trim())
  ) {
    return {
      ok: false,
      error: "note is required for Not Applicable.",
    };
  }

  return {
    ok: true,
    patch: {
      issueKey: raw.issueKey.trim(),
      issueType: raw.issueType,
      title: raw.title.trim(),
      disposition: raw.disposition,
      note:
        typeof raw.note === "string" ? raw.note.trim() || null : null,
      acceptedRiskReason:
        typeof raw.acceptedRiskReason === "string"
          ? raw.acceptedRiskReason.trim() || null
          : null,
    },
  };
}

export function validateLegReorder(body: unknown, maxLegs: number): TravelPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.orderedLegIds)) {
    return { ok: false, error: "orderedLegIds must be an array." };
  }
  if (raw.orderedLegIds.length > maxLegs) {
    return { ok: false, error: `At most ${maxLegs} legs are allowed.` };
  }
  if (!raw.orderedLegIds.every((id) => typeof id === "string" && id.trim())) {
    return { ok: false, error: "orderedLegIds must be non-empty strings." };
  }
  const unique = new Set(raw.orderedLegIds);
  if (unique.size !== raw.orderedLegIds.length) {
    return { ok: false, error: "orderedLegIds must be unique." };
  }
  return {
    ok: true,
    patch: {
      orderedLegIds: raw.orderedLegIds,
      expectedUpdatedAt: raw.expectedUpdatedAt,
    },
  };
}
