import { NextResponse } from "next/server";
import {
  getGoogleIntegrationEnv,
  oauthConfigStatus,
} from "@/features/google-integration/config";
import { buildGoogleAuthUrl } from "@/features/google-integration/google-oauth-client";
import {
  generateOAuthState,
  generatePkcePair,
  persistOAuthState,
  purgeExpiredOAuthStates,
} from "@/features/google-integration/oauth-state";
import { assertGoogleIntegrationAdmin } from "@/features/google-integration/require-google-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/integrations/google/calendar/connect", requestId);
    const actor = await requireActiveAuthenticatedActor();
    assertGoogleIntegrationAdmin(actor);

    const status = oauthConfigStatus();
    if (!status.oauthFullyConfigured) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: "Google OAuth is not configured." },
          oauth: status,
          requestId,
        },
        { status: 503, headers: { "x-request-id": requestId } },
      );
    }

    const env = getGoogleIntegrationEnv();
    await purgeExpiredOAuthStates();
    const state = generateOAuthState();
    const { codeVerifier, codeChallenge } = generatePkcePair();
    await persistOAuthState({
      state,
      codeVerifier,
      createdByUserId: actor.userId,
    });

    const authUrl = buildGoogleAuthUrl({
      state,
      codeChallenge,
      redirectUri: env.redirectUri!,
      clientId: env.clientId!,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/integrations/google/calendar/connect");
  }
}
