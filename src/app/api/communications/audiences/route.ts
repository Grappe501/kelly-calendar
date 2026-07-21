import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createAudienceRecord,
  createDefinitionRecord,
  getAudienceWorkspaceHome,
  runAudienceEvaluation,
} from "@/server/services/communications-audience-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/audiences",
    async ({ actor }) => getAudienceWorkspaceHome(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/audiences",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (typeof body?.audienceId === "string" && body.action === "evaluate") {
        return runAudienceEvaluation(actor, body.audienceId, {
          definitionId:
            typeof body.definitionId === "string" ? body.definitionId : undefined,
          evaluationType:
            body.evaluationType === "MANIFEST"
              ? "MANIFEST"
              : body.evaluationType === "REVIEW"
                ? "REVIEW"
                : body.evaluationType === "TEST"
                  ? "TEST"
                  : "PREVIEW",
        });
      }
      if (typeof body?.audienceId === "string" && body.criteria) {
        return createDefinitionRecord(actor, body.audienceId, {
          channel: body.channel === "SMS" ? "SMS" : "EMAIL",
          criteria: body.criteria,
          evaluationLimit:
            typeof body.evaluationLimit === "number"
              ? body.evaluationLimit
              : undefined,
          changeSummary:
            typeof body.changeSummary === "string" ? body.changeSummary : undefined,
        });
      }
      return createAudienceRecord(actor, {
        audienceKey: typeof body?.audienceKey === "string" ? body.audienceKey : "",
        name: typeof body?.name === "string" ? body.name : "",
        audienceType:
          typeof body?.audienceType === "string"
            ? (body.audienceType as "TEST_ONLY")
            : "TEST_ONLY",
        channelScope:
          body?.channelScope === "SMS"
            ? "SMS"
            : body?.channelScope === "MULTI_CHANNEL"
              ? "MULTI_CHANNEL"
              : "EMAIL",
        description:
          typeof body?.description === "string" ? body.description : undefined,
        purpose: typeof body?.purpose === "string" ? body.purpose : undefined,
      });
    },
  );
}
