import { loadApprovedEnvironment } from "@/lib/env/load-server-environment";
import {
  MOBILIZE_CAMPAIGN_SCOPE,
  MOBILIZE_DOCS,
} from "@/features/mobilize-integration/docs-revision";

export type MobilizeIntegrationEnv = {
  apiKey: string | null;
  organizationId: string | null;
  apiBaseUrl: string;
  importEventsEnabled: boolean;
  importAttendanceEnabled: boolean;
  publishingEnabled: boolean;
  updatesEnabled: boolean;
  deleteEnabled: boolean;
  defaultContactEmail: string | null;
  campaignScopeKey: string;
};

function truthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

/** Allowlisted Mobilize HTTPS origins only. */
export function resolveMobilizeApiBaseUrl(raw: string | undefined): string {
  const fallback = MOBILIZE_DOCS.apiBaseUrl;
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("MOBILIZE_API_BASE_URL is not a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("MOBILIZE_API_BASE_URL must use HTTPS.");
  }
  if (
    !(MOBILIZE_DOCS.allowlistedHosts as readonly string[]).includes(url.host)
  ) {
    throw new Error("MOBILIZE_API_BASE_URL host is not allowlisted.");
  }
  const path = url.pathname.replace(/\/$/, "") || "/v1";
  return `${url.origin}${path.endsWith("/v1") ? path : `${path}/v1`}`.replace(
    /\/v1\/v1$/,
    "/v1",
  );
}

export function getMobilizeIntegrationEnv(): MobilizeIntegrationEnv {
  const loaded = loadApprovedEnvironment();
  const env = { ...loaded.env, ...process.env };
  return {
    apiKey: env.MOBILIZE_API_KEY?.trim() || null,
    organizationId: env.MOBILIZE_ORGANIZATION_ID?.trim() || null,
    apiBaseUrl: resolveMobilizeApiBaseUrl(env.MOBILIZE_API_BASE_URL),
    importEventsEnabled: truthy(env.MOBILIZE_IMPORT_EVENTS_ENABLED),
    importAttendanceEnabled: truthy(env.MOBILIZE_IMPORT_ATTENDANCE_ENABLED),
    publishingEnabled: truthy(env.MOBILIZE_PUBLISHING_ENABLED),
    updatesEnabled: truthy(env.MOBILIZE_UPDATES_ENABLED),
    /** Default false — never enable from absence. */
    deleteEnabled: truthy(env.MOBILIZE_DELETE_ENABLED),
    defaultContactEmail: env.MOBILIZE_DEFAULT_CONTACT_EMAIL?.trim() || null,
    campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
  };
}

export function mobilizeConfigStatus(env = getMobilizeIntegrationEnv()) {
  const networkWritesPossible = Boolean(env.apiKey && env.organizationId);
  return {
    apiKeyConfigured: Boolean(env.apiKey),
    organizationIdConfigured: Boolean(env.organizationId),
    apiBaseUrl: env.apiBaseUrl,
    importEventsEnabled: env.importEventsEnabled,
    importAttendanceEnabled: env.importAttendanceEnabled,
    publishingEnabled: env.publishingEnabled,
    updatesEnabled: env.updatesEnabled,
    deleteEnabled: env.deleteEnabled,
    defaultContactEmailConfigured: Boolean(env.defaultContactEmail),
    /** Application may enable create/update only when flags + credentials exist. */
    outboundWritesEnabled: Boolean(
      networkWritesPossible && (env.publishingEnabled || env.updatesEnabled),
    ),
    networkPublishingAvailable: Boolean(
      networkWritesPossible && env.publishingEnabled,
    ),
    networkUpdatesAvailable: Boolean(networkWritesPossible && env.updatesEnabled),
    networkDeleteAvailable: Boolean(networkWritesPossible && env.deleteEnabled),
    fullyConfigured: Boolean(env.apiKey && env.organizationId),
    documentationRevision: MOBILIZE_DOCS.documentationRevisionShort,
    adapterVersion: MOBILIZE_DOCS.adapterVersion,
    mappingVersion: MOBILIZE_DOCS.mappingVersion,
  };
}
