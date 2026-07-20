import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { completeMorningLaunchReview } from "@/server/services/campaign-day-launch-review-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

export async function POST(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/launch/review",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Morning Launch Review requires campaign leadership access.",
        );
      }
      const body = await request.json().catch(() => ({}));
      return {
        model: await completeMorningLaunchReview({
          dateKey: date,
          actor,
          body,
        }),
      };
    },
  );
}
