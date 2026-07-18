import "server-only";

import { prisma } from "@/server/db/prisma";

export async function listActiveCalendars() {
  return prisma.calendar.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: { displayOrder: "asc" },
  });
}

export async function getCalendarById(calendarId: string) {
  return prisma.calendar.findFirst({
    where: { id: calendarId, archivedAt: null },
  });
}

export async function getCommandCalendar() {
  return prisma.calendar.findFirst({
    where: { isCommandCalendar: true, isActive: true, archivedAt: null },
  });
}
