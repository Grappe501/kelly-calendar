import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  void eventId;
  return blockUnauthorizedMutation(
    request,
    "/api/events/[eventId]/program-flow",
    "Event program-flow updates are disabled until authentication and RBAC (Step 4) are complete.",
  );
}
