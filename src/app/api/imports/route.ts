import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";

export const dynamic = "force-dynamic";

/** DB-backed import runs — list blocked until Step 4; staging import remains under /api/import/google-calendar. */
export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message:
          "Canonical import persistence APIs require Step 4 authentication. Staging import UI remains available.",
      },
      historicalFloor: "2025-11-01",
      requestId,
    },
    { status: 401, headers: { "x-request-id": requestId } },
  );
}
