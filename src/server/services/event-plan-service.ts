import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import type { MutationAction } from "@/server/auth/actions";
import { withTransaction } from "@/server/db/transaction";
import { prisma } from "@/server/db/prisma";
import { ConflictError, NotFoundError } from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";

async function bumpEventVersion(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  eventId: string,
  expectedVersion: number,
) {
  const existing = await tx.event.findUnique({ where: { id: eventId } });
  if (!existing || existing.archivedAt) throw new NotFoundError("Event not found.");
  if (existing.version !== expectedVersion) {
    throw new ConflictError(
      "This event changed after you opened it. Review the latest version before saving.",
    );
  }
  return tx.event.update({
    where: { id: eventId },
    data: { version: { increment: 1 } },
  });
}

async function replaceSection(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  action: MutationAction;
  auditAction: string;
  requestId?: string;
  replace: (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  ) => Promise<void>;
}) {
  await requireAuthorized(input.actor, {
    action: input.action,
    resource: { type: "event", id: input.eventId },
  });
  return withTransaction(async (tx) => {
    await input.replace(tx);
    const updated = await bumpEventVersion(tx, input.eventId, input.expectedVersion);
    await writeAttributedAudit({
      actor: input.actor,
      action: input.auditAction,
      entityType: "Event",
      entityId: input.eventId,
      requestId: input.requestId,
      newState: { version: updated.version },
      tx,
    });
    return { eventId: input.eventId, version: updated.version };
  });
}

export async function replaceObjectives(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  items: Array<{
    objectiveType: string;
    description: string;
    isPrimary?: boolean;
    successDefinition?: string;
  }>;
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_OBJECTIVES_EDIT",
    auditAction: "EVENT_OBJECTIVES_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventObjective.deleteMany({ where: { eventId: input.eventId } });
      if (input.items.length) {
        await tx.eventObjective.createMany({
          data: input.items.map((item, index) => ({
            eventId: input.eventId,
            objectiveType: item.objectiveType as never,
            description: item.description,
            isPrimary: item.isPrimary ?? index === 0,
            successDefinition: item.successDefinition ?? null,
          })),
        });
      }
    },
  });
}

export async function replaceProgramFlow(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  items: Array<{
    sequence: number;
    activityType: string;
    title: string;
    durationMinutes?: number;
  }>;
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_PROGRAM_FLOW_EDIT",
    auditAction: "EVENT_PROGRAM_FLOW_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventProgramFlowItem.deleteMany({ where: { eventId: input.eventId } });
      if (input.items.length) {
        await tx.eventProgramFlowItem.createMany({
          data: input.items.map((item) => ({
            eventId: input.eventId,
            sequence: item.sequence,
            activityType: item.activityType as never,
            title: item.title,
            durationMinutes: item.durationMinutes ?? null,
          })),
        });
      }
    },
  });
}

export async function replacePacking(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  items: Array<{ category: string; itemName: string; quantity?: number }>;
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_PACKING_EDIT",
    auditAction: "EVENT_PACKING_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventPackingItem.deleteMany({ where: { eventId: input.eventId } });
      if (input.items.length) {
        await tx.eventPackingItem.createMany({
          data: input.items.map((item) => ({
            eventId: input.eventId,
            category: item.category as never,
            itemName: item.itemName,
            quantity: item.quantity ?? 1,
          })),
        });
      }
    },
  });
}

export async function replaceStaffing(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  items: Array<{ roleType: string; assignedUserId?: string }>;
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_STAFFING_EDIT",
    auditAction: "EVENT_STAFFING_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventStaffAssignment.deleteMany({ where: { eventId: input.eventId } });
      if (input.items.length) {
        await tx.eventStaffAssignment.createMany({
          data: input.items.map((item) => ({
            eventId: input.eventId,
            roleType: item.roleType as never,
            assignedUserId: item.assignedUserId ?? null,
          })),
        });
      }
    },
  });
}

export async function replaceActions(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  items: Array<{
    phase: string;
    actionType: string;
    title: string;
    priority?: string;
  }>;
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_ACTIONS_EDIT",
    auditAction: "EVENT_ACTIONS_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventActionItem.deleteMany({ where: { eventId: input.eventId } });
      if (input.items.length) {
        await tx.eventActionItem.createMany({
          data: input.items.map((item) => ({
            eventId: input.eventId,
            phase: item.phase as never,
            actionType: item.actionType,
            title: item.title,
            priority: item.priority ?? "MEDIUM",
          })),
        });
      }
    },
  });
}

export async function replaceCommunications(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  items: Array<{
    channel: string;
    communicationType: string;
    audience?: string;
  }>;
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_COMMUNICATIONS_EDIT",
    auditAction: "EVENT_COMMUNICATIONS_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventCommunicationsItem.deleteMany({ where: { eventId: input.eventId } });
      if (input.items.length) {
        await tx.eventCommunicationsItem.createMany({
          data: input.items.map((item) => ({
            eventId: input.eventId,
            channel: item.channel as never,
            communicationType: item.communicationType as never,
            audience: item.audience ?? null,
          })),
        });
      }
    },
  });
}

export async function replaceTravel(input: {
  actor: AuthenticatedActor;
  eventId: string;
  expectedVersion: number;
  plan: {
    travelRequired?: boolean;
    estimatedDurationMinutes?: number;
    notes?: string;
  };
  requestId?: string;
}) {
  return replaceSection({
    actor: input.actor,
    eventId: input.eventId,
    expectedVersion: input.expectedVersion,
    action: "EVENT_TRAVEL_EDIT",
    auditAction: "EVENT_TRAVEL_REPLACED",
    requestId: input.requestId,
    replace: async (tx) => {
      await tx.eventTravelPlan.deleteMany({ where: { eventId: input.eventId } });
      await tx.eventTravelPlan.create({
        data: {
          eventId: input.eventId,
          travelRequired: input.plan.travelRequired ?? true,
          estimatedDurationMinutes: input.plan.estimatedDurationMinutes ?? null,
          notes: input.plan.notes ?? null,
        },
      });
    },
  });
}
