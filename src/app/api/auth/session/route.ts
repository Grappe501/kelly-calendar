import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/lib/env/server-environment";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { getSessionViewer } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  getServerEnvironment();
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        requestId,
      },
      { status: 401, headers: { "x-request-id": requestId } },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      user: {
        id: viewer.userId,
        email: viewer.email,
        displayName: viewer.displayName,
        systemRole: viewer.systemRole,
        teamIds: viewer.teamIds,
      },
      requestId,
    },
    { headers: { "x-request-id": requestId } },
  );
}
