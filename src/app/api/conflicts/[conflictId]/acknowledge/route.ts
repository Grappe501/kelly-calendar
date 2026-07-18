import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return blockUnauthorizedMutation(
    request,
    "/api/conflicts/[conflictId]/acknowledge",
    "Conflict acknowledgment requires Step 4 authentication.",
  );
}
