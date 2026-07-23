import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listCorridors } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/corridors",
    async ({ actor }) => ({ corridors: await listCorridors(actor) }),
  );
}
