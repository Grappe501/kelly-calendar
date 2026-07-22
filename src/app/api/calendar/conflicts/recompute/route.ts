import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { recomputeConflictsForRange } from "@/server/services/conflict-engine-service";
import { chicagoDateKeysToUtcRange, chicagoTodayKey } from "@/lib/calendar/chicago-date";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

/**
 * CC-06 optional alias for `/api/conflicts` POST, named to match the CC-05
 * `/api/calendar/availability/*` surface. Same underlying service call.
 */
export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/conflicts/recompute",
    async ({ actor, requestId }) => {
      const body = z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .safeParse(await request.json().catch(() => ({})));
      if (!body.success) throw new ValidationError("Invalid recompute request body.");
      const fromKey =
        body.data.from && /^\d{4}-\d{2}-\d{2}$/.test(body.data.from)
          ? body.data.from
          : chicagoTodayKey();
      const toKey =
        body.data.to && /^\d{4}-\d{2}-\d{2}$/.test(body.data.to) ? body.data.to : fromKey;
      if (toKey < fromKey) throw new ValidationError("`to` must not be before `from`.");
      const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(fromKey, toKey);
      return recomputeConflictsForRange({ actor, rangeStart, rangeEnd, requestId });
    },
  );
}
