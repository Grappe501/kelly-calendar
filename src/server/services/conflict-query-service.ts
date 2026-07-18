import "server-only";

import { AUTH_STATUS } from "@/server/auth/auth-status";
import { AppError } from "@/lib/security/safe-error";

export type ConflictFact = {
  code: string;
  severity: "info" | "warning" | "blocker";
  summary: string;
  eventIds: string[];
};

/**
 * Deterministic conflict facts for later AI advisory (not autonomous).
 */
export async function queryConflictFacts(input: {
  viewerUserId: string;
  dateStart: string;
  dateEnd: string;
}): Promise<ConflictFact[]> {
  void input.dateStart;
  void input.dateEnd;
  if (!AUTH_STATUS.authenticationComplete) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Conflict queries require Step 4 authentication.",
    });
  }
  return [];
}
