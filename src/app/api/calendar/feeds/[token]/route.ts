import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { serveSubscriptionFeedIcs } from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

function stripIcsSuffix(tokenParam: string): string {
  const decoded = decodeURIComponent(tokenParam);
  return decoded.endsWith(".ics") ? decoded.slice(0, -4) : decoded;
}

const FEED_HEADERS_BASE = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
} as const;

/**
 * Public feed endpoint — authenticated by subscription token only.
 * Never echo the token in JSON bodies or logs.
 */
export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { token: tokenParam } = await context.params;
  const rawToken = stripIcsSuffix(tokenParam);

  const result = await serveSubscriptionFeedIcs({
    rawToken,
    ifNoneMatch: request.headers.get("if-none-match"),
    userAgent: request.headers.get("user-agent"),
  });

  if (result.kind === "unauthorized") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Feed not found.",
          requestId,
        },
      },
      {
        status: 404,
        headers: {
          ...FEED_HEADERS_BASE,
          "x-request-id": requestId,
        },
      },
    );
  }

  if (result.kind === "rate_limited") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many requests. Please try again later.",
          requestId,
        },
      },
      {
        status: 429,
        headers: {
          ...FEED_HEADERS_BASE,
          "x-request-id": requestId,
        },
      },
    );
  }

  if (result.kind === "not_modified") {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ...FEED_HEADERS_BASE,
        ETag: result.etag,
        "Last-Modified": result.lastModified.toUTCString(),
        "x-request-id": requestId,
      },
    });
  }

  return new NextResponse(result.ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      ...FEED_HEADERS_BASE,
      ETag: result.etag,
      "Last-Modified": result.lastModified.toUTCString(),
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "x-request-id": requestId,
    },
  });
}
