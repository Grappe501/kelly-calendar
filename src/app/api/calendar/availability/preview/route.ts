import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { previewExpansion } from "@/server/services/availability-service";
import { chicagoTodayKey, shiftChicagoDateKey } from "@/lib/calendar/chicago-date";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/availability/preview",
    async ({ actor }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get("from") || chicagoTodayKey();
      const to =
        url.searchParams.get("to") || shiftChicagoDateKey(from, 13);
      const campaignKey = url.searchParams.get("campaignKey") ?? undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new ValidationError("from/to must be YYYY-MM-DD date keys.");
      }
      return previewExpansion({
        actor,
        campaignKey,
        fromDateKey: from,
        toDateKeyInclusive: to,
      });
    },
  );
}
