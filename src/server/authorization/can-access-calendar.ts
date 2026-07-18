import "server-only";

import { refreshAuthStatus } from "@/server/auth/auth-status";
import { getSessionViewer } from "@/server/auth/session";
import { resolveCalendarAccess } from "@/server/authorization/resolve-calendar-access";

/**
 * Default-deny calendar access until a session + membership/role resolves.
 */
export async function canAccessCalendar(input: {
  calendarId: string;
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

  const viewer = await getSessionViewer();
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

  const resolved = await resolveCalendarAccess({
    calendarId: input.calendarId,
    viewerUserId: viewer.userId,
    systemRole: viewer.systemRole,
    teamIds: viewer.teamIds,
  });
  return {
    allowed: resolved.allowed,
    accessLevel: resolved.accessLevel,
    reason: resolved.reason,
  };
}
