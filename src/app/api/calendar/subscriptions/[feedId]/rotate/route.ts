import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { rotateSubscriptionFeedToken } from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ feedId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { feedId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/subscriptions/${feedId}/rotate`,
    async ({ actor }) => rotateSubscriptionFeedToken({ actor, feedId }),
  );
}
