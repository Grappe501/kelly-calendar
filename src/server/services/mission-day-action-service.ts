import "server-only";

import type { EventStatus } from "@prisma/client";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/security/safe-error";
import {
  missionDayActionAllowed,
  type MissionDayAction,
} from "@/lib/missions/mission-day-actions";

export type MissionDayActionResult = {
  eventId: string;
  version: number;
  status: EventStatus;
  arrivalAt: string | null;
  confirmationStatus: string | null;
  action: MissionDayAction;
  idempotent: boolean;
  changed: boolean;
};

/**
 * Apply a one-tap mission day action with version protection + audit.
 * AI never calls this path autonomously.
 */
export async function applyMissionDayAction(input: {
  actor: AuthenticatedActor;
  eventId: string;
  action: MissionDayAction;
  expectedVersion: number;
  requestId?: string;
}): Promise<MissionDayActionResult> {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });

  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: input.eventId } });
    if (!existing || existing.archivedAt) {
      throw new NotFoundError("Mission not found.");
    }
    if (existing.version !== input.expectedVersion) {
      throw new ConflictError(
        "This mission changed after you opened it. Refresh and try again.",
      );
    }

    const snapshot = {
      status: existing.status,
      arrivalAt: existing.arrivalAt?.toISOString() ?? null,
      confirmationStatus: existing.confirmationStatus,
      // Narrowed null by archivedAt guard above.
      archivedAt: null as string | null,
    };
    const allowed = missionDayActionAllowed(input.action, snapshot);
    if (!allowed.ok) {
      throw new ValidationError(allowed.reason);
    }

    let nextStatus = existing.status;
    let nextArrival = existing.arrivalAt;
    let nextConfirmation = existing.confirmationStatus;
    let idempotent = false;
    let changed = false;

    switch (input.action) {
      case "START_MISSION": {
        if (existing.status === "IN_PROGRESS") {
          idempotent = true;
        } else {
          nextStatus = "IN_PROGRESS";
          if (nextConfirmation === "NEEDS_ATTENTION") nextConfirmation = null;
          changed = true;
        }
        break;
      }
      case "MARK_ARRIVED": {
        if (existing.arrivalAt) {
          idempotent = true;
        } else {
          nextArrival = new Date();
          if (nextStatus !== "IN_PROGRESS" && nextStatus !== "COMPLETED") {
            nextStatus = "IN_PROGRESS";
          }
          changed = true;
        }
        break;
      }
      case "MARK_COMPLETE": {
        if (existing.status === "COMPLETED") {
          idempotent = true;
        } else {
          nextStatus = "COMPLETED";
          if (nextConfirmation === "NEEDS_ATTENTION") nextConfirmation = null;
          changed = true;
        }
        break;
      }
      case "NEEDS_ATTENTION": {
        if (existing.confirmationStatus === "NEEDS_ATTENTION") {
          idempotent = true;
        } else {
          nextConfirmation = "NEEDS_ATTENTION";
          changed = true;
        }
        break;
      }
      default:
        throw new ValidationError("Unknown mission day action.");
    }

    if (!changed) {
      await writeAttributedAudit({
        actor: input.actor,
        action: "MISSION_DAY_ACTION_IDEMPOTENT",
        entityType: "Event",
        entityId: existing.id,
        requestId: input.requestId,
        previousState: {
          version: existing.version,
          status: existing.status,
          action: input.action,
        },
        newState: {
          version: existing.version,
          status: existing.status,
          action: input.action,
          idempotent: true,
        },
        tx,
      });
      return {
        eventId: existing.id,
        version: existing.version,
        status: existing.status,
        arrivalAt: existing.arrivalAt?.toISOString() ?? null,
        confirmationStatus: existing.confirmationStatus,
        action: input.action,
        idempotent: true,
        changed: false,
      };
    }

    const updated = await tx.event.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        arrivalAt: nextArrival,
        confirmationStatus: nextConfirmation,
        version: { increment: 1 },
      },
    });

    if (nextStatus !== existing.status) {
      await tx.eventStatusHistory.create({
        data: {
          eventId: existing.id,
          fromStatus: existing.status,
          toStatus: nextStatus,
          changedByUserId: input.actor.userId,
          reason: `Mission day action: ${input.action}`,
        },
      });
    }

    await writeAttributedAudit({
      actor: input.actor,
      action: "MISSION_DAY_ACTION",
      entityType: "Event",
      entityId: existing.id,
      requestId: input.requestId,
      previousState: {
        version: existing.version,
        status: existing.status,
        arrivalAt: existing.arrivalAt?.toISOString() ?? null,
        confirmationStatus: existing.confirmationStatus,
      },
      newState: {
        version: updated.version,
        status: updated.status,
        arrivalAt: updated.arrivalAt?.toISOString() ?? null,
        confirmationStatus: updated.confirmationStatus,
        action: input.action,
      },
      tx,
    });

    return {
      eventId: updated.id,
      version: updated.version,
      status: updated.status,
      arrivalAt: updated.arrivalAt?.toISOString() ?? null,
      confirmationStatus: updated.confirmationStatus,
      action: input.action,
      idempotent,
      changed: true,
    };
  });
}

/** Convenience for building action menus without an extra round-trip. */
export async function getMissionDaySnapshots(eventIds: string[]) {
  const rows = await prisma.event.findMany({
    where: { id: { in: eventIds }, archivedAt: null },
    select: {
      id: true,
      version: true,
      status: true,
      arrivalAt: true,
      confirmationStatus: true,
      archivedAt: true,
    },
  });
  return rows;
}
