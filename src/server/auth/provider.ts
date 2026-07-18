import "server-only";

/**
 * Auth provider registry.
 * Primary: app-signed sessions over kelly_calendar User credentials.
 * Optional: Supabase Auth when browser + service keys are configured
 * (maps externalAuthId → User; does not mutate Supabase/RedDirt tables from KCCC).
 */

export type AuthProviderId = "app_session" | "supabase";

export type AuthProviderStatus = {
  primary: AuthProviderId;
  appSessionReady: boolean;
  supabaseConfigured: boolean;
  loginEnabled: boolean;
};

export function getAuthProviderStatus(): AuthProviderStatus {
  const appSessionReady = Boolean(
    process.env.APP_SESSION_SECRET && process.env.APP_SESSION_SECRET.trim().length >= 32,
  );
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return {
    primary: "app_session",
    appSessionReady,
    supabaseConfigured,
    loginEnabled: appSessionReady,
  };
}
