import { blockUnauthorizedMutation } from "@/lib/api/mutation-blocked";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ importRunId: string; recordId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { importRunId, recordId } = await context.params;
  void importRunId;
  void recordId;
  return blockUnauthorizedMutation(
    request,
    "/api/imports/[importRunId]/records/[recordId]/approve",
    "Import approve is disabled until authentication and RBAC (Step 4) are complete.",
  );
}
