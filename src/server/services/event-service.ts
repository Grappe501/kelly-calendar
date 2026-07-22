import "server-only";

import { getEventById } from "@/server/repositories/event-repository";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import {
  updateCanonicalEvent,
  archiveCanonicalEvent,
  restoreCanonicalEvent,
  changePrimaryCalendar as changePrimaryCalendarRepo,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/server/repositories/event-mutation-repository";
import { createEventWithOptionalRecurrence } from "@/server/services/event-lifecycle-service";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { AppError } from "@/lib/security/safe-error";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { accessLevelRank } from "@/lib/auth/access-level";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/security/safe-error";
import { isStandingWorkBlockEvent } from "@/lib/campaign/standing-work-blocks";

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
  data: CreateEventInput & { weeklyOccurrences?: number };
}) {
  return createEventWithOptionalRecurrence(input);
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
  return listEventsForActorInRange(actor, {
    // Backward-compatible default: upcoming window, not an unbounded catalogue.
    rangeStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    rangeEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    take: 200,
  });
}

/**
 * Canonical Event range query for operating views.
 * One source for Today / Day / Week / Month / Agenda lenses.
 */
export async function listEventsForActorInRange(
  actor: AuthenticatedActor,
  input: {
    rangeStart: Date;
    rangeEnd: Date;
    take?: number;
  },
) {
  await requireAuthorized(actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const take = Math.min(Math.max(input.take ?? 200, 1), 500);
  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
      status: { not: "CANCELLED" },
      // Overlap [rangeStart, rangeEnd)
      startsAt: { lt: input.rangeEnd },
      endsAt: { gt: input.rangeStart },
    },
    orderBy: { startsAt: "asc" },
    take,
    include: {
      primaryCalendar: true,
      campaignMission: { select: { id: true, lifecyclePhase: true, missionStatus: true } },
      travelPlans: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: {
          travelRequired: true,
          departureAt: true,
          targetArrivalAt: true,
          estimatedDurationMinutes: true,
          bufferMinutes: true,
        },
      },
      followups: {
        where: { status: { not: "COMPLETE" } },
        take: 5,
        select: { id: true, title: true, status: true, dueAt: true },
      },
      actionItems: {
        where: { status: { notIn: ["COMPLETE", "CANCELLED"] } },
        take: 8,
        select: {
          id: true,
          title: true,
          phase: true,
          status: true,
          dueAt: true,
        },
      },
      eventPeople: {
        take: 6,
        include: { person: { select: { displayName: true } } },
      },
      packingItems: {
        take: 8,
        select: { itemName: true, state: true },
      },
    },
  });
  const listedEvents = events.filter(
    (event) =>
      !isStandingWorkBlockEvent({
        eventType: event.eventType,
        internalTitle: event.internalTitle,
        campaignDisplayTitle: event.campaignDisplayTitle,
        privateNotes: event.privateNotes,
        sourceType: event.sourceType,
      }),
  );
  const out = [];
  for (const event of listedEvents) {
    const access = await canAccessEvent({
      eventId: event.id,
      viewerUserId: actor.userId,
    });
    if (!access.allowed) continue;
    const safe = projectSafeEvent({
      event,
      calendar: event.primaryCalendar,
      viewerAccess: mapAccessToViewer(access.accessLevel),
    });
    if (!safe) continue;
    out.push({
      ...safe,
      missionId: event.campaignMission?.id ?? null,
      missionLifecyclePhase: event.campaignMission?.lifecyclePhase ?? null,
      missionStatus: event.campaignMission?.missionStatus ?? null,
      travel: event.travelPlans[0]
        ? {
            travelRequired: event.travelPlans[0].travelRequired,
            departureAt: event.travelPlans[0].departureAt?.toISOString() ?? null,
            targetArrivalAt:
              event.travelPlans[0].targetArrivalAt?.toISOString() ?? null,
            estimatedDurationMinutes:
              event.travelPlans[0].estimatedDurationMinutes ?? null,
            bufferMinutes: event.travelPlans[0].bufferMinutes ?? null,
          }
        : null,
      openFollowUps: event.followups.map((f) => ({
        id: f.id,
        title: f.title,
        status: f.status,
        dueAt: f.dueAt?.toISOString() ?? null,
      })),
      openActions: event.actionItems.map((a) => ({
        id: a.id,
        title: a.title,
        phase: a.phase,
        status: a.status,
        dueAt: a.dueAt?.toISOString() ?? null,
      })),
      people: event.eventPeople
        .map((p) => p.person.displayName)
        .filter((name): name is string => Boolean(name)),
      packing: event.packingItems.map((p) => ({
        name: p.itemName,
        state: p.state,
      })),
    });
  }
  return out;
}

export type OperatingEventRecord = Awaited<
  ReturnType<typeof listEventsForActorInRange>
>[number];

