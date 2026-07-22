import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  approveRule,
  deactivateRule,
  getRule,
  updateRule,
} from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ruleId: string }> };

const updateSchema = z.object({
  op: z.enum(["update", "approve", "deactivate"]).default("update"),
  classification: z
    .enum(["AVAILABLE", "PREFERRED", "CONSTRAINED", "UNAVAILABLE", "UNKNOWN", "REQUIRES_REVIEW"])
    .optional(),
  timezone: z.string().min(1).max(80).optional(),
  effectiveStartDate: z.string().min(8).max(10).optional(),
  effectiveEndDate: z.string().min(8).max(10).nullable().optional(),
  startLocalTime: z.string().min(4).max(5).nullable().optional(),
  endLocalTime: z.string().min(4).max(5).nullable().optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(24 * 60).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  label: z.string().min(1).max(200).optional(),
  reasonSensitive: z.string().max(2000).nullable().optional(),
  locationHint: z.string().max(300).nullable().optional(),
  visibilityNote: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).optional(),
});

export async function GET(request: Request, context: Ctx) {
  const { ruleId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/calendar/availability/rules/[ruleId]",
    async ({ actor }) => getRule({ actor, ruleId }),
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { ruleId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/calendar/availability/rules/[ruleId]",
    async ({ actor, requestId }) => {
      const parsed = updateSchema.safeParse(await request.json());
      if (!parsed.success) throw new ValidationError("Invalid availability rule update.");
      const { op, reason, ...data } = parsed.data;
      if (op === "approve") {
        return approveRule({ actor, ruleId, requestId });
      }
      if (op === "deactivate") {
        return deactivateRule({ actor, ruleId, reason, requestId });
      }
      return updateRule({ actor, ruleId, data, requestId });
    },
  );
}
