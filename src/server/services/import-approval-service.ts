import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  buildImportProvenanceSnapshot,
  IMPORT_PROVENANCE_AUDIT_ACTIONS,
  type ImportApplyOutcomeKind,
  type ImportProvenanceSnapshot,
} from "@/lib/calendar/import-provenance";
import {
  calendarSlugForProposal,
  mapNormalizedPayloadToEventFields,
  mergeImportFieldsWithLocalPrecedence,
  type GoogleNormalizedImportPayload,
} from "@/lib/calendar/import-apply-mapper";

export type ImportApplyResult = {
  recordId: string;
  decision: "APPROVE" | "REJECT" | "MERGE";
  outcome: ImportApplyOutcomeKind;
  canonicalEventId: string | null;
  eventNumber: string | null;
  eventsCreated: 0 | 1;
  historicalAttendanceConfirmed: false;
  missionMutated: false;
  externalCalendarMutated: false;
  provenance: ImportProvenanceSnapshot;
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function allocateEventNumber(tx: Tx, year: number): Promise<string> {
  const existing = await tx.eventNumberCounter.findUnique({ where: { year } });
  if (!existing) {
    await tx.eventNumberCounter.create({ data: { year, nextValue: 2 } });
    return `KCCC-${year}-0001`;
  }
  const current = existing.nextValue;
  await tx.eventNumberCounter.update({
    where: { year },
    data: { nextValue: { increment: 1 } },
  });
  return `KCCC-${year}-${String(current).padStart(4, "0")}`;
}

async function resolvePrimaryCalendarId(
  tx: Tx,
  proposal: string,
): Promise<string> {
  const slug = calendarSlugForProposal(proposal);
  const bySlug = await tx.calendar.findFirst({
    where: { slug, archivedAt: null, isActive: true },
  });
  if (bySlug) return bySlug.id;
  const fallback = await tx.calendar.findFirst({
    where: { slug: "public-events", archivedAt: null },
  });
  if (!fallback) {
    throw new ValidationError(
      "No import target calendar found (expected public-events).",
    );
  }
  return fallback.id;
}

function asPayload(raw: unknown): GoogleNormalizedImportPayload {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Import record has no normalizedPayload.");
  }
  return raw as GoogleNormalizedImportPayload;
}

async function loadRecordContext(
  tx: Tx,
  importRunId: string,
  recordId: string,
) {
  const record = await tx.calendarImportRecord.findFirst({
    where: { id: recordId, importRunId },
  });
  if (!record) throw new NotFoundError("Import record not found.");

  const run = await tx.calendarImportRun.findUnique({
    where: { id: importRunId },
  });
  if (!run) throw new NotFoundError("Import run not found.");

  const externalSource = await tx.externalCalendarSource.findUnique({
    where: { id: run.externalSourceId },
  });

  return { record, run, externalSource };
}

function assertNoMissionSideEffects(): {
  missionMutated: false;
  externalCalendarMutated: false;
  historicalAttendanceConfirmed: false;
} {
  return {
    missionMutated: false,
    externalCalendarMutated: false,
    historicalAttendanceConfirmed: false,
  };
}

/**
 * Approve staged import → exactly one canonical Event (or idempotent no-op).
 * Never creates Missions or mutates the external calendar (IMPORT_ONLY).
 */
