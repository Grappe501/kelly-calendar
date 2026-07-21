import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redact(message: string): string {
  return message
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "[redacted]")
    .replace(/[A-Za-z]:\\[^\s"']+/g, "[path]")
    .replace(/\/opt\/[^\s"']+/g, "[path]")
    .replace(/\/var\/[^\s"']+/g, "[path]")
    .slice(0, 400);
}

/**
 * Public DB reachability probe. Dynamic-imports Prisma so load failures return JSON.
 */
export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    const { ensurePrismaEnv, prisma } = await import("@/server/db/prisma");
    const { getServerEnvironment } = await import("@/lib/env/server-environment");
    ensurePrismaEnv();
    const server = getServerEnvironment();
    if (!server.databaseUrl) {
      return NextResponse.json(
        { ok: false, configured: false, reachable: false, requestId },
        { status: 503, headers: { "x-request-id": requestId } },
      );
    }
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json(
      { ok: true, configured: true, reachable: true, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    const message =
      error instanceof Error ? redact(error.message) : "unknown";
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        reachable: false,
        errorName: name,
        errorCode: code || undefined,
        errorHint: message,
        requestId,
      },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }
}
