import { ValidationError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getCampaignCommunicationDetail,
  updateCampaignCommunicationContent,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/communications/[communicationId]",
    async ({ actor }) =>
      getCampaignCommunicationDetail(communicationId, actor),
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "";
      if (action !== "content") {
        throw new ValidationError(
          "PATCH action must be content on this route.",
        );
      }
      const payload =
        body?.payload && typeof body.payload === "object"
          ? body.payload
          : body;
      return {
        detail: await updateCampaignCommunicationContent(
          communicationId,
          actor,
          payload,
        ),
      };
    },
  );
}
