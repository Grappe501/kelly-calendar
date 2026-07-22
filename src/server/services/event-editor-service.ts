import "server-only";

import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import {
  deriveEventOperationalLifecycle,
  type EventPersistenceStatus,
} from "@/lib/calendar/canonical-event";
import { NotFoundError, ValidationError } from "@/lib/security/safe-error";
import type { PersonEventRole, StaffRoleType } from "@prisma/client";

export type EventEditorPayload = {
  eventId: string;
  eventNumber: string;
  version: number;
  title: string;
  campaignDisplayTitle: string;
  status: EventPersistenceStatus;
  operationalLifecycle: ReturnType<typeof deriveEventOperationalLifecycle>;
  startsAt: string;
  endsAt: string;
  timezone: string;
  isAllDay: boolean;
  venueName: string | null;
  streetAddress: string | null;
  city: string | null;
  locationNotes: string | null;
  virtualMeetingUrl: string | null;
  locationDisclosure: string;
  defaultVisibility: string;
  privateNotes: string | null;
  eventType: string | null;
  primaryCalendar: { id: string; name: string; type: string };
  isRecurring: boolean;
  recurrenceSeriesId: string | null;
  recurrenceRule: string | null;
  people: Array<{ id: string; displayName: string; role: string }>;
  objectives: Array<{ id: string; title: string; objectiveType: string }>;
  prepActions: Array<{ id: string; title: string; phase: string; status: string }>;
  followUps: Array<{ id: string; title: string; status: string }>;
  staff: Array<{ id: string; roleType: string; label: string | null }>;
  missionId: string | null;
};

export async function getEventEditorPayload(
  actor: AuthenticatedActor,
  eventId: string,
): Promise<EventEditorPayload> {
  await requireAuthorized(actor, {
    action: "EVENT_VIEW",
    resource: { type: "event", id: eventId },
  });

  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: {
      primaryCalendar: true,
      campaignMission: { select: { id: true } },
      eventPeople: { include: { person: true }, take: 40 },
      objectives: { take: 20, orderBy: { createdAt: "asc" } },
      actionItems: {
        where: { status: { notIn: ["COMPLETE", "CANCELLED"] } },
        take: 40,
        orderBy: { createdAt: "asc" },
      },
      followups: { take: 20, orderBy: { createdAt: "desc" } },
      staffAssignments: { take: 20 },
    },
  });
  if (!event) throw new NotFoundError("Event not found.");

  const openFollowUps = event.followups.filter((f) => f.status !== "COMPLETE").length;

  return {
    eventId: event.id,
    eventNumber: event.eventNumber,
    version: event.version,
    title: event.internalTitle,
    campaignDisplayTitle: event.campaignDisplayTitle,
    status: event.status as EventPersistenceStatus,
    operationalLifecycle: deriveEventOperationalLifecycle({
      status: event.status as EventPersistenceStatus,
      archivedAt: event.archivedAt,
      openFollowUpCount: openFollowUps,
    }),
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    isAllDay: event.isAllDay,
    venueName: event.venueName,
    streetAddress: event.streetAddress,
    city: event.city,
    locationNotes: event.locationNotes,
    virtualMeetingUrl: event.virtualMeetingUrl,
    locationDisclosure: event.locationDisclosure,
    defaultVisibility: event.defaultVisibility,
    privateNotes: event.privateNotes,
    eventType: event.eventType,
    primaryCalendar: {
      id: event.primaryCalendar.id,
      name: event.primaryCalendar.name,
      type: event.primaryCalendar.calendarType,
    },
    isRecurring: event.isRecurring,
    recurrenceSeriesId: event.recurrenceSeriesId,
    recurrenceRule: event.recurrenceRule,
    people: event.eventPeople.map((p) => ({
      id: p.id,
      displayName: p.person.displayName,
      role: p.role,
    })),
    objectives: event.objectives.map((o) => ({
      id: o.id,
      title: o.description?.trim() || o.objectiveType,
      objectiveType: o.objectiveType,
    })),
    prepActions: event.actionItems.map((a) => ({
      id: a.id,
      title: a.title,
      phase: a.phase,
      status: a.status,
    })),
    followUps: event.followups.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
    })),
    staff: event.staffAssignments.map((s) => ({
      id: s.id,
      roleType: s.roleType,
      label: s.instructions,
    })),
    missionId: event.campaignMission?.id ?? null,
  };
}

