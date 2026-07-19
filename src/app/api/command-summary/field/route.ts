import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { maybeGenerateFieldOperationsAdvisory } from "@/server/services/field-operations-ai";
import { getFieldOperations } from "@/server/services/field-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/field",
    async ({ actor, requestId }) => {
      const data = await getFieldOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateFieldOperationsAdvisory({
        actor,
        field: data.field,
        requestId,
        enabled: wantAi,
      });
      return {
        field: data.field,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: false as const,
      };
    },
  );
}
