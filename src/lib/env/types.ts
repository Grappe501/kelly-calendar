export type EnvSource =
  | "process_environment"
  | "calendar_env_local"
  | "calendar_env"
  | "reddirt_env_local"
  | "reddirt_env"
  | "missing";

export type PublicEnvironment = {
  appName: string;
  appUrl: string;
  campaignTimezone: string;
  electionDate: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

export type ServerEnvironment = {
  databaseUrl?: string;
  directUrl?: string;
  openAiApiKey?: string;
  supabaseServiceRoleKey?: string;
  appSessionSecret?: string;
  internalApiSecret?: string;
  logLevel: "debug" | "info" | "warn" | "error";
  redDirtFallbackEnabled: boolean;
};

export type EnvVarStatus = {
  configured: boolean;
  source: EnvSource;
  classification?: string;
};

export type EnvironmentSourceReport = Record<string, EnvVarStatus>;
