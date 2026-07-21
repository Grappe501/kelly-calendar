import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getSandboxConsole,
  runSandboxTestConsole,
} from "@/server/services/communications-provider-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers/sandbox/console",
    async ({ actor }) => getSandboxConsole(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/providers/sandbox/console",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return runSandboxTestConsole(actor, {
        providerKey:
          typeof body?.providerKey === "string" ? body.providerKey : "",
        recipient: typeof body?.recipient === "string" ? body.recipient : "",
        subject: typeof body?.subject === "string" ? body.subject : "",
        message: typeof body?.message === "string" ? body.message : "",
        simulateOnly: body?.simulateOnly === true,
      });
    },
  );
}
