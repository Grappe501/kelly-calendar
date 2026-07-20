import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createCampaignCommunicationDraft,
  listCampaignCommunications,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications",
    async ({ actor }) => listCampaignCommunications(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications",
    async ({ actor }) => {
      const body = await request.json().catch(() => null);
      return {
        detail: await createCampaignCommunicationDraft(actor, body),
      };
    },
  );
}
