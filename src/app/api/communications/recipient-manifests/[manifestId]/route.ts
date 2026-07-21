import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  approveManifest,
  getManifestDetail,
  revokeManifest,
  submitManifest,
} from "@/server/services/communications-audience-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ manifestId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { manifestId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/recipient-manifests/${manifestId}`,
    async ({ actor }) => getManifestDetail(actor, manifestId),
  );
}

export async function POST(request: Request, context: Ctx) {
  const { manifestId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/recipient-manifests/${manifestId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "submit";
      if (action === "approve") {
        return approveManifest(
          actor,
          manifestId,
          typeof body?.manifestHash === "string" ? body.manifestHash : undefined,
        );
      }
      if (action === "revoke") {
        return revokeManifest(
          actor,
          manifestId,
          typeof body?.reason === "string" ? body.reason : undefined,
        );
      }
      return submitManifest(actor, manifestId);
    },
  );
}
