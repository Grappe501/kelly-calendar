import "server-only";

import { randomUUID } from "node:crypto";
import type {
  CalendarBulkActionType,
  CalendarBulkItemEligibility,
  CalendarBulkOperationStatus,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { authorize } from "@/server/auth/authorization";
import type { MutationAction } from "@/server/auth/actions";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/security/safe-error";
import {
  BULK_CAMPAIGN_KEY,
  BULK_MAX_ITEMS,
  BULK_PREVIEW_TTL_MS,
  RECOVERABLE_ACTIONS,
  classifyBulkItem,
  buildBulkEventFingerprint,
  buildBulkPreviewFingerprint,
  buildBulkIdempotencyKey,
  inverseBulkAction,
  type BulkActionType,
} from "@/lib/calendar/bulk";
import {
  archiveEvent,
  restoreEvent,
  addEventCalendarMembership,
  removeEventCalendarMembership,
} from "@/server/services/event-service";
import { cancelEvent } from "@/server/services/event-lifecycle-service";
import { recomputeConflictsForEventBestEffort } from "@/server/services/conflict-engine-service";

function asAction(action: string): BulkActionType {
  const allowed: BulkActionType[] = [
    "ARCHIVE",
    "RESTORE",
    "CANCEL",
    "ADD_CALENDAR",
    "REMOVE_CALENDAR",
  ];
  if (!allowed.includes(action as BulkActionType)) {
    throw new ValidationError("Unsupported bulk action.");
  }
  return action as BulkActionType;
}

async function loadEventsForBulk(eventIds: string[]) {
  return prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: {
      id: true,
      version: true,
      status: true,
      archivedAt: true,
      startsAt: true,
      endsAt: true,
      primaryCalendarId: true,
      isImported: true,
      isRecurring: true,
      recurrenceSeriesId: true,
      campaignMission: { select: { id: true } },
      calendarMemberships: {
        where: { removedAt: null },
        select: { calendarId: true, isPrimary: true },
      },
    },
  });
}

