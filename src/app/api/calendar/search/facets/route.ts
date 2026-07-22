import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSearchFacets } from "@/server/services/calendar-search-service";

export const dynamic = "force-dynamic";

/** CC-07 — safe facets over authorized search results only. */
export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/search/facets",
    async ({ actor }) => {
      const url = new URL(request.url);
      const raw: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        raw[key] = value;
      });
      return getSearchFacets({ actor, rawQuery: raw });
    },
  );
}
