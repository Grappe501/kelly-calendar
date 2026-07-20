import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getMobilizeAttendanceWorkspace } from "@/server/services/mobilize-attendance-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/attendance",
    async ({ actor }) => getMobilizeAttendanceWorkspace(actor),
  );
}
