import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { searchCalendarEvents } from "@/server/services/calendar-search-service";

export const dynamic = "force-dynamic";

/** CC-07 — authorized Event search. Read-only. */
export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/calendar/search", async ({ actor }) => {
    const url = new URL(request.url);
    const raw: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    return searchCalendarEvents({ actor, rawQuery: raw });
  });
}
