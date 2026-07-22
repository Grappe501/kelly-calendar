import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  pinSavedView,
  setDefaultSavedView,
} from "@/server/services/calendar-saved-view-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ viewId: string }> };

const BodySchema = z.object({
  pinned: z.boolean().optional(),
  setDefault: z.boolean().optional(),
});

export async function POST(request: Request, ctx: Ctx) {
  const { viewId } = await ctx.params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/saved-views/${viewId}/pin`,
    async ({ actor }) => {
      const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid pin body.");
      if (parsed.data.setDefault) {
        return setDefaultSavedView({ actor, viewId, isDefault: true });
      }
      return pinSavedView({
        actor,
        viewId,
        pinned: parsed.data.pinned ?? true,
      });
    },
  );
}
