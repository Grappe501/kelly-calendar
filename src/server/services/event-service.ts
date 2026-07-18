import "server-only";

import { getEventById } from "@/server/repositories/event-repository";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import {
  createCanonicalEvent,
  updateCanonicalEvent,
  archiveCanonicalEvent,
  restoreCanonicalEvent,
  changePrimaryCalendar as changePrimaryCalendarRepo,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/server/repositories/event-mutation-repository";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { AppError } from "@/lib/security/safe-error";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { accessLevelRank } from "@/lib/auth/access-level";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/security/safe-error";

function mapAccessToViewer(
  level: string,
): "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL" {
  const rank = accessLevelRank(level);
  if (rank <= 0) return "NO_ACCESS";
  if (rank === 1) return "AVAILABILITY_ONLY";
  if (rank <= 3) return "VIEW_LIMITED";
  if (rank <= 5) return "VIEW_FULL";
  return "FULL";
}

export async function getSafeEventForViewer(input: {
  eventId: string;
  viewerUserId?: string | null;
  requestedSections?: string[];
  requestContext?: { requestId?: string };
  viewerAccess?: "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL";
}) {
  void input.requestedSections;
  void input.requestContext;
  if (!input.viewerUserId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Authentication is required to view protected calendar events.",
    });
  }

  const access = await canAccessEvent({
    eventId: input.eventId,
    viewerUserId: input.viewerUserId,
  });
  if (!access.allowed) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "You do not have permission to view this event.",
    });
  }

  const row = await getEventById(input.eventId);
  if (!row) {
    throw new AppError({
      code: "NOT_FOUND",
      status: 404,
      publicMessage: "Event not found.",
    });
  }

  return projectSafeEvent({
    event: row,
    calendar: row.primaryCalendar,
    viewerAccess: input.viewerAccess ?? mapAccessToViewer(access.accessLevel),
  });
}

export async function createEvent(input: {
  actor: AuthenticatedActor;
  data: CreateEventInput;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_CREATE",
    resource: {
      type: "calendar",
      calendarId: input.data.primaryCalendarId,
    },
  });
  const event = await createCanonicalEvent(input);
  return getSafeEventForViewer({
    eventId: event.id,
    viewerUserId: input.actor.userId,
    viewerAccess: "FULL",
  });
}

export async function updateEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  data: UpdateEventInput;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const event = await updateCanonicalEvent(input);
  return getSafeEventForViewer({
    eventId: event.id,
    viewerUserId: input.actor.userId,
  });
}

export async function archiveEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  reason: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_ARCHIVE",
    resource: { type: "event", id: input.eventId },
  });
  const event = await archiveCanonicalEvent(input);
  return {
    eventId: event.id,
    version: event.version,
    archivedAt: event.archivedAt?.toISOString() ?? null,
  };
}

export async function restoreEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_RESTORE",
    resource: { type: "event", id: input.eventId },
  });
  const event = await restoreCanonicalEvent(input);
  return getSafeEventForViewer({
    eventId: event.id,
    viewerUserId: input.actor.userId,
  });
}

export async function changePrimaryCalendar(input: {
  actor: AuthenticatedActor;
  eventId: string;
  newPrimaryCalendarId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_CHANGE_PRIMARY_CALENDAR",
    resource: { type: "event", id: input.eventId },
  });
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: {
      type: "calendar",
      calendarId: input.newPrimaryCalendarId,
    },
  });
  const event = await changePrimaryCalendarRepo(input);
  return getSafeEventForViewer({
    eventId: event.id,
    viewerUserId: input.actor.userId,
  });
}

export async function addEventCalendarMembership(input: {
  actor: AuthenticatedActor;
  eventId: string;
  calendarId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_MANAGE_CALENDARS",
    resource: { type: "event", id: input.eventId },
  });
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "calendar", calendarId: input.calendarId },
  });

  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: input.eventId } });
    if (!existing || existing.archivedAt) throw new NotFoundError("Event not found.");
    if (existing.version !== input.expectedVersion) {
      throw new ConflictError(
        "This event changed after you opened it. Review the latest version before saving.",
      );
    }
    const calendar = await tx.calendar.findFirst({
      where: { id: input.calendarId, archivedAt: null },
    });
    if (!calendar) throw new NotFoundError("Calendar not found.");

    const mem = await tx.eventCalendarMembership.findFirst({
      where: {
        eventId: input.eventId,
        calendarId: input.calendarId,
        removedAt: null,
      },
    });
    if (!mem) {
      await tx.eventCalendarMembership.create({
        data: {
          eventId: input.eventId,
          calendarId: input.calendarId,
          membershipType: "RELATED",
          isPrimary: false,
          createdByUserId: input.actor.userId,
        },
      });
    }
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: { version: { increment: 1 } },
    });
    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_CALENDAR_MEMBERSHIP_ADDED",
      entityType: "Event",
      entityId: input.eventId,
      requestId: input.requestId,
      newState: { calendarId: input.calendarId, version: updated.version },
      tx,
    });
    return updated;
  });
}

export async function removeEventCalendarMembership(input: {
  actor: AuthenticatedActor;
  eventId: string;
  calendarId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_MANAGE_CALENDARS",
    resource: { type: "event", id: input.eventId },
  });

  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: input.eventId } });
    if (!existing || existing.archivedAt) throw new NotFoundError("Event not found.");
    if (existing.version !== input.expectedVersion) {
      throw new ConflictError(
        "This event changed after you opened it. Review the latest version before saving.",
      );
    }
    if (existing.primaryCalendarId === input.calendarId) {
      throw new ValidationError("Cannot remove the primary calendar membership.");
    }
    await tx.eventCalendarMembership.updateMany({
      where: {
        eventId: input.eventId,
        calendarId: input.calendarId,
        removedAt: null,
      },
      data: { removedAt: new Date() },
    });
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: { version: { increment: 1 } },
    });
    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_CALENDAR_MEMBERSHIP_REMOVED",
      entityType: "Event",
      entityId: input.eventId,
      requestId: input.requestId,
      newState: { calendarId: input.calendarId, version: updated.version },
      tx,
    });
    return updated;
  });
}

export async function listEventsForActor(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  // Leadership sees recent synthetic/manual events; others see events they can access via primary calendar grants.
  const events = await prisma.event.findMany({
    where: { archivedAt: null },
    orderBy: { startsAt: "asc" },
    take: 50,
    include: { primaryCalendar: true },
  });
  const out = [];
  for (const event of events) {
    const access = await canAccessEvent({
      eventId: event.id,
      viewerUserId: actor.userId,
    });
    if (!access.allowed) continue;
    out.push(
      projectSafeEvent({
        event,
        calendar: event.primaryCalendar,
        viewerAccess: mapAccessToViewer(access.accessLevel),
      }),
    );
  }
  return out;
}
