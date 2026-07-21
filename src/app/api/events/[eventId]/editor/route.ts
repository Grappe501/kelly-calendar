import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  getEventAuditHistory,
  getEventEditorPayload,
} from "@/server/services/event-editor-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  const url = new URL(request.url);
  const includeHistory = url.searchParams.get("history") === "1";

  return withAuthenticatedQuery(
    request,
    "/api/events/[eventId]/editor",
    async ({ actor }) => {
      const editor = await getEventEditorPayload(actor, eventId);
      const history = includeHistory
        ? await getEventAuditHistory(actor, eventId)
        : null;
      return { editor, history };
    },
  );
}
