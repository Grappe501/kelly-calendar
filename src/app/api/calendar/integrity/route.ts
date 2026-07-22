import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  getIntegritySummary,
  startIntegrityScan,
} from "@/server/services/calendar-integrity-service";
import type { IntegrityScanScope } from "@/lib/calendar/integrity/types";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/calendar/integrity", async ({ actor }) =>
    getIntegritySummary(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/integrity/scans",
    async ({ actor, requestId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        scope?: string;
        eventId?: string;
        importRunId?: string;
        sourceId?: string;
        rangeStart?: string;
        rangeEnd?: string;
      };
      const scope = (body.scope ?? "FULL") as IntegrityScanScope;
      const allowed: IntegrityScanScope[] = [
        "EVENT",
        "IMPORT_RUN",
        "SOURCE",
        "DATE_RANGE",
        "FULL",
      ];
      if (!allowed.includes(scope)) {
        throw new ValidationError("Invalid scan scope.");
      }
      return startIntegrityScan({
        actor,
        scope,
        eventId: body.eventId,
        importRunId: body.importRunId,
        sourceId: body.sourceId,
        rangeStart: body.rangeStart ? new Date(body.rangeStart) : undefined,
        rangeEnd: body.rangeEnd ? new Date(body.rangeEnd) : undefined,
        requestId,
      });
    },
  );
}
