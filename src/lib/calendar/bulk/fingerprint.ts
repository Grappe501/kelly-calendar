import { createHash } from "node:crypto";

/** Stable Event fingerprint for bulk preview/execute staleness — no titles/notes. */
export function buildBulkEventFingerprint(input: {
  eventId: string;
  version: number;
  status: string;
  archivedAt: Date | string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  primaryCalendarId: string;
}): string {
  const archived =
    input.archivedAt == null
      ? ""
      : input.archivedAt instanceof Date
        ? input.archivedAt.toISOString()
        : String(input.archivedAt);
  const starts =
    input.startsAt instanceof Date ? input.startsAt.toISOString() : String(input.startsAt);
  const ends =
    input.endsAt instanceof Date ? input.endsAt.toISOString() : String(input.endsAt);
  const raw = [
    input.eventId,
    input.version,
    input.status,
    archived,
    starts,
    ends,
    input.primaryCalendarId,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function buildBulkPreviewFingerprint(input: {
  actionType: string;
  campaignKey: string;
  eventFingerprints: string[];
  targetCalendarId?: string | null;
  reason?: string | null;
}): string {
  const sorted = [...input.eventFingerprints].sort();
  const raw = [
    input.actionType,
    input.campaignKey,
    input.targetCalendarId ?? "",
    input.reason?.trim() ?? "",
    ...sorted,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 40);
}

export function buildBulkIdempotencyKey(input: {
  actorUserId: string;
  actionType: string;
  previewFingerprint: string;
  clientNonce: string;
}): string {
  const raw = [
    input.actorUserId,
    input.actionType,
    input.previewFingerprint,
    input.clientNonce,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 48);
}
