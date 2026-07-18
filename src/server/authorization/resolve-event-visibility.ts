import "server-only";

import { canAccessEvent } from "@/server/authorization/can-access-event";
import { accessLevelRank } from "@/lib/auth/access-level";

/**
 * Maps access level to an event visibility projection tier.
 */
export async function resolveEventVisibility(input: {
  eventId: string;
  viewerUserId?: string | null;
}): Promise<"NO_ACCESS" | "BUSY_ONLY" | "LIMITED" | "FULL"> {
  const access = await canAccessEvent(input);
  if (!access.allowed) return "NO_ACCESS";
  const rank = accessLevelRank(access.accessLevel);
  if (rank <= 1) return "BUSY_ONLY";
  if (rank <= 3) return "LIMITED";
  return "FULL";
}
