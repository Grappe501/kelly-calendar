import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { acknowledgeAlert } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ alertId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { alertId } = await params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/health/alerts/${alertId}/acknowledge`,
    async ({ actor }) => {
      const alert = await acknowledgeAlert(actor, alertId);
      return { alert };
    },
  );
}
