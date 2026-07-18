import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

export async function listMembershipsForCalendar(calendarId: string) {
  return prisma.calendarMembership.findMany({
    where: { calendarId, revokedAt: null },
  });
}

export async function grantCalendarPermission(input: unknown) {
  void input;
  requireAuthorizedMutation("grantCalendarPermission");
}

export async function revokeCalendarPermission(input: unknown) {
  void input;
  requireAuthorizedMutation("revokeCalendarPermission");
}
