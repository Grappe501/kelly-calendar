import { NextResponse } from "next/server";
import { getEnvironmentCapabilityStatus } from "@/lib/env/environment-status";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/system/environment", requestId);
    const env = getEnvironmentCapabilityStatus();
    const isProd = process.env.NODE_ENV === "production";
    return NextResponse.json(
      {
        ok: true,
        public: {
          appName: env.publicSafe.appName,
          timezone: env.publicSafe.timezone,
          electionDate: env.publicSafe.electionDate,
          appUrl: env.publicSafe.appUrl,
        },
        capabilities: {
          database: env.database,
          directDatabase: env.directDatabase,
          supabaseBrowser: env.supabaseBrowser,
          supabaseServer: env.supabaseServer,
          openAi: env.openAi,
          sessionSecret: env.sessionSecret,
        },
        redDirtFallback: env.redDirtFallback,
        sources: isProd
          ? undefined
          : Object.fromEntries(
              Object.entries(env.sources).map(([key, value]) => [
                key,
                {
                  configured: value.configured,
                  source: value.source,
                  classification: value.classification,
                },
              ]),
            ),
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/system/environment");
  }
}
