import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getVolunteerCounts,
  getVolunteerManagerHome,
  mutateVolunteerOps,
} from "@/server/services/campaign-volunteer-service";

export const dynamic = "force-dynamic";

function gate(actor: { primarySystemRole: string }) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole as never)) {
    throw new PermissionDeniedError("Volunteer operations require campaign access.");
  }
}

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/volunteers", async ({ actor }) => {
    gate(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "home";
    if (view === "counts") return getVolunteerCounts(actor);
    return getVolunteerManagerHome(actor);
  });
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/volunteers",
    async ({ actor }) => {
      gate(actor);
      const body = (await request.json().catch(() => null)) ?? {};
      return mutateVolunteerOps(actor, body as Record<string, unknown>);
    },
  );
}
