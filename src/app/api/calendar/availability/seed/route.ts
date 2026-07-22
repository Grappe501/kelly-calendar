import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { seedStandingRulesIfEmpty } from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  campaignKey: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/availability/seed",
    async ({ actor, requestId }) => {
      const raw = await request.text();
      const parsed = bodySchema.safeParse(raw ? JSON.parse(raw) : {});
      if (!parsed.success) throw new ValidationError("Invalid seed payload.");
      return seedStandingRulesIfEmpty({
        actor,
        campaignKey: parsed.data.campaignKey,
        requestId,
      });
    },
  );
}