export async function approveImportRecord(input: {
  actor: AuthenticatedActor;
  importRunId: string;
  recordId: string;
  requestId?: string;
  notes?: string;
}): Promise<ImportApplyResult> {
  await requireAuthorized(input.actor, {
    action: "HISTORICAL_IMPORT_APPROVE",
    resource: { type: "import_record", id: input.recordId },
  });

  return withTransaction(async (tx) => {
    const { record, run, externalSource } = await loadRecordContext(
      tx,
      input.importRunId,
      input.recordId,
    );

    const fingerprint = record.rawFingerprint;
    const payload = asPayload(record.normalizedPayload);
    const mapped = mapNormalizedPayloadToEventFields(payload, { fingerprint });

    const identity =
      externalSource != null
        ? await tx.externalEventIdentity.findUnique({
            where: {
              externalSourceId_fingerprint: {
                externalSourceId: externalSource.id,
                fingerprint,
              },
            },
          })
        : null;

    // Idempotent paths: already approved / already linked by fingerprint.
    const existingEventId =
      record.canonicalEventId ?? identity?.canonicalEventId ?? null;

    if (existingEventId) {
      const existingEvent = await tx.event.findUnique({
        where: { id: existingEventId },
        include: {
          statusHistory: { select: { reason: true } },
        },
      });
      if (!existingEvent) {
        throw new ConflictError(
          "Import record points at a missing canonical Event.",
        );
      }

      // Fingerprint change on same Google event id: apply ADR-081 timing only.
      let outcome: ImportApplyOutcomeKind = "idempotent";
      let auditAction:
        | typeof IMPORT_PROVENANCE_AUDIT_ACTIONS.IDEMPOTENT_SKIP
        | typeof IMPORT_PROVENANCE_AUDIT_ACTIONS.SOURCE_TIMING_APPLIED
        | typeof IMPORT_PROVENANCE_AUDIT_ACTIONS.SOURCE_DELETED_CANCEL =
        IMPORT_PROVENANCE_AUDIT_ACTIONS.IDEMPOTENT_SKIP;
      if (
        identity &&
        identity.canonicalEventId === existingEvent.id &&
        record.reviewStatus === "APPROVED"
      ) {
        outcome = "idempotent";
      } else if (existingEvent.isImported) {
        const merge = mergeImportFieldsWithLocalPrecedence(
          {
            internalTitle: existingEvent.internalTitle,
            campaignDisplayTitle: existingEvent.campaignDisplayTitle,
            privateNotes: existingEvent.privateNotes,
            status: existingEvent.status,
            startsAt: existingEvent.startsAt,
            endsAt: existingEvent.endsAt,
            timezone: existingEvent.timezone,
            isAllDay: existingEvent.isAllDay,
            isImported: existingEvent.isImported,
            statusHistoryReasons: existingEvent.statusHistory.map((h) => h.reason),
          },
          mapped,
        );
        if (merge.appliedSourceTiming) {
          await tx.event.update({
            where: { id: existingEvent.id },
            data: { ...merge.data, version: { increment: 1 } },
          });
          outcome = "timing_updated";
          auditAction = IMPORT_PROVENANCE_AUDIT_ACTIONS.SOURCE_TIMING_APPLIED;
        }
      }

      // Source-deleted (cancelled) while Event exists → CANCELLED history (ADR-085).
      if (
        mapped.sourceCancelled &&
        existingEvent.status !== "CANCELLED" &&
        existingEvent.status !== "ARCHIVED"
      ) {
        await tx.event.update({
          where: { id: existingEvent.id },
          data: { status: "CANCELLED", version: { increment: 1 } },
        });
        await tx.eventStatusHistory.create({
          data: {
            eventId: existingEvent.id,
            fromStatus: existingEvent.status,
            toStatus: "CANCELLED",
            changedByUserId: input.actor.userId,
            reason: "Source deleted on external calendar (import apply)",
          },
        });
        outcome = "source_cancelled";
        auditAction = IMPORT_PROVENANCE_AUDIT_ACTIONS.SOURCE_DELETED_CANCEL;
      }

      const updated = await tx.calendarImportRecord.update({
        where: { id: record.id },
        data: {
          reviewStatus: "APPROVED",
          reviewedByUserId: input.actor.userId,
          reviewedAt: new Date(),
          reviewNotes: input.notes?.trim() || record.reviewNotes,
          canonicalEventId: existingEvent.id,
          externalEventIdentityId: identity?.id ?? record.externalEventIdentityId,
        },
      });

      if (identity && !identity.canonicalEventId) {
        await tx.externalEventIdentity.update({
          where: { id: identity.id },
          data: { canonicalEventId: existingEvent.id },
        });
      }

      await tx.calendarImportReviewAction.create({
        data: {
          importRecordId: record.id,
          action: "APPROVE",
          actorUserId: input.actor.userId,
          notes: input.notes?.trim() || null,
        },
      });

      const provenance = buildImportProvenanceSnapshot({
        provider: externalSource?.provider ?? "GOOGLE_CALENDAR",
        externalSourceId: externalSource?.id ?? null,
        externalEventId: mapped.externalEventId,
        iCalUid: mapped.iCalUid,
        fingerprint,
        importRunId: run.id,
        importRecordId: updated.id,
        canonicalEventId: existingEvent.id,
        applyOutcome: outcome,
      });

      await writeAttributedAudit({
        actor: input.actor,
        action: auditAction,
        entityType: "CalendarImportRecord",
        entityId: record.id,
        requestId: input.requestId,
        newState: provenance,
        tx,
      });

      return {
        recordId: updated.id,
        decision: "APPROVE" as const,
        outcome,
        canonicalEventId: existingEvent.id,
        eventNumber: existingEvent.eventNumber,
        eventsCreated: 0 as const,
        ...assertNoMissionSideEffects(),
        provenance,
      };
    }

    // Fresh create — exactly one Event.
    if (mapped.sourceCancelled) {
      // Cancelled source with no prior Event: create CANCELLED history row (campaign memory).
    }

    const primaryCalendarId = await resolvePrimaryCalendarId(
      tx,
      mapped.proposedCalendarType,
    );
    const year = mapped.startsAt.getFullYear();
    const eventNumber = await allocateEventNumber(tx, year);

    const event = await tx.event.create({
      data: {
        eventNumber,
        sourceType: mapped.sourceType,
        createdByUserId: input.actor.userId,
        ownerUserId: input.actor.userId,
        primaryCalendarId,
        internalTitle: mapped.internalTitle,
        campaignDisplayTitle: mapped.campaignDisplayTitle,
        status: mapped.status,
        startsAt: mapped.startsAt,
        endsAt: mapped.endsAt,
        timezone: mapped.timezone,
        isAllDay: mapped.isAllDay,
        city: mapped.city,
        venueName: mapped.venueName,
        locationNotes: mapped.locationNotes,
        locationDisclosure: mapped.locationDisclosure,
        privateNotes: mapped.privateNotes,
        isImported: true,
        historicalReviewStatus: "APPROVED",
        historicalAttendanceConfirmed: false,
        historicalReviewedByUserId: input.actor.userId,
        historicalReviewedAt: new Date(),
        version: 1,
      },
    });

    await tx.eventCalendarMembership.create({
      data: {
        eventId: event.id,
        calendarId: primaryCalendarId,
        membershipType: "PRIMARY",
        isPrimary: true,
        createdByUserId: input.actor.userId,
      },
    });

    await tx.eventStatusHistory.create({
      data: {
        eventId: event.id,
        fromStatus: null,
        toStatus: event.status,
        changedByUserId: input.actor.userId,
        reason: "Created from import approval (CC-01)",
      },
    });

    let identityId = identity?.id ?? null;
    if (externalSource) {
      if (identity) {
        await tx.externalEventIdentity.update({
          where: { id: identity.id },
          data: {
            canonicalEventId: event.id,
            externalEventId: mapped.externalEventId,
            iCalUid: mapped.iCalUid,
            deletedAt: mapped.sourceCancelled ? new Date() : null,
          },
        });
        identityId = identity.id;
      } else {
        const createdIdentity = await tx.externalEventIdentity.create({
          data: {
            provider: externalSource.provider,
            externalSourceId: externalSource.id,
            externalEventId: mapped.externalEventId,
            iCalUid: mapped.iCalUid,
            fingerprint,
            canonicalEventId: event.id,
            deletedAt: mapped.sourceCancelled ? new Date() : null,
          },
        });
        identityId = createdIdentity.id;
      }
    }

    const updated = await tx.calendarImportRecord.update({
      where: { id: record.id },
      data: {
        reviewStatus: "APPROVED",
        reviewedByUserId: input.actor.userId,
        reviewedAt: new Date(),
        reviewNotes: input.notes?.trim() || record.reviewNotes,
        canonicalEventId: event.id,
        externalEventIdentityId: identityId,
      },
    });

    await tx.calendarImportRun.update({
      where: { id: run.id },
      data: { approvedCount: { increment: 1 } },
    });

    await tx.calendarImportReviewAction.create({
      data: {
        importRecordId: record.id,
        action: "APPROVE",
        actorUserId: input.actor.userId,
        notes: input.notes?.trim() || null,
      },
    });

    const provenance = buildImportProvenanceSnapshot({
      provider: externalSource?.provider ?? "GOOGLE_CALENDAR",
      externalSourceId: externalSource?.id ?? null,
      externalEventId: mapped.externalEventId,
      iCalUid: mapped.iCalUid,
      fingerprint,
      importRunId: run.id,
      importRecordId: updated.id,
      canonicalEventId: event.id,
      applyOutcome: "created",
    });

    await writeAttributedAudit({
      actor: input.actor,
      action: IMPORT_PROVENANCE_AUDIT_ACTIONS.APPROVE,
      entityType: "CalendarImportRecord",
      entityId: record.id,
      requestId: input.requestId,
      newState: {
        ...provenance,
        eventNumber: event.eventNumber,
      },
      tx,
    });

    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_CREATED",
      entityType: "Event",
      entityId: event.id,
      requestId: input.requestId,
      newState: {
        eventNumber: event.eventNumber,
        title: event.internalTitle,
        status: event.status,
        source: "import_approval",
      },
      tx,
    });

    return {
      recordId: updated.id,
      decision: "APPROVE" as const,
      outcome: "created" as const,
      canonicalEventId: event.id,
      eventNumber: event.eventNumber,
      eventsCreated: 1 as const,
      ...assertNoMissionSideEffects(),
      provenance,
    };
  });
}

