import {
  deleteDraft,
  getDraft,
  saveDraft,
} from "@/features/event-drafts/draft-store";
import { AppError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ draftId: string }> };

export async function GET(request: Request, context: Ctx) {
  return withAuthenticatedQuery(
    request,
    "/api/drafts/events/[draftId]",
    async ({ actor, requestId }) => {
      await requireAuthorized(actor, {
        action: "EVENT_VIEW",
        resource: { type: "system" },
      });
      enforceScaffoldRateLimit("/api/drafts/events/[draftId]", requestId);
      const { draftId } = await context.params;
      const draft = await getDraft(draftId);
      if (!draft) {
        throw new AppError({
          code: "NOT_FOUND",
          status: 404,
          publicMessage: "Draft not found.",
        });
      }
      return { draft, liveCalendar: false };
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  return withAuthenticatedMutation(
    request,
    "/api/drafts/events/[draftId]",
    async ({ actor, requestId }) => {
      await requireAuthorized(actor, {
        action: "EVENT_CREATE",
        resource: { type: "system" },
      });
      enforceScaffoldRateLimit("/api/drafts/events/[draftId]", requestId);
      const { draftId } = await context.params;
      const existing = await getDraft(draftId);
      if (!existing) {
        throw new AppError({
          code: "NOT_FOUND",
          status: 404,
          publicMessage: "Draft not found.",
        });
      }
      const body = await request.json();
      const draft = await saveDraft({ ...existing, ...body, draftId });
      return {
        draft,
        banner: "DRAFT — NOT YET ON LIVE CALENDAR",
        databaseWriteAttempted: true,
      };
    },
  );
}

export async function DELETE(request: Request, context: Ctx) {
  return withAuthenticatedMutation(
    request,
    "/api/drafts/events/[draftId]",
    async ({ actor, requestId }) => {
      await requireAuthorized(actor, {
        action: "EVENT_CREATE",
        resource: { type: "system" },
      });
      enforceScaffoldRateLimit("/api/drafts/events/[draftId]", requestId);
      const { draftId } = await context.params;
      const removed = await deleteDraft(draftId);
      if (!removed) {
        throw new AppError({
          code: "NOT_FOUND",
          status: 404,
          publicMessage: "Draft not found.",
        });
      }
      return { deleted: true };
    },
  );
}
