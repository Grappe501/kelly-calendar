import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateExecutiveCommandAdvisory } from "@/server/services/executive-command-ai";
import { getExecutiveCommand } from "@/server/services/executive-command-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/command",
    async ({ actor, requestId }) => {
      const data = await getExecutiveCommand(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateExecutiveCommandAdvisory({
        actor,
        command: data.command,
        requestId,
        enabled: wantAi,
      });
      return {
        command: data.command,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
