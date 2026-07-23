import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSubscriptionFeedDetail } from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ feedId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { feedId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/calendar/subscriptions/${feedId}`,
    async ({ actor }) => getSubscriptionFeedDetail({ actor, feedId }),
  );
}
