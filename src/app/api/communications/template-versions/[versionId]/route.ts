import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  approveTemplateVersion,
  submitTemplateVersion,
} from "@/server/services/communications-composition-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ versionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { versionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/template-versions/${versionId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "submit";
      if (action === "approve") return approveTemplateVersion(actor, versionId);
      return submitTemplateVersion(actor, versionId);
    },
  );
}
