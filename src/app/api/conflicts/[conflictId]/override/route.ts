import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return blockUnauthorizedMutation(
    request,
    "/api/conflicts/[conflictId]/override",
    "Conflict override requires Step 4 authentication and elevated permission.",
  );
}
