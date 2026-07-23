import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AppError } from "@/lib/security/safe-error";

/** Owner / campaign manager only — RedDirt connection, dry-run, apply. */
export function assertRedDirtIntegrationAdmin(actor: AuthenticatedActor): void {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage:
        "Only Kelly or Campaign Manager may manage RedDirt integration.",
    });
  }
}
