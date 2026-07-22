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
import { NotFoundError, ValidationError } from "@/lib/security/safe-error";
import { PUBLISH_TARGET_STATUSES } from "@/lib/calendar/event-status-transitions";
import type { EventStatus } from "@prisma/client";
import {
  assertAvailabilityAllowsSave,
  type AvailabilityAcknowledgementInput,
} from "@/server/services/availability-service";
import type { AvailabilityAssessment } from "@/lib/calendar/availability";

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
  seriesFingerprint?: string;
  availabilityAcknowledgement?: AvailabilityAcknowledgementInput;
}) {
  const source = await prisma.event.findFirst({
    where: { id: input.eventId, archivedAt: null },
    select: { timezone: true, isAllDay: true, status: true },
  });
  if (!source) throw new NotFoundError("Event not found.");

  // CC-05: input-only availability check — never auto-moves/cancels the Event.
  const { assessment } = await assertAvailabilityAllowsSave({
    actor: input.actor,
    eventId: input.eventId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone ?? source.timezone,
    isAllDay: source.isAllDay,
    eventStatus: source.status,
    acknowledgement: input.availabilityAcknowledgement,
    requestId: input.requestId,
  });

  const { mutateRecurrenceScope } = await import(
    "@/server/services/recurrence-series-service"
  );
  const result = await mutateRecurrenceScope({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    scope: input.scope ?? "this",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    requestId: input.requestId,
    seriesFingerprint: input.seriesFingerprint,
  });
  return {
    event: await returnSafe(input.actor, input.eventId),
    updatedCount: result.updatedCount,
    scope: result.scope,
    seriesId: result.seriesId,
    availabilityAssessment: assessment as AvailabilityAssessment,
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
 * Create event; optionally expand a recurrence rule into sibling Events (CC-04).
 * All instances are canonical Event rows sharing recurrenceSeriesId.
 * Prefer createRecurringSeries when a full RRULE + series row is required.
 */
export async function createEventWithOptionalRecurrence(input: {
  actor: AuthenticatedActor;
  data: CreateEventInput & {
    weeklyOccurrences?: number;
    materializeCount?: number;
    untilLocal?: string;
    exdatesLocal?: string[];
    availabilityAcknowledgement?: AvailabilityAcknowledgementInput;
  };
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_CREATE",
    resource: {
      type: "calendar",
      calendarId: input.data.primaryCalendarId,
    },
  });

  // CC-05: input-only availability check against the base occurrence.
  // Never blocks on its own accord — only warns/requires acknowledgement.
  // Recurring series are checked against their first occurrence only.
  const { assessment } = await assertAvailabilityAllowsSave({
    actor: input.actor,
    startsAt: input.data.startsAt,
    endsAt: input.data.endsAt,
    timezone: input.data.timezone ?? "America/Chicago",
    isAllDay: input.data.isAllDay ?? false,
    eventStatus: input.data.status,
    acknowledgement: input.data.availabilityAcknowledgement,
    requestId: input.data.requestId,
  });

  const weeklyOccurrences = Math.min(
    Math.max(input.data.weeklyOccurrences ?? 0, 0),
    12,
  );

  // Full CC-04 path when an explicit RRULE is provided (or weekly count > 1).
  if (input.data.recurrenceRule || weeklyOccurrences > 1) {
    const { createRecurringSeries } = await import(
      "@/server/services/recurrence-series-service"
    );
    const rule =
      input.data.recurrenceRule?.trim() || "FREQ=WEEKLY;INTERVAL=1";
    const result = await createRecurringSeries({
      actor: input.actor,
      data: {
        ...input.data,
        recurrenceRule: rule,
        materializeCount:
          input.data.materializeCount ??
          (weeklyOccurrences > 1 ? weeklyOccurrences : 8),
        untilLocal: input.data.untilLocal,
        exdatesLocal: input.data.exdatesLocal,
      },
      requestId: input.data.requestId,
    });
    if (!result.firstEventId) {
      throw new ValidationError("Series created without occurrences.");
    }
    return {
      event: await returnSafe(input.actor, result.firstEventId),
      availabilityAssessment: assessment as AvailabilityAssessment,
    };
  }

  const first = await createCanonicalEvent({
    actor: input.actor,
    data: input.data,
  });
  return {
    event: await returnSafe(input.actor, first.id),
    availabilityAssessment: assessment as AvailabilityAssessment,
  };
}
