import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createLiveTestProgramRecord,
  getLiveTestWorkspaceHome,
} from "@/server/services/communications-live-test-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/live-tests",
    async ({ actor }) => getLiveTestWorkspaceHome(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/live-tests",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return createLiveTestProgramRecord(actor, {
        programKey:
          typeof body?.programKey === "string" ? body.programKey : "",
        name: typeof body?.name === "string" ? body.name : "",
        channel: body?.channel === "SMS" ? "SMS" : "EMAIL",
        purpose: typeof body?.purpose === "string" ? body.purpose : undefined,
      });
    },
  );
}
