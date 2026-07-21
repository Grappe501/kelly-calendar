import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { runSandboxCertification } from "@/server/services/communications-provider-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/providers/sandbox/certify",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const providerKey =
        typeof body?.providerKey === "string" ? body.providerKey : "kccc-sandbox";
      return runSandboxCertification(actor, providerKey);
    },
  );
}
