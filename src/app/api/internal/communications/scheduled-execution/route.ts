import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns";

export const dynamic = "force-dynamic";

/**
 * Scheduled sandbox ingress — fail closed.
 * Requires server-only header; never accepts destinations or production mode.
 */
export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/internal/communications/scheduled-execution",
    async () => {
      const secret = process.env.KCCC_SCHEDULED_EXECUTION_SECRET;
      const provided = request.headers.get("x-kccc-scheduled-execution");
      if (!secret || !provided || provided !== secret) {
        throw new ValidationError("SCHEDULED_INGRESS_UNAUTHORIZED");
      }
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (body?.mode === "PRODUCTION" || body?.executionMode === "PRODUCTION") {
        throw new ValidationError("PRODUCTION_MODE_NOT_AUTHORIZED");
      }
      if (body?.destinationOverride != null || body?.destinations != null) {
        throw new ValidationError("ARBITRARY_DESTINATION_OVERRIDE_REJECTED");
      }
      return {
        accepted: false,
        processedBatches: 0,
        reason: d25ProductionDispatchHardBlock().reason,
        notice:
          "Scheduled ingress authenticated but D25 processes at most one bounded sandbox batch per future invocation — production remains blocked.",
        productionDispatchEnabled: false,
      };
    },
  );
}
