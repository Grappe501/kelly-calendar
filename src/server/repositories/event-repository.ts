import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

export async function getEventById(eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, archivedAt: null },
    include: { primaryCalendar: true },
  });
}

export async function createEvent(input: unknown) {
  void input;
  requireAuthorizedMutation("createEvent");
}

export async function updateEvent(eventId: string, input: unknown) {
  void eventId;
  void input;
  requireAuthorizedMutation("updateEvent");
}

export async function archiveEvent(eventId: string) {
  void eventId;
  requireAuthorizedMutation("archiveEvent");
}

export async function restoreEvent(eventId: string) {
  void eventId;
  requireAuthorizedMutation("restoreEvent");
}
