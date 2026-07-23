import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { revokeSubscriptionFeed } from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ feedId: string }> };

const RevokeSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request, context: Ctx) {
  const { feedId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/subscriptions/${feedId}/revoke`,
    async ({ actor }) => {
      const parsed = RevokeSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid revoke body.");
      return revokeSubscriptionFeed({
        actor,
        feedId,
        reason: parsed.data.reason,
      });
    },
  );
}
