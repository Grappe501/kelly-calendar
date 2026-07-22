import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  getIntegrityFinding,
  previewIntegrityRepair,
  recordIntegrityDisposition,
} from "@/server/services/calendar-integrity-service";
import type { IntegrityDisposition } from "@/lib/calendar/integrity/types";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ findingId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { findingId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/calendar/integrity/findings/[findingId]",
    async ({ actor }) => getIntegrityFinding(actor, findingId),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { findingId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/calendar/integrity/findings/[findingId]",
    async ({ actor, requestId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        action?: string;
        disposition?: string;
        reason?: string;
      };
      if (body.action === "preview-repair") {
        return previewIntegrityRepair({ actor, findingId });
      }
      if (!body.disposition) {
        throw new ValidationError("disposition is required.");
      }
      return recordIntegrityDisposition({
        actor,
        findingId,
        disposition: body.disposition as IntegrityDisposition,
        reason: body.reason,
        requestId,
      });
    },
  );
}
