import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  approveComposition,
  createDispatchArtifact,
  getCompositionDetail,
  revokeCompositionApproval,
  saveComposition,
  submitCompositionForReview,
  validateAndRenderComposition,
} from "@/server/services/communications-composition-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ compositionId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { compositionId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/compositions/${compositionId}`,
    async ({ actor }) => getCompositionDetail(actor, compositionId),
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { compositionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/compositions/${compositionId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return saveComposition(actor, compositionId, {
        subjectDraft:
          typeof body?.subjectDraft === "string" ? body.subjectDraft : undefined,
        htmlDraft:
          typeof body?.htmlDraft === "string" ? body.htmlDraft : undefined,
        textDraft:
          typeof body?.textDraft === "string" ? body.textDraft : undefined,
        smsDraft: typeof body?.smsDraft === "string" ? body.smsDraft : undefined,
        changeSummary:
          typeof body?.changeSummary === "string" ? body.changeSummary : undefined,
      });
    },
  );
}

export async function POST(request: Request, context: Ctx) {
  const { compositionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/compositions/${compositionId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "validate";
      if (action === "validate" || action === "render") {
        return validateAndRenderComposition(actor, compositionId, {
          previewProfileKey:
            typeof body?.previewProfileKey === "string"
              ? body.previewProfileKey
              : undefined,
          renderPurpose:
            body?.renderPurpose === "DISPATCH"
              ? "DISPATCH"
              : body?.renderPurpose === "APPROVAL"
                ? "APPROVAL"
                : "PREVIEW",
        });
      }
      if (action === "submit") {
        return submitCompositionForReview(actor, compositionId);
      }
      if (action === "approve") {
        return approveComposition(
          actor,
          compositionId,
          typeof body?.reviewNotes === "string" ? body.reviewNotes : undefined,
        );
      }
      if (action === "revoke") {
        return revokeCompositionApproval(actor, compositionId);
      }
      if (action === "dispatch-artifact") {
        return createDispatchArtifact(
          actor,
          compositionId,
          typeof body?.previewProfileKey === "string"
            ? body.previewProfileKey
            : undefined,
        );
      }
      return validateAndRenderComposition(actor, compositionId, {});
    },
  );
}
