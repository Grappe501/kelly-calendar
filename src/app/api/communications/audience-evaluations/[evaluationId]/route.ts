import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  generateManifestFromEvaluation,
  getEvaluationDetail,
} from "@/server/services/communications-audience-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ evaluationId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { evaluationId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/audience-evaluations/${evaluationId}`,
    async ({ actor }) => getEvaluationDetail(actor, evaluationId),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { evaluationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/audience-evaluations/${evaluationId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (body?.action === "manifest") {
        return generateManifestFromEvaluation(actor, evaluationId);
      }
      return getEvaluationDetail(actor, evaluationId);
    },
  );
}
