import "server-only";

import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import type { EventStatus, LocationDisclosure, EventVisibilityLevel } from "@prisma/client";

export type CreateEventInput = {
  primaryCalendarId: string;
  internalTitle: string;
  campaignDisplayTitle?: string;
  publicTitle?: string;
  eventType?: string;
  status?: EventStatus;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  city?: string;
  countyId?: string;
  venueName?: string;
  locationDisclosure?: LocationDisclosure;
  defaultVisibility?: EventVisibilityLevel;
  candidateAttendance?: boolean;
  candidateRole?: string;
  relatedCalendarIds?: string[];
  requestId?: string;
};

export type UpdateEventInput = {
  expectedVersion: number;
  internalTitle?: string;
  campaignDisplayTitle?: string;
  publicTitle?: string;
  eventType?: string;
  status?: EventStatus;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  city?: string;
  countyId?: string | null;
  venueName?: string | null;
  locationDisclosure?: LocationDisclosure;
  defaultVisibility?: EventVisibilityLevel;
  candidateRole?: string | null;
  privateNotes?: string | null;
  requestId?: string;
};

async function allocateEventNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  year: number,
): Promise<string> {
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

function assertTimeRange(startsAt: Date, endsAt: Date) {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new ValidationError("Invalid start or end time.");
  }
  if (endsAt.getTime() < startsAt.getTime()) {
    throw new ValidationError("End time must be on or after start time.");
  }
}

export async function createCanonicalEvent(input: {
  actor: AuthenticatedActor;
  data: CreateEventInput;
}) {
  const startsAt = new Date(input.data.startsAt);
  const endsAt = new Date(input.data.endsAt);
  assertTimeRange(startsAt, endsAt);
  if (!input.data.internalTitle?.trim()) {
    throw new ValidationError("Title is required.");
  }

  const calendar = await prisma.calendar.findFirst({
    where: { id: input.data.primaryCalendarId, archivedAt: null },
  });
  if (!calendar) throw new NotFoundError("Primary calendar not found.");

  const year = startsAt.getFullYear();
  const title = input.data.internalTitle.trim();
  const display = (input.data.campaignDisplayTitle ?? title).trim();

  return withTransaction(async (tx) => {
    const eventNumber = await allocateEventNumber(tx, year);
    const event = await tx.event.create({
      data: {
        eventNumber,
        sourceType: "MANUAL",
        createdByUserId: input.actor.userId,
        ownerUserId: input.actor.userId,
        primaryCalendarId: input.data.primaryCalendarId,
        internalTitle: title,
        campaignDisplayTitle: display,
        publicTitle: input.data.publicTitle?.trim() || null,
        eventType: input.data.eventType ?? null,
        status: input.data.status ?? "DRAFT",
        startsAt,
        endsAt,
        timezone: input.data.timezone ?? "America/Chicago",
        city: input.data.city ?? null,
        countyId: input.data.countyId ?? null,
        venueName: input.data.venueName ?? null,
        locationDisclosure: input.data.locationDisclosure ?? "CITY",
        defaultVisibility: input.data.defaultVisibility ?? "TITLE_LOCATION",
        candidateAttendance: input.data.candidateAttendance ?? null,
        candidateRole: input.data.candidateRole ?? null,
        version: 1,
      },
    });

    await tx.eventCalendarMembership.create({
      data: {
        eventId: event.id,
        calendarId: input.data.primaryCalendarId,
        membershipType: "PRIMARY",
        isPrimary: true,
        createdByUserId: input.actor.userId,
      },
    });

    for (const calendarId of input.data.relatedCalendarIds ?? []) {
      if (calendarId === input.data.primaryCalendarId) continue;
      await tx.eventCalendarMembership.create({
        data: {
          eventId: event.id,
          calendarId,
          membershipType: "RELATED",
          isPrimary: false,
          createdByUserId: input.actor.userId,
        },
      });
    }

    await tx.eventStatusHistory.create({
      data: {
        eventId: event.id,
        fromStatus: null,
        toStatus: event.status,
        changedByUserId: input.actor.userId,
        reason: "Created",
      },
    });

    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_CREATED",
      entityType: "Event",
      entityId: event.id,
      requestId: input.data.requestId,
      newState: {
        eventNumber: event.eventNumber,
        title: event.internalTitle,
        status: event.status,
        version: event.version,
      },
      tx,
    });

    return event;
  });
}

export async function updateCanonicalEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  data: UpdateEventInput;
}) {
  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: input.eventId } });
    if (!existing || existing.archivedAt) {
      throw new NotFoundError("Event not found.");
    }
    if (existing.version !== input.data.expectedVersion) {
      throw new ConflictError(
        "This event changed after you opened it. Review the latest version before saving.",
      );
    }

    const startsAt = input.data.startsAt
      ? new Date(input.data.startsAt)
      : existing.startsAt;
    const endsAt = input.data.endsAt ? new Date(input.data.endsAt) : existing.endsAt;
    assertTimeRange(startsAt, endsAt);

    const nextStatus = input.data.status ?? existing.status;
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: {
        internalTitle: input.data.internalTitle?.trim() ?? existing.internalTitle,
        campaignDisplayTitle:
          input.data.campaignDisplayTitle?.trim() ?? existing.campaignDisplayTitle,
        publicTitle:
          input.data.publicTitle !== undefined
            ? input.data.publicTitle?.trim() || null
            : existing.publicTitle,
        eventType: input.data.eventType ?? existing.eventType,
        status: nextStatus,
        startsAt,
        endsAt,
        timezone: input.data.timezone ?? existing.timezone,
        city: input.data.city !== undefined ? input.data.city : existing.city,
        countyId:
          input.data.countyId !== undefined ? input.data.countyId : existing.countyId,
        venueName:
          input.data.venueName !== undefined ? input.data.venueName : existing.venueName,
        locationDisclosure:
          input.data.locationDisclosure ?? existing.locationDisclosure,
        defaultVisibility:
          input.data.defaultVisibility ?? existing.defaultVisibility,
        candidateRole:
          input.data.candidateRole !== undefined
            ? input.data.candidateRole
            : existing.candidateRole,
        privateNotes:
          input.data.privateNotes !== undefined
            ? input.data.privateNotes
            : existing.privateNotes,
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
          reason: "Status update",
        },
      });
    }

    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_UPDATED",
      entityType: "Event",
      entityId: existing.id,
      requestId: input.data.requestId,
      previousState: {
        version: existing.version,
        status: existing.status,
        title: existing.internalTitle,
      },
      newState: {
        version: updated.version,
        status: updated.status,
        title: updated.internalTitle,
      },
      tx,
    });

    return updated;
  });
}