export async function rejectImportRecord(input: {
  actor: AuthenticatedActor;
  importRunId: string;
  recordId: string;
  requestId?: string;
  notes?: string;
}): Promise<ImportApplyResult> {
  await requireAuthorized(input.actor, {
    action: "HISTORICAL_IMPORT_REJECT",
    resource: { type: "import_record", id: input.recordId },
  });

  return withTransaction(async (tx) => {
    const { record, run, externalSource } = await loadRecordContext(
      tx,
      input.importRunId,
      input.recordId,
    );

    if (record.reviewStatus === "APPROVED" && record.canonicalEventId) {
      throw new ConflictError(
        "Cannot reject an import record that already created a canonical Event. Use cancel on the Event instead.",
      );
    }

    const updated = await tx.calendarImportRecord.update({
      where: { id: record.id },
      data: {
        reviewStatus: "REJECTED",
        reviewedByUserId: input.actor.userId,
        reviewedAt: new Date(),
        reviewNotes: input.notes?.trim() || record.reviewNotes,
      },
    });

    if (record.reviewStatus !== "REJECTED") {
      await tx.calendarImportRun.update({
        where: { id: run.id },
        data: { rejectedCount: { increment: 1 } },
      });
    }

    await tx.calendarImportReviewAction.create({
      data: {
        importRecordId: record.id,
        action: "REJECT",
        actorUserId: input.actor.userId,
        notes: input.notes?.trim() || null,
      },
    });

    const provenance = buildImportProvenanceSnapshot({
      provider: externalSource?.provider ?? "GOOGLE_CALENDAR",
      externalSourceId: externalSource?.id ?? null,
      externalEventId: asPayload(record.normalizedPayload).sourceEventId ?? null,
      iCalUid: asPayload(record.normalizedPayload).iCalUid ?? null,
      fingerprint: record.rawFingerprint,
      importRunId: run.id,
      importRecordId: updated.id,
      canonicalEventId: null,
      applyOutcome: "rejected",
    });

    await writeAttributedAudit({
      actor: input.actor,
      action: IMPORT_PROVENANCE_AUDIT_ACTIONS.REJECT,
      entityType: "CalendarImportRecord",
      entityId: record.id,
      requestId: input.requestId,
      reason: input.notes?.trim() || null,
      newState: provenance,
      tx,
    });

    return {
      recordId: updated.id,
      decision: "REJECT" as const,
      outcome: "rejected" as const,
      canonicalEventId: null,
      eventNumber: null,
      eventsCreated: 0 as const,
      ...assertNoMissionSideEffects(),
      provenance,
    };
  });
}

