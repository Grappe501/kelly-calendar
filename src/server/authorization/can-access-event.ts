import "server-only";

import { AUTH_STATUS } from "@/server/auth/auth-status";

export function canAccessEvent(_input: {
  eventId: string;
  viewerUserId?: string | null;
}): { allowed: boolean; accessLevel: "NO_ACCESS"; reason: string } {
  void _input;
  if (!AUTH_STATUS.authenticationComplete) {
    return {
      allowed: false,
      accessLevel: "NO_ACCESS",
      reason: "Step 4 authentication not complete — default deny",
    };
  }
  return {
    allowed: false,
    accessLevel: "NO_ACCESS",
    reason: "No event permission resolved",
  };
}
