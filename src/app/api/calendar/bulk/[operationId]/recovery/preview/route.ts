import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { previewBulkRecovery } from "@/server/services/calendar-bulk-operation-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ operationId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { operationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/calendar/bulk/[operationId]/recovery/preview",
    async ({ actor }) => previewBulkRecovery({ actor, operationId }),
  );
}
