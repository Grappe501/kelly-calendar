import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return blockUnauthorizedMutation(
    request,
    "/api/events/[eventId]/readiness/recalculate",
    "Readiness recalculation requires Step 4 authentication.",
  );
}
