import "server-only";

import { prisma } from "@/server/db/prisma";
import {
  maxAccessLevel,
  toViewerPermission,
} from "@/lib/auth/access-level";
import {
  roleHasFullCalendarAccess,
  type SystemRoleName,
} from "@/lib/auth/system-roles";
import type { CalendarPermission } from "@/lib/calendar-security/calendar-access-types";

export type CalendarAccessResult = {
  allowed: boolean;
  accessLevel: string;
  viewerPermission: CalendarPermission;
  reason: string;
};

/**
 * Resolve calendar access: system role → personal membership → team bindings.
 * Default deny. Kelly / Campaign Manager receive ADMINISTER.
 */
export async function resolveCalendarAccess(input: {
  calendarId: string;
  viewerUserId: string;
  systemRole: SystemRoleName;
  teamIds: string[];
}): Promise<CalendarAccessResult> {
  if (roleHasFullCalendarAccess(input.systemRole)) {
    return {
      allowed: true,
      accessLevel: "ADMINISTER",
      viewerPermission: "ADMINISTER",
      reason: `${input.systemRole} has full calendar authority`,
    };
  }

  let best = "NO_ACCESS";

  const membership = await prisma.calendarMembership.findFirst({
    where: {
      calendarId: input.calendarId,
      userId: input.viewerUserId,
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    select: { accessLevel: true },
  });
  if (membership) {
    best = maxAccessLevel(best, membership.accessLevel);
  }

  if (input.teamIds.length > 0) {
    const bindings = await prisma.calendarTeamBinding.findMany({
      where: {
        calendarId: input.calendarId,
        teamId: { in: input.teamIds },
      },
      select: { accessLevel: true },
    });
    for (const b of bindings) {
      best = maxAccessLevel(best, b.accessLevel);
    }
  }

  const allowed = best !== "NO_ACCESS";
  return {
    allowed,
    accessLevel: best,
    viewerPermission: toViewerPermission(best),
    reason: allowed
      ? "Resolved from membership/team binding"
      : "No calendar membership or team binding",
  };
}

export async function resolveAllCalendarPermissions(input: {
  viewerUserId: string;
  systemRole: SystemRoleName;
  teamIds: string[];
}): Promise<Record<string, CalendarPermission>> {
  if (roleHasFullCalendarAccess(input.systemRole)) {
    const calendars = await prisma.calendar.findMany({
      where: { archivedAt: null },
      select: { id: true },
    });
    const out: Record<string, CalendarPermission> = {};
    for (const c of calendars) out[c.id] = "ADMINISTER";
    return out;
  }

  const out: Record<string, string> = {};
  const memberships = await prisma.calendarMembership.findMany({
    where: {
      userId: input.viewerUserId,
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    select: { calendarId: true, accessLevel: true },
  });
  for (const m of memberships) {
    out[m.calendarId] = maxAccessLevel(out[m.calendarId] ?? "NO_ACCESS", m.accessLevel);
  }

  if (input.teamIds.length > 0) {
    const bindings = await prisma.calendarTeamBinding.findMany({
      where: { teamId: { in: input.teamIds } },
      select: { calendarId: true, accessLevel: true },
    });
    for (const b of bindings) {
      out[b.calendarId] = maxAccessLevel(out[b.calendarId] ?? "NO_ACCESS", b.accessLevel);
    }
  }

  const mapped: Record<string, CalendarPermission> = {};
  for (const [id, level] of Object.entries(out)) {
    if (level !== "NO_ACCESS") mapped[id] = toViewerPermission(level);
  }
  return mapped;
}
