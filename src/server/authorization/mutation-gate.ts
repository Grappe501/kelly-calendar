import "server-only";

import { AUTH_STATUS } from "@/server/auth/auth-status";
import { AppError } from "@/lib/security/safe-error";

/** All Step 5 mutation services must call this until Step 4 is complete. */
export function requireAuthorizedMutation(action: string): void {
  if (!AUTH_STATUS.mutationApisAuthorized) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage:
        "Database mutations are disabled until authentication and RBAC (Step 4) are complete.",
      internalMessage: `Blocked mutation: ${action}`,
    });
  }
}

export function mutationsAuthorized(): boolean {
  return AUTH_STATUS.mutationApisAuthorized;
}
