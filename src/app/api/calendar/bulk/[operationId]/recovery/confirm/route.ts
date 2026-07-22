import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { confirmBulkRecovery } from "@/server/services/calendar-bulk-operation-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ operationId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { operationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/calendar/bulk/[operationId]/recovery/confirm",
    async ({ actor }) => {
      const body = z
        .object({
          recoveryPreviewOperationId: z.string().min(1),
          previewFingerprint: z.string().min(8).max(80),
          confirmationPhrase: z.string().max(40).optional().nullable(),
        })
        .safeParse(await request.json());
      if (!body.success) {
        throw new ValidationError("recoveryPreviewOperationId and previewFingerprint required.");
      }
      return confirmBulkRecovery({
        actor,
        operationId,
        recoveryPreviewOperationId: body.data.recoveryPreviewOperationId,
        previewFingerprint: body.data.previewFingerprint,
        confirmationPhrase: body.data.confirmationPhrase,
      });
    },
  );
}
