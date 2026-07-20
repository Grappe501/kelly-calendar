import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { verifyMobilizeConnection } from "@/server/services/mobilize-integration-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/verify",
    async ({ actor }) => verifyMobilizeConnection(actor),
  );
}
