import { ValidationError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  listSuppressionsView,
  recordSuppression,
  revokeCommunicationSuppression,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/suppressions",
    async ({ actor }) => listSuppressionsView(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/suppressions",
    async ({ actor }) => {
      const body = await request.json().catch(() => null);
      return { result: await recordSuppression(actor, body) };
    },
  );
}

export async function PATCH(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/suppressions",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const suppressionId =
        typeof body?.suppressionId === "string" ? body.suppressionId : "";
      if (!suppressionId) {
        throw new ValidationError("suppressionId required.");
      }
      const payload =
        body?.payload && typeof body.payload === "object"
          ? body.payload
          : body;
      return {
        result: await revokeCommunicationSuppression(
          suppressionId,
          actor,
          payload,
        ),
      };
    },
  );
}
