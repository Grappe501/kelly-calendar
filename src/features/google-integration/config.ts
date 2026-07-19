import { loadApprovedEnvironment } from "@/lib/env/load-server-environment";

export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_OAUTH_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

export type GoogleIntegrationEnv = {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  tokenEncryptionKey: string | null;
  calendarId: string;
  mapsRoutesApiKey: string | null;
  syncEnabled: boolean;
  routesEnabled: boolean;
  historyStartIso: string;
};

function truthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

export function getGoogleIntegrationEnv(): GoogleIntegrationEnv {
  const loaded = loadApprovedEnvironment();
  const env = { ...loaded.env, ...process.env };
  return {
    clientId: env.KCCC_GOOGLE_CLIENT_ID?.trim() || null,
    clientSecret: env.KCCC_GOOGLE_CLIENT_SECRET?.trim() || null,
    redirectUri: env.KCCC_GOOGLE_OAUTH_REDIRECT_URI?.trim() || null,
    tokenEncryptionKey: env.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() || null,
    calendarId: env.KCCC_GOOGLE_CALENDAR_ID?.trim() || "primary",
    mapsRoutesApiKey: env.KCCC_GOOGLE_MAPS_ROUTES_API_KEY?.trim() || null,
    syncEnabled: truthy(env.KCCC_GOOGLE_SYNC_ENABLED),
    routesEnabled: truthy(env.KCCC_GOOGLE_ROUTES_ENABLED),
    historyStartIso:
      env.KCCC_GOOGLE_HISTORY_START?.trim() || "2025-11-01T00:00:00-05:00",
  };
}

export function oauthConfigStatus(env = getGoogleIntegrationEnv()) {
  return {
    clientIdConfigured: Boolean(env.clientId),
    clientSecretConfigured: Boolean(env.clientSecret),
    redirectUriConfigured: Boolean(env.redirectUri),
    encryptionKeyConfigured: Boolean(env.tokenEncryptionKey),
    calendarId: env.calendarId,
    syncEnabled: env.syncEnabled,
    historyStart: env.historyStartIso,
    routesApiKeyConfigured: Boolean(env.mapsRoutesApiKey),
    routesEnabled: env.routesEnabled,
    oauthFullyConfigured: Boolean(
      env.clientId && env.clientSecret && env.redirectUri && env.tokenEncryptionKey,
    ),
  };
}

export { redactGoogleDiagnostics } from "@/features/google-integration/redact";
