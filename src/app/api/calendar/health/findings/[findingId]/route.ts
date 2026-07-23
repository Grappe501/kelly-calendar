import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getFinding } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ findingId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { findingId } = await params;
  return withAuthenticatedQuery(
    request,
    `/api/calendar/health/findings/${findingId}`,
    async ({ actor }) => getFinding(actor, findingId),
  );
}
