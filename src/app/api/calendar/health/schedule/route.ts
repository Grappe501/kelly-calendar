import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getHealthScheduleStatus } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/health/schedule",
    async ({ actor }) => getHealthScheduleStatus(actor),
  );
}
