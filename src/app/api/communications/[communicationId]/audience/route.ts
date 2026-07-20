import { ValidationError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  approveCommunicationAudience,
  getCampaignCommunicationDetail,
  materializeCommunicationAudience,
  reviewAudienceMemberInclusion,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/communications/[communicationId]/audience",
    async ({ actor }) =>
      getCampaignCommunicationDetail(communicationId, actor),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]/audience",
    async ({ actor }) => {
      const body = await request.json().catch(() => null);
      return {
        detail: await materializeCommunicationAudience(
          communicationId,
          actor,
          body,
        ),
      };
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { communicationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/[communicationId]/audience",
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
        case "include":
          return {
            detail: await reviewAudienceMemberInclusion(
              communicationId,
              actor,
              payload,
            ),
          };
        case "approve":
          return {
            detail: await approveCommunicationAudience(
              communicationId,
              actor,
            ),
          };
        default:
          throw new ValidationError(
            "PATCH action must be include or approve.",
          );
      }
    },
  );
}
