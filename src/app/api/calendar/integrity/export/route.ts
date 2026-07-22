import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { exportIntegrityDiagnostics } from "@/server/services/calendar-integrity-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/integrity/export",
    async ({ actor }) => {
      const body = await exportIntegrityDiagnostics(actor);
      return {
        format: "text/plain",
        redacted: true,
        body,
      };
    },
  );
}
