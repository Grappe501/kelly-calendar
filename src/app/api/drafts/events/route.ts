import { listDrafts, saveDraft } from "@/features/event-drafts/draft-store";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/drafts/events", async ({ actor, requestId }) => {
    await requireAuthorized(actor, {
      action: "EVENT_VIEW",
      resource: { type: "system" },
    });
    enforceScaffoldRateLimit("/api/drafts/events", requestId);
    const drafts = (await listDrafts()).map((d) => ({
      draftId: d.draftId,
      status: d.status,
      title: d.basic.campaignDisplayTitle || d.basic.internalTitle,
      primaryCalendar: d.basic.primaryCalendar,
      updatedAt: d.updatedAt,
      liveCalendar: false,
      databaseWriteAttempted: true,
    }));
    return { drafts };
  });
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(request, "/api/drafts/events", async ({ actor, requestId }) => {
    await requireAuthorized(actor, {
      action: "EVENT_CREATE",
      resource: { type: "system" },
    });
    enforceScaffoldRateLimit("/api/drafts/events", requestId);
    const body = await request.json();
    const draft = await saveDraft(body);
    return {
      draft,
      banner: "DRAFT — NOT YET ON LIVE CALENDAR",
      databaseWriteAttempted: true,
    };
  });
}
