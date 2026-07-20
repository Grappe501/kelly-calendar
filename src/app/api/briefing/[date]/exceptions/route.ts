import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getDayExceptionDigest } from "@/server/services/campaign-day-exception-digest-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

export async function GET(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/briefing/[date]/exceptions",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Campaign Day Exception Digest requires campaign leadership access.",
        );
      }
      const url = new URL(request.url);
      return getDayExceptionDigest({
        dateKey: date,
        actor,
        searchParams: url.searchParams,
      });
    },
  );
}
