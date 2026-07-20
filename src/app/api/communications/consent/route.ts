import {
  withAuthenticatedMutation,
} from "@/server/auth/api-mutation";
import { recordConsentEvidence } from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/consent",
    async ({ actor }) => {
      const body = await request.json().catch(() => null);
      return { result: await recordConsentEvidence(actor, body) };
    },
  );
}
