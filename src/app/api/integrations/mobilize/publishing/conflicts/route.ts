import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listMobilizePublicationConflicts } from "@/server/services/mobilize-publishing-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/publishing/conflicts",
    async ({ actor }) => listMobilizePublicationConflicts(actor),
  );
}
