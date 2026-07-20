import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  getMobilizeAttendanceWorkspace,
  reviewPersonMatch,
} from "@/server/services/mobilize-attendance-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/people/matches",
    async ({ actor }) => {
      const ws = await getMobilizeAttendanceWorkspace(actor);
      return { matches: ws.matches, personLevelApplyEnabled: false };
    },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/people/matches",
    async ({ actor }) => reviewPersonMatch(actor, body),
  );
}
