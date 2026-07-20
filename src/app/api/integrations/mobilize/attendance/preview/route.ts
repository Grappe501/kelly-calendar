import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  applyAttendanceAggregates,
  previewAttendanceAggregates,
  startAttendanceDryRun,
} from "@/server/services/mobilize-attendance-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalEventId = url.searchParams.get("externalEventId");
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/attendance/preview",
    async ({ actor }) => previewAttendanceAggregates(actor, externalEventId),
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action =
    body && typeof body === "object" && "action" in body
      ? String((body as { action?: string }).action)
      : "dry-run";
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/attendance/preview",
    async ({ actor }) => {
      if (action === "apply") return applyAttendanceAggregates(actor, body);
      return startAttendanceDryRun(actor, body);
    },
  );
}
