import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  createSavedView,
  listSavedViewsForActor,
} from "@/server/services/calendar-saved-view-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/saved-views",
    async ({ actor }) => {
      const url = new URL(request.url);
      return listSavedViewsForActor({
        actor,
        includeArchived: url.searchParams.get("includeArchived") === "1",
      });
    },
  );
}

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  query: z.record(z.string(), z.unknown()),
  viewMode: z
    .enum(["today", "day", "week", "month", "agenda", "ops", "search"])
    .optional(),
  visibility: z.enum(["PRIVATE", "CAMPAIGN_SHARED", "ROLE_RESTRICTED"]).optional(),
  roleScope: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/saved-views",
    async ({ actor }) => {
      const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid saved-view create body.");
      return createSavedView({ actor, ...parsed.data });
    },
  );
}
