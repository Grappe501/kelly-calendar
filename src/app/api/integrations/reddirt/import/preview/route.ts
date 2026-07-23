import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { previewRedDirtExport } from "@/server/services/reddirt-integration-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/reddirt/import/preview",
    async ({ actor }) => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        throw new ValidationError("Upload a JSON or CSV file as form field file.");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      return previewRedDirtExport(actor, {
        buffer,
        filename: file.name || "export.json",
      });
    },
  );
}
