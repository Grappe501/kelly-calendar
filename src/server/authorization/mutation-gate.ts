import "server-only";

import { refreshAuthStatus } from "@/server/auth/auth-status";
import { getRequestActor } from "@/server/auth/actor-context";
import { AppError } from "@/lib/security/safe-error";
import { roleMayMutate, type SystemRoleName } from "@/lib/auth/system-roles";

/** Infrastructure gate — Step 4 must be configured. */
export function mutationsAuthorized(): boolean {
  return refreshAuthStatus().mutationApisAuthorized;
}

/**
 * Call before any DB mutation. Requires Step 4 + authenticated mutator role.
 * Actor may be passed explicitly or resolved from request AsyncLocalStorage.
 */
export function requireAuthorizedMutation(
  action: string,
  actor?: { userId: string; systemRole: SystemRoleName } | null,
): void {
  if (!mutationsAuthorized()) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage:
        "Database mutations are disabled until authentication and RBAC (Step 4) are ready.",
      internalMessage: `Blocked mutation: ${action}`,
    });
  }
  const resolved = actor ?? getRequestActor();
  if (!resolved?.userId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Sign in required to mutate calendar data.",
      internalMessage: `Blocked mutation (no actor): ${action}`,
    });
  }
  if (!roleMayMutate(resolved.systemRole)) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "Your role cannot mutate calendar data.",
      internalMessage: `Blocked mutation (role ${resolved.systemRole}): ${action}`,
    });
  }
}
