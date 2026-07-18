import { redirect } from "next/navigation";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  requireActiveAuthenticatedActor,
  type AuthenticatedActor,
} from "@/server/auth/actor";

export async function requireSystemAdminPage(
  nextPath: string,
): Promise<AuthenticatedActor> {
  const actor = await requireActiveAuthenticatedActor().catch(() => null);
  if (!actor) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    redirect("/system/status");
  }
  return actor;
}
