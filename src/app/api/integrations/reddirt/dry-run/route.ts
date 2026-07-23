import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { startRedDirtDryRun } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/reddirt/dry-run",
    async ({ actor }) => startRedDirtDryRun(actor),
  );
}
