import type { LogisticsPackConfig } from "@/lib/missions/v21/logistics-pack/logistics-config";
import type { MissionLogisticsAcknowledgementDisposition, MissionLogisticsHandoffStatus, MissionLogisticsIssueType, MissionLogisticsItemCategory, MissionLogisticsItemCriticality, MissionLogisticsItemStatus, MissionLogisticsPackStatus, MissionLogisticsReadiness } from "@/lib/missions/v21/logistics-pack/types";

const set = <T extends string>(values: T[]) => new Set<T>(values);
const PACK_STATUS = set<MissionLogisticsPackStatus>(["DRAFT", "ACTIVE", "READY", "NEEDS_REVIEW", "INACTIVE", "CANCELLED"]);
const READINESS = set<MissionLogisticsReadiness>(["NOT_ASSESSED", "READY", "READY_WITH_ACCEPTED_RISK", "NOT_READY", "NOT_REQUIRED"]);
const CATEGORY = set<MissionLogisticsItemCategory>(["DOCUMENTS", "CREDENTIALS", "SIGNAGE", "PRINTED_MATERIALS", "TECHNOLOGY", "AUDIO_VISUAL", "WARDROBE", "FOOD_WATER", "ACCESSIBILITY", "SECURITY", "VOLUNTEER_MATERIALS", "GENERAL_SUPPLIES", "OTHER"]);
const ITEM_STATUS = set<MissionLogisticsItemStatus>(["REQUIRED", "ASSIGNED", "PACKED", "HANDED_OFF", "RECEIVED", "READY", "USED", "RETURN_PENDING", "RETURNED", "NOT_APPLICABLE", "CANCELLED"]);
const CRITICALITY = set<MissionLogisticsItemCriticality>(["CRITICAL", "STANDARD", "OPTIONAL"]);
const HANDOFF_STATUS = set<MissionLogisticsHandoffStatus>(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const ISSUE_TYPE = set<MissionLogisticsIssueType>(["NO_PACK", "CRITICAL_UNASSIGNED", "CRITICAL_NOT_PACKED", "DEPARTURE_NOT_READY", "HANDOFF_INCOMPLETE", "HANDOFF_PARTIAL_CONFIRM", "MISSING_OWNER", "ITEM_INCOMPLETE", "RETURN_OUTSTANDING", "STALE_AFTER_RESCHEDULE", "STALE_AFTER_TRAVEL_CHANGE", "CANCELLED_MISSION_ACTIVE_PACK", "WRONG_CAMPAIGN_DAY", "TIME_CONFLICT", "OWNER_OVERLAP", "OPERATOR_ADDED"]);
const DISPOSITION = set<MissionLogisticsAcknowledgementDisposition>(["ACKNOWLEDGED", "ACCEPTED_RISK", "RESOLVED", "NOT_APPLICABLE"]);
const FORBIDDEN = new Set(["lifecyclePhase", "missionStatus", "operationalStatus", "executionStatus", "debriefStatus", "followUpStatus", "startsAt", "endsAt", "eventId", "sourceEventId", "plannedDepartureAt"]);
export type LogisticsPatchResult = { ok: true; patch: Record<string, unknown> } | { ok: false; error: string };
const object = (body: unknown): Record<string, unknown> | null => body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
const forbidden = (raw: Record<string, unknown>) => Object.keys(raw).find((key) => FORBIDDEN.has(key));
function text(value: unknown, max: number, label: string): { ok: true; value: string | null } | { ok: false; error: string } { if (value == null) return { ok: true, value: null }; if (typeof value !== "string") return { ok: false, error: `${label} must be a string.` }; const valueTrimmed = value.trim(); return valueTrimmed.length > max ? { ok: false, error: `${label} must be at most ${max} characters.` } : { ok: true, value: valueTrimmed || null }; }
function iso(value: unknown, label: string): { ok: true; value: string | null } | { ok: false; error: string } { if (value == null || value === "") return { ok: true, value: null }; if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) return { ok: false, error: `${label} must be a valid ISO datetime.` }; return { ok: true, value: new Date(value).toISOString() }; }
function begin(body: unknown): { raw: Record<string, unknown> } | LogisticsPatchResult { const raw = object(body); if (!raw) return { ok: false, error: "Request body must be an object." }; const bad = forbidden(raw); return bad ? { ok: false, error: `Field "${bad}" cannot be mutated from Logistics Pack Operations.` } : { raw }; }
function enumField<T extends string>(raw: Record<string, unknown>, patch: Record<string, unknown>, field: string, values: Set<T>) { if (!(field in raw)) return null; if (typeof raw[field] !== "string" || !values.has(raw[field] as T)) return `Invalid ${field}.`; patch[field] = raw[field]; return null; }

