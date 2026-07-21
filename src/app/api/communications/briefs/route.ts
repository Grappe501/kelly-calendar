import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createBriefRecord,
  getCompositionWorkspaceHome,
} from "@/server/services/communications-composition-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/briefs",
    async ({ actor }) => getCompositionWorkspaceHome(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/briefs",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return createBriefRecord(actor, {
        purpose: typeof body?.purpose === "string" ? body.purpose : "",
        channel: body?.channel === "SMS" ? "SMS" : "EMAIL",
        objective:
          typeof body?.objective === "string" ? body.objective : undefined,
        audienceDescription:
          typeof body?.audienceDescription === "string"
            ? body.audienceDescription
            : undefined,
      });
    },
  );
}
