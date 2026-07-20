import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  correctCheckInCorrelation,
  correlateCheckIn,
} from "@/server/services/mobilize-attendance-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action =
    body && typeof body === "object" && "action" in body
      ? String((body as { action?: string }).action)
      : "correlate";
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/attendance/correlate",
    async ({ actor }) => {
      if (action === "remove") return correctCheckInCorrelation(actor, body);
      return correlateCheckIn(actor, body);
    },
  );
}
