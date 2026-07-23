import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listFocusAreas } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/focus-areas",
    async ({ actor }) => ({ focusAreas: await listFocusAreas(actor) }),
  );
}
