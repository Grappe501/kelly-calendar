import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { exportHealthDiagnostics } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/health/export",
    async ({ actor }) => {
      const body = await exportHealthDiagnostics(actor);
      return {
        format: "text/plain",
        redacted: true,
        body,
      };
    },
  );
}
