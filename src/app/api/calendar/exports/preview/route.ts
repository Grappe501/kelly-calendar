import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { previewOneTimeIcsExport } from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

const PreviewSchema = z.object({
  privacyProfile: z.enum(["BUSY_ONLY", "CITY_ONLY", "OPERATIONAL_REDACTED"]),
  query: z.record(z.string(), z.unknown()).default({}),
  sampleLimit: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/exports/preview",
    async ({ actor }) => {
      const parsed = PreviewSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid ICS export preview body.");
      return previewOneTimeIcsExport({
        actor,
        privacyProfile: parsed.data.privacyProfile,
        query: parsed.data.query,
        sampleLimit: parsed.data.sampleLimit,
      });
    },
  );
}
