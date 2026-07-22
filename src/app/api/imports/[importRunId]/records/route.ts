import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getImportRecordsForOperator } from "@/server/services/historical-import-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ importRunId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { importRunId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/imports/[importRunId]/records",
    async ({ actor }) => {
      const records = await getImportRecordsForOperator(actor, importRunId);
      return { importRunId, records };
    },
  );
}