export async function archiveCanonicalEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  reason: string;
  requestId?: string;
}) {
  if (!input.reason?.trim()) throw new ValidationError("Archive reason is required.");
  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: input.eventId } });
    if (!existing || existing.archivedAt) throw new NotFoundError("Event not found.");
    if (existing.version !== input.expectedVersion) {
      throw new ConflictError(
        "This event changed after you opened it. Review the latest version before saving.",
      );
    }
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: {
        archivedAt: new Date(),
        archivedByUserId: input.actor.userId,
        archiveReason: input.reason.trim(),
        status: "ARCHIVED",
        version: { increment: 1 },
      },
    });
    await tx.eventStatusHistory.create({
      data: {
        eventId: existing.id,
        fromStatus: existing.status,
        toStatus: "ARCHIVED",
        changedByUserId: input.actor.userId,
        reason: input.reason.trim(),
      },
    });
    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_ARCHIVED",
      entityType: "Event",
      entityId: existing.id,
      requestId: input.requestId,
      reason: input.reason.trim(),
      previousState: { version: existing.version, status: existing.status },
      newState: { version: updated.version, status: updated.status },
      tx,
    });
    return updated;
  });
}

export async function restoreCanonicalEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id: input.eventId } });
    if (!existing || !existing.archivedAt) {
      throw new NotFoundError("Archived event not found.");
    }
    if (existing.version !== input.expectedVersion) {
      throw new ConflictError(
        "This event changed after you opened it. Review the latest version before saving.",
      );
    }
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: {
        archivedAt: null,
        archivedByUserId: null,
        archiveReason: null,
        status: "DRAFT",
        version: { increment: 1 },
      },
    });
    await tx.eventStatusHistory.create({
      data: {
        eventId: existing.id,
        fromStatus: existing.status,
        toStatus: "DRAFT",
        changedByUserId: input.actor.userId,
        reason: "Restored",
      },
    });
    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_RESTORED",
      entityType: "Event",
      entityId: existing.id,
      requestId: input.requestId,
      previousState: { version: existing.version },
      newState: { version: updated.version, status: updated.status },
      tx,
    });
    return updated;
  });
}

export async function changePrimaryCalendar(input: {
  actor: AuthenticatedActor;
  eventId: string;
  newPrimaryCalendarId: string;
  expectedVersion: number;
  requestId?: string;
}) {
  return withTransaction(async (tx) => {
    const existing = await tx.event.findUnique({
      where: { id: input.eventId },
      include: { calendarMemberships: true },
    });
    if (!existing || existing.archivedAt) throw new NotFoundError("Event not found.");
    if (existing.version !== input.expectedVersion) {
      throw new ConflictError(
        "This event changed after you opened it. Review the latest version before saving.",
      );
    }
    const calendar = await tx.calendar.findFirst({
      where: { id: input.newPrimaryCalendarId, archivedAt: null },
    });
    if (!calendar) throw new NotFoundError("Calendar not found.");

    const oldPrimaryId = existing.primaryCalendarId;
    await tx.event.update({
      where: { id: existing.id },
      data: {
        primaryCalendarId: input.newPrimaryCalendarId,
        version: { increment: 1 },
      },
    });

    await tx.eventCalendarMembership.updateMany({
      where: { eventId: existing.id, isPrimary: true, removedAt: null },
      data: { isPrimary: false, membershipType: "RELATED" },
    });

    const existingMem = existing.calendarMemberships.find(
      (m) => m.calendarId === input.newPrimaryCalendarId && !m.removedAt,
    );
    if (existingMem) {
      await tx.eventCalendarMembership.update({
        where: { id: existingMem.id },
        data: { isPrimary: true, membershipType: "PRIMARY" },
      });
    } else {
      await tx.eventCalendarMembership.create({
        data: {
          eventId: existing.id,
          calendarId: input.newPrimaryCalendarId,
          isPrimary: true,
          membershipType: "PRIMARY",
          createdByUserId: input.actor.userId,
        },
      });
    }

    const updated = await tx.event.findUniqueOrThrow({ where: { id: existing.id } });
    await writeAttributedAudit({
      actor: input.actor,
      action: "EVENT_PRIMARY_CALENDAR_CHANGED",
      entityType: "Event",
      entityId: existing.id,
      requestId: input.requestId,
      previousState: { primaryCalendarId: oldPrimaryId, version: existing.version },
      newState: {
        primaryCalendarId: input.newPrimaryCalendarId,
        version: updated.version,
      },
      tx,
    });
    return updated;
  });
}
