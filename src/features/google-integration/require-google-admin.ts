import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AppError } from "@/lib/security/safe-error";

/** Owner / campaign manager only — connect, disconnect, sync, routes apply. */
export function assertGoogleIntegrationAdmin(actor: AuthenticatedActor): void {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "Only Kelly or Campaign Manager may manage Google Calendar integration.",
    });
  }
}
