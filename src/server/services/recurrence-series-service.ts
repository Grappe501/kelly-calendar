/**
 * CC-04 recurrence series service — Model B (materialized Events).
 * Views never write. Materialization is explicit and idempotent.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  createCanonicalEvent,
  updateCanonicalEvent,
  type CreateEventInput,
} from "@/server/repositories/event-mutation-repository";
import {
  buildOccurrenceKey,
  buildRuleFingerprint,
  expandRecurrenceOccurrences,
  MAX_MATERIALIZE_OCCURRENCES,
  MAX_PREVIEW_OCCURRENCES,
  parseRecurrenceRule,
  summarizeRule,
  type EditScope,
} from "@/lib/calendar/recurrence";
import { wallPartsInTimeZone } from "@/lib/calendar/temporal";

function localStartFromInstant(
  instant: Date,
  timezone: string,
  isAllDay: boolean,
): string {
  const parts = wallPartsInTimeZone(instant, timezone);
  return isAllDay ? parts.dateKey : `${parts.dateKey}T${parts.hhmm}`;
}

export async function previewRecurrenceSeries(input: {
  rrule: string;
  dtstartLocal: string;
  timezone: string;
  isAllDay: boolean;
  durationMinutes: number;
  seriesId?: string;
  maxOccurrences?: number;
  exdatesLocal?: string[];
}) {
  const seriesId = input.seriesId ?? "preview";
  const expansion = expandRecurrenceOccurrences({
    seriesId,
    rrule: input.rrule,
    dtstartLocal: input.dtstartLocal,
    timezone: input.timezone,
    isAllDay: input.isAllDay,
    durationMinutes: input.durationMinutes,
    maxOccurrences: input.maxOccurrences ?? MAX_PREVIEW_OCCURRENCES,
    exdatesLocal: input.exdatesLocal,
  });
  if (!expansion.ok) throw new ValidationError(expansion.message);
  return {
    ruleSummary: summarizeRule(expansion.parsed),
    fingerprint: buildRuleFingerprint({
      rruleNormalized: expansion.parsed.normalized,
      dtstartLocal: input.dtstartLocal,
      timezone: input.timezone,
      isAllDay: input.isAllDay,
      durationMinutes: input.durationMinutes,
    }),
    truncated: expansion.truncated,
    truncationNote: expansion.truncationNote,
    occurrences: expansion.occurrences.map((o) => ({
      occurrenceKey: o.occurrenceKey,
      originalLocalStart: o.originalLocalStart,
      startsAt: Number.isNaN(o.startsAt.getTime()) ? null : o.startsAt.toISOString(),
      endsAt: Number.isNaN(o.endsAt.getTime()) ? null : o.endsAt.toISOString(),
      lifecycle: o.lifecycle,
      reviewReason: o.reviewReason ?? null,
    })),
  };
}

export async function createRecurringSeries(input: {
  actor: AuthenticatedActor;
  data: CreateEventInput & {
    recurrenceRule: string;
    materializeCount?: number;
    untilLocal?: string;
    exdatesLocal?: string[];
  };
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_CREATE",
    resource: { type: "calendar", calendarId: input.data.primaryCalendarId },
  });

  const timezone = input.data.timezone ?? "America/Chicago";
  const isAllDay = input.data.isAllDay ?? false;
  const startsAt = new Date(input.data.startsAt);
  const endsAt = new Date(input.data.endsAt);
  const durationMinutes = Math.max(
    1,
    Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
  );
  const dtstartLocal = localStartFromInstant(startsAt, timezone, isAllDay);
  const parsed = parseRecurrenceRule(input.data.recurrenceRule);
  if (!parsed.ok) throw new ValidationError(parsed.message);

  const seriesId = input.data.recurrenceSeriesId ?? randomUUID();
  const materializeCount = Math.min(
    Math.max(input.data.materializeCount ?? 8, 1),
    MAX_MATERIALIZE_OCCURRENCES,
  );

  const expansion = expandRecurrenceOccurrences({
    seriesId,
    rrule: parsed.normalized,
    dtstartLocal,
    timezone,
    isAllDay,
    durationMinutes,
    maxOccurrences: materializeCount,
    windowEndLocal: input.data.untilLocal,
    exdatesLocal: input.data.exdatesLocal,
  });
  if (!expansion.ok) throw new ValidationError(expansion.message);

  const fingerprint = buildRuleFingerprint({
    rruleNormalized: parsed.normalized,
    dtstartLocal,
    timezone,
    isAllDay,
    durationMinutes,
  });

  const creatable = expansion.occurrences.filter(
    (o) => o.lifecycle !== "REQUIRES_REVIEW" && !Number.isNaN(o.startsAt.getTime()),
  );
  if (creatable.length === 0) {
    throw new ValidationError(
      "No valid occurrences to materialize (DST review or empty expansion).",
    );
  }

  return withTransaction(async (tx) => {
    const horizonEnd = creatable[creatable.length - 1]?.endsAt ?? endsAt;
    await tx.calendarRecurrenceSeries.create({
      data: {
        id: seriesId,
        primaryCalendarId: input.data.primaryCalendarId,
        timezone,
        isAllDay,
        baseLocalStart: dtstartLocal,
        baseDurationMinutes: durationMinutes,
        rruleOriginal: input.data.recurrenceRule,
        rruleNormalized: parsed.normalized,
        ruleFingerprint: fingerprint,
        dtstartLocal,
        untilLocal: input.data.untilLocal ?? null,
        countLimit: parsed.count,
        wkst: parsed.wkst,
        status: "ACTIVE",
        materializationHorizonEnd: horizonEnd,
        materializationVersion: 1,
        createdByUserId: input.actor.userId,
        updatedByUserId: input.actor.userId,
        unsupportedComponents: [],
      },
    });

    const createdEventIds: string[] = [];
    let firstEventId: string | null = null;

    for (const occ of creatable) {
      const event = await createCanonicalEvent({
        actor: input.actor,
        data: {
          ...input.data,
          startsAt: occ.startsAt.toISOString(),
          endsAt: occ.endsAt.toISOString(),
          timezone,
          isAllDay,
          isRecurring: true,
          recurrenceSeriesId: seriesId,
          recurrenceRule: parsed.normalized,
          requestId: input.requestId,
        },
      });
      await tx.event.update({
        where: { id: event.id },
        data: { originalOccurrenceAt: occ.startsAt },
      });
      createdEventIds.push(event.id);
      if (!firstEventId) firstEventId = event.id;
    }

    for (const ex of input.data.exdatesLocal ?? []) {
      const originalLocalStart = ex;
      const occurrenceKey = buildOccurrenceKey({
        seriesId,
        originalLocalStart,
        timezone,
        isAllDay,
      });
      await tx.calendarOccurrenceException.create({
        data: {
          seriesId,
          occurrenceKey,
          originalOccurrenceAt: creatable[0]?.startsAt ?? startsAt,
          exceptionType: "EXCLUDED",
          reason: "EXDATE on create",
          createdByUserId: input.actor.userId,
          updatedByUserId: input.actor.userId,
        },
      });
    }

    await writeAttributedAudit({
      actor: input.actor,
      action: "RECURRENCE_SERIES_CREATED",
      entityType: "CalendarRecurrenceSeries",
      entityId: seriesId,
      requestId: input.requestId,
      newState: {
        seriesId,
        eventCount: createdEventIds.length,
        fingerprint,
        truncated: expansion.truncated,
      },
      tx,
    });

    return {
      seriesId,
      firstEventId,
      createdEventIds,
      materializedCount: createdEventIds.length,
      truncated: expansion.truncated,
      truncationNote: expansion.truncationNote,
      ruleSummary: summarizeRule(parsed),
      requiresReviewCount: expansion.occurrences.filter(
        (o) => o.lifecycle === "REQUIRES_REVIEW",
      ).length,
    };
  });
}

export async function getSeriesWorkspace(input: {
  actor: AuthenticatedActor;
  seriesId: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });

  const series = await prisma.calendarRecurrenceSeries.findUnique({
    where: { id: input.seriesId },
    include: { exceptions: { orderBy: { originalOccurrenceAt: "asc" } } },
  });
  if (!series) throw new NotFoundError("Series not found.");

  const events = await prisma.event.findMany({
    where: { recurrenceSeriesId: input.seriesId, archivedAt: null },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      eventNumber: true,
      internalTitle: true,
      startsAt: true,
      endsAt: true,
      status: true,
      originalOccurrenceAt: true,
      timezone: true,
      isAllDay: true,
      version: true,
      campaignMission: { select: { id: true } },
    },
  });

  const parsed = parseRecurrenceRule(series.rruleNormalized);

  return {
    series: {
      id: series.id,
      timezone: series.timezone,
      isAllDay: series.isAllDay,
      rruleNormalized: series.rruleNormalized,
      rruleOriginal: series.rruleOriginal,
      ruleFingerprint: series.ruleFingerprint,
      dtstartLocal: series.dtstartLocal,
      untilLocal: series.untilLocal,
      countLimit: series.countLimit,
      status: series.status,
      materializationVersion: series.materializationVersion,
      materializationHorizonEnd:
        series.materializationHorizonEnd?.toISOString() ?? null,
      ruleSummary: parsed.ok ? summarizeRule(parsed) : series.rruleNormalized,
    },
    exceptions: series.exceptions.map((e) => ({
      id: e.id,
      occurrenceKey: e.occurrenceKey,
      exceptionType: e.exceptionType,
      originalOccurrenceAt: e.originalOccurrenceAt.toISOString(),
      eventId: e.eventId,
      reason: e.reason,
      restoredAt: e.restoredAt?.toISOString() ?? null,
    })),
    occurrences: events.map((e) => ({
      eventId: e.id,
      eventNumber: e.eventNumber,
      title: e.internalTitle,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      status: e.status,
      originalOccurrenceAt: e.originalOccurrenceAt?.toISOString() ?? null,
      timezone: e.timezone,
      isAllDay: e.isAllDay,
      version: e.version,
      missionId: e.campaignMission?.id ?? null,
      href: `/events/${e.id}`,
    })),
  };
}

export async function mutateRecurrenceScope(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  scope: EditScope;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  internalTitle?: string;
  requestId?: string;
  seriesFingerprint?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });

  const source = await prisma.event.findFirst({
    where: { id: input.eventId, archivedAt: null },
  });
  if (!source) throw new NotFoundError("Event not found.");
  if (source.version !== input.expectedVersion) {
    throw new ConflictError("This event changed after you opened it.");
  }

  if (input.scope === "this" || !source.recurrenceSeriesId) {
    const updated = await updateCanonicalEvent({
      actor: input.actor,
      eventId: input.eventId,
      data: {
        expectedVersion: input.expectedVersion,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        internalTitle: input.internalTitle,
        statusChangeReason: "Occurrence edited (this only)",
        requestId: input.requestId,
      },
    });

    if (source.recurrenceSeriesId && source.originalOccurrenceAt) {
      const series = await prisma.calendarRecurrenceSeries.findUnique({
        where: { id: source.recurrenceSeriesId },
      });
      const originalLocal = localStartFromInstant(
        source.originalOccurrenceAt,
        source.timezone,
        source.isAllDay,
      );
      const occurrenceKey = buildOccurrenceKey({
        seriesId: source.recurrenceSeriesId,
        originalLocalStart: originalLocal,
        timezone: series?.timezone ?? source.timezone,
        isAllDay: source.isAllDay,
      });
      await prisma.calendarOccurrenceException.upsert({
        where: {
          seriesId_occurrenceKey: {
            seriesId: source.recurrenceSeriesId,
            occurrenceKey,
          },
        },
        create: {
          seriesId: source.recurrenceSeriesId,
          occurrenceKey,
          originalOccurrenceAt: source.originalOccurrenceAt,
          exceptionType: "MODIFIED",
          eventId: source.id,
          overrideStartsAt: new Date(input.startsAt),
          overrideEndsAt: new Date(input.endsAt),
          overrideTitle: input.internalTitle,
          overrideTimezone: input.timezone,
          reason: "Edit this occurrence",
          createdByUserId: input.actor.userId,
          updatedByUserId: input.actor.userId,
        },
        update: {
          exceptionType: "MODIFIED",
          overrideStartsAt: new Date(input.startsAt),
          overrideEndsAt: new Date(input.endsAt),
          overrideTitle: input.internalTitle,
          overrideTimezone: input.timezone,
          updatedByUserId: input.actor.userId,
          restoredAt: null,
        },
      });
    }

    await writeAttributedAudit({
      actor: input.actor,
      action: "RECURRENCE_OCCURRENCE_EDITED",
      entityType: "Event",
      entityId: updated.id,
      requestId: input.requestId,
      newState: { scope: "this" },
    });

    return { updatedCount: 1, scope: "this" as const, seriesId: source.recurrenceSeriesId };
  }

  const series = await prisma.calendarRecurrenceSeries.findUnique({
    where: { id: source.recurrenceSeriesId },
  });
  if (
    series &&
    input.seriesFingerprint &&
    input.seriesFingerprint !== series.ruleFingerprint
  ) {
    throw new ConflictError(
      "Series changed since preview. Refresh and confirm again.",
    );
  }

  if (input.scope === "this_and_future") {
    return splitSeriesThisAndFuture({
      actor: input.actor,
      source,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      internalTitle: input.internalTitle,
      requestId: input.requestId,
    });
  }

  const deltaMs =
    new Date(input.startsAt).getTime() - source.startsAt.getTime();
  const durationMs =
    new Date(input.endsAt).getTime() - new Date(input.startsAt).getTime();

  const siblings = await prisma.event.findMany({
    where: {
      recurrenceSeriesId: source.recurrenceSeriesId,
      archivedAt: null,
      status: { not: "CANCELLED" },
    },
    orderBy: { startsAt: "asc" },
  });

  const modifiedKeys = new Set(
    (
      await prisma.calendarOccurrenceException.findMany({
        where: {
          seriesId: source.recurrenceSeriesId,
          exceptionType: { in: ["MODIFIED", "DETACHED", "CANCELLED", "EXCLUDED"] },
          restoredAt: null,
        },
        select: { eventId: true },
      })
    )
      .map((e) => e.eventId)
      .filter(Boolean),
  );

  let updatedCount = 0;
  for (const sibling of siblings) {
    if (modifiedKeys.has(sibling.id) && sibling.id !== source.id) continue;
    const nextStart = new Date(sibling.startsAt.getTime() + deltaMs);
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    await updateCanonicalEvent({
      actor: input.actor,
      eventId: sibling.id,
      data: {
        expectedVersion: sibling.version,
        startsAt: nextStart.toISOString(),
        endsAt: nextEnd.toISOString(),
        timezone: input.timezone ?? sibling.timezone,
        internalTitle:
          sibling.id === source.id ? input.internalTitle : undefined,
        statusChangeReason: "Rescheduled (full series)",
        requestId: input.requestId,
      },
    });
    updatedCount += 1;
  }

  if (series) {
    await prisma.calendarRecurrenceSeries.update({
      where: { id: series.id },
      data: {
        materializationVersion: { increment: 1 },
        updatedByUserId: input.actor.userId,
        timezone: input.timezone ?? series.timezone,
      },
    });
  }

  await writeAttributedAudit({
    actor: input.actor,
    action: "RECURRENCE_SERIES_EDITED",
    entityType: "CalendarRecurrenceSeries",
    entityId: source.recurrenceSeriesId,
    requestId: input.requestId,
    newState: { scope: "series", updatedCount },
  });

  return {
    updatedCount,
    scope: "series" as const,
    seriesId: source.recurrenceSeriesId,
  };
}

async function splitSeriesThisAndFuture(input: {
  actor: AuthenticatedActor;
  source: {
    id: string;
    recurrenceSeriesId: string | null;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    isAllDay: boolean;
    internalTitle: string;
    primaryCalendarId: string;
    version: number;
  };
  startsAt: string;
  endsAt: string;
  timezone?: string;
  internalTitle?: string;
  requestId?: string;
}) {
  const oldSeriesId = input.source.recurrenceSeriesId!;
  const oldSeries = await prisma.calendarRecurrenceSeries.findUnique({
    where: { id: oldSeriesId },
  });
  const newSeriesId = randomUUID();
  const boundary = input.source.startsAt;

  const futureEvents = await prisma.event.findMany({
    where: {
      recurrenceSeriesId: oldSeriesId,
      archivedAt: null,
      startsAt: { gte: boundary },
    },
    orderBy: { startsAt: "asc" },
  });

  const pastCutoff = new Date(boundary.getTime() - 1);
  if (oldSeries) {
    await prisma.calendarRecurrenceSeries.update({
      where: { id: oldSeriesId },
      data: {
        status: "ENDED",
        untilLocal: localStartFromInstant(
          pastCutoff,
          oldSeries.timezone,
          oldSeries.isAllDay,
        ).slice(0, 10),
        updatedByUserId: input.actor.userId,
      },
    });
  }

  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(input.endsAt).getTime() - new Date(input.startsAt).getTime()) /
        60_000,
    ),
  );
  const timezone = input.timezone ?? input.source.timezone;
  const dtstartLocal = localStartFromInstant(
    new Date(input.startsAt),
    timezone,
    input.source.isAllDay,
  );
  const rrule = oldSeries?.rruleNormalized ?? "FREQ=WEEKLY;INTERVAL=1";
  const parsed = parseRecurrenceRule(rrule);
  const fingerprint = buildRuleFingerprint({
    rruleNormalized: parsed.ok ? parsed.normalized : rrule,
    dtstartLocal,
    timezone,
    isAllDay: input.source.isAllDay,
    durationMinutes,
  });

  await prisma.calendarRecurrenceSeries.create({
    data: {
      id: newSeriesId,
      primaryCalendarId: input.source.primaryCalendarId,
      timezone,
      isAllDay: input.source.isAllDay,
      baseLocalStart: dtstartLocal,
      baseDurationMinutes: durationMinutes,
      rruleOriginal: oldSeries?.rruleOriginal ?? rrule,
      rruleNormalized: parsed.ok ? parsed.normalized : rrule,
      ruleFingerprint: fingerprint,
      dtstartLocal,
      status: "ACTIVE",
      createdByUserId: input.actor.userId,
      updatedByUserId: input.actor.userId,
      unsupportedComponents: [],
    },
  });

  let updatedCount = 0;
  const deltaMs =
    new Date(input.startsAt).getTime() - input.source.startsAt.getTime();
  const durationMs =
    new Date(input.endsAt).getTime() - new Date(input.startsAt).getTime();

  for (const ev of futureEvents) {
    const nextStart =
      ev.id === input.source.id
        ? new Date(input.startsAt)
        : new Date(ev.startsAt.getTime() + deltaMs);
    const nextEnd =
      ev.id === input.source.id
        ? new Date(input.endsAt)
        : new Date(nextStart.getTime() + durationMs);
    await updateCanonicalEvent({
      actor: input.actor,
      eventId: ev.id,
      data: {
        expectedVersion: ev.version,
        startsAt: nextStart.toISOString(),
        endsAt: nextEnd.toISOString(),
        timezone,
        internalTitle:
          ev.id === input.source.id ? input.internalTitle : undefined,
        statusChangeReason: "Series split (this and future)",
        requestId: input.requestId,
      },
    });
    await prisma.event.update({
      where: { id: ev.id },
      data: {
        recurrenceSeriesId: newSeriesId,
        recurrenceRule: parsed.ok ? parsed.normalized : rrule,
      },
    });
    updatedCount += 1;
  }

  await writeAttributedAudit({
    actor: input.actor,
    action: "RECURRENCE_SERIES_SPLIT",
    entityType: "CalendarRecurrenceSeries",
    entityId: newSeriesId,
    requestId: input.requestId,
    newState: {
      oldSeriesId,
      newSeriesId,
      boundary: boundary.toISOString(),
      movedCount: updatedCount,
    },
  });

  return {
    updatedCount,
    scope: "this_and_future" as const,
    seriesId: newSeriesId,
    priorSeriesId: oldSeriesId,
  };
}

export async function cancelOccurrence(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  reason?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const source = await prisma.event.findFirst({
    where: { id: input.eventId, archivedAt: null },
  });
  if (!source) throw new NotFoundError("Event not found.");

  await updateCanonicalEvent({
    actor: input.actor,
    eventId: input.eventId,
    data: {
      expectedVersion: input.expectedVersion,
      status: "CANCELLED",
      statusChangeReason: input.reason ?? "Occurrence cancelled",
      requestId: input.requestId,
    },
  });

  if (source.recurrenceSeriesId && source.originalOccurrenceAt) {
    const originalLocal = localStartFromInstant(
      source.originalOccurrenceAt,
      source.timezone,
      source.isAllDay,
    );
    const occurrenceKey = buildOccurrenceKey({
      seriesId: source.recurrenceSeriesId,
      originalLocalStart: originalLocal,
      timezone: source.timezone,
      isAllDay: source.isAllDay,
    });
    await prisma.calendarOccurrenceException.upsert({
      where: {
        seriesId_occurrenceKey: {
          seriesId: source.recurrenceSeriesId,
          occurrenceKey,
        },
      },
      create: {
        seriesId: source.recurrenceSeriesId,
        occurrenceKey,
        originalOccurrenceAt: source.originalOccurrenceAt,
        exceptionType: "CANCELLED",
        eventId: source.id,
        reason: input.reason ?? "Cancelled occurrence",
        createdByUserId: input.actor.userId,
        updatedByUserId: input.actor.userId,
      },
      update: {
        exceptionType: "CANCELLED",
        reason: input.reason ?? "Cancelled occurrence",
        updatedByUserId: input.actor.userId,
        restoredAt: null,
      },
    });
  }

  await writeAttributedAudit({
    actor: input.actor,
    action: "RECURRENCE_OCCURRENCE_CANCELLED",
    entityType: "Event",
    entityId: input.eventId,
    requestId: input.requestId,
  });

  return { cancelled: true };
}

export async function restoreOccurrence(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const source = await prisma.event.findFirst({
    where: { id: input.eventId },
  });
  if (!source) throw new NotFoundError("Event not found.");

  await updateCanonicalEvent({
    actor: input.actor,
    eventId: input.eventId,
    data: {
      expectedVersion: input.expectedVersion,
      status: "HOLD",
      statusChangeReason: "Occurrence restored",
      requestId: input.requestId,
    },
  });

  if (source.recurrenceSeriesId) {
    await prisma.calendarOccurrenceException.updateMany({
      where: {
        seriesId: source.recurrenceSeriesId,
        eventId: source.id,
        exceptionType: "CANCELLED",
        restoredAt: null,
      },
      data: {
        restoredAt: new Date(),
        updatedByUserId: input.actor.userId,
      },
    });
  }

  await writeAttributedAudit({
    actor: input.actor,
    action: "RECURRENCE_OCCURRENCE_RESTORED",
    entityType: "Event",
    entityId: input.eventId,
    requestId: input.requestId,
  });

  return { restored: true };
}
