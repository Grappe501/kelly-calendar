import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  approveMobilizePublication,
  getMobilizeEventPublication,
  previewMobilizePublication,
  publishMobilizeEvent,
} from "@/server/services/mobilize-publishing-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/publishing/[eventId]",
    async ({ actor }) => getMobilizeEventPublication(actor, eventId),
  );
}

export async function POST(request: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const action =
    body && typeof body === "object" && "action" in body
      ? String((body as { action?: string }).action)
      : "preview";

  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/publishing/[eventId]",
    async ({ actor }) => {
      if (action === "approve") {
        return approveMobilizePublication(actor, eventId, body);
      }
      if (action === "publish") {
        return publishMobilizeEvent(actor, eventId, body);
      }
      return previewMobilizePublication(actor, eventId, body);
    },
  );
}
