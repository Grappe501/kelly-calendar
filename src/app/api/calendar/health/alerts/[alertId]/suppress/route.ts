import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { suppressAlert } from "@/server/services/calendar-health-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ alertId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { alertId } = await params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/health/alerts/${alertId}/suppress`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => ({}))) as {
        reason?: string;
        until?: string;
      };
      if (!body.reason?.trim() || !body.until) {
        throw new ValidationError("reason and until are required.");
      }
      const until = new Date(body.until);
      if (Number.isNaN(until.getTime())) {
        throw new ValidationError("until must be a valid ISO date.");
      }
      const alert = await suppressAlert(actor, alertId, {
        reason: body.reason,
        until,
      });
      return { alert };
    },
  );
}
