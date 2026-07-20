import type { IncidentLogConfig } from "@/lib/missions/v21/incident-log/incident-config";
import type {
  MissionIncidentAcknowledgementDisposition,
  MissionIncidentCategory,
  MissionIncidentIssueType,
  MissionIncidentSensitivity,
  MissionIncidentSeverity,
  MissionIncidentStatus,
  MissionIncidentUpdateType,
} from "@/lib/missions/v21/incident-log/types";

const set = <T extends string>(values: T[]) => new Set<T>(values);

const CATEGORY = set<MissionIncidentCategory>([
  "SAFETY",
  "ACCESS",
  "SECURITY",
  "PRESS",
  "TRAVEL",
  "LOGISTICS",
  "TECHNOLOGY",
  "STAFFING",
  "SCHEDULE",
  "VENUE",
  "PUBLIC_INTERACTION",
  "OTHER",
]);
const SEVERITY = set<MissionIncidentSeverity>([
  "INFO",
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
]);
const STATUS = set<MissionIncidentStatus>([
  "OPEN",
  "MONITORING",
  "STABILIZED",
  "RESOLVED",
  "CLOSED",
]);
const SENSITIVITY = set<MissionIncidentSensitivity>([
  "STANDARD",
  "RESTRICTED",
  "CONFIDENTIAL",
]);
const UPDATE_TYPE = set<MissionIncidentUpdateType>([
  "OBSERVATION",
  "ACTION_TAKEN",
  "STATUS_CHANGE",
  "SEVERITY_CHANGE",
  "HANDOFF",
  "RESOLUTION",
  "FOLLOW_UP_NOTE",
  "CORRECTION",
]);
const ISSUE_TYPE = set<MissionIncidentIssueType>([
  "OPEN_HIGH_CRITICAL",
  "EXECUTE_COMPLETED_OPEN",
  "STABILIZED_UNRESOLVED",
  "CARRY_FORWARD_REQUIRED",
  "FOLLOW_UP_REQUIRED_UNLINKED",
  "CANCELLED_MISSION_ACTIVE",
  "UPDATED_AFTER_CLOSEOUT",
  "OVERNIGHT_ACTIVE",
  "MISSING_OWNER",
  "RESOLUTION_NOTE_MISSING",
  "OPERATOR_ADDED",
]);
const DISPOSITION = set<MissionIncidentAcknowledgementDisposition>([
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
  "incidentRef",
  "campaignDateKey",
  "missionId",
  "reportedAt",
  "reportedByUserId",
  "stabilizedAt",
  "stabilizedByUserId",
  "resolvedAt",
  "resolvedByUserId",
  "closedAt",
  "closedByUserId",
  "archivedAt",
  "archivedByUserId",
  "isArchived",
  "carriedForwardAt",
  "carriedForwardByUserId",
  "linkedFollowUpActionId",
  "linkedFollowUpImportKey",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId",
]);

export type IncidentPatchResult =
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
  required = false,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || value === "") {
    return required
      ? { ok: false, error: `${label} is required.` }
      : { ok: true, value: null };
  }
  if (typeof value !== "string")
    return { ok: false, error: `${label} must be a string.` };
  const valueTrimmed = value.trim();
  if (required && !valueTrimmed)
    return { ok: false, error: `${label} is required.` };
  return valueTrimmed.length > max
    ? { ok: false, error: `${label} must be at most ${max} characters.` }
    : { ok: true, value: valueTrimmed || null };
}

function iso(
  value: unknown,
  label: string,
  required = false,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || value === "") {
    return required
      ? { ok: false, error: `${label} is required.` }
      : { ok: true, value: null };
  }
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    return { ok: false, error: `${label} must be a valid ISO datetime.` };
  }
  return { ok: true, value: new Date(value).toISOString() };
}

