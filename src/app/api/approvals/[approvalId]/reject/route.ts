import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { resolveApproval } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ approvalId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { approvalId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/approvals/[approvalId]/reject",
    async ({ actor, requestId }) => {
      const body = z
        .object({ notes: z.string().optional() })
        .safeParse(await request.json().catch(() => ({})));
      const approval = await resolveApproval({
        actor,
        approvalId,
        decision: "REJECTED",
        notes: body.success ? body.data.notes : undefined,
        requestId,
      });
      return { approval };
    },
  );
}
