import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { toSafeErrorBody } from "@/lib/security/safe-error";
import { runScheduledHealthIngress } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

/**
 * CC-11 scheduled health ingress — secret header auth only (no session).
 * Prefer KCCC_CALENDAR_HEALTH_SCHEDULE_SECRET; fall back to
 * KCCC_SCHEDULED_EXECUTION_SECRET when the dedicated secret is unset.
 * Fail closed when neither secret is configured.
 */
export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    const dedicated = process.env.KCCC_CALENDAR_HEALTH_SCHEDULE_SECRET?.trim();
    const shared = process.env.KCCC_SCHEDULED_EXECUTION_SECRET?.trim();
    const expected = dedicated || shared || "";
    const provided =
      request.headers.get("x-kccc-calendar-health-secret")?.trim() ||
      (dedicated ? "" : request.headers.get("x-kccc-scheduled-execution")?.trim()) ||
      "";

    const secretConfigured = Boolean(expected);
    const secretOk = secretConfigured && provided.length > 0 && provided === expected;

    const result = await runScheduledHealthIngress({
      secretConfigured,
      secretOk,
      systemJobId: `netlify-sched-${requestId}`,
    });

    return NextResponse.json(
      { ok: true, ...result, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const body = toSafeErrorBody(error, requestId);
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status) || 500
        : 500;
    return NextResponse.json(body, {
      status,
      headers: { "x-request-id": requestId },
    });
  }
}
