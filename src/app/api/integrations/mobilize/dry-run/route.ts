import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { startMobilizeEventDryRun } from "@/server/services/mobilize-integration-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/dry-run",
    async ({ actor }) => startMobilizeEventDryRun(actor),
  );
}
