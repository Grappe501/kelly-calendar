import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  getHealthDashboard,
  startHealthRun,
} from "@/server/services/calendar-health-service";
import { HEALTH_DOMAINS, type HealthDomain } from "@/lib/calendar/health";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/calendar/health", async ({ actor }) =>
    getHealthDashboard(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/health",
    async ({ actor, requestId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        scope?: string;
        runType?: string;
        domains?: string[];
        focusedRef?: { type?: string; id?: string };
      };
      const scope = (body.scope ?? "FULL").trim() || "FULL";
      const allowedScopes = [
        "FULL",
        "LIGHTWEIGHT",
        "DATE_RANGE",
        "IMPORT_RUN",
        "EVENT",
        "SOURCE",
        "BULK_OPERATION",
        "FEED",
      ];
      if (!allowedScopes.includes(scope)) {
        throw new ValidationError("Invalid health run scope.");
      }
      const domains = Array.isArray(body.domains)
        ? body.domains.filter((d): d is HealthDomain =>
            (HEALTH_DOMAINS as readonly string[]).includes(d),
          )
        : undefined;
      return startHealthRun({
        actor,
        runType: body.runType === "FOCUSED" ? "FOCUSED" : "MANUAL",
        scope,
        domains,
        focusedRef:
          body.focusedRef?.type && body.focusedRef?.id
            ? { type: body.focusedRef.type, id: body.focusedRef.id }
            : null,
        requestId,
      });
    },
  );
}
