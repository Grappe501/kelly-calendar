/**
 * Import provenance & audit contracts — shared by CC-01 apply and CC-02 console.
 * Keep this module free of server-only / Prisma imports so both layers can reuse it.
 */

export const IMPORT_APPLY_BUILD_ID =
  "KCCC-CC-01-IMPORT-APPROVAL-CANONICAL-APPLY-1.0" as const;

/** Stable audit action vocabulary (AuditLog.action). */
export const IMPORT_PROVENANCE_AUDIT_ACTIONS = {
  APPROVE: "IMPORT_RECORD_APPROVE",
  REJECT: "IMPORT_RECORD_REJECT",
  MERGE: "IMPORT_RECORD_MERGE",
  IDEMPOTENT_SKIP: "IMPORT_RECORD_IDEMPOTENT_SKIP",
  SOURCE_TIMING_APPLIED: "IMPORT_SOURCE_TIMING_APPLIED",
  SOURCE_DELETED_CANCEL: "IMPORT_SOURCE_DELETED_CANCEL",
} as const;

export type ImportProvenanceAuditAction =
  (typeof IMPORT_PROVENANCE_AUDIT_ACTIONS)[keyof typeof IMPORT_PROVENANCE_AUDIT_ACTIONS];

export type ImportApplyOutcomeKind =
  | "created"
  | "idempotent"
  | "merged"
  | "rejected"
  | "source_cancelled"
  | "timing_updated";

/**
 * Compact provenance snapshot stored on AuditLog / review metadata.
 * CC-02 integrity console should read this shape without CC-01 internals.
 */
export type ImportProvenanceSnapshot = {
  schemaVersion: 1;
  buildId: typeof IMPORT_APPLY_BUILD_ID;
  provider: string;
  externalSourceId: string | null;
  externalEventId: string | null;
  iCalUid: string | null;
  fingerprint: string;
  importRunId: string;
  importRecordId: string;
  canonicalEventId: string | null;
  applyOutcome: ImportApplyOutcomeKind;
  historicalAttendanceConfirmed: false;
  missionMutated: false;
  externalCalendarMutated: false;
  appliedAt: string;
};

export function buildImportProvenanceSnapshot(
  partial: Omit<
    ImportProvenanceSnapshot,
    | "schemaVersion"
    | "buildId"
    | "historicalAttendanceConfirmed"
    | "missionMutated"
    | "externalCalendarMutated"
    | "appliedAt"
  > & { appliedAt?: string },
): ImportProvenanceSnapshot {
  return {
    schemaVersion: 1,
    buildId: IMPORT_APPLY_BUILD_ID,
    historicalAttendanceConfirmed: false,
    missionMutated: false,
    externalCalendarMutated: false,
    appliedAt: partial.appliedAt ?? new Date().toISOString(),
    provider: partial.provider,
    externalSourceId: partial.externalSourceId,
    externalEventId: partial.externalEventId,
    iCalUid: partial.iCalUid,
    fingerprint: partial.fingerprint,
    importRunId: partial.importRunId,
    importRecordId: partial.importRecordId,
    canonicalEventId: partial.canonicalEventId,
    applyOutcome: partial.applyOutcome,
  };
}

/** ADR-081 — which fields local edits protect vs source timing may overwrite. */
export const IMPORT_FIELD_PRECEDENCE = {
  localWins: ["internalTitle", "campaignDisplayTitle", "privateNotes", "status"] as const,
  sourceTimingWinsWhenNeverRescheduled: ["startsAt", "endsAt", "timezone", "isAllDay"] as const,
} as const;

export function eventAppearsManuallyRescheduled(input: {
  statusHistoryReasons: Array<string | null | undefined>;
  auditActions?: Array<string | null | undefined>;
}): boolean {
  const reasons = input.statusHistoryReasons.map((r) => (r ?? "").toLowerCase());
  if (reasons.some((r) => r.includes("reschedule"))) return true;
  const actions = (input.auditActions ?? []).map((a) => (a ?? "").toUpperCase());
  return actions.some(
    (a) => a.includes("EVENT_RESCHEDULE") || a === "EVENT_RESCHEDULED",
  );
}
