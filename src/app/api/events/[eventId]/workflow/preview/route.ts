import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

/** Preview requires auth in production path; blocked until Step 4. */
export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  void eventId;
  return blockUnauthorizedMutation(
    request,
    "/api/events/[eventId]/workflow/preview",
    "Workflow preview requires Step 4 authentication.",
  );
}
