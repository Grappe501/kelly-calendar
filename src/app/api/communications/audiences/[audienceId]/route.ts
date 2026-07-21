import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  addStaticAudienceMember,
  getAudienceDetail,
  runAudienceEvaluation,
} from "@/server/services/communications-audience-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ audienceId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { audienceId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/audiences/${audienceId}`,
    async ({ actor }) => getAudienceDetail(actor, audienceId),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { audienceId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/audiences/${audienceId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "evaluate";
      if (action === "add-static-member") {
        return addStaticAudienceMember(
          actor,
          audienceId,
          typeof body?.localPersonId === "string" ? body.localPersonId : "",
          typeof body?.inclusionReason === "string"
            ? body.inclusionReason
            : undefined,
        );
      }
      return runAudienceEvaluation(actor, audienceId, {
        definitionId:
          typeof body?.definitionId === "string" ? body.definitionId : undefined,
        evaluationType:
          body?.evaluationType === "MANIFEST"
            ? "MANIFEST"
            : body?.evaluationType === "REVIEW"
              ? "REVIEW"
              : "PREVIEW",
      });
    },
  );
}
