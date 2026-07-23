import "server-only";

import { prisma } from "@/server/db/prisma";
import { refreshAuthStatus } from "@/server/auth/auth-status";
import { getRequestActor } from "@/server/auth/actor-context";
import { getSessionViewer } from "@/server/auth/session";
import { resolveCalendarAccess } from "@/server/authorization/resolve-calendar-access";
import { maxAccessLevel } from "@/lib/auth/access-level";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";

/**
 * Event access derives from primary + connected calendar memberships,
 * with system-role full access for Kelly / Campaign Manager.
 *
 * Prefer request-scoped actor (ALS) when present so token-authenticated
 * ICS feed generation can re-evaluate as the feed owner without a cookie.
 */
export async function canAccessEvent(input: {
  eventId: string;
  viewerUserId?: string | null;
}): Promise<{ allowed: boolean; accessLevel: string; reason: string }> {
  const status = refreshAuthStatus();
  if (!status.authenticationComplete) {
    return {
      allowed: false,
      accessLevel: "NO_ACCESS",
      reason: "Authentication not configured — default deny",
    };
  }

  const viewer = getRequestActor() ?? (await getSessionViewer());
  if (!viewer) {
    return {
      allowed: false,
      accessLevel: "NO_ACCESS",
      reason: "Unauthenticated — default deny",
    };
  }
  if (input.viewerUserId && input.viewerUserId !== viewer.userId) {
    return {
      allowed: false,
      accessLevel: "NO_ACCESS",
      reason: "Viewer mismatch",
    };
  }

  if (roleHasFullCalendarAccess(viewer.systemRole)) {
    return {
      allowed: true,
      accessLevel: "ADMINISTER",
      reason: `${viewer.systemRole} has full event authority`,
    };
  }

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      primaryCalendarId: true,
      calendarMemberships: { select: { calendarId: true } },
    },
  });
  if (!event) {
    return { allowed: false, accessLevel: "NO_ACCESS", reason: "Event not found" };
  }

  const calendarIds = new Set<string>([
    event.primaryCalendarId,
    ...event.calendarMemberships.map((m) => m.calendarId),
  ]);

  let best = "NO_ACCESS";
  for (const calendarId of calendarIds) {
    const resolved = await resolveCalendarAccess({
      calendarId,
      viewerUserId: viewer.userId,
      systemRole: viewer.systemRole,
      teamIds: viewer.teamIds,
    });
    best = maxAccessLevel(best, resolved.accessLevel);
  }

  return {
    allowed: best !== "NO_ACCESS",
    accessLevel: best,
    reason:
      best === "NO_ACCESS"
        ? "No calendar grant for this event"
        : "Resolved via calendar memberships",
  };
}
