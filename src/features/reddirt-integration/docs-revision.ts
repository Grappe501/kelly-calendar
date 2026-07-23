/**
 * Official RedDirt API contract inspection record (IC-02 / ADR-104).
 *
 * No verified official RedDirt HTTP API docs were present in Kelly-calendar
 * or supplied as an approved OpenAPI/SDK packet at inspection time.
 * Network sync therefore remains DOCUMENTATION_PENDING / NOT_CONFIGURED until
 * a verified contract is recorded. Fixture + approved-export paths are the
 * authorized dry-run sources in that state.
 */
export const REDDIRT_DOCS = {
  providerProductName: "RedDirt",
  inspectionDate: "2026-07-23",
  documentationStatus: "DOCUMENTATION_PENDING" as const,
  documentationLocation:
    "No official RedDirt API documentation packet in Kelly-calendar repo",
  documentationRevision: "none-pending-official-contract",
  documentationRevisionShort: "pending",
  publicationDate: null as string | null,
  authenticationMethod: "Bearer token over HTTPS (when contract verified)",
  /** Placeholder allowlist host — never called unless REDDIRT_READ_ENABLED + key. */
  apiBaseUrl: "https://api.reddirt.example",
  allowlistedHosts: ["api.reddirt.example"] as const,
  supportedReadEndpoints: [] as const,
  objectTypesDocumented: [
    "GEOGRAPHY_COUNTY",
    "GEOGRAPHY_PLACE",
    "STRATEGIC_FACT",
  ] as const,
  stableIdentifiers: ["externalObjectId", "countyFips", "placeGeoid"] as const,
  pagination: null,
  rateLimits: null,
  updateTimestamps: ["updatedAt", "modified_at"] as const,
  deletionBehavior: "UNKNOWN_UNTIL_CONTRACT — never infer deletion from incomplete reads",
  permissionModel: "UNKNOWN_UNTIL_CONTRACT — read-only when enabled",
  privacySensitiveFieldsDeniedByDefault: [
    "email",
    "phone",
    "street",
    "address",
    "person",
    "given_name",
    "family_name",
    "home_address",
    "notes",
  ] as const,
  fieldsIntentionallyExcluded: [
    "PERSON",
    "email",
    "phone",
    "street",
    "consent",
    "communication_preferences",
  ] as const,
  writeEndpoints: "HARD_DISABLED — IC-02 never issues POST/PUT/PATCH/DELETE",
  adapterVersion: "kccc-reddirt-adapter-ic02.1",
  mappingVersion: "kccc-reddirt-map-ic02.1",
  privacyAllowlistVersion: "kccc-reddirt-privacy-ic02.1",
  geographyReconcileVersion: "kccc-ic01-reconcile-v1",
  liveCredentialTesting: "Pending — no RedDirt API key / verified contract during IC-02.",
  applicationModeDefault: "FIXTURE_OR_EXPORT" as const,
} as const;

export const REDDIRT_CAMPAIGN_SCOPE = "KELLY";
export const REDDIRT_PROVIDER = "REDDIRT" as const;
