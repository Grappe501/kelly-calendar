import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createCompositionRecord,
  getCompositionWorkspaceHome,
} from "@/server/services/communications-composition-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/compositions",
    async ({ actor }) => getCompositionWorkspaceHome(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/compositions",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return createCompositionRecord(actor, {
        name: typeof body?.name === "string" ? body.name : "Untitled",
        channel: body?.channel === "SMS" ? "SMS" : "EMAIL",
        briefId: typeof body?.briefId === "string" ? body.briefId : undefined,
        templateVersionId:
          typeof body?.templateVersionId === "string"
            ? body.templateVersionId
            : undefined,
      });
    },
  );
}
