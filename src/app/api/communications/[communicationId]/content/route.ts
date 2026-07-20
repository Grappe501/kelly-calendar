import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  approveCommunicationContent,
  getCampaignCommunicationDetail,
  updateCampaignCommunicationContent,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/communications/[communicationId]/content",
    async ({ actor }) =>
      getCampaignCommunicationDetail(communicationId, actor),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]/content",
    async ({ actor }) => ({
      detail: await approveCommunicationContent(communicationId, actor),
    }),
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]/content",
    async ({ actor }) => {
      const body = await request.json().catch(() => null);
      return {
        detail: await updateCampaignCommunicationContent(
          communicationId,
          actor,
          body,
        ),
      };
    },
  );
}
