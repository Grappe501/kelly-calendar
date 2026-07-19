import {
  getGoogleIntegrationEnv,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_REVOKE_URL,
  GOOGLE_OAUTH_TOKEN_URL,
} from "@/features/google-integration/config";
import { AppError } from "@/lib/security/safe-error";

export type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export function buildGoogleAuthUrl(input: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<GoogleTokenResponse> {
  const env = getGoogleIntegrationEnv();
  if (!env.clientId || !env.clientSecret || !env.redirectUri) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Google OAuth is not configured.",
    });
  }
  const body = new URLSearchParams({
    code: input.code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  });
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: "Google token exchange failed.",
    });
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const env = getGoogleIntegrationEnv();
  if (!env.clientId || !env.clientSecret) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Google OAuth is not configured.",
    });
  }
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: "Google token refresh failed.",
    });
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(`${GOOGLE_OAUTH_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).catch(() => undefined);
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { email?: string };
  return json.email ?? null;
}

export function parseGrantedScopes(scope: string | undefined): string[] {
  if (!scope?.trim()) return [GOOGLE_CALENDAR_READONLY_SCOPE];
  return scope.split(/\s+/).filter(Boolean);
}

export function assertReadonlyCalendarScope(scopes: string[]): void {
  if (!scopes.includes(GOOGLE_CALENDAR_READONLY_SCOPE)) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "Granted Google scope is not calendar.readonly.",
    });
  }
}
