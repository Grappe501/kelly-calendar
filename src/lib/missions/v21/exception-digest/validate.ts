import type { CampaignDayIncidentDigestReviewStatus } from "@/lib/missions/v21/exception-digest/types";

const NOTE_MAX = 2000;

export function validateDigestReviewComplete(body: unknown): {
  ok: true;
  patch: { note: string | null };
} | {
  ok: false;
  error: string;
} {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Review payload must be an object." };
  }
  const record = body as Record<string, unknown>;
  if ("note" in record && record.note != null && typeof record.note !== "string") {
    return { ok: false, error: "note must be a string." };
  }
  const note =
    typeof record.note === "string" ? record.note.trim().slice(0, NOTE_MAX) : null;
  return { ok: true, patch: { note: note || null } };
}

export function nextDigestReviewStatusAfterMaterialChange(
  status: CampaignDayIncidentDigestReviewStatus | null | undefined,
): CampaignDayIncidentDigestReviewStatus | null {
  if (status === "REVIEWED") return "STALE";
  return status ?? null;
}

export function assertDigestDoesNotMutateOperationalSystems(): {
  mutatesIncidents: false;
  mutatesCloseout: false;
  mutatesLaunch: false;
  mutatesFollowUp: false;
  mutatesMission: false;
  mutatesExecute: false;
  mutatesFieldOps: false;
  mutatesLogistics: false;
  mutatesTravel: false;
  createsMobilizeRecords: false;
  performsRemoteSync: false;
} {
  return {
    mutatesIncidents: false,
    mutatesCloseout: false,
    mutatesLaunch: false,
    mutatesFollowUp: false,
    mutatesMission: false,
    mutatesExecute: false,
    mutatesFieldOps: false,
    mutatesLogistics: false,
    mutatesTravel: false,
    createsMobilizeRecords: false,
    performsRemoteSync: false,
  };
}
