import { ValidationError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  exportCommunicationQueuePreview,
  getCampaignCommunicationDetail,
  handoffCommunicationQueue,
  prepareCommunicationQueue,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/communications/[communicationId]/queue",
    async ({ actor }) =>
      getCampaignCommunicationDetail(communicationId, actor),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]/queue",
    async ({ actor }) => ({
      detail: await prepareCommunicationQueue(communicationId, actor),
    }),
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]/queue",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "";
      const payload =
        body?.payload && typeof body.payload === "object"
          ? body.payload
          : body;

      switch (action) {
        case "handoff":
          return {
            detail: await handoffCommunicationQueue(
              communicationId,
              actor,
              payload,
            ),
          };
        case "export":
          return {
            export: await exportCommunicationQueuePreview(
              communicationId,
              actor,
            ),
          };
        default:
          throw new ValidationError(
            "PATCH action must be handoff or export.",
          );
      }
    },
  );
}
