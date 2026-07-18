import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    // Reference calendars may be listed only after schema exists; still no auth claims.
    const { prisma } = await import("@/server/db/prisma");
    const calendars = await prisma.calendar.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        calendarType: true,
        isCommandCalendar: true,
        defaultVisibility: true,
        defaultRollupMode: true,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        calendars,
        authenticationComplete: false,
        mutationsAuthorized: false,
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    // Schema may not be applied yet
    return jsonSafeError(error, requestId, "/api/calendars");
  }
}
