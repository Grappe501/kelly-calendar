import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getIntegrityScan } from "@/server/services/calendar-integrity-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ scanId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { scanId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/calendar/integrity/scans/[scanId]",
    async ({ actor }) => getIntegrityScan(actor, scanId),
  );
}
