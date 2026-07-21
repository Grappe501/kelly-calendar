import "server-only";

import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import {
  cancelCanonicalEvent,
  createCanonicalEvent,
  duplicateCanonicalEvent,
  updateCanonicalEvent,
  type CreateEventInput,
} from "@/server/repositories/event-mutation-repository";
import { getSafeEventForViewer } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";
import { PUBLISH_TARGET_STATUSES } from "@/lib/calendar/event-status-transitions";
import type { EventStatus } from "@prisma/client";
import { randomUUID } from "crypto";

async function returnSafe(actor: AuthenticatedActor, eventId: string) {
  return getSafeEventForViewer({
    eventId,
    viewerUserId: actor.userId,
    viewerAccess: "FULL",
  });
}

export async function cancelEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  reason: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const event = await cancelCanonicalEvent(input);
  return returnSafe(input.actor, event.id);
}

export async function publishEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  targetStatus?: (typeof PUBLISH_TARGET_STATUSES)[number];
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const target = input.targetStatus ?? "CONFIRMED";
  if (!(PUBLISH_TARGET_STATUSES as readonly string[]).includes(target)) {
    throw new ValidationError("Invalid publish target status.");
  }
  const event = await updateCanonicalEvent({
    actor: input.actor,
    eventId: input.eventId,
    data: {
      expectedVersion: input.expectedVersion,
      status: target as EventStatus,
      statusChangeReason: `Published as ${target}`,
      requestId: input.requestId,
    },
  });
  return returnSafe(input.actor, event.id);
}

export async function rescheduleEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  /** this | this_and_future | series — series edits require recurrenceSeriesId */
  scope?: "this" | "this_and_future" | "series";
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });

  const scope = input.scope ?? "this";
  const source = await prisma.event.findFirst({
    where: { id: input.eventId, archivedAt: null },
  });
  if (!source) {
    throw new ValidationError("Event not found.");
  }

  if (scope === "this" || !source.recurrenceSeriesId) {
    const event = await updateCanonicalEvent({
      actor: input.actor,
      eventId: input.eventId,
      data: {
        expectedVersion: input.expectedVersion,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        statusChangeReason: "Rescheduled",
        requestId: input.requestId,
      },
    });
    return { event: await returnSafe(input.actor, event.id), updatedCount: 1 };
  }

  const deltaMs =
    new Date(input.startsAt).getTime() - source.startsAt.getTime();
  const durationMs = source.endsAt.getTime() - source.startsAt.getTime();

  const siblings = await prisma.event.findMany({
    where: {
      recurrenceSeriesId: source.recurrenceSeriesId,
      archivedAt: null,
      status: { not: "CANCELLED" },
      ...(scope === "this_and_future"
        ? { startsAt: { gte: source.startsAt } }
        : {}),
    },
    orderBy: { startsAt: "asc" },
  });

  let updatedCount = 0;
  let primarySafe = null as Awaited<ReturnType<typeof returnSafe>> | null;

  for (const sibling of siblings) {
    const nextStart = new Date(sibling.startsAt.getTime() + deltaMs);
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    const updated = await updateCanonicalEvent({
      actor: input.actor,
      eventId: sibling.id,
      data: {
        expectedVersion: sibling.version,
        startsAt: nextStart.toISOString(),
        endsAt: nextEnd.toISOString(),
        timezone: input.timezone ?? sibling.timezone,
        statusChangeReason:
          scope === "series"
            ? "Rescheduled (full series)"
            : "Rescheduled (this and future)",
        requestId: input.requestId,
      },
    });
    updatedCount += 1;
    if (sibling.id === input.eventId) {
      primarySafe = await returnSafe(input.actor, updated.id);
    }
  }

  return {
    event:
      primarySafe ??
      (await returnSafe(input.actor, input.eventId)),
    updatedCount,
  };
}

export async function duplicateEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_CREATE",
    resource: { type: "event", id: input.eventId },
  });
  // Prefer calendar-scoped create auth after load.
  const source = await prisma.event.findFirst({
    where: { id: input.eventId, archivedAt: null },
    select: { primaryCalendarId: true },
  });
  if (!source) throw new ValidationError("Event not found.");
  await requireAuthorized(input.actor, {
    action: "EVENT_CREATE",
    resource: { type: "calendar", calendarId: source.primaryCalendarId },
  });
  const event = await duplicateCanonicalEvent(input);
  return returnSafe(input.actor, event.id);
}

/**
 * Create event; optionally expand a simple weekly RRULE into sibling Events.
 * All instances are canonical Event rows sharing recurrenceSeriesId.
 */
export async function createEventWithOptionalRecurrence(input: {
  actor: AuthenticatedActor;
  data: CreateEventInput & { weeklyOccurrences?: number };
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_CREATE",
    resource: {
      type: "calendar",
      calendarId: input.data.primaryCalendarId,
    },
  });

  const weeklyOccurrences = Math.min(
    Math.max(input.data.weeklyOccurrences ?? 0, 0),
    12,
  );
  const seriesId =
    weeklyOccurrences > 1 || input.data.isRecurring || input.data.recurrenceRule
      ? input.data.recurrenceSeriesId ?? randomUUID()
      : undefined;

  const first = await createCanonicalEvent({
    actor: input.actor,
    data: {
      ...input.data,
      isRecurring: Boolean(seriesId),
      recurrenceSeriesId: seriesId,
      recurrenceRule:
        input.data.recurrenceRule ??
        (weeklyOccurrences > 1 ? "FREQ=WEEKLY;INTERVAL=1" : undefined),
    },
  });

  if (seriesId && weeklyOccurrences > 1) {
    const duration =
      new Date(input.data.endsAt).getTime() -
      new Date(input.data.startsAt).getTime();
    for (let i = 1; i < weeklyOccurrences; i += 1) {
      const starts = new Date(
        new Date(input.data.startsAt).getTime() + i * 7 * 24 * 60 * 60 * 1000,
      );
      const ends = new Date(starts.getTime() + duration);
      await createCanonicalEvent({
        actor: input.actor,
        data: {
          ...input.data,
          startsAt: starts.toISOString(),
          endsAt: ends.toISOString(),
          status: input.data.status ?? "DRAFT",
          isRecurring: true,
          recurrenceSeriesId: seriesId,
          recurrenceRule: "FREQ=WEEKLY;INTERVAL=1",
          requestId: input.data.requestId,
        },
      });
    }
  }

  return returnSafe(input.actor, first.id);
}