function begin(
  body: unknown,
  surface: string,
): { raw: Record<string, unknown> } | IncidentPatchResult {
  const raw = object(body);
  if (!raw) return { ok: false, error: "Request body must be an object." };
  const bad = forbidden(raw);
  return bad
    ? {
        ok: false,
        error: `Field "${bad}" cannot be mutated from ${surface}.`,
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

function applyIncidentFields(
  raw: Record<string, unknown>,
  patch: Record<string, unknown>,
  config: IncidentLogConfig,
  requireSummary: boolean,
): IncidentPatchResult | null {
  for (const [field, values] of [
    ["category", CATEGORY],
    ["severity", SEVERITY],
    ["status", STATUS],
    ["sensitivity", SENSITIVITY],
  ] as const) {
    const error = enumField(raw, patch, field, values);
    if (error) return { ok: false, error };
  }
  if ("summary" in raw || requireSummary) {
    const result = text(raw.summary, config.maxSummaryChars, "summary", requireSummary);
    if (!result.ok) return result;
    if ("summary" in raw || requireSummary) patch.summary = result.value;
  }
  if ("description" in raw) {
    const result = text(
      raw.description,
      config.maxDescriptionChars,
      "description",
    );
    if (!result.ok) return result;
    patch.description = result.value;
  }
  if ("observedAt" in raw || requireSummary) {
    const result = iso(raw.observedAt, "observedAt", requireSummary);
    if (!result.ok) return result;
    if ("observedAt" in raw || requireSummary) patch.observedAt = result.value;
  }
  for (const field of ["locationLabel", "ownerName", "ownerUserId"] as const) {
    if (field in raw) {
      const result = text(raw[field], 200, field);
      if (!result.ok) return result;
      patch[field] = result.value;
    }
  }
  if ("immediateActionSummary" in raw) {
    const result = text(
      raw.immediateActionSummary,
      config.maxActionChars,
      "immediateActionSummary",
    );
    if (!result.ok) return result;
    patch.immediateActionSummary = result.value;
  }
  for (const field of ["followUpRequired", "carryForwardRequired"] as const) {
    if (field in raw) {
      if (typeof raw[field] !== "boolean") {
        return { ok: false, error: `${field} must be a boolean.` };
      }
      patch[field] = raw[field];
    }
  }
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  return null;
}

export function validateIncidentCreate(
  body: unknown,
  config: IncidentLogConfig,
): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log");
  if (!("raw" in started)) return started;
  const patch: Record<string, unknown> = {};
  const error = applyIncidentFields(started.raw, patch, config, true);
  if (error) return error;
  if (!patch.summary || !patch.observedAt) {
    return { ok: false, error: "summary and observedAt are required." };
  }
  return { ok: true, patch };
}

export function validateIncidentPatch(
  body: unknown,
  config: IncidentLogConfig,
): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log");
  if (!("raw" in started)) return started;
  const patch: Record<string, unknown> = {};
  const error = applyIncidentFields(started.raw, patch, config, false);
  if (error) return error;
  if (!Object.keys(patch).length) {
    return { ok: false, error: "No supported incident fields were provided." };
  }
  return { ok: true, patch };
}

export function validateIncidentUpdateAppend(
  body: unknown,
  config: IncidentLogConfig,
): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log updates");
  if (!("raw" in started)) return started;
  const { raw } = started;
  const patch: Record<string, unknown> = {};
  const typeErr = enumField(raw, patch, "updateType", UPDATE_TYPE);
  if (typeErr) return { ok: false, error: typeErr };
  if (!("updateType" in patch)) {
    return { ok: false, error: "updateType is required." };
  }
  const sensErr = enumField(raw, patch, "sensitivity", SENSITIVITY);
  if (sensErr) return { ok: false, error: sensErr };
  if ("note" in raw) {
    const result = text(raw.note, config.maxNotesChars, "note");
    if (!result.ok) return result;
    patch.note = result.value;
  }
  if ("actionTaken" in raw) {
    const result = text(raw.actionTaken, config.maxActionChars, "actionTaken");
    if (!result.ok) return result;
    patch.actionTaken = result.value;
  }
  const occurred = iso(raw.occurredAt, "occurredAt", true);
  if (!occurred.ok) return occurred;
  patch.occurredAt = occurred.value;
  if (patch.updateType === "RESOLUTION" && !patch.note) {
    return {
      ok: false,
      error: "note is required for RESOLUTION updates.",
    };
  }
  return { ok: true, patch };
}

export function validateIncidentAcknowledgement(
  body: unknown,
): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log acknowledgements");
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
  if (!("issueType" in patch)) {
    return { ok: false, error: "issueType is required." };
  }
  const dispErr = enumField(raw, patch, "disposition", DISPOSITION);
  if (dispErr) return { ok: false, error: dispErr };
  if (!("disposition" in patch)) {
    return { ok: false, error: "disposition is required." };
  }
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
  if (patch.disposition === "ACCEPTED_RISK" && !patch.acceptedRiskReason) {
    return {
      ok: false,
      error: "acceptedRiskReason is required for ACCEPTED_RISK.",
    };
  }
  return { ok: true, patch };
}

export function validateIncidentArchive(body: unknown): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log archive");
  if (!("raw" in started)) return started;
  const patch: Record<string, unknown> = { archive: true };
  if ("expectedUpdatedAt" in started.raw) {
    patch.expectedUpdatedAt = started.raw.expectedUpdatedAt;
  }
  return { ok: true, patch };
}

export function validateIncidentCarryForward(
  body: unknown,
): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log carry-forward");
  if (!("raw" in started)) return started;
  const patch: Record<string, unknown> = {};
  if (started.raw.markRequired === true) patch.markRequired = true;
  if (started.raw.markCarried === true) patch.markCarried = true;
  if ("expectedUpdatedAt" in started.raw) {
    patch.expectedUpdatedAt = started.raw.expectedUpdatedAt;
  }
  if (!patch.markRequired && !patch.markCarried) {
    return {
      ok: false,
      error: "markRequired or markCarried must be true.",
    };
  }
  return { ok: true, patch };
}

export function validateIncidentLinkFollowUp(
  body: unknown,
): IncidentPatchResult {
  const started = begin(body, "Mission Incident Log follow-up link");
  if (!("raw" in started)) return started;
  const { raw } = started;
  if (
    typeof raw.linkedFollowUpActionId !== "string" ||
    !raw.linkedFollowUpActionId.trim()
  ) {
    return { ok: false, error: "linkedFollowUpActionId is required." };
  }
  const patch: Record<string, unknown> = {
    linkedFollowUpActionId: raw.linkedFollowUpActionId.trim(),
  };
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  return { ok: true, patch };
}
