import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { normalizeQueryForActor } from "@/server/services/calendar-search-service";
import { serializeCalendarQuery } from "@/lib/calendar/search";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  query: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/** CC-07 — parse/canonicalize a query without searching. */
export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/search/normalize",
    async ({ actor }) => {
      const body = await request.json().catch(() => ({}));
      const parsed = BodySchema.safeParse(body);
      if (!parsed.success) throw new ValidationError("Invalid normalize body.");
      const raw = parsed.data.query ?? parsed.data;
      const query = await normalizeQueryForActor({ actor, raw });
      return {
        query,
        querySerialized: serializeCalendarQuery(query),
        mutations: 0 as const,
      };
    },
  );
}
