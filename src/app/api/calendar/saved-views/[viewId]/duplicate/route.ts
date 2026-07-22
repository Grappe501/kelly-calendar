import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { duplicateSavedViewAsPrivate } from "@/server/services/calendar-saved-view-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ viewId: string }> };

const BodySchema = z.object({ name: z.string().min(1).max(120).optional() });

export async function POST(request: Request, ctx: Ctx) {
  const { viewId } = await ctx.params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/saved-views/${viewId}/duplicate`,
    async ({ actor }) => {
      const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid duplicate body.");
      return duplicateSavedViewAsPrivate({
        actor,
        viewId,
        name: parsed.data.name,
      });
    },
  );
}
