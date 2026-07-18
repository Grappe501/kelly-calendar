import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requestApproval } from "@/server/services/authenticated-ops-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/approvals",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          approvalType: z.string().min(1),
          assignedToUserId: z.string().optional(),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("approvalType is required.");
      const approval = await requestApproval({
        actor,
        eventId,
        approvalType: body.data.approvalType,
        assignedToUserId: body.data.assignedToUserId,
        requestId,
      });
      return { approval };
    },
  );
}
