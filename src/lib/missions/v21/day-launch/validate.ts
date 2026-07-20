import type { CampaignDayLaunchConfig } from "@/lib/missions/v21/day-launch/launch-config";
import type {
  CampaignDayLaunchAcknowledgementStatus,
  CampaignDayLaunchAcknowledgementType,
  CampaignDayLaunchReadiness,
  CampaignDayLaunchSourceType,
} from "@/lib/missions/v21/day-launch/types";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-launch/launch-date";

const READINESS = new Set<CampaignDayLaunchReadiness>([
  "NOT_ASSESSED",
  "READY",
  "READY_WITH_ACCEPTED_RISK",
  "NOT_READY",
  "NO_MISSIONS_SCHEDULED",
]);

const ACK_STATUS = new Set<CampaignDayLaunchAcknowledgementStatus>([
  "OPEN",
  "ACKNOWLEDGED",
  "ACCEPTED_RISK",
  "RESOLVED",
  "NOT_APPLICABLE",
]);

const ACK_TYPE = new Set<CampaignDayLaunchAcknowledgementType>([
  "OVERNIGHT_CHANGE",
  "CARRY_FORWARD",
  "FIRST_MISSION_PREPARATION",
  "TRAVEL",
  "SCHEDULE_CONFLICT",
  "DUE_COMMITMENT",
  "LEADERSHIP_DECISION",
  "MATERIALS",
  "PEOPLE_BRIEF",
  "ORGANIZATION_BRIEF",
  "DATA_INTEGRITY",
  "OPERATOR_ADDED",
]);

const SOURCE_TYPE = new Set<CampaignDayLaunchSourceType>([
  "PRIOR_DAY_CLOSEOUT",
  "CARRY_FORWARD_ITEM",
  "CAMPAIGN_MISSION",
  "MISSION_PREPARATION",
  "MISSION_EXECUTION",
  "MISSION_DEBRIEF",
  "MISSION_FOLLOW_UP",
  "EVENT",
  "COMMAND_CENTER_RULE",
  "OPERATOR_ADDED",
]);

const FORBIDDEN = new Set([
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

export type LaunchPatchResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

function rejectForbidden(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN.has(key)) {
      return `Field "${key}" cannot be mutated from Morning Launch Review.`;
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

export function validateLaunchContentPatch(
  body: unknown,
  config: CampaignDayLaunchConfig,
): LaunchPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  const patch: Record<string, unknown> = {};
  if ("readinessAssessment" in raw) {
    if (
      typeof raw.readinessAssessment !== "string" ||
      !READINESS.has(raw.readinessAssessment as CampaignDayLaunchReadiness)
    ) {
      return { ok: false, error: "Invalid readinessAssessment." };
    }
    patch.readinessAssessment = raw.readinessAssessment;
  }
  for (const field of [
    "launchSummary",
    "overnightChangeNotes",
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
  return { ok: true, patch };
}

export function validateAcknowledgementCreate(body: unknown): LaunchPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = body as Record<string, unknown>;
  const forbidden = rejectForbidden(raw);
  if (forbidden) return { ok: false, error: forbidden };

  if (
    typeof raw.acknowledgementType !== "string" ||
    !ACK_TYPE.has(raw.acknowledgementType as CampaignDayLaunchAcknowledgementType)
  ) {
    return { ok: false, error: "Invalid acknowledgementType." };
  }
  if (
    typeof raw.sourceType !== "string" ||
    !SOURCE_TYPE.has(raw.sourceType as CampaignDayLaunchSourceType)
  ) {
    return { ok: false, error: "Invalid sourceType." };
  }
  if (typeof raw.title !== "string" || !raw.title.trim()) {
    return { ok: false, error: "title is required." };
  }

  return {
    ok: true,
    patch: {
      acknowledgementType: raw.acknowledgementType,
      sourceType: raw.sourceType,
      sourceRecordId:
        typeof raw.sourceRecordId === "string" ? raw.sourceRecordId : null,
      missionId: typeof raw.missionId === "string" ? raw.missionId : null,
      title: raw.title.trim(),
      importKeyHint:
        typeof raw.importKey === "string" ? raw.importKey : null,
      clientKey: typeof raw.clientKey === "string" ? raw.clientKey : null,
      status:
        typeof raw.status === "string" &&
        ACK_STATUS.has(raw.status as CampaignDayLaunchAcknowledgementStatus)
          ? raw.status
          : "ACKNOWLEDGED",
      acknowledgementNote:
        typeof raw.acknowledgementNote === "string"
          ? raw.acknowledgementNote.trim() || null
          : null,
      acceptedRiskReason:
        typeof raw.acceptedRiskReason === "string"
          ? raw.acceptedRiskReason.trim() || null
          : null,
    },
  };
}

export function validateAcknowledgementPatch(body: unknown): LaunchPatchResult {
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
      !ACK_STATUS.has(raw.status as CampaignDayLaunchAcknowledgementStatus)
    ) {
      return { ok: false, error: "Invalid status." };
    }
    patch.status = raw.status;
    if (raw.status === "ACCEPTED_RISK") {
      if (
        typeof raw.acceptedRiskReason !== "string" ||
        !raw.acceptedRiskReason.trim()
      ) {
        return {
          ok: false,
          error: "acceptedRiskReason is required when accepting risk.",
        };
      }
      patch.acceptedRiskReason = raw.acceptedRiskReason.trim();
    }
    if (raw.status === "NOT_APPLICABLE") {
      if (
        typeof raw.acknowledgementNote !== "string" ||
        !raw.acknowledgementNote.trim()
      ) {
        return {
          ok: false,
          error: "acknowledgementNote is required for Not Applicable.",
        };
      }
      patch.acknowledgementNote = raw.acknowledgementNote.trim();
    }
  }
  if ("acknowledgementNote" in raw && !("acknowledgementNote" in patch)) {
    patch.acknowledgementNote =
      typeof raw.acknowledgementNote === "string"
        ? raw.acknowledgementNote.trim() || null
        : null;
  }
  void parseBriefingDateKey;
  return { ok: true, patch };
}