export function validateLogisticsPackPatch(body: unknown, config: LogisticsPackConfig): LogisticsPatchResult {
  const started = begin(body); if (!("raw" in started)) return started; const { raw } = started; const patch: Record<string, unknown> = {};
  for (const [field, values] of [["status", PACK_STATUS], ["readinessState", READINESS]] as const) { const error = enumField(raw, patch, field, values); if (error) return { ok: false, error }; }
  if ("logisticsRequired" in raw) { if (raw.logisticsRequired !== null && typeof raw.logisticsRequired !== "boolean") return { ok: false, error: "logisticsRequired must be boolean or null." }; patch.logisticsRequired = raw.logisticsRequired; }
  for (const field of ["label", "packOwnerName", "packOwnerUserId", "assemblyLocation", "plannedHandoffLocation", "relatedTravelPlanId"] as const) if (field in raw) { const result = text(raw[field], 200, field); if (!result.ok) return result; patch[field] = result.value; }
  for (const field of ["acceptedRiskSummary", "logisticsNotes"] as const) if (field in raw) { const result = text(raw[field], config.maxSummaryChars, field); if (!result.ok) return result; patch[field] = result.value; }
  if ("internalNotes" in raw) { const result = text(raw.internalNotes, config.maxNotesChars, "internalNotes"); if (!result.ok) return result; patch.internalNotes = result.value; }
  if ("plannedHandoffAt" in raw) { const result = iso(raw.plannedHandoffAt, "plannedHandoffAt"); if (!result.ok) return result; patch.plannedHandoffAt = result.value; }
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  if (raw.confirmSchedule === true) patch.confirmSchedule = true;
  return { ok: true, patch };
}
export function validateLogisticsItemUpsert(body: unknown, config: LogisticsPackConfig): LogisticsPatchResult {
  const started = begin(body); if (!("raw" in started)) return started; const { raw } = started; const patch: Record<string, unknown> = {};
  if ("sequence" in raw && (!Number.isInteger(raw.sequence) || Number(raw.sequence) < 1 || Number(raw.sequence) > config.maxItems)) return { ok: false, error: `sequence must be an integer from 1 to ${config.maxItems}.` }; if ("sequence" in raw) patch.sequence = raw.sequence;
  for (const [field, values] of [["category", CATEGORY], ["status", ITEM_STATUS], ["criticality", CRITICALITY]] as const) { const error = enumField(raw, patch, field, values); if (error) return { ok: false, error }; }
  for (const field of ["description", "quantityLabel", "responsibleName", "responsibleUserId", "recipientName", "packLocation"] as const) if (field in raw) { const result = text(raw[field], config.maxSummaryChars, field); if (!result.ok) return result; if (field === "description" && !result.value) return { ok: false, error: "description is required." }; patch[field] = result.value; }
  if ("notes" in raw) { const result = text(raw.notes, config.maxNotesChars, "notes"); if (!result.ok) return result; patch.notes = result.value; }
  if ("requiredByAt" in raw) { const result = iso(raw.requiredByAt, "requiredByAt"); if (!result.ok) return result; patch.requiredByAt = result.value; }
  if ("returnRequired" in raw) { if (typeof raw.returnRequired !== "boolean") return { ok: false, error: "returnRequired must be a boolean." }; patch.returnRequired = raw.returnRequired; }
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  return { ok: true, patch };
}
export function validateLogisticsHandoffUpsert(body: unknown, config: LogisticsPackConfig): LogisticsPatchResult {
  const started = begin(body); if (!("raw" in started)) return started; const { raw } = started; const patch: Record<string, unknown> = {};
  const error = enumField(raw, patch, "status", HANDOFF_STATUS); if (error) return { ok: false, error };
  for (const field of ["logisticsItemId", "fromName", "toName", "plannedLocation", "actualLocation"] as const) if (field in raw) { const result = text(raw[field], config.maxSummaryChars, field); if (!result.ok) return result; patch[field] = result.value; }
  for (const field of ["plannedAt", "actualAt", "giverConfirmedAt", "receiverConfirmedAt"] as const) if (field in raw) { const result = iso(raw[field], field); if (!result.ok) return result; patch[field] = result.value; }
  if ("notes" in raw) { const result = text(raw.notes, config.maxNotesChars, "notes"); if (!result.ok) return result; patch.notes = result.value; }
  if ("expectedUpdatedAt" in raw) patch.expectedUpdatedAt = raw.expectedUpdatedAt;
  return { ok: true, patch };
}
export function validateLogisticsAcknowledgement(body: unknown): LogisticsPatchResult {
  const started = begin(body); if (!("raw" in started)) return started; const { raw } = started;
  if (typeof raw.issueKey !== "string" || !raw.issueKey.trim() || typeof raw.title !== "string" || !raw.title.trim()) return { ok: false, error: "issueKey and title are required." };
  if (typeof raw.issueType !== "string" || !ISSUE_TYPE.has(raw.issueType as MissionLogisticsIssueType) || typeof raw.disposition !== "string" || !DISPOSITION.has(raw.disposition as MissionLogisticsAcknowledgementDisposition)) return { ok: false, error: "Invalid issueType or disposition." };
  if (raw.disposition === "ACCEPTED_RISK" && (typeof raw.acceptedRiskReason !== "string" || !raw.acceptedRiskReason.trim())) return { ok: false, error: "acceptedRiskReason is required when accepting risk." };
  if (raw.disposition === "NOT_APPLICABLE" && (typeof raw.note !== "string" || !raw.note.trim())) return { ok: false, error: "note is required for Not Applicable." };
  return { ok: true, patch: { issueKey: raw.issueKey.trim(), issueType: raw.issueType, title: raw.title.trim(), disposition: raw.disposition, note: typeof raw.note === "string" ? raw.note.trim() || null : null, acceptedRiskReason: typeof raw.acceptedRiskReason === "string" ? raw.acceptedRiskReason.trim() || null : null } };
}
export function validateItemReorder(body: unknown, maxItems: number): LogisticsPatchResult { const started = begin(body); if (!("raw" in started)) return started; const ids = started.raw.orderedItemIds; if (!Array.isArray(ids) || ids.length > maxItems || !ids.every((id) => typeof id === "string" && id.trim()) || new Set(ids).size !== ids.length) return { ok: false, error: "orderedItemIds must be unique non-empty strings within the item limit." }; return { ok: true, patch: { orderedItemIds: ids, expectedUpdatedAt: started.raw.expectedUpdatedAt } }; }
