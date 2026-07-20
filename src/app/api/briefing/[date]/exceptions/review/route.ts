import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { completeDayExceptionDigestReview } from "@/server/services/campaign-day-exception-digest-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

export async function POST(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/exceptions/review",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Campaign Day Exception Digest requires campaign leadership access.",
        );
      }
      const body = await request.json().catch(() => null);
      const model = await completeDayExceptionDigestReview({
        dateKey: date,
        actor,
        body,
      });
      return { model };
    },
  );
}