export async function createBulkPreview(input: {
  actor: AuthenticatedActor;
  actionType: string;
  eventIds: string[];
  reason?: string | null;
  targetCalendarId?: string | null;
  clientNonce?: string | null;
  querySnapshot?: Record<string, unknown> | null;
  seriesScopeRequested?: boolean;
}) {
  const actionType = asAction(input.actionType);
  const uniqueIds = [...new Set(input.eventIds.filter(Boolean))];
  if (uniqueIds.length === 0) throw new ValidationError("Select at least one Event.");
  const truncated = uniqueIds.length > BULK_MAX_ITEMS;
  const selectedIds = uniqueIds.slice(0, BULK_MAX_ITEMS);

  if (
    (actionType === "ADD_CALENDAR" || actionType === "REMOVE_CALENDAR") &&
    !input.targetCalendarId
  ) {
    throw new ValidationError("targetCalendarId is required for calendar actions.");
  }
  if ((actionType === "ARCHIVE" || actionType === "CANCEL") && !input.reason?.trim()) {
    throw new ValidationError("reason is required for archive and cancel.");
  }

  const events = await loadEventsForBulk(selectedIds);
  const byId = new Map(events.map((e) => [e.id, e]));

  const itemRows: Array<{
    eventId: string;
    fingerprintAtPreview: string;
    eligibility: CalendarBulkItemEligibility;
    missionLinked: boolean;
    isImported: boolean;
    isRecurring: boolean;
    recurrenceSeriesId: string | null;
    classificationNote: string | null;
    recoveryEligible: boolean;
    beforeStatus: string | null;
  }> = [];

  const fingerprints: string[] = [];

  for (const eventId of selectedIds) {
    const event = byId.get(eventId);
    if (!event) {
      itemRows.push({
        eventId,
        fingerprintAtPreview: "missing",
        eligibility: "INELIGIBLE",
        missionLinked: false,
        isImported: false,
        isRecurring: false,
        recurrenceSeriesId: null,
        classificationNote: "Event not found.",
        recoveryEligible: false,
        beforeStatus: null,
      });
      continue;
    }

    const access = await canAccessEvent({
      eventId,
      viewerUserId: input.actor.userId,
    });
    const authAction: MutationAction =
      actionType === "ARCHIVE"
        ? "EVENT_ARCHIVE"
        : actionType === "RESTORE"
          ? "EVENT_RESTORE"
          : actionType === "CANCEL"
            ? "EVENT_EDIT"
            : "EVENT_MANAGE_CALENDARS";
    const auth = await authorize(input.actor, {
      action: authAction,
      resource: { type: "event", id: eventId },
    });

    const targetId = input.targetCalendarId ?? null;
    const membership = targetId
      ? event.calendarMemberships.find((m) => m.calendarId === targetId)
      : undefined;

    const classified = classifyBulkItem({
      actionType,
      status: event.status,
      archivedAt: event.archivedAt,
      isRecurring: event.isRecurring,
      recurrenceSeriesId: event.recurrenceSeriesId,
      missionLinked: Boolean(event.campaignMission),
      isImported: event.isImported,
      seriesScopeRequested: Boolean(input.seriesScopeRequested),
      canAccess: Boolean(access.allowed && auth.allowed),
      targetCalendarId: targetId,
      isPrimaryCalendarTarget: Boolean(
        membership?.isPrimary || event.primaryCalendarId === targetId,
      ),
      alreadyMemberOfTarget: Boolean(membership),
    });

    const fp = buildBulkEventFingerprint({
      eventId: event.id,
      version: event.version,
      status: event.status,
      archivedAt: event.archivedAt,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      primaryCalendarId: event.primaryCalendarId,
    });
    fingerprints.push(fp);

    itemRows.push({
      eventId,
      fingerprintAtPreview: fp,
      eligibility: classified.eligibility as CalendarBulkItemEligibility,
      missionLinked: Boolean(event.campaignMission),
      isImported: event.isImported,
      isRecurring: event.isRecurring,
      recurrenceSeriesId: event.recurrenceSeriesId,
      classificationNote: classified.note,
      recoveryEligible: classified.recoveryEligible,
      beforeStatus: event.status,
    });
  }

  const previewFingerprint = buildBulkPreviewFingerprint({
    actionType,
    campaignKey: BULK_CAMPAIGN_KEY,
    eventFingerprints: fingerprints,
    targetCalendarId: input.targetCalendarId,
    reason: input.reason,
  });
  const idempotencyKey = buildBulkIdempotencyKey({
    actorUserId: input.actor.userId,
    actionType,
    previewFingerprint,
    clientNonce: input.clientNonce?.trim() || randomUUID(),
  });

  const existing = await prisma.calendarBulkOperation.findUnique({
    where: { idempotencyKey },
    include: { items: true },
  });
  if (existing) {
    return summarizeOperation(existing.id);
  }

  const eligibleCount = itemRows.filter((i) => i.eligibility === "ELIGIBLE").length;
  const alreadyCompleteCount = itemRows.filter(
    (i) => i.eligibility === "ALREADY_COMPLETE",
  ).length;
  const ineligibleCount = itemRows.filter(
    (i) => i.eligibility === "INELIGIBLE" || i.eligibility === "UNAUTHORIZED",
  ).length;
  const reviewRequiredCount = itemRows.filter(
    (i) => i.eligibility === "REQUIRES_INDIVIDUAL_REVIEW",
  ).length;

  const op = await prisma.calendarBulkOperation.create({
    data: {
      campaignKey: BULK_CAMPAIGN_KEY,
      actionType: actionType as CalendarBulkActionType,
      status: "PREVIEW",
      selectionMode: "EXPLICIT_IDS",
      querySnapshotJson: (input.querySnapshot ?? undefined) as object | undefined,
      previewFingerprint,
      idempotencyKey,
      targetCalendarId: input.targetCalendarId ?? null,
      reason: input.reason?.trim() || null,
      requestedByUserId: input.actor.userId,
      previewExpiresAt: new Date(Date.now() + BULK_PREVIEW_TTL_MS),
      totalCount: itemRows.length,
      eligibleCount,
      alreadyCompleteCount,
      ineligibleCount,
      reviewRequiredCount,
      truncated,
      recoveryState: RECOVERABLE_ACTIONS.has(actionType) ? "AVAILABLE" : "NONE",
      items: {
        create: itemRows.map((row) => ({
          eventId: row.eventId,
          recurrenceSeriesId: row.recurrenceSeriesId,
          fingerprintAtPreview: row.fingerprintAtPreview,
          eligibility: row.eligibility,
          missionLinked: row.missionLinked,
          isImported: row.isImported,
          isRecurring: row.isRecurring,
          classificationNote: row.classificationNote,
          recoveryEligible: row.recoveryEligible,
          beforeStatus: row.beforeStatus,
        })),
      },
    },
  });

  return summarizeOperation(op.id);
}

