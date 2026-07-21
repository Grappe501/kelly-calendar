import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getTemplateDetail } from "@/server/services/communications-composition-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ templateId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { templateId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/templates/${templateId}`,
    async ({ actor }) => getTemplateDetail(actor, templateId),
  );
}
