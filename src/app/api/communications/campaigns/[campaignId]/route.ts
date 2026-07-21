import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  authorizeSandboxLaunch,
  createRevisionAndPlan,
  createSandboxRun,
  getCampaignDetail,
  revokeAuthorization,
  runReadinessReview,
  submitAndApproveRevision,
} from "@/server/services/communications-campaign-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ campaignId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { campaignId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/campaigns/${campaignId}`,
    async ({ actor }) => getCampaignDetail(actor, campaignId),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { campaignId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/campaigns/${campaignId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "revise";
      if (action === "revise") {
        return createRevisionAndPlan(actor, campaignId, {
          changeSummary:
            typeof body?.changeSummary === "string"
              ? body.changeSummary
              : undefined,
          maximumRecipients:
            typeof body?.maximumRecipients === "number"
              ? body.maximumRecipients
              : undefined,
          maximumBatchSize:
            typeof body?.maximumBatchSize === "number"
              ? body.maximumBatchSize
              : undefined,
          scheduledStartAt:
            typeof body?.scheduledStartAt === "string"
              ? body.scheduledStartAt
              : undefined,
          scheduledEndAt:
            typeof body?.scheduledEndAt === "string"
              ? body.scheduledEndAt
              : undefined,
          executionMode:
            body?.executionMode === "SCHEDULED_SANDBOX"
              ? "SCHEDULED_SANDBOX"
              : "MANUAL_SANDBOX",
        });
      }
      if (action === "approve-revision") {
        return submitAndApproveRevision(
          actor,
          typeof body?.revisionId === "string" ? body.revisionId : "",
          campaignId,
        );
      }
      if (action === "readiness") {
        return runReadinessReview(actor, campaignId);
      }
      if (action === "authorize") {
        return authorizeSandboxLaunch(actor, campaignId, {
          recipientLimit:
            typeof body?.recipientLimit === "number"
              ? body.recipientLimit
              : undefined,
          batchLimit:
            typeof body?.batchLimit === "number" ? body.batchLimit : undefined,
          notes: typeof body?.notes === "string" ? body.notes : undefined,
        });
      }
      if (action === "revoke-authorization") {
        return revokeAuthorization(
          actor,
          campaignId,
          typeof body?.reason === "string" ? body.reason : undefined,
        );
      }
      if (action === "create-run") {
        return createSandboxRun(actor, campaignId);
      }
      throw new Error(`Unknown action: ${action}`);
    },
  );
}
