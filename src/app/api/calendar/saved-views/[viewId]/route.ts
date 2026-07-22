import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  getSavedViewForActor,
  updateSavedView,
} from "@/server/services/calendar-saved-view-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ viewId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { viewId } = await ctx.params;
  return withAuthenticatedQuery(
    request,
    `/api/calendar/saved-views/${viewId}`,
    async ({ actor }) => getSavedViewForActor({ actor, viewId }),
  );
}

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  viewMode: z
    .enum(["today", "day", "week", "month", "agenda", "ops", "search"])
    .optional(),
  visibility: z.enum(["PRIVATE", "CAMPAIGN_SHARED", "ROLE_RESTRICTED"]).optional(),
  roleScope: z.array(z.string()).nullable().optional(),
  isPinned: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  const { viewId } = await ctx.params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/saved-views/${viewId}`,
    async ({ actor }) => {
      const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid saved-view update body.");
      return updateSavedView({ actor, viewId, ...parsed.data });
    },
  );
}
