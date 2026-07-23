import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listPriorities } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/priorities",
    async ({ actor }) => ({ priorities: await listPriorities(actor) }),
  );
}
