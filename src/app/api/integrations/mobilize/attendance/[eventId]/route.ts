import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getAttendanceEventDetail } from "@/server/services/mobilize-attendance-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/attendance/[eventId]",
    async ({ actor }) => getAttendanceEventDetail(actor, eventId),
  );
}
