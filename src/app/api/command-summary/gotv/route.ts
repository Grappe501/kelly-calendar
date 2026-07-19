import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { maybeGenerateGotvOperationsAdvisory } from "@/server/services/gotv-operations-ai";
import { getGotvOperations } from "@/server/services/gotv-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/gotv",
    async ({ actor, requestId }) => {
      const data = await getGotvOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateGotvOperationsAdvisory({
        actor,
        gotv: data.gotv,
        requestId,
        enabled: wantAi,
      });
      return {
        gotv: data.gotv,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: false as const,
      };
    },
  );
}
