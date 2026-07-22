import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  listConflicts,
  recomputeConflictsForRange,
} from "@/server/services/conflict-engine-service";
import { chicagoDateKeysToUtcRange, chicagoTodayKey } from "@/lib/calendar/chicago-date";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

/**
 * CC-06 Conflict Engine — `/api/conflicts`.
 * GET: list persisted OperationalConflictRecord rows (filterable).
 * POST: recompute/scan a date range (or a single eventId) — never mutates
 * Events/Missions, only detects + persists conflict facts.
 */
export async function GET(request: Request) {
  return withAuthenticatedMutation(request, "/api/conflicts", async ({ actor }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const severity = url.searchParams.get("severity");
    const conflictType = url.searchParams.get("conflictType");
    const includeStale = url.searchParams.get("includeStale") === "1";
    const take = url.searchParams.get("take");
    const skip = url.searchParams.get("skip");
    return listConflicts({
      actor,
      status: status ? status.split(",").filter(Boolean) : undefined,
      severity: severity ? severity.split(",").filter(Boolean) : undefined,
      conflictType: conflictType ? conflictType.split(",").filter(Boolean) : undefined,
      includeStale,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  });
}

const RecomputeBodySchema = z.object({
  eventId: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/conflicts",
    async ({ actor, requestId }) => {
      const parsed = RecomputeBodySchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid recompute request body.");
      const { eventId, from, to } = parsed.data;

      if (eventId) {
        const { recomputeConflictsForEvent } = await import(
          "@/server/services/conflict-engine-service"
        );
        return recomputeConflictsForEvent({ actor, eventId, requestId });
      }

      const fromKey = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : chicagoTodayKey();
      const toKey = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : fromKey;
      if (toKey < fromKey) throw new ValidationError("`to` must not be before `from`.");
      const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(fromKey, toKey);
      return recomputeConflictsForRange({ actor, rangeStart, rangeEnd, requestId });
    },
  );
}