export async function getBulkOperation(input: {
  actor: AuthenticatedActor;
  operationId: string;
}) {
  const op = await prisma.calendarBulkOperation.findFirst({
    where: { id: input.operationId, campaignKey: BULK_CAMPAIGN_KEY },
  });
  if (!op) throw new NotFoundError("Bulk operation not found.");
  // Actor must be requester or mutator with access — keep simple: same campaign + authenticated
  return summarizeOperation(op.id);
}

async function summarizeOperation(operationId: string) {
  const op = await prisma.calendarBulkOperation.findUniqueOrThrow({
    where: { id: operationId },
    include: {
      items: { orderBy: { createdAt: "asc" }, take: 100 },
      recoveryActions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return {
    operation: {
      id: op.id,
      actionType: op.actionType,
      status: op.status,
      selectionMode: op.selectionMode,
      previewFingerprint: op.previewFingerprint,
      idempotencyKey: op.idempotencyKey,
      targetCalendarId: op.targetCalendarId,
      reason: op.reason,
      previewExpiresAt: op.previewExpiresAt.toISOString(),
      confirmedAt: op.confirmedAt?.toISOString() ?? null,
      startedAt: op.startedAt?.toISOString() ?? null,
      completedAt: op.completedAt?.toISOString() ?? null,
      totalCount: op.totalCount,
      eligibleCount: op.eligibleCount,
      alreadyCompleteCount: op.alreadyCompleteCount,
      ineligibleCount: op.ineligibleCount,
      reviewRequiredCount: op.reviewRequiredCount,
      succeededCount: op.succeededCount,
      skippedCount: op.skippedCount,
      failedCount: op.failedCount,
      staleCount: op.staleCount,
      truncated: op.truncated,
      recoveryState: op.recoveryState,
      recoveryFingerprint: op.recoveryFingerprint,
      errorSummaryRedacted: op.errorSummaryRedacted,
      createdAt: op.createdAt.toISOString(),
    },
    items: op.items.map((item) => ({
      id: item.id,
      eventId: item.eventId,
      eligibility: item.eligibility,
      result: item.result,
      missionLinked: item.missionLinked,
      isImported: item.isImported,
      isRecurring: item.isRecurring,
      classificationNote: item.classificationNote,
      errorClassification: item.errorClassification,
      recoveryEligible: item.recoveryEligible,
      beforeStatus: item.beforeStatus,
      afterStatus: item.afterStatus,
    })),
    recoveryActions: op.recoveryActions.map((r) => ({
      id: r.id,
      recoveryAction: r.recoveryAction,
      status: r.status,
      succeededCount: r.succeededCount,
      failedCount: r.failedCount,
      skippedCount: r.skippedCount,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function confirmBulkOperation(input: {
  actor: AuthenticatedActor;
  operationId: string;
  previewFingerprint: string;
  confirmationPhrase?: string | null;
}) {
  const op = await prisma.calendarBulkOperation.findFirst({
    where: { id: input.operationId, campaignKey: BULK_CAMPAIGN_KEY },
    include: { items: true },
  });
  if (!op) throw new NotFoundError("Bulk operation not found.");

  if (op.status === "COMPLETED" || op.status === "PARTIAL") {
    return summarizeOperation(op.id);
  }
  if (op.status === "RUNNING") {
    throw new ConflictError("Bulk operation is already running.");
  }
  if (op.status !== "PREVIEW" && op.status !== "CONFIRMED") {
    throw new ValidationError("Operation is not confirmable.");
  }
  if (op.previewFingerprint !== input.previewFingerprint) {
    throw new ValidationError("Preview fingerprint mismatch.");
  }
  if (op.previewExpiresAt.getTime() < Date.now()) {
    throw new ValidationError("Preview expired. Create a new preview.");
  }
  if (
    (op.actionType === "ARCHIVE" || op.actionType === "CANCEL") &&
    op.eligibleCount > 0 &&
    input.confirmationPhrase?.trim().toUpperCase() !== op.actionType
  ) {
    throw new ValidationError(`Type ${op.actionType} to confirm.`);
  }

  // Claim execution
  const claimed = await prisma.calendarBulkOperation.updateMany({
    where: {
      id: op.id,
      status: { in: ["PREVIEW", "CONFIRMED"] },
    },
    data: {
      status: "RUNNING",
      confirmedByUserId: input.actor.userId,
      confirmedAt: new Date(),
      startedAt: new Date(),
    },
  });
  if (claimed.count === 0) {
    return summarizeOperation(op.id);
  }

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  let stale = 0;
  const errors: string[] = [];

  for (const item of op.items) {
    if (item.result === "SUCCEEDED") {
      succeeded += 1;
      continue;
    }
    if (
      item.eligibility === "ALREADY_COMPLETE" ||
      item.eligibility === "INELIGIBLE" ||
      item.eligibility === "UNAUTHORIZED" ||
      item.eligibility === "REQUIRES_INDIVIDUAL_REVIEW"
    ) {
      await prisma.calendarBulkOperationItem.update({
        where: { id: item.id },
        data: { result: "SKIPPED" },
      });
      skipped += 1;
      continue;
    }

    const event = await prisma.event.findUnique({
      where: { id: item.eventId },
      select: {
        id: true,
        version: true,
        status: true,
        archivedAt: true,
        startsAt: true,
        endsAt: true,
        primaryCalendarId: true,
      },
    });
    if (!event) {
      await prisma.calendarBulkOperationItem.update({
        where: { id: item.id },
        data: {
          result: "FAILED",
          errorClassification: "NOT_FOUND",
        },
      });
      failed += 1;
      continue;
    }

    const nowFp = buildBulkEventFingerprint({
      eventId: event.id,
      version: event.version,
      status: event.status,
      archivedAt: event.archivedAt,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      primaryCalendarId: event.primaryCalendarId,
    });
    if (nowFp !== item.fingerprintAtPreview) {
      await prisma.calendarBulkOperationItem.update({
        where: { id: item.id },
        data: {
          result: "STALE",
          fingerprintAtExecution: nowFp,
          errorClassification: "STALE_FINGERPRINT",
        },
      });
      stale += 1;
      continue;
    }

    try {
      let afterStatus: string | null = event.status;
      if (op.actionType === "ARCHIVE") {
        const result = await archiveEvent({
          actor: input.actor,
          eventId: event.id,
          expectedVersion: event.version,
          reason: op.reason ?? "Bulk archive",
        });
        afterStatus = "ARCHIVED";
        void result;
      } else if (op.actionType === "RESTORE") {
        await restoreEvent({
          actor: input.actor,
          eventId: event.id,
          expectedVersion: event.version,
        });
        afterStatus = "DRAFT";
      } else if (op.actionType === "CANCEL") {
        await cancelEvent({
          actor: input.actor,
          eventId: event.id,
          expectedVersion: event.version,
          reason: op.reason ?? "Bulk cancel",
        });
        afterStatus = "CANCELLED";
      } else if (op.actionType === "ADD_CALENDAR" && op.targetCalendarId) {
        await addEventCalendarMembership({
          actor: input.actor,
          eventId: event.id,
          calendarId: op.targetCalendarId,
          expectedVersion: event.version,
        });
      } else if (op.actionType === "REMOVE_CALENDAR" && op.targetCalendarId) {
        await removeEventCalendarMembership({
          actor: input.actor,
          eventId: event.id,
          calendarId: op.targetCalendarId,
          expectedVersion: event.version,
        });
      } else {
        throw new ValidationError("Unsupported action at execution.");
      }

      await recomputeConflictsForEventBestEffort({
        actor: input.actor,
        eventId: event.id,
      });

      await prisma.calendarBulkOperationItem.update({
        where: { id: item.id },
        data: {
          result: "SUCCEEDED",
          fingerprintAtExecution: nowFp,
          afterStatus,
          recoveryEligible: RECOVERABLE_ACTIONS.has(op.actionType as BulkActionType),
        },
      });
      succeeded += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.name : "ERROR";
      errors.push(msg);
      await prisma.calendarBulkOperationItem.update({
        where: { id: item.id },
        data: {
          result: "FAILED",
          fingerprintAtExecution: nowFp,
          errorClassification: msg.slice(0, 80),
        },
      });
      failed += 1;
    }
  }

  const finalStatus: CalendarBulkOperationStatus =
    failed > 0 || stale > 0
      ? succeeded > 0
        ? "PARTIAL"
        : "FAILED"
      : "COMPLETED";

  await prisma.calendarBulkOperation.update({
    where: { id: op.id },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      succeededCount: succeeded,
      skippedCount: skipped,
      failedCount: failed,
      staleCount: stale,
      recoveryState:
        succeeded > 0 && RECOVERABLE_ACTIONS.has(op.actionType as BulkActionType)
          ? "AVAILABLE"
          : op.recoveryState,
      errorSummaryRedacted: errors.length
        ? `${errors.length} item error class(es): ${[...new Set(errors)].slice(0, 5).join(",")}`
        : null,
    },
  });

  return summarizeOperation(op.id);
}

export async function previewBulkRecovery(input: {
  actor: AuthenticatedActor;
  operationId: string;
}) {
  const op = await prisma.calendarBulkOperation.findFirst({
    where: { id: input.operationId, campaignKey: BULK_CAMPAIGN_KEY },
    include: { items: true },
  });
  if (!op) throw new NotFoundError("Bulk operation not found.");
  const inverse = inverseBulkAction(op.actionType as BulkActionType);
  if (!inverse) {
    throw new ValidationError("This action is not recoverable via bulk inverse.");
  }
  const recoverableIds = op.items
    .filter((i) => i.result === "SUCCEEDED" && i.recoveryEligible)
    .map((i) => i.eventId);
  if (recoverableIds.length === 0) {
    throw new ValidationError("No recoverable items.");
  }

  const preview = await createBulkPreview({
    actor: input.actor,
    actionType: inverse,
    eventIds: recoverableIds,
    reason: `Recovery of ${op.actionType} ${op.id}`,
    targetCalendarId: op.targetCalendarId,
    clientNonce: `recovery:${op.id}:${Date.now()}`,
  });

  const recoveryFp = preview.operation.previewFingerprint;
  await prisma.calendarRecoveryAction.create({
    data: {
      operationId: op.id,
      recoveryAction: inverse as CalendarBulkActionType,
      previewFingerprint: recoveryFp,
      status: "PREVIEW",
      requestedByUserId: input.actor.userId,
    },
  });
  await prisma.calendarBulkOperation.update({
    where: { id: op.id },
    data: {
      recoveryState: "PREVIEWED",
      recoveryFingerprint: recoveryFp,
    },
  });

  return {
    originalOperationId: op.id,
    recoveryPreview: preview,
  };
}

export async function confirmBulkRecovery(input: {
  actor: AuthenticatedActor;
  operationId: string;
  recoveryPreviewOperationId: string;
  previewFingerprint: string;
  confirmationPhrase?: string | null;
}) {
  const result = await confirmBulkOperation({
    actor: input.actor,
    operationId: input.recoveryPreviewOperationId,
    previewFingerprint: input.previewFingerprint,
    confirmationPhrase: input.confirmationPhrase,
  });

  await prisma.calendarBulkOperation.update({
    where: { id: input.operationId },
    data: {
      recoveryState:
        result.operation.status === "COMPLETED"
          ? "COMPLETED"
          : result.operation.status === "PARTIAL"
            ? "PARTIAL"
            : "BLOCKED",
    },
  });
  await prisma.calendarRecoveryAction.updateMany({
    where: {
      operationId: input.operationId,
      previewFingerprint: input.previewFingerprint,
      status: "PREVIEW",
    },
    data: {
      status: result.operation.status as CalendarBulkOperationStatus,
      confirmedByUserId: input.actor.userId,
      completedAt: new Date(),
      succeededCount: result.operation.succeededCount,
      failedCount: result.operation.failedCount,
      skippedCount: result.operation.skippedCount,
    },
  });

  return result;
}

export async function listRecentBulkOperations(input: {
  actor: AuthenticatedActor;
  limit?: number;
}) {
  const rows = await prisma.calendarBulkOperation.findMany({
    where: { campaignKey: BULK_CAMPAIGN_KEY },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, input.limit ?? 20),
    select: {
      id: true,
      actionType: true,
      status: true,
      totalCount: true,
      succeededCount: true,
      failedCount: true,
      createdAt: true,
      requestedByUserId: true,
    },
  });
  return { operations: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
}
