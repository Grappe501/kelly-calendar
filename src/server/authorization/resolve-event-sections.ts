import "server-only";

import { canAccessEvent } from "@/server/authorization/can-access-event";
import { accessLevelRank } from "@/lib/auth/access-level";
import { getSessionViewer } from "@/server/auth/session";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";

const ALL_SECTIONS = [
  "BASIC",
  "NOTES",
  "FILES",
  "TRAVEL",
  "COMMUNICATIONS",
  "FUNDRAISING",
  "SECURITY",
  "PARTICIPANTS",
] as const;

/**
 * Section grant list for a viewer. Full roles see all sections.
 * AVAILABILITY_ONLY yields no operational sections.
 */
export async function resolveEventSections(input: {
  eventId: string;
  viewerUserId?: string | null;
}): Promise<string[]> {
  const viewer = await getSessionViewer();
  if (!viewer) return [];
  if (roleHasFullCalendarAccess(viewer.systemRole)) {
    return [...ALL_SECTIONS];
  }

  const access = await canAccessEvent(input);
  if (!access.allowed) return [];
  const rank = accessLevelRank(access.accessLevel);
  if (rank <= 1) return ["BASIC"];
  if (rank <= 3) return ["BASIC", "PARTICIPANTS"];
  if (rank <= 5) {
    return ["BASIC", "NOTES", "FILES", "TRAVEL", "COMMUNICATIONS", "PARTICIPANTS"];
  }
  return [...ALL_SECTIONS];
}
