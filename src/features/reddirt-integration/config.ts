import { loadApprovedEnvironment } from "@/lib/env/load-server-environment";
import {
  REDDIRT_CAMPAIGN_SCOPE,
  REDDIRT_DOCS,
} from "@/features/reddirt-integration/docs-revision";

export type RedDirtIntegrationEnv = {
  apiKey: string | null;
  baseUrl: string;
  organizationId: string | null;
  readEnabled: boolean;
  campaignScopeKey: string;
};

function truthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

/** Allowlisted RedDirt HTTPS origins only (placeholder until official contract). */
export function resolveRedDirtBaseUrl(raw: string | undefined): string {
  const fallback = REDDIRT_DOCS.apiBaseUrl;
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("REDDIRT_BASE_URL is not a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("REDDIRT_BASE_URL must use HTTPS.");
  }
  if (!(REDDIRT_DOCS.allowlistedHosts as readonly string[]).includes(url.host)) {
    throw new Error("REDDIRT_BASE_URL host is not allowlisted.");
  }
  return url.origin;
}

export function getRedDirtIntegrationEnv(): RedDirtIntegrationEnv {
  const loaded = loadApprovedEnvironment();
  const env = { ...loaded.env, ...process.env };
  return {
    apiKey: env.REDDIRT_API_KEY?.trim() || null,
    baseUrl: resolveRedDirtBaseUrl(env.REDDIRT_BASE_URL),
    organizationId: env.REDDIRT_ORGANIZATION_ID?.trim() || null,
    /** Default false — never enable network from absence. */
    readEnabled: truthy(env.REDDIRT_READ_ENABLED),
    campaignScopeKey: REDDIRT_CAMPAIGN_SCOPE,
  };
}

export type RedDirtConfigStatus = {
  apiKeyConfigured: boolean;
  organizationIdConfigured: boolean;
  baseUrl: string;
  readEnabled: boolean;
  fullyConfigured: boolean;
  networkReadsAllowed: boolean;
  documentationStatus: typeof REDDIRT_DOCS.documentationStatus;
  documentationRevision: string;
  adapterVersion: string;
  mappingVersion: string;
  privacyAllowlistVersion: string;
  outboundWritesEnabled: false;
  connectionStateHint:
    | "NOT_CONFIGURED"
    | "DISABLED"
    | "CONFIGURED_UNVERIFIED"
    | "DOCUMENTATION_PENDING";
};

export function reddirtConfigStatus(
  env = getRedDirtIntegrationEnv(),
): RedDirtConfigStatus {
  const fullyConfigured = Boolean(env.apiKey && env.organizationId);
  const networkReadsAllowed = Boolean(
    env.readEnabled && env.apiKey && env.organizationId,
  );
  let connectionStateHint: RedDirtConfigStatus["connectionStateHint"] =
    "NOT_CONFIGURED";
  if (!fullyConfigured) {
    connectionStateHint = "NOT_CONFIGURED";
  } else if (!env.readEnabled) {
    connectionStateHint = "DISABLED";
  } else if (REDDIRT_DOCS.documentationStatus === "DOCUMENTATION_PENDING") {
    connectionStateHint = "DOCUMENTATION_PENDING";
  } else {
    connectionStateHint = "CONFIGURED_UNVERIFIED";
  }
  return {
    apiKeyConfigured: Boolean(env.apiKey),
    organizationIdConfigured: Boolean(env.organizationId),
    baseUrl: env.baseUrl,
    readEnabled: env.readEnabled,
    fullyConfigured,
    networkReadsAllowed,
    documentationStatus: REDDIRT_DOCS.documentationStatus,
    documentationRevision: REDDIRT_DOCS.documentationRevisionShort,
    adapterVersion: REDDIRT_DOCS.adapterVersion,
    mappingVersion: REDDIRT_DOCS.mappingVersion,
    privacyAllowlistVersion: REDDIRT_DOCS.privacyAllowlistVersion,
    outboundWritesEnabled: false,
    connectionStateHint,
  };
}
