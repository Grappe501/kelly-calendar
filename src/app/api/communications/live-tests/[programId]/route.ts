import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  addAndApproveRecipient,
  authorizeOneLiveTest,
  completeLiveTestReview,
  createAndApproveRevision,
  emergencyStopLiveTest,
  getLiveTestDetail,
  launchOneControlledTest,
  recordVerificationChecks,
  revokeAuthorizationAction,
  runLiveTestReadiness,
} from "@/server/services/communications-live-test-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ programId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { programId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/live-tests/${programId}`,
    async ({ actor }) => getLiveTestDetail(actor, programId),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { programId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/live-tests/${programId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "";
      if (action === "revise") {
        return createAndApproveRevision(actor, programId, {
          senderProfileKey:
            typeof body?.senderProfileKey === "string"
              ? body.senderProfileKey
              : undefined,
          renderArtifactId:
            typeof body?.renderArtifactId === "string"
              ? body.renderArtifactId
              : undefined,
        });
      }
      if (action === "verify") {
        return recordVerificationChecks(actor, programId);
      }
      if (action === "add-recipient") {
        return addAndApproveRecipient(actor, programId, {
          destinationHint:
            typeof body?.destinationHint === "string"
              ? body.destinationHint
              : "ops@example.test",
          ownershipMethod:
            body?.ownershipMethod === "CAMPAIGN_CONTROLLED_DESTINATION"
              ? "CAMPAIGN_CONTROLLED_DESTINATION"
              : "OPERATOR_ATTESTATION",
          attestationNotes:
            typeof body?.attestationNotes === "string"
              ? body.attestationNotes
              : undefined,
        });
      }
      if (action === "readiness") {
        return runLiveTestReadiness(actor, programId);
      }
      if (action === "authorize") {
        return authorizeOneLiveTest(actor, programId, {
          typedConfirmation:
            typeof body?.typedConfirmation === "string"
              ? body.typedConfirmation
              : "",
          notes: typeof body?.notes === "string" ? body.notes : undefined,
        });
      }
      if (action === "launch") {
        return launchOneControlledTest(actor, programId, {
          typedConfirmation:
            typeof body?.typedConfirmation === "string"
              ? body.typedConfirmation
              : "",
          authorizationId:
            typeof body?.authorizationId === "string"
              ? body.authorizationId
              : "",
          authorizationHash:
            typeof body?.authorizationHash === "string"
              ? body.authorizationHash
              : "",
        });
      }
      if (action === "emergency-stop") {
        return emergencyStopLiveTest(
          actor,
          programId,
          typeof body?.reason === "string" ? body.reason : undefined,
        );
      }
      if (action === "revoke-authorization") {
        return revokeAuthorizationAction(
          actor,
          programId,
          typeof body?.reason === "string" ? body.reason : undefined,
        );
      }
      if (action === "complete-review") {
        return completeLiveTestReview(
          actor,
          programId,
          typeof body?.executionId === "string" ? body.executionId : "",
        );
      }
      throw new ValidationError(`Unknown action: ${action || "(empty)"}`);
    },
  );
}
