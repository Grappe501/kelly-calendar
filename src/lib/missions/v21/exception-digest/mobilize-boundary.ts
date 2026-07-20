/**
 * Mobilize adapter boundary (foundation only).
 *
 * Local CampaignMission / Event / MissionIncident remain the system of record.
 * This module documents the future adapter surface and exposes type-safe stubs
 * that never perform network I/O and never require a Mobilize API key.
 *
 * Endpoint paths, auth schemes, and payload shapes MUST be verified against
 * official Mobilize documentation before any integration deliverable enables them.
 */

export const MOBILIZE_PROVIDER = "MOBILIZE" as const;

export type MobilizeCapability =
  | "EVENT_PUBLISH"
  | "EVENT_RECONCILE"
  | "SIGNUP_INGEST"
  | "RSVP_INGEST"
  | "SHIFT_INGEST"
  | "ATTENDANCE_INGEST"
  | "CANCEL_DETECT"
  | "SCHEDULE_CHANGE_DETECT"
  | "WEBHOOK_RECEIVE"
  | "POLL_SYNC";

/** Declared future capability map — not enabled until documented endpoints are verified. */
export const MOBILIZE_CAPABILITY_MAP: Record<
  MobilizeCapability,
  { enabled: false; requiresOfficialDocs: true; direction: "IN" | "OUT" | "BOTH" }
> = {
  EVENT_PUBLISH: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "OUT",
  },
  EVENT_RECONCILE: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "BOTH",
  },
  SIGNUP_INGEST: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  RSVP_INGEST: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  SHIFT_INGEST: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  ATTENDANCE_INGEST: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  CANCEL_DETECT: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  SCHEDULE_CHANGE_DETECT: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  WEBHOOK_RECEIVE: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
  POLL_SYNC: {
    enabled: false,
    requiresOfficialDocs: true,
    direction: "IN",
  },
};

export type MobilizeAdapterBoundary = {
  provider: typeof MOBILIZE_PROVIDER;
  systemOfRecord: "LOCAL";
  secretsInBrowser: false;
  speculativeNetworkCalls: false;
  blocksLocalOperationOnSyncFailure: false;
  capabilities: typeof MOBILIZE_CAPABILITY_MAP;
};

export function getMobilizeAdapterBoundary(): MobilizeAdapterBoundary {
  return {
    provider: MOBILIZE_PROVIDER,
    systemOfRecord: "LOCAL",
    secretsInBrowser: false,
    speculativeNetworkCalls: false,
    blocksLocalOperationOnSyncFailure: false,
    capabilities: MOBILIZE_CAPABILITY_MAP,
  };
}

/** D15 and normal ops must never call Mobilize. */
export function assertNoMobilizeNetworkDuringDigest(): void {
  // Intentionally empty — presence documents the invariant for tests.
}
