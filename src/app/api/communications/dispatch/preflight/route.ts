import { ValidationError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { runCommunicationDispatchPreflight } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/dispatch/preflight",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const communicationId =
        typeof body?.communicationId === "string"
          ? body.communicationId.trim()
          : "";
      if (!communicationId) {
        throw new ValidationError("communicationId is required.");
      }
      return runCommunicationDispatchPreflight(communicationId, actor);
    },
  );
}
