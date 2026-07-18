import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/lib/env/server-environment";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { refreshAuthStatus } from "@/server/auth/auth-status";
import { getAuthProviderStatus } from "@/server/auth/provider";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  getServerEnvironment();
  const status = refreshAuthStatus();
  const provider = getAuthProviderStatus();
  return NextResponse.json({
    ok: true,
    authenticationComplete: status.authenticationComplete,
    sessionValidationAvailable: status.sessionValidationAvailable,
    mutationApisAuthorized: status.mutationApisAuthorized,
    candidateDataEntryAuthorized: status.candidateDataEntryAuthorized,
    loginEnabled: provider.loginEnabled,
    provider: {
      primary: provider.primary,
      supabaseConfigured: provider.supabaseConfigured,
    },
    requestId,
  });
}
