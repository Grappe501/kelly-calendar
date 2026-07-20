import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  ensureCommunicationPolicySeed,
  getCommunicationPolicyView,
} from "@/server/services/campaign-communications-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/policy",
    async ({ actor }) => getCommunicationPolicyView(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/policy",
    async ({ actor }) => ({
      policy: await ensureCommunicationPolicySeed(actor),
    }),
  );
}
