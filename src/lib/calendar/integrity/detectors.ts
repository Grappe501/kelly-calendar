/**
 * Pure integrity detectors — run in validators, on-demand scans, and future CC-11 jobs.
 * Never mutate Event/Mission data.
 */

import {
  CALENDAR_INTEGRITY_DETECTOR_VERSION,
  type IntegrityFindingDraft,
} from "@/lib/calendar/integrity/types";
import {
  chicagoDayKey,
  extractIngestKey,
  extractImportFingerprint,
  normalizeEventTitle,
  redactLocationForEvidence,
  stableIntegrityFindingKey,
  timesOverlap,
} from "@/lib/calendar/integrity/normalize";

export type IntegrityEventSnapshot = {
  id: string;
  eventNumber: string;
  internalTitle: string;
  campaignDisplayTitle: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  isImported: boolean;
  isRecurring: boolean;
  recurrenceSeriesId: string | null;
  recurrenceRule: string | null;
  originalOccurrenceAt: Date | null;
  city: string | null;
  streetAddress: string | null;
  privateNotes: string | null;
  sourceType: string;
  primaryCalendarId: string;
  primaryCalendarSlug: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  membershipCalendarIds: string[];
  primaryMembershipCount: number;
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; reason: string | null }>;
  externalIdentityIds: string[];
  importRecordIds: string[];
  missionId: string | null;
};

export type IntegrityIdentitySnapshot = {
  id: string;
  externalSourceId: string;
  externalEventId: string | null;
  fingerprint: string;
  canonicalEventId: string | null;
  deletedAt: Date | null;
  provider: string;
};

export type IntegrityImportRecordSnapshot = {
  id: string;
  importRunId: string;
  rawFingerprint: string;
  reviewStatus: string;
  canonicalEventId: string | null;
  externalEventIdentityId: string | null;
};

export type IntegrityImportRunSnapshot = {
  id: string;
  externalSourceId: string;
  status: string;
  stagedCount: number;
  approvedCount: number;
  rejectedCount: number;
  errorCount: number;
  recordIds: string[];
};

export type IntegrityMissionSnapshot = {
  id: string;
  sourceEventId: string;
};

export type IntegrityDetectorInput = {
  events: IntegrityEventSnapshot[];
  identities: IntegrityIdentitySnapshot[];
  importRecords: IntegrityImportRecordSnapshot[];
  importRuns: IntegrityImportRunSnapshot[];
  missions?: IntegrityMissionSnapshot[];
  /** Audit actions keyed by Event id (optional). */
  eventAuditActions?: Record<string, string[]>;
};

function draft(
  partial: Omit<IntegrityFindingDraft, "detectionVersion" | "repairAvailable"> & {
    repairAvailable?: boolean;
  },
): IntegrityFindingDraft {
  return {
    ...partial,
    repairAvailable: partial.repairAvailable ?? false,
    detectionVersion: CALENDAR_INTEGRITY_DETECTOR_VERSION,
  };
}

