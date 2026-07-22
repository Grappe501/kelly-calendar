import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listImportRunsForOperator } from "@/server/services/historical-import-service";

export const dynamic = "force-dynamic";

/** List recent DB-backed import runs (CC-01). */
export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/imports",
    async ({ actor }) => {
      const runs = await listImportRunsForOperator(actor);
      return {
        historicalFloor: "2025-11-01",
        importApplyEnabled: true,
        buildId: "KCCC-CC-01-IMPORT-APPROVAL-CANONICAL-APPLY-1.0",
        runs,
      };
    },
  );
}
