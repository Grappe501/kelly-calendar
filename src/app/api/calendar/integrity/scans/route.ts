import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listIntegrityScans } from "@/server/services/calendar-integrity-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/integrity/scans",
    async ({ actor }) => ({ scans: await listIntegrityScans(actor) }),
  );
}