export async function getEventAuditHistory(
  actor: AuthenticatedActor,
  eventId: string,
) {
  await requireAuthorized(actor, {
    action: "AUDIT_VIEW",
    resource: { type: "event", id: eventId },
  });

  const [audits, statusHistory] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: "Event", entityId: eventId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
        actorUserId: true,
        previousStateRedacted: true,
        newStateRedacted: true,
      },
    }),
    prisma.eventStatusHistory.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    audits: audits.map((a) => ({
      id: a.id,
      action: a.action,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
      actorUserId: a.actorUserId,
      previousState: a.previousStateRedacted,
      newState: a.newStateRedacted,
    })),
    statusHistory: statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      changedAt: h.createdAt.toISOString(),
      changedByUserId: h.changedByUserId,
    })),
  };
}

export async function addEventParticipantByName(input: {
  actor: AuthenticatedActor;
  eventId: string;
  displayName: string;
  role?: PersonEventRole;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const name = input.displayName.trim();
  if (!name) throw new ValidationError("Participant name is required.");

  const event = await prisma.event.findFirst({
    where: { id: input.eventId, archivedAt: null },
  });
  if (!event) throw new NotFoundError("Event not found.");

  let person = await prisma.person.findFirst({
    where: { displayName: name, archivedAt: null },
  });
  if (!person) {
    person = await prisma.person.create({
      data: { displayName: name },
    });
  }

  const role = input.role ?? "ATTENDEE";
  const link = await prisma.eventPerson.upsert({
    where: {
      eventId_personId_role: {
        eventId: input.eventId,
        personId: person.id,
        role,
      },
    },
    create: {
      eventId: input.eventId,
      personId: person.id,
      role,
    },
    update: {},
  });

  return { id: link.id, displayName: person.displayName, role: link.role };
}

export async function addEventPrepOrFollowUp(input: {
  actor: AuthenticatedActor;
  eventId: string;
  kind: "prep" | "follow_up";
  title: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const title = input.title.trim();
  if (!title) throw new ValidationError("Title is required.");

  if (input.kind === "prep") {
    const item = await prisma.eventActionItem.create({
      data: {
        eventId: input.eventId,
        title,
        phase: "PRE_EVENT",
        status: "NOT_STARTED",
      },
    });
    return { id: item.id, title: item.title, kind: "prep" as const };
  }

  const follow = await prisma.eventFollowup.create({
    data: {
      eventId: input.eventId,
      title,
      status: "NOT_STARTED",
    },
  });
  return { id: follow.id, title: follow.title, kind: "follow_up" as const };
}

export async function addEventObjective(input: {
  actor: AuthenticatedActor;
  eventId: string;
  title: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_OBJECTIVES_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const title = input.title.trim();
  if (!title) throw new ValidationError("Objective title is required.");
  const row = await prisma.eventObjective.create({
    data: {
      eventId: input.eventId,
      description: title,
      objectiveType: "OTHER",
      isPrimary: false,
    },
  });
  return { id: row.id, title: row.description ?? title };
}

export async function addEventStaffAssignment(input: {
  actor: AuthenticatedActor;
  eventId: string;
  roleType?: StaffRoleType;
  label?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "EVENT_STAFFING_EDIT",
    resource: { type: "event", id: input.eventId },
  });
  const row = await prisma.eventStaffAssignment.create({
    data: {
      eventId: input.eventId,
      roleType: input.roleType ?? "CUSTOM",
      instructions: input.label?.trim() || null,
    },
  });
  return {
    id: row.id,
    roleType: row.roleType,
    label: row.instructions,
  };
}
