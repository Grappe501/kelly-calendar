import { NextResponse } from "next/server";
import { z } from "zod";
import {
  actorAsSessionViewer,
  requireActiveAuthenticatedActor,
} from "@/server/auth/actor";
import { runWithActorAsync } from "@/server/auth/actor-context";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { ValidationError } from "@/lib/security/safe-error";
import { getServerEnvironment } from "@/lib/env/server-environment";
import { generateOneTimeIcsExport } from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

const DownloadSchema = z.object({
  privacyProfile: z.enum(["BUSY_ONLY", "CITY_ONLY", "OPERATIONAL_REDACTED"]),
  query: z.record(z.string(), z.unknown()).default({}),
  calendarName: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    getServerEnvironment();
    const actor = await requireActiveAuthenticatedActor(request);
    const parsed = DownloadSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError("Invalid ICS export download body.");

    const result = await runWithActorAsync(actorAsSessionViewer(actor), () =>
      generateOneTimeIcsExport({
        actor,
        privacyProfile: parsed.data.privacyProfile,
        query: parsed.data.query,
        calendarName: parsed.data.calendarName,
      }),
    );

    return new NextResponse(result.ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        ETag: result.etag,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "x-request-id": requestId,
        "x-ics-event-count": String(result.eventCount),
        "x-ics-truncated": result.truncated ? "1" : "0",
      },
    });
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/calendar/exports/download");
  }
}
