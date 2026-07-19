import { NextResponse } from "next/server";
import { getGoogleIntegrationEnv } from "@/features/google-integration/config";
import {
  assertReadonlyCalendarScope,
  exchangeAuthorizationCode,
  fetchGoogleAccountEmail,
  parseGrantedScopes,
} from "@/features/google-integration/google-oauth-client";
import { consumeOAuthState } from "@/features/google-integration/oauth-state";
import { assertGoogleIntegrationAdmin } from "@/features/google-integration/require-google-admin";
import { storeRefreshToken } from "@/features/google-integration/token-store";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/integrations/google/calendar/callback", requestId);
    const actor = await requireActiveAuthenticatedActor();
    assertGoogleIntegrationAdmin(actor);

    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    if (error) {
      return NextResponse.redirect(
        new URL("/system/google-integration?error=oauth_denied", url.origin),
      );
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/system/google-integration?error=missing_code", url.origin),
      );
    }

    const { codeVerifier } = await consumeOAuthState({
      state,
      actorUserId: actor.userId,
    });
    const tokens = await exchangeAuthorizationCode({ code, codeVerifier });
    const scopes = parseGrantedScopes(tokens.scope);
    assertReadonlyCalendarScope(scopes);
    const email = await fetchGoogleAccountEmail(tokens.access_token);
    const env = getGoogleIntegrationEnv();

    await storeRefreshToken({
      refreshToken: tokens.refresh_token,
      googleAccountEmail: email,
      googleCalendarId: env.calendarId,
      grantedScopes: scopes,
      connectedByUserId: actor.userId,
    });

    // Access token intentionally not persisted.
    return NextResponse.redirect(
      new URL("/system/google-integration?connected=1", url.origin),
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/integrations/google/calendar/callback");
  }
}