export async function mergeImportRecord(input: {
  actor: AuthenticatedActor;
  importRunId: string;
  recordId: string;
  canonicalEventId: string;
  requestId?: string;
  notes?: string;
}): Promise<ImportApplyResult> {
  await requireAuthorized(input.actor, {
    action: "HISTORICAL_IMPORT_MERGE",
    resource: { type: "import_record", id: input.recordId },
  });

  if (!input.canonicalEventId?.trim()) {
    throw new ValidationError("canonicalEventId is required for merge.");
  }

  return withTransaction(async (tx) => {
    const { record, run, externalSource } = await loadRecordContext(
      tx,
      input.importRunId,
      input.recordId,
    );

    const target = await tx.event.findFirst({
      where: { id: input.canonicalEventId, archivedAt: null },
    });
    if (!target) throw new NotFoundError("Merge target Event not found.");

    // Idempotent merge: already linked to this Event.
    if (
      record.reviewStatus === "MERGED" &&
      record.canonicalEventId === target.id
    ) {
      const provenance = buildImportProvenanceSnapshot({
        provider: externalSource?.provider ?? "GOOGLE_CALENDAR",
        externalSourceId: externalSource?.id ?? null,
        externalEventId: asPayload(record.normalizedPayload).sourceEventId ?? null,
        iCalUid: asPayload(record.normalizedPayload).iCalUid ?? null,
        fingerprint: record.rawFingerprint,
        importRunId: run.id,
        importRecordId: record.id,
        canonicalEventId: target.id,
        applyOutcome: "idempotent",
      });
      return {
        recordId: record.id,
        decision: "MERGE" as const,
        outcome: "idempotent" as const,
        canonicalEventId: target.id,
        eventNumber: target.eventNumber,
        eventsCreated: 0 as const,
        ...assertNoMissionSideEffects(),
        provenance,
      };
    }

    if (
      record.canonicalEventId &&
      record.canonicalEventId !== target.id &&
      record.reviewStatus === "APPROVED"
    ) {
      throw new ConflictError(
        "Import record already approved to a different Event.",
      );
    }

    let identityId = record.externalEventIdentityId;
    if (externalSource) {
      const identity = await tx.externalEventIdentity.upsert({
        where: {
          externalSourceId_fingerprint: {
            externalSourceId: externalSource.id,
            fingerprint: record.rawFingerprint,
          },
        },
        create: {
          provider: externalSource.provider,
          externalSourceId: externalSource.id,
          externalEventId: asPayload(record.normalizedPayload).sourceEventId,
          iCalUid: asPayload(record.normalizedPayload).iCalUid,
          fingerprint: record.rawFingerprint,
          canonicalEventId: target.id,
        },
        update: {
          canonicalEventId: target.id,
          externalEventId: asPayload(record.normalizedPayload).sourceEventId,
          iCalUid: asPayload(record.normalizedPayload).iCalUid,
        },
      });
      identityId = identity.id;
    }

    const updated = await tx.calendarImportRecord.update({
      where: { id: record.id },
      data: {
        reviewStatus: "MERGED",
        reviewedByUserId: input.actor.userId,
        reviewedAt: new Date(),
        reviewNotes: input.notes?.trim() || record.reviewNotes,
        canonicalEventId: target.id,
        externalEventIdentityId: identityId,
      },
    });

    await tx.calendarImportReviewAction.create({
      data: {
        importRecordId: record.id,
        action: "MERGE",
        actorUserId: input.actor.userId,
        notes: input.notes?.trim() || `Merged onto ${target.eventNumber}`,
      },
    });

    const provenance = buildImportProvenanceSnapshot({
      provider: externalSource?.provider ?? "GOOGLE_CALENDAR",
      externalSourceId: externalSource?.id ?? null,
      externalEventId: asPayload(record.normalizedPayload).sourceEventId ?? null,
      iCalUid: asPayload(record.normalizedPayload).iCalUid ?? null,
      fingerprint: record.rawFingerprint,
      importRunId: run.id,
      importRecordId: updated.id,
      canonicalEventId: target.id,
      applyOutcome: "merged",
    });

    await writeAttributedAudit({
      actor: input.actor,
      action: IMPORT_PROVENANCE_AUDIT_ACTIONS.MERGE,
      entityType: "CalendarImportRecord",
      entityId: record.id,
      requestId: input.requestId,
      newState: {
        ...provenance,
        mergedOntoEventNumber: target.eventNumber,
      },
      tx,
    });

    return {
      recordId: updated.id,
      decision: "MERGE" as const,
      outcome: "merged" as const,
      canonicalEventId: target.id,
      eventNumber: target.eventNumber,
      eventsCreated: 0 as const,
      ...assertNoMissionSideEffects(),
      provenance,
    };
  });
}
