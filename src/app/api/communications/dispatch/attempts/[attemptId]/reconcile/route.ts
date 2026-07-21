import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { reconcileUnknownAttempt } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { attemptId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/communications/dispatch/attempts/[attemptId]/reconcile",
    async ({ actor }) => reconcileUnknownAttempt(attemptId, actor),
  );
}
