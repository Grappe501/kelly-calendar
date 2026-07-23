import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listPlaces } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/places",
    async ({ actor }) => {
      const url = new URL(request.url);
      const all = url.searchParams.get("all") === "1";
      return {
        places: await listPlaces(actor, { top250Only: !all }),
      };
    },
  );
}
