import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return blockUnauthorizedMutation(
    request,
    "/api/events/[eventId]/recommendations/[recommendationId]/reject",
    "Rejecting a recommendation requires Step 4 authentication.",
  );
}