export function detectDuplicateFindings(
  events: IntegrityEventSnapshot[],
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  const active = events.filter((e) => !e.archivedAt && e.status !== "CANCELLED");
  const allNonArchived = events.filter((e) => !e.archivedAt);

  // Exact window + title
  const byExact = new Map<string, IntegrityEventSnapshot[]>();
  for (const e of active) {
    const key = [
      e.startsAt.toISOString(),
      e.endsAt.toISOString(),
      normalizeEventTitle(e.campaignDisplayTitle || e.internalTitle),
      e.primaryCalendarSlug,
    ].join("|");
    const list = byExact.get(key) ?? [];
    list.push(e);
    byExact.set(key, list);
  }
  for (const [bucket, group] of byExact) {
    if (group.length < 2) continue;
    const ids = group.map((g) => g.id).sort();
    out.push(
      draft({
        findingType: "EXACT_DUPLICATE_GROUP",
        findingKey: stableIntegrityFindingKey("EXACT_DUPLICATE_GROUP", [bucket, ...ids]),
        severity: "ERROR",
        summary: `${group.length} active Events share the same title, time window, and calendar.`,
        evidence: {
          confidence: "exact",
          matchedFields: ["title", "startsAt", "endsAt", "calendar"],
          eventNumbers: group.map((g) => g.eventNumber),
          eventIds: ids,
          location: redactLocationForEvidence(group[0]?.city, group[0]?.streetAddress),
        },
        primaryEventId: ids[0] ?? null,
        relatedEventIds: ids.slice(1),
        externalSourceId: null,
        externalIdentityId: null,
        importRunId: null,
        importRecordId: null,
      }),
    );
  }

  // Same Chicago day + title + overlapping times → near duplicate
  const byDayTitle = new Map<string, IntegrityEventSnapshot[]>();
  for (const e of active) {
    const key = `${chicagoDayKey(e.startsAt)}|${normalizeEventTitle(e.campaignDisplayTitle || e.internalTitle)}`;
    const list = byDayTitle.get(key) ?? [];
    list.push(e);
    byDayTitle.set(key, list);
  }
  for (const [bucket, group] of byDayTitle) {
    if (group.length < 2) continue;
    // Skip if already covered as exact
    const pairs: Array<[IntegrityEventSnapshot, IntegrityEventSnapshot]> = [];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        const exactSame =
          a.startsAt.getTime() === b.startsAt.getTime() &&
          a.endsAt.getTime() === b.endsAt.getTime() &&
          a.primaryCalendarSlug === b.primaryCalendarSlug;
        if (exactSame) continue;
        if (timesOverlap(a.startsAt, a.endsAt, b.startsAt, b.endsAt)) {
          pairs.push([a, b]);
        }
      }
    }
    for (const [a, b] of pairs) {
      const ids = [a.id, b.id].sort();
      out.push(
        draft({
          findingType: "NEAR_DUPLICATE_CANDIDATE",
          findingKey: stableIntegrityFindingKey("NEAR_DUPLICATE_CANDIDATE", [
            bucket,
            ...ids,
          ]),
          severity: "WARNING",
          summary: `Near-duplicate candidate: overlapping times on the same Chicago day with similar titles.`,
          evidence: {
            confidence: "candidate",
            matchedFields: ["chicagoDay", "normalizedTitle", "timeOverlap"],
            differedFields: ["startsAt", "endsAt", "calendar"].filter(
              (f) =>
                (f === "startsAt" && a.startsAt.getTime() !== b.startsAt.getTime()) ||
                (f === "endsAt" && a.endsAt.getTime() !== b.endsAt.getTime()) ||
                (f === "calendar" && a.primaryCalendarSlug !== b.primaryCalendarSlug),
            ),
            eventNumbers: [a.eventNumber, b.eventNumber],
            eventIds: ids,
          },
          primaryEventId: ids[0] ?? null,
          relatedEventIds: ids.slice(1),
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
  }

  // ingestKey clones
  const byIngest = new Map<string, IntegrityEventSnapshot[]>();
  for (const e of allNonArchived) {
    const key = extractIngestKey(e.privateNotes);
    if (!key) continue;
    const list = byIngest.get(key) ?? [];
    list.push(e);
    byIngest.set(key, list);
  }
  for (const [ingestKey, group] of byIngest) {
    if (group.length < 2) continue;
    const ids = group.map((g) => g.id).sort();
    const hasActive = group.some((g) => g.status !== "CANCELLED");
    const hasCancelled = group.some((g) => g.status === "CANCELLED");
    out.push(
      draft({
        findingType: hasActive && hasCancelled ? "ACTIVE_CANCELLED_CLONE" : "INGEST_KEY_CLONE",
        findingKey: stableIntegrityFindingKey(
          hasActive && hasCancelled ? "ACTIVE_CANCELLED_CLONE" : "INGEST_KEY_CLONE",
          [ingestKey, ...ids],
        ),
        severity: hasActive && hasCancelled ? "ERROR" : "WARNING",
        summary:
          hasActive && hasCancelled
            ? `Active and cancelled clones share ingestKey ${ingestKey}.`
            : `Multiple Events share ingestKey ${ingestKey}.`,
        evidence: {
          ingestKey,
          eventNumbers: group.map((g) => g.eventNumber),
          statuses: group.map((g) => g.status),
          eventIds: ids,
        },
        primaryEventId: ids[0] ?? null,
        relatedEventIds: ids.slice(1),
        externalSourceId: null,
        externalIdentityId: null,
        importRunId: null,
        importRecordId: null,
      }),
    );
  }

  // Recurrence occurrence duplicates (same series + same originalOccurrenceAt)
  const byOcc = new Map<string, IntegrityEventSnapshot[]>();
  for (const e of allNonArchived) {
    if (!e.recurrenceSeriesId || !e.originalOccurrenceAt) continue;
    const key = `${e.recurrenceSeriesId}|${e.originalOccurrenceAt.toISOString()}`;
    const list = byOcc.get(key) ?? [];
    list.push(e);
    byOcc.set(key, list);
  }
  for (const [bucket, group] of byOcc) {
    if (group.length < 2) continue;
    const ids = group.map((g) => g.id).sort();
    out.push(
      draft({
        findingType: "RECURRENCE_OCCURRENCE_DUPLICATE",
        findingKey: stableIntegrityFindingKey("RECURRENCE_OCCURRENCE_DUPLICATE", [
          bucket,
          ...ids,
        ]),
        severity: "ERROR",
        summary: "Duplicate materialized occurrences share series identity and original start.",
        evidence: {
          recurrenceSeriesId: group[0]?.recurrenceSeriesId,
          eventIds: ids,
          eventNumbers: group.map((g) => g.eventNumber),
        },
        primaryEventId: ids[0] ?? null,
        relatedEventIds: ids.slice(1),
        externalSourceId: null,
        externalIdentityId: null,
        importRunId: null,
        importRecordId: null,
      }),
    );
  }

  return out;
}

export function detectSharedIdentityFindings(
  identities: IntegrityIdentitySnapshot[],
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  const byExternal = new Map<string, IntegrityIdentitySnapshot[]>();
  for (const id of identities) {
    if (!id.externalEventId || id.deletedAt) continue;
    const key = `${id.externalSourceId}|${id.externalEventId}`;
    const list = byExternal.get(key) ?? [];
    list.push(id);
    byExternal.set(key, list);
  }
  for (const [bucket, group] of byExternal) {
    const eventIds = [
      ...new Set(group.map((g) => g.canonicalEventId).filter(Boolean) as string[]),
    ].sort();
    if (eventIds.length < 2) continue;
    out.push(
      draft({
        findingType: "SHARED_EXTERNAL_IDENTITY",
        findingKey: stableIntegrityFindingKey("SHARED_EXTERNAL_IDENTITY", [
          bucket,
          ...eventIds,
        ]),
        severity: "CRITICAL",
        summary: "One external source event maps to multiple canonical Events.",
        evidence: {
          externalEventId: group[0]?.externalEventId,
          identityIds: group.map((g) => g.id),
          eventIds,
        },
        primaryEventId: eventIds[0] ?? null,
        relatedEventIds: eventIds.slice(1),
        externalSourceId: group[0]?.externalSourceId ?? null,
        externalIdentityId: group[0]?.id ?? null,
        importRunId: null,
        importRecordId: null,
      }),
    );
  }
  return out;
}

export function detectProvenanceFindings(
  events: IntegrityEventSnapshot[],
  identities: IntegrityIdentitySnapshot[],
  eventAuditActions: Record<string, string[]> = {},
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  const identitiesByEvent = new Map<string, IntegrityIdentitySnapshot[]>();
  for (const id of identities) {
    if (!id.canonicalEventId) {
      out.push(
        draft({
          findingType: "ORPHANED_EXTERNAL_IDENTITY",
          findingKey: stableIntegrityFindingKey("ORPHANED_EXTERNAL_IDENTITY", [id.id]),
          severity: "WARNING",
          summary: "ExternalEventIdentity has no linked canonical Event.",
          evidence: {
            identityId: id.id,
            fingerprint: id.fingerprint,
            externalEventId: id.externalEventId,
            provider: id.provider,
          },
          primaryEventId: null,
          relatedEventIds: [],
          externalSourceId: id.externalSourceId,
          externalIdentityId: id.id,
          importRunId: null,
          importRecordId: null,
        }),
      );
      continue;
    }
    const list = identitiesByEvent.get(id.canonicalEventId) ?? [];
    list.push(id);
    identitiesByEvent.set(id.canonicalEventId, list);
  }

  for (const e of events) {
    if (e.archivedAt) continue;
    const ids = identitiesByEvent.get(e.id) ?? [];
    if (e.isImported && ids.length === 0) {
      const ingestKey = extractIngestKey(e.privateNotes);
      const fp = extractImportFingerprint(e.privateNotes);
      out.push(
        draft({
          findingType: ingestKey && !fp ? "LEGACY_INGEST_KEY_ONLY" : "IMPORTED_WITHOUT_IDENTITY",
          findingKey: stableIntegrityFindingKey(
            ingestKey && !fp ? "LEGACY_INGEST_KEY_ONLY" : "IMPORTED_WITHOUT_IDENTITY",
            [e.id],
          ),
          severity: "WARNING",
          summary: ingestKey
            ? "Imported Event relies on legacy ingestKey notes without ExternalEventIdentity."
            : "Imported Event has no ExternalEventIdentity.",
          evidence: {
            eventNumber: e.eventNumber,
            ingestKey,
            importFingerprintNote: fp,
            sourceType: e.sourceType,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (!e.isImported && e.sourceType === "GOOGLE_CALENDAR") {
      out.push(
        draft({
          findingType: "LOCAL_MARKED_IMPORTED_FALSELY",
          findingKey: stableIntegrityFindingKey("LOCAL_MARKED_IMPORTED_FALSELY", [e.id]),
          severity: "WARNING",
          summary: "Event sourceType is GOOGLE_CALENDAR but isImported is false.",
          evidence: { eventNumber: e.eventNumber, sourceType: e.sourceType },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (ids.length > 1) {
      const active = ids.filter((i) => !i.deletedAt);
      if (active.length > 1) {
        out.push(
          draft({
            findingType: "MULTIPLE_ACTIVE_IDENTITIES",
            findingKey: stableIntegrityFindingKey("MULTIPLE_ACTIVE_IDENTITIES", [
              e.id,
              ...active.map((a) => a.id).sort(),
            ]),
            severity: "ERROR",
            summary: "Event has multiple active external identities.",
            evidence: {
              eventNumber: e.eventNumber,
              identityIds: active.map((a) => a.id),
              fingerprints: active.map((a) => a.fingerprint),
            },
            primaryEventId: e.id,
            relatedEventIds: [],
            externalSourceId: active[0]?.externalSourceId ?? null,
            externalIdentityId: active[0]?.id ?? null,
            importRunId: null,
            importRecordId: null,
          }),
        );
      }
    }
    if (e.isImported && e.importRecordIds.length === 0 && ids.length > 0) {
      out.push(
        draft({
          findingType: "MISSING_IMPORT_LINKAGE",
          findingKey: stableIntegrityFindingKey("MISSING_IMPORT_LINKAGE", [e.id]),
          severity: "INFO",
          summary: "Imported Event has identity but no CalendarImportRecord linkage.",
          evidence: { eventNumber: e.eventNumber, identityIds: ids.map((i) => i.id) },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: ids[0]?.externalSourceId ?? null,
          externalIdentityId: ids[0]?.id ?? null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (e.isImported && Object.prototype.hasOwnProperty.call(eventAuditActions, e.id)) {
      const actions = eventAuditActions[e.id] ?? [];
      const hasImportAudit = actions.some(
        (a) =>
          a.includes("IMPORT_RECORD") ||
          a === "EVENT_CREATED" ||
          a.includes("IMPORT"),
      );
      if (!hasImportAudit) {
        out.push(
          draft({
            findingType: "IMPORT_WITHOUT_AUDIT",
            findingKey: stableIntegrityFindingKey("IMPORT_WITHOUT_AUDIT", [e.id]),
            severity: "WARNING",
            summary: "Imported Event has no import/create audit trail in loaded history.",
            evidence: {
              eventNumber: e.eventNumber,
              auditActionCount: actions.length,
            },
            primaryEventId: e.id,
            relatedEventIds: [],
            externalSourceId: ids[0]?.externalSourceId ?? null,
            externalIdentityId: ids[0]?.id ?? null,
            importRunId: null,
            importRecordId: null,
          }),
        );
      }
    }
  }
  return out;
}

/**
 * Source/local drift — report only. Never auto-resolve (ADR-081 / ADR-085).
 * Fingerprint mismatch + local edit signals classify drift; field-level conflicts stay advisory.
 */
export function detectDriftFindings(
  events: IntegrityEventSnapshot[],
  identities: IntegrityIdentitySnapshot[],
  eventAuditActions: Record<string, string[]> = {},
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  const identitiesByEvent = new Map<string, IntegrityIdentitySnapshot[]>();
  for (const id of identities) {
    if (!id.canonicalEventId) continue;
    const list = identitiesByEvent.get(id.canonicalEventId) ?? [];
    list.push(id);
    identitiesByEvent.set(id.canonicalEventId, list);
  }

  for (const e of events) {
    if (!e.isImported || e.archivedAt) continue;
    const allIds = identitiesByEvent.get(e.id) ?? [];
    const ids = allIds.filter((i) => !i.deletedAt);
    const deletedIdentity = allIds.find((i) => i.deletedAt);
    const noteFp = extractImportFingerprint(e.privateNotes);
    const identityFp = ids[0]?.fingerprint ?? deletedIdentity?.fingerprint ?? null;
    const sourceChanged =
      Boolean(noteFp && identityFp && noteFp !== identityFp) ||
      Boolean(deletedIdentity);
    const localChanged =
      e.updatedAt.getTime() - e.createdAt.getTime() > 60_000 ||
      (eventAuditActions[e.id] ?? []).some(
        (a) =>
          a.includes("EVENT_UPDATE") ||
          a.includes("EVENT_RESCHEDULE") ||
          a.includes("EVENT_EDIT"),
      );
    const manuallyRescheduled = (eventAuditActions[e.id] ?? []).some(
      (a) => a.includes("EVENT_RESCHEDULE") || a === "EVENT_RESCHEDULED",
    );

    let classification:
      | "SOURCE_UNCHANGED_LOCAL_UNCHANGED"
      | "SOURCE_CHANGED_LOCAL_UNCHANGED"
      | "SOURCE_UNCHANGED_LOCAL_CHANGED"
      | "SOURCE_AND_LOCAL_CHANGED"
      | "SOURCE_DELETED_LOCAL_ACTIVE"
      | "SOURCE_ACTIVE_LOCAL_CANCELLED" = "SOURCE_UNCHANGED_LOCAL_UNCHANGED";

    if (deletedIdentity && e.status !== "CANCELLED") {
      classification = "SOURCE_DELETED_LOCAL_ACTIVE";
    } else if (!deletedIdentity && e.status === "CANCELLED") {
      classification = "SOURCE_ACTIVE_LOCAL_CANCELLED";
    } else if (sourceChanged && localChanged) {
      classification = "SOURCE_AND_LOCAL_CHANGED";
    } else if (sourceChanged) {
      classification = "SOURCE_CHANGED_LOCAL_UNCHANGED";
    } else if (localChanged) {
      classification = "SOURCE_UNCHANGED_LOCAL_CHANGED";
    }

    if (classification !== "SOURCE_UNCHANGED_LOCAL_UNCHANGED") {
      out.push(
        draft({
          findingType: "SOURCE_LOCAL_DRIFT",
          findingKey: stableIntegrityFindingKey("SOURCE_LOCAL_DRIFT", [
            e.id,
            classification,
          ]),
          severity:
            classification === "SOURCE_DELETED_LOCAL_ACTIVE" ||
            classification === "SOURCE_AND_LOCAL_CHANGED"
              ? "ERROR"
              : "WARNING",
          summary: `Source/local drift classified as ${classification}.`,
          evidence: {
            classification,
            eventNumber: e.eventNumber,
            noteFingerprint: noteFp,
            identityFingerprint: identityFp,
            sourceChanged,
            localChanged,
            location: redactLocationForEvidence(e.city, e.streetAddress),
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId:
            ids[0]?.externalSourceId ?? deletedIdentity?.externalSourceId ?? null,
          externalIdentityId: ids[0]?.id ?? deletedIdentity?.id ?? null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }

    if (
      (classification === "SOURCE_UNCHANGED_LOCAL_CHANGED" ||
        classification === "SOURCE_AND_LOCAL_CHANGED") &&
      !manuallyRescheduled
    ) {
      out.push(
        draft({
          findingType: "ADR081_PROTECTED_LOCAL_FIELDS",
          findingKey: stableIntegrityFindingKey("ADR081_PROTECTED_LOCAL_FIELDS", [
            e.id,
          ]),
          severity: "INFO",
          summary:
            "Local edits may protect title/notes/status under ADR-081; source timing only if never manually rescheduled.",
          evidence: {
            eventNumber: e.eventNumber,
            protectedFields: ["title", "notes", "status"],
            sourceTimingEligible: !manuallyRescheduled,
            driftClassification: classification,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: ids[0]?.externalSourceId ?? null,
          externalIdentityId: ids[0]?.id ?? null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }

    if (sourceChanged && localChanged && noteFp && identityFp && noteFp !== identityFp) {
      out.push(
        draft({
          findingType: "UNRESOLVABLE_FIELD_CONFLICT",
          findingKey: stableIntegrityFindingKey("UNRESOLVABLE_FIELD_CONFLICT", [
            e.id,
            noteFp.slice(0, 12),
            identityFp.slice(0, 12),
          ]),
          severity: "WARNING",
          summary:
            "Source fingerprint and local import fingerprint differ while local edits exist — operator must reconcile; CC-02 does not auto-resolve.",
          evidence: {
            eventNumber: e.eventNumber,
            noteFingerprint: noteFp,
            identityFingerprint: identityFp,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: ids[0]?.externalSourceId ?? null,
          externalIdentityId: ids[0]?.id ?? null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
  }
  return out;
}

/** Mission-boundary anomalies — report only; never mutate Missions. */
export function detectMissionBoundaryFindings(
  events: IntegrityEventSnapshot[],
  missions: IntegrityMissionSnapshot[] = [],
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  const eventIds = new Set(events.map((e) => e.id));
  const missionsByEvent = new Map<string, IntegrityMissionSnapshot[]>();
  for (const m of missions) {
    const list = missionsByEvent.get(m.sourceEventId) ?? [];
    list.push(m);
    missionsByEvent.set(m.sourceEventId, list);
    if (!eventIds.has(m.sourceEventId)) {
      out.push(
        draft({
          findingType: "MISSION_BOUNDARY_ANOMALY",
          findingKey: stableIntegrityFindingKey("MISSION_BOUNDARY_ANOMALY", [
            "orphan-mission",
            m.id,
          ]),
          severity: "ERROR",
          summary: "CampaignMission references a missing source Event (report only).",
          evidence: { missionId: m.id, sourceEventId: m.sourceEventId },
          primaryEventId: null,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
  }
  for (const [eventId, group] of missionsByEvent) {
    if (group.length < 2) continue;
    out.push(
      draft({
        findingType: "MISSION_BOUNDARY_ANOMALY",
        findingKey: stableIntegrityFindingKey("MISSION_BOUNDARY_ANOMALY", [
          "multi-mission",
          eventId,
          ...group.map((g) => g.id).sort(),
        ]),
        severity: "CRITICAL",
        summary:
          "More than one Mission references the same Event (1:1 required). CC-02 does not repair Missions.",
        evidence: {
          eventId,
          missionIds: group.map((g) => g.id),
        },
        primaryEventId: eventId,
        relatedEventIds: [],
        externalSourceId: null,
        externalIdentityId: null,
        importRunId: null,
        importRecordId: null,
      }),
    );
  }
  for (const e of events) {
    if (e.missionId && !missionsByEvent.has(e.id) && missions.length > 0) {
      out.push(
        draft({
          findingType: "MISSION_BOUNDARY_ANOMALY",
          findingKey: stableIntegrityFindingKey("MISSION_BOUNDARY_ANOMALY", [
            "event-mission-pointer",
            e.id,
            e.missionId,
          ]),
          severity: "WARNING",
          summary: "Event reports a Mission id that is not in the loaded Mission set.",
          evidence: { eventNumber: e.eventNumber, missionId: e.missionId },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (
      e.primaryCalendarId &&
      e.membershipCalendarIds.length > 0 &&
      !e.membershipCalendarIds.includes(e.primaryCalendarId)
    ) {
      out.push(
        draft({
          findingType: "ORPHANED_CALENDAR_MEMBERSHIP",
          findingKey: stableIntegrityFindingKey("ORPHANED_CALENDAR_MEMBERSHIP", [
            e.id,
          ]),
          severity: "WARNING",
          summary: "Primary calendar id is not present in Event membership rows.",
          evidence: {
            eventNumber: e.eventNumber,
            primaryCalendarId: e.primaryCalendarId,
            membershipCalendarIds: e.membershipCalendarIds,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
  }
  return out;
}

export function detectImportIntegrityFindings(
  records: IntegrityImportRecordSnapshot[],
  runs: IntegrityImportRunSnapshot[],
  events: IntegrityEventSnapshot[],
  identities: IntegrityIdentitySnapshot[],
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  const eventIds = new Set(events.map((e) => e.id));
  const eventsById = new Map(events.map((e) => [e.id, e]));

  for (const rec of records) {
    if (rec.reviewStatus === "APPROVED" && !rec.canonicalEventId) {
      out.push(
        draft({
          findingType: "APPROVED_WITHOUT_EVENT",
          findingKey: stableIntegrityFindingKey("APPROVED_WITHOUT_EVENT", [rec.id]),
          severity: "ERROR",
          summary: "Approved import record has no canonical Event.",
          evidence: { importRecordId: rec.id, fingerprint: rec.rawFingerprint },
          primaryEventId: null,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: rec.externalEventIdentityId,
          importRunId: rec.importRunId,
          importRecordId: rec.id,
        }),
      );
    }
    if (rec.reviewStatus === "APPROVED" && rec.canonicalEventId) {
      if (!eventIds.has(rec.canonicalEventId)) {
        out.push(
          draft({
            findingType: "APPROVED_WITHOUT_EVENT",
            findingKey: stableIntegrityFindingKey("APPROVED_WITHOUT_EVENT", [
              rec.id,
              "missing-target",
            ]),
            severity: "ERROR",
            summary: "Approved import record points at a missing Event.",
            evidence: {
              importRecordId: rec.id,
              canonicalEventId: rec.canonicalEventId,
            },
            primaryEventId: null,
            relatedEventIds: [],
            externalSourceId: null,
            externalIdentityId: rec.externalEventIdentityId,
            importRunId: rec.importRunId,
            importRecordId: rec.id,
          }),
        );
      }
    }
    if (rec.reviewStatus === "MERGED") {
      if (!rec.canonicalEventId || !eventIds.has(rec.canonicalEventId)) {
        out.push(
          draft({
            findingType: "INVALID_MERGE_TARGET",
            findingKey: stableIntegrityFindingKey("INVALID_MERGE_TARGET", [rec.id]),
            severity: "ERROR",
            summary: "Merged import record lacks a valid canonical target Event.",
            evidence: {
              importRecordId: rec.id,
              canonicalEventId: rec.canonicalEventId,
            },
            primaryEventId: rec.canonicalEventId,
            relatedEventIds: [],
            externalSourceId: null,
            externalIdentityId: rec.externalEventIdentityId,
            importRunId: rec.importRunId,
            importRecordId: rec.id,
          }),
        );
      }
    }
    if (rec.reviewStatus === "UNREVIEWED") {
      out.push(
        draft({
          findingType: "STRANDED_STAGED_RECORD",
          findingKey: stableIntegrityFindingKey("STRANDED_STAGED_RECORD", [rec.id]),
          severity: "INFO",
          summary: "Staged import record remains unreviewed.",
          evidence: { importRecordId: rec.id, fingerprint: rec.rawFingerprint },
          primaryEventId: rec.canonicalEventId,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: rec.externalEventIdentityId,
          importRunId: rec.importRunId,
          importRecordId: rec.id,
        }),
      );
    }
  }

  // One identity → multiple events already covered; approved multi-event via same fingerprint
  const approvedByFp = new Map<string, IntegrityImportRecordSnapshot[]>();
  for (const rec of records) {
    if (rec.reviewStatus !== "APPROVED" || !rec.canonicalEventId) continue;
    const list = approvedByFp.get(rec.rawFingerprint) ?? [];
    list.push(rec);
    approvedByFp.set(rec.rawFingerprint, list);
  }
  for (const [fp, group] of approvedByFp) {
    const targets = [...new Set(group.map((g) => g.canonicalEventId!).filter(Boolean))];
    if (targets.length > 1) {
      out.push(
        draft({
          findingType: "APPROVED_MULTI_EVENT",
          findingKey: stableIntegrityFindingKey("APPROVED_MULTI_EVENT", [fp, ...targets.sort()]),
          severity: "CRITICAL",
          summary: "Same import fingerprint approved onto multiple Events.",
          evidence: {
            fingerprint: fp,
            eventIds: targets,
            recordIds: group.map((g) => g.id),
          },
          primaryEventId: targets[0] ?? null,
          relatedEventIds: targets.slice(1),
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: group[0]?.importRunId ?? null,
          importRecordId: group[0]?.id ?? null,
        }),
      );
    }
  }

  for (const run of runs) {
    if (
      (run.status === "FAILED" || run.status === "PARTIAL") &&
      run.recordIds.length > 0
    ) {
      out.push(
        draft({
          findingType: "PARTIAL_RUN_APPLIED",
          findingKey: stableIntegrityFindingKey("PARTIAL_RUN_APPLIED", [run.id]),
          severity: "WARNING",
          summary: `Import run ${run.status} still has ${run.recordIds.length} child record(s).`,
          evidence: {
            runStatus: run.status,
            recordCount: run.recordIds.length,
            stagedCount: run.stagedCount,
          },
          primaryEventId: null,
          relatedEventIds: [],
          externalSourceId: run.externalSourceId,
          externalIdentityId: null,
          importRunId: run.id,
          importRecordId: null,
        }),
      );
    }
    if (run.stagedCount > 0 && run.recordIds.length !== run.stagedCount) {
      out.push(
        draft({
          findingType: "RUN_COUNT_MISMATCH",
          findingKey: stableIntegrityFindingKey("RUN_COUNT_MISMATCH", [run.id]),
          severity: "WARNING",
          summary: "Import run stagedCount does not match child record count.",
          evidence: {
            stagedCount: run.stagedCount,
            childCount: run.recordIds.length,
            approvedCount: run.approvedCount,
            rejectedCount: run.rejectedCount,
          },
          primaryEventId: null,
          relatedEventIds: [],
          externalSourceId: run.externalSourceId,
          externalIdentityId: null,
          importRunId: run.id,
          importRecordId: null,
        }),
      );
    }
  }

  // Source deleted / local active (ADR-085 expectation)
  for (const id of identities) {
    if (!id.deletedAt || !id.canonicalEventId) continue;
    const event = eventsById.get(id.canonicalEventId);
    if (!event || event.archivedAt) continue;
    if (event.status !== "CANCELLED" && event.status !== "ARCHIVED") {
      out.push(
        draft({
          findingType: "SOURCE_DELETED_LOCAL_ACTIVE",
          findingKey: stableIntegrityFindingKey("SOURCE_DELETED_LOCAL_ACTIVE", [
            id.id,
            event.id,
          ]),
          severity: "ERROR",
          summary:
            "External source marks deleted but local Event remains active (ADR-085 expects CANCELLED history).",
          evidence: {
            eventNumber: event.eventNumber,
            eventStatus: event.status,
            identityDeletedAt: id.deletedAt.toISOString(),
          },
          primaryEventId: event.id,
          relatedEventIds: [],
          externalSourceId: id.externalSourceId,
          externalIdentityId: id.id,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
  }

  return out;
}

export function detectLifecycleAndMembershipFindings(
  events: IntegrityEventSnapshot[],
): IntegrityFindingDraft[] {
  const out: IntegrityFindingDraft[] = [];
  for (const e of events) {
    if (e.endsAt.getTime() < e.startsAt.getTime()) {
      out.push(
        draft({
          findingType: "END_BEFORE_START",
          findingKey: stableIntegrityFindingKey("END_BEFORE_START", [e.id]),
          severity: "ERROR",
          summary: "Event ends before it starts.",
          evidence: {
            eventNumber: e.eventNumber,
            startsAt: e.startsAt.toISOString(),
            endsAt: e.endsAt.toISOString(),
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (!e.timezone?.trim()) {
      out.push(
        draft({
          findingType: "MISSING_OR_INVALID_TIMEZONE",
          findingKey: stableIntegrityFindingKey("MISSING_OR_INVALID_TIMEZONE", [e.id]),
          severity: "WARNING",
          summary: "Event timezone is missing.",
          evidence: { eventNumber: e.eventNumber },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    const startDay = chicagoDayKey(e.startsAt);
    const endDay = chicagoDayKey(e.endsAt);
    if (startDay !== endDay && !e.isAllDay) {
      out.push(
        draft({
          findingType: "CROSS_MIDNIGHT_START_DAY_BIAS",
          findingKey: stableIntegrityFindingKey("CROSS_MIDNIGHT_START_DAY_BIAS", [e.id]),
          severity: "WARNING",
          summary:
            "Overnight/cross-midnight Event may only appear on its start Chicago day (CC-03 owns fix).",
          evidence: {
            eventNumber: e.eventNumber,
            startDay,
            endDay,
            isAllDay: e.isAllDay,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (e.isAllDay && e.startsAt.toISOString().includes("T") && !/T00:00:00/.test(e.startsAt.toISOString()) && e.startsAt.getUTCHours() !== 0 && e.startsAt.getUTCHours() !== 5 && e.startsAt.getUTCHours() !== 6) {
      out.push(
        draft({
          findingType: "SUSPICIOUS_ALL_DAY",
          findingKey: stableIntegrityFindingKey("SUSPICIOUS_ALL_DAY", [e.id]),
          severity: "INFO",
          summary: "All-day Event has a non-midnight UTC wall time (review representation).",
          evidence: {
            eventNumber: e.eventNumber,
            startsAt: e.startsAt.toISOString(),
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (e.isRecurring && !e.recurrenceSeriesId) {
      out.push(
        draft({
          findingType: "MISSING_SERIES_IDENTITY",
          findingKey: stableIntegrityFindingKey("MISSING_SERIES_IDENTITY", [e.id]),
          severity: "WARNING",
          summary: "Recurring Event is missing recurrenceSeriesId (CC-04 owns repair).",
          evidence: { eventNumber: e.eventNumber, recurrenceRule: e.recurrenceRule },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (e.recurrenceRule && /FREQ=/i.test(e.recurrenceRule) && /BYDAY=|COUNT=|UNTIL=/i.test(e.recurrenceRule) === false && /WEEKLY|DAILY|MONTHLY/i.test(e.recurrenceRule)) {
      // simple weekly ok — flag complex unsupported later
    }
    if (e.recurrenceRule && /BYSETPOS|EXDATE|RDATE|INTERVAL=\d{2,}/i.test(e.recurrenceRule)) {
      out.push(
        draft({
          findingType: "UNSUPPORTED_RECURRENCE_RULE",
          findingKey: stableIntegrityFindingKey("UNSUPPORTED_RECURRENCE_RULE", [e.id]),
          severity: "WARNING",
          summary: "Recurrence rule uses features beyond current KCCC expand support.",
          evidence: {
            eventNumber: e.eventNumber,
            recurrenceRule: e.recurrenceRule.slice(0, 120),
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (e.primaryMembershipCount < 1) {
      out.push(
        draft({
          findingType: "MISSING_PRIMARY_MEMBERSHIP",
          findingKey: stableIntegrityFindingKey("MISSING_PRIMARY_MEMBERSHIP", [e.id]),
          severity: "ERROR",
          summary: "Event has no PRIMARY calendar membership.",
          evidence: {
            eventNumber: e.eventNumber,
            primaryCalendarId: e.primaryCalendarId,
            membershipCalendarIds: e.membershipCalendarIds,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    const uniqueMemberships = new Set(e.membershipCalendarIds);
    if (uniqueMemberships.size < e.membershipCalendarIds.length) {
      out.push(
        draft({
          findingType: "DUPLICATE_MEMBERSHIP",
          findingKey: stableIntegrityFindingKey("DUPLICATE_MEMBERSHIP", [e.id]),
          severity: "WARNING",
          summary: "Event has duplicate calendar membership rows.",
          evidence: {
            eventNumber: e.eventNumber,
            membershipCalendarIds: e.membershipCalendarIds,
          },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (
      e.status === "CANCELLED" &&
      !e.statusHistory.some((h) => h.toStatus === "CANCELLED")
    ) {
      out.push(
        draft({
          findingType: "MISSING_CANCELLATION_HISTORY",
          findingKey: stableIntegrityFindingKey("MISSING_CANCELLATION_HISTORY", [e.id]),
          severity: "WARNING",
          summary: "CANCELLED Event lacks a matching status-history row.",
          evidence: { eventNumber: e.eventNumber },
          primaryEventId: e.id,
          relatedEventIds: [],
          externalSourceId: null,
          externalIdentityId: null,
          importRunId: null,
          importRecordId: null,
        }),
      );
    }
    if (e.statusHistory.length > 0) {
      const last = e.statusHistory[e.statusHistory.length - 1];
      if (last && last.toStatus !== e.status) {
        out.push(
          draft({
            findingType: "STATUS_HISTORY_MISMATCH",
            findingKey: stableIntegrityFindingKey("STATUS_HISTORY_MISMATCH", [e.id]),
            severity: "WARNING",
            summary: "Latest status history does not match current Event status.",
            evidence: {
              eventNumber: e.eventNumber,
              status: e.status,
              lastHistoryTo: last.toStatus,
            },
            primaryEventId: e.id,
            relatedEventIds: [],
            externalSourceId: null,
            externalIdentityId: null,
            importRunId: null,
            importRecordId: null,
          }),
        );
      }
    }
  }

  // Duplicate series identity across unrelated masters
  const bySeries = new Map<string, IntegrityEventSnapshot[]>();
  for (const e of events) {
    if (!e.recurrenceSeriesId || e.originalOccurrenceAt) continue;
    const list = bySeries.get(e.recurrenceSeriesId) ?? [];
    list.push(e);
    bySeries.set(e.recurrenceSeriesId, list);
  }
  for (const [seriesId, group] of bySeries) {
    if (group.length < 2) continue;
    const ids = group.map((g) => g.id).sort();
    out.push(
      draft({
        findingType: "DUPLICATE_SERIES_IDENTITY",
        findingKey: stableIntegrityFindingKey("DUPLICATE_SERIES_IDENTITY", [
          seriesId,
          ...ids,
        ]),
        severity: "ERROR",
        summary: "Multiple recurrence masters share the same recurrenceSeriesId.",
        evidence: { recurrenceSeriesId: seriesId, eventIds: ids },
        primaryEventId: ids[0] ?? null,
        relatedEventIds: ids.slice(1),
        externalSourceId: null,
        externalIdentityId: null,
        importRunId: null,
        importRecordId: null,
      }),
    );
  }

  return out;
}

export function runAllIntegrityDetectors(
  input: IntegrityDetectorInput,
): IntegrityFindingDraft[] {
  const findings = [
    ...detectDuplicateFindings(input.events),
    ...detectSharedIdentityFindings(input.identities),
    ...detectProvenanceFindings(
      input.events,
      input.identities,
      input.eventAuditActions ?? {},
    ),
    ...detectImportIntegrityFindings(
      input.importRecords,
      input.importRuns,
      input.events,
      input.identities,
    ),
    ...detectDriftFindings(
      input.events,
      input.identities,
      input.eventAuditActions ?? {},
    ),
    ...detectLifecycleAndMembershipFindings(input.events),
    ...detectMissionBoundaryFindings(input.events, input.missions ?? []),
  ];

  // Deterministic order: severity then type then key
  const sevRank: Record<string, number> = {
    CRITICAL: 0,
    ERROR: 1,
    WARNING: 2,
    INFO: 3,
  };
  return findings.sort((a, b) => {
    const s = (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9);
    if (s !== 0) return s;
    const t = a.findingType.localeCompare(b.findingType);
    if (t !== 0) return t;
    return a.findingKey.localeCompare(b.findingKey);
  });
}
