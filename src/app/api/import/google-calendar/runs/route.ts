import { NextResponse } from "next/server";
import {
  getImportManifest,
  listImportManifests,
} from "@/features/calendar-import/staging-store";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/import/google-calendar/runs", requestId);
    const url = new URL(request.url);
    const importId = url.searchParams.get("importId");
    if (importId) {
      const manifest = getImportManifest(importId);
      return NextResponse.json(
        { ok: true, manifest, requestId },
        { headers: { "x-request-id": requestId } },
      );
    }
    return NextResponse.json(
      { ok: true, runs: listImportManifests(), requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/import/google-calendar/runs");
  }
}
