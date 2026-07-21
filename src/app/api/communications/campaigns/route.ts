import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createCampaignRecord,
  getCampaignWorkspaceHome,
} from "@/server/services/communications-campaign-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/campaigns",
    async ({ actor }) => getCampaignWorkspaceHome(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/campaigns",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return createCampaignRecord(actor, {
        campaignKey:
          typeof body?.campaignKey === "string" ? body.campaignKey : "",
        name: typeof body?.name === "string" ? body.name : "",
        channel: body?.channel === "SMS" ? "SMS" : "EMAIL",
        campaignType:
          typeof body?.campaignType === "string"
            ? (body.campaignType as "TEST_ONLY")
            : "TEST_ONLY",
        description:
          typeof body?.description === "string" ? body.description : undefined,
        purpose: typeof body?.purpose === "string" ? body.purpose : undefined,
        compositionId:
          typeof body?.compositionId === "string"
            ? body.compositionId
            : undefined,
        approvedCompositionRevisionId:
          typeof body?.approvedCompositionRevisionId === "string"
            ? body.approvedCompositionRevisionId
            : undefined,
        recipientManifestId:
          typeof body?.recipientManifestId === "string"
            ? body.recipientManifestId
            : undefined,
        timezone:
          typeof body?.timezone === "string" ? body.timezone : undefined,
      });
    },
  );
}
