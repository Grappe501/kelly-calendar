import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getBulkOperation } from "@/server/services/calendar-bulk-operation-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ operationId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { operationId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/calendar/bulk/[operationId]",
    async ({ actor }) => getBulkOperation({ actor, operationId }),
  );
}
